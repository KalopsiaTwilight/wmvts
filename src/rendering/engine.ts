import { Camera } from "@app/cameras";
import { AABB, Float3, Float4, Float44, Frustrum } from "@app/math";
import { FileIdentifier } from "@app/metadata";
import { IProgressReporter, IDataLoader, RequestFrameFunction, ErrorHandlerFn, ErrorType, IDisposable } from "@app/interfaces";
import { Disposable } from "@app/disposable";

import { IRenderObject, isWorldPositionedObject } from "./objects";
import {
    DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest,
    RenderMaterial
} from "./graphics";
import { WebGlCache } from "./webglCache";
import { IDataManager, IIoCContainer, IObjectFactory, IObjectIdentifier, IRenderingEngine } from "./interfaces";
import { DefaultIoCContainer } from "./iocContainer";

const DataProcessingErrorType: ErrorType = "dataProcessing";
const RenderingErrorType: ErrorType = "rendering"

export interface RenderingEngineRequirements {
    graphics: IGraphics,
    dataLoader: IDataLoader,
    requestFrame: RequestFrameFunction,
}

export interface RenderingEngineOptions {
    progress?: IProgressReporter,
    container?: HTMLElement,
    errorHandler?: ErrorHandlerFn,
    cameraFov?: number;

    clearColor?: Float4;

    lightDirection?: Float3;
    lightColor?: Float4;
    ambientColor?: Float4;

    oceanCloseColor?: Float4;
    oceanFarColor?: Float4;
    riverCloseColor?: Float4;
    riverFarColor?: Float4;
    waterAlphas?: Float4;

    cacheTtl?: number;
}
export class RenderingEngine extends Disposable implements IRenderingEngine {
    // Options / Configurables
    graphics: IGraphics;
    dataLoader: IDataLoader;
    requestFrame: RequestFrameFunction;
    containerElement?: HTMLElement;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;
    sceneCamera: Camera;

    // Rendering settings
    fov: number;
    width: number;
    height: number;
    clearColor: Float4;
    doodadRenderDistance: number;
    debugPortals: boolean;

    // Light settings
    ambientColor: Float4;
    lightColor: Float4;
    lightDir: Float3;

    // Water settings
    oceanCloseColor: Float4;
    oceanFarColor: Float4;
    riverCloseColor: Float4;
    riverFarColor: Float4;
    waterAlphas: Float4;

    // Working data
    isDisposing: boolean;
    lastTime: number;

    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;

    graphicsCache: WebGlCache;
    textureRequests: { [key: string]: Promise<ITexture> }

    // Some stats
    framesDrawn: number;
    timeElapsed: number;

    // FPS calculation over avg of x frames
    maxFpsCounterSize: number;
    fpsCounter: number[];

    // DOM References
    debugContainer?: HTMLDivElement;
    fpsElement?: HTMLParagraphElement;
    batchesElement?: HTMLParagraphElement;

    // Drawing data
    drawRequests: DrawingBatchRequest[];
    otherGraphicsRequests: RenderingBatchRequest[];
    sceneObjects: IRenderObject[];
    sceneBoundingBox: AABB;

    // IoC
    iocContainer: IIoCContainer;
    objectFactory: IObjectFactory;
    dataManager: IDataManager;
    objectIdentifier: IObjectIdentifier;

    constructor(graphics: IGraphics, dataLoader: IDataLoader, requestFrame: RequestFrameFunction,
        options: RenderingEngineOptions) {
        super();
        this.graphics = graphics;
        this.dataLoader = dataLoader;
        this.requestFrame = requestFrame;
        this.progress = options.progress;
        this.dataLoader.useProgressReporter(options.progress);
        this.errorHandler = options.errorHandler;
        this.containerElement = options.container;

        this.sceneObjects = [];
        this.sceneBoundingBox = AABB.zero();

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.projViewMatrix = Float44.identity();
        this.cameraFrustrum = Frustrum.zero();
        this.cameraPosition = Float3.zero();

        const cacheTtl = options.cacheTtl ? options.cacheTtl : 1000 * 60 * 15;
        this.graphicsCache = new WebGlCache(cacheTtl);

        this.textureRequests = {};
        this.drawRequests = [];
        this.otherGraphicsRequests = [];

        this.clearColor = options.clearColor ? options.clearColor : Float4.create(0.1, 0.1, 0.1, 1);
        this.fov = options.cameraFov ? options.cameraFov : 60;
        this.ambientColor = options.ambientColor ? options.ambientColor : Float4.create(1 / 3, 1 / 3, 1 / 3, 1);
        this.lightColor = options.lightColor ? options.lightColor : Float4.one()
        this.lightDir = Float3.normalize(options.lightDirection ? options.lightDirection : [0, 0, 1]);

        this.oceanCloseColor = options.oceanCloseColor ? options.oceanCloseColor : Float4.create(17 / 255, 75 / 255, 89 / 255, 1);
        this.oceanFarColor = options.oceanFarColor ? options.oceanFarColor : Float4.create(0, 29 / 255, 41 / 255, 1);
        this.riverCloseColor = options.riverCloseColor ? options.riverCloseColor : Float4.create(41 / 255, 76 / 255, 81 / 255, 1);
        this.riverFarColor = options.riverFarColor ? options.riverFarColor : Float4.create(26 / 255, 46 / 255, 51 / 255, 1),
            this.waterAlphas = options.waterAlphas ? options.waterAlphas : Float4.create(0.3, 0.8, 0.5, 1)

        this.framesDrawn = 0;
        this.timeElapsed = 0;
        this.maxFpsCounterSize = 100;
        this.fpsCounter = [];

        // Set opts to defaults
        this.debugPortals = false;
        this.doodadRenderDistance = 300;

        // TODO: Make this configurable
        this.iocContainer = new DefaultIoCContainer(this.dataLoader, this.errorHandler, this.progress);
        this.objectFactory = this.iocContainer.getObjectFactory();
        this.dataManager = this.iocContainer.getDataManager();
        this.objectIdentifier = this.iocContainer.getObjectIdentifier();
    }

    dispose(): void {
        this.viewMatrix = null;
        this.invViewMatrix = null;
        this.sceneCamera.dispose();
        for (const object of this.sceneObjects) {
            object.dispose();
        }
    }

    now() {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    draw(currentTime: number) {
        try {
            const deltaTime = (currentTime - this.lastTime);
            this.lastTime = currentTime;

            this.sceneCamera.update(deltaTime);
            Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
            Float44.invert(this.viewMatrix, this.invViewMatrix);
            Float44.multiply(this.projectionMatrix, this.viewMatrix, this.projViewMatrix);
            Frustrum.fromViewMatrix(this.projViewMatrix, this.cameraFrustrum);
            Float44.getTranslation(this.invViewMatrix, this.cameraPosition);

            // Update objects
            this.dataManager.update(deltaTime);
            this.graphicsCache.update(deltaTime);
            for (const obj of this.sceneObjects) {
                obj.update(deltaTime);
            }

            // Do non drawing graphics work
            const otherGraphicsWork = this.otherGraphicsRequests.sort((a, b) => a.key.compareTo(b.key));
            for (const batch of otherGraphicsWork) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();
            this.otherGraphicsRequests = [];


            for (const obj of this.sceneObjects) {
                obj.draw();
            }

            // Sort batches in draw order.
            const drawOrderRequests = this.drawRequests.sort((r1, r2) => r1.compareTo(r2))

            // Draw new frame
            this.graphics.clearFrame(this.clearColor);
            this.graphics.startFrame(this.width, this.height);
            for (const batch of drawOrderRequests) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();

            if (this.fpsElement) {
                this.fpsCounter.push(1 / (deltaTime / 1000));
                if (this.fpsCounter.length > this.maxFpsCounterSize) {
                    this.fpsCounter.splice(0, 1);
                }
                const avgFps = this.fpsCounter.reduce((acc, next) => acc + next, 0) / this.fpsCounter.length;
                this.fpsElement.textContent = "FPS: " + Math.floor(avgFps);
            }

            if (this.batchesElement) {
                this.batchesElement.textContent = "Batches: " + drawOrderRequests.length;
            }

            this.drawRequests = [];

            if (drawOrderRequests.length > 0) {
                this.framesDrawn++;
            }
            this.timeElapsed += deltaTime;
        }
        catch (err) {
            this.errorHandler?.(RenderingErrorType, null, err);
        }
    }

    start() {
        this.lastTime = this.now();

        this.sceneCamera.initialize(this);
        Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
        Float44.invert(this.viewMatrix, this.invViewMatrix);

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
        const engine = this;
        const drawFrame = () => {
            if (engine.isDisposing) {
                return;
            }
            const now = engine.now();
            engine.draw(now);
            this.requestFrame(drawFrame)
        }
        drawFrame();
    }

    enableDebug() {
        this.setupDebugElements();
    }

    enableDebugPortals() {
        this.debugPortals = true;
    }

    disableDebug() {
        this.destroyDebugElements();
    }

    disableDebugPortals() {
        this.debugPortals = false;
    }

    resize(width: number, height: number) {
        this.height = height;
        this.width = width;

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
    }

    switchCamera(newCamera: Camera) {
        newCamera.initialize(this);
        newCamera.scaleToBoundingBox(this.sceneBoundingBox);
        this.sceneCamera.dispose();
        this.sceneCamera = newCamera;
    }

    addSceneObject(object: IRenderObject, priority: number) {
        object.attachToRenderer(this);
        object.once("disposed", () => {
            this.sceneObjects = this.sceneObjects.filter(x => !x.isDisposing);
        })
        if (isWorldPositionedObject(object)) {
            object.once("loaded", (obj) => {
                this.processNewBoundingBox(obj.worldBoundingBox);
            })
        }
        this.sceneObjects.push(object);
    }

    removeSceneObject(object: IRenderObject) {
        this.sceneObjects = this.sceneObjects.filter((x) => x != object);
        object.dispose();
        this.recalculateSceneBounds();
    }

    private recalculateSceneBounds() {
        this.sceneBoundingBox = AABB.zero();
        for (const obj of this.sceneObjects) {
            if (isWorldPositionedObject(obj)) {
                this.sceneBoundingBox = AABB.merge(this.sceneBoundingBox, obj.worldBoundingBox)
            }
        }
        this.sceneCamera.scaleToBoundingBox(this.sceneBoundingBox);
    }

    processNewBoundingBox(boundingBox: AABB): void {
        this.sceneBoundingBox = AABB.merge(this.sceneBoundingBox, boundingBox);
        this.sceneCamera.scaleToBoundingBox(this.sceneBoundingBox);
    }

    submitDrawRequest(request: DrawingBatchRequest) {
        this.drawRequests.push(request);
    }

    submitOtherGraphicsRequest(request: RenderingBatchRequest) {
        this.otherGraphicsRequests.push(request);
    }

    getSolidColorTexture(color: Float4) {
        return this.graphics.createSolidColorTexture(color);
    }

    getUnknownTexture(): ITexture {
        const unknownTexture = this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
        return unknownTexture;
    }

    async getTexture(requester: IDisposable, fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture | null> {
        const id = this.objectIdentifier.createIdentifier(requester);
        const key = "TEXTURE-" + fileId;

        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(key, id);
        })
        // Try to resolve from cache
        if (this.graphicsCache.contains(key)) {
            this.graphicsCache.addOwner(key, id);
            return this.graphicsCache.get(key);
        }

        if (this.textureRequests[key]) {
            const data = await this.textureRequests[key];
            if (this.graphicsCache.contains(key)) {
                this.graphicsCache.addOwner(key, id);
            }
            return data;
        }

        const promise = this.dataManager.getTextureImageData(fileId).then(async (data) => {
            if (!data) {
                return null;
            }
            const texture = await this.processTexture(fileId, data, opts);
            return texture;
        });
        this.textureRequests[key] = promise;

        const texture = await promise;
        if (texture) {
            this.graphicsCache.store(key, texture);
            this.graphicsCache.addOwner(key, id);
        }
        delete this.textureRequests[key];
        return texture;
    }

    private async processTexture(fileId: FileIdentifier, imgData: string, opts?: ITextureOptions) {
        return new Promise<ITexture>((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const texture = this.graphics.createTextureFromImg(img, opts);
                texture.fileId = fileId;
                res(texture);
            }
            img.onerror = (evt, src, line, col, err) => {
                this.errorHandler?.(DataProcessingErrorType, "TEXTURE-" + fileId, err ? err : new Error("Unable to process image data for file: " + fileId));
                res(this.getUnknownTexture());
            }
            img.src = imgData;
        });
    }

    getShaderProgram(requester: IDisposable, key: string, vertexShader: string, fragmentShader: string): IShaderProgram {
        const id = this.objectIdentifier.createIdentifier(requester);
        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(cacheKey, id);
        })

        const cacheKey = "PROGRAM-" + key;
        if (this.graphicsCache.contains(cacheKey)) {
            this.graphicsCache.addOwner(cacheKey, id);
            return this.graphicsCache.get(cacheKey);
        }

        const program = this.graphics.createShaderProgram(vertexShader, fragmentShader);
        this.graphicsCache.store(cacheKey, program);
        this.graphicsCache.addOwner(cacheKey, id);
        return program;
    }

    getDataBuffers(requester: IDisposable, key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers {
        const id = this.objectIdentifier.createIdentifier(requester);

        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(cacheKey, id);
        })

        const cacheKey = "DATABUFFER-" + key;
        if (this.graphicsCache.contains(cacheKey)) {
            this.graphicsCache.addOwner(cacheKey, id);
            return this.graphicsCache.get(cacheKey);
        }

        const dataBuffers = createFn(this.graphics);
        this.graphicsCache.store(cacheKey, dataBuffers);
        this.graphicsCache.addOwner(cacheKey, id);
        return dataBuffers;
    }

    getBaseMaterial() {
        const material = new RenderMaterial();
        material.useUniforms({
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,

            "u_ambientColor": this.ambientColor,
            "u_lightColor": this.lightColor,
            "u_lightDir": this.lightDir,

            "u_oceanCloseColor": this.oceanCloseColor,
            "u_oceanFarColor": this.oceanFarColor,
            "u_riverCloseColor": this.riverCloseColor,
            "u_riverFarColor": this.riverFarColor,
            "u_waterAlphas": this.waterAlphas
        });
        return material;
    }

    private setupDebugElements() {
        if (document && this.containerElement) {
            this.debugContainer = document.createElement("div");
            this.debugContainer.style.position = "absolute";
            this.debugContainer.style.left = "0";
            this.debugContainer.style.top = "0";
            this.debugContainer.style.padding = "1em";

            this.fpsElement = document.createElement("p");
            this.fpsElement.style.color = "white";
            this.fpsElement.style.margin = "0";
            this.debugContainer.append(this.fpsElement);

            this.batchesElement = document.createElement("p");
            this.batchesElement.style.color = "white";
            this.batchesElement.style.margin = "0";
            this.batchesElement.style.marginTop = "1.2em";
            this.debugContainer.append(this.batchesElement);

            this.containerElement.append(this.debugContainer);
        }
    }

    private destroyDebugElements() {
        if (this.fpsElement) {
            this.fpsElement.remove()
            this.fpsElement = null;
        }
        if (this.batchesElement) {
            this.batchesElement.remove();
            this.batchesElement = null;
        }
        if (this.debugContainer) {
            this.debugContainer.remove()
            this.debugContainer = null;
        }
    }
}