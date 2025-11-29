import { AABB, Float3, Float4, Float44, Frustrum } from "@app/math";
import { FileIdentifier } from "@app/metadata";
import { IProgressReporter, IDataLoader, ErrorHandlerFn, ErrorType, IDisposable, ICamera } from "@app/interfaces";
import { Disposable } from "@app/disposable";

import { IRenderObject, isWorldPositionedObject } from "./objects";
import {
    DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest,
    RenderMaterial
} from "./graphics";
import { WebGlCache } from "./webglCache";
import { IBaseRendererOptions, IDataManager, IIoCContainer, IObjectFactory, IObjectIdentifier, IRenderer, RendererEvents } from "./interfaces";
import { DefaultIoCContainer } from "./iocContainer";

const DataProcessingErrorType: ErrorType = "dataProcessing";
const RenderingErrorType: ErrorType = "rendering"

export abstract class BaseRenderer<TParentEvent extends string = never> extends Disposable<TParentEvent | RendererEvents> implements IRenderer<TParentEvent> {
    // Options / Configurables
    graphics: IGraphics;
    dataLoader: IDataLoader;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;
    sceneCamera: ICamera;

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
    lastDeltaTime: number;
    timeElapsed: number;

    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;

    graphicsCache: WebGlCache;
    textureRequests: { [key: string]: Promise<ITexture> }

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

    constructor(graphics: IGraphics, dataLoader: IDataLoader, options: IBaseRendererOptions) {
        super();
        this.graphics = graphics;
        this.dataLoader = dataLoader;
        this.progress = options.progress;
        this.dataLoader.useProgressReporter(options.progress);
        this.errorHandler = options.errorHandler;

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

        // Set opts to defaults
        this.debugPortals = false;
        this.doodadRenderDistance = 300;

        // TODO: Make this configurable
        this.iocContainer = new DefaultIoCContainer(this.dataLoader, this.errorHandler, this.progress);
        this.objectFactory = this.iocContainer.getObjectFactory();
        this.dataManager = this.iocContainer.getDataManager();
        this.objectIdentifier = this.iocContainer.getObjectIdentifier();

        // Set up working data
        this.lastDeltaTime = 0;
        this.lastTime = 0;
        this.timeElapsed = 0;
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.graphics = null;
        this.dataLoader = null;
        this.progress = null;
        this.errorHandler = null;
        this.sceneCamera = null;

        this.ambientColor = null;
        this.lightColor = null;
        this.lightDir = null;
        
        // Water settings
        this.oceanCloseColor = null;
        this.oceanFarColor = null;
        this.riverCloseColor = null;
        this.riverFarColor = null;
        this.waterAlphas = null;

        // Camera data
        this.projectionMatrix = null;
        this.viewMatrix = null;
        this.invViewMatrix = null;
        this.projViewMatrix = null;
        this.cameraFrustrum = null;
        this.cameraPosition = null;

        this.graphicsCache.dispose();
        this.graphicsCache = null;
        this.textureRequests = null;

        // Drawing data
        this.drawRequests = null;
        this.otherGraphicsRequests = null;
        for(let i = 0; i < this.sceneObjects.length; i++) {
            this.sceneObjects[i].dispose();
        }
        this.sceneObjects = null;
        this.sceneBoundingBox = null;

        this.iocContainer = null;
        this.objectFactory = null;
        this.dataManager = null;
        this.objectIdentifier = null;
    }

    draw(currentTime: number) {
        try {
            this.processCallbacks("beforeUpdate");

            const deltaTime = (currentTime - this.lastTime);
            this.lastTime = currentTime;

            // Update camera
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
            this.processCallbacks("afterUpdate")

            this.processCallbacks("beforeDraw");

            // Do non drawing graphics work
            this.otherGraphicsRequests.sort((a, b) => a.compareTo(b));
            for (const batch of this.otherGraphicsRequests) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();
            this.otherGraphicsRequests = [];

            // Draw all scene objects
            for (const obj of this.sceneObjects) {
                obj.draw();
            }

            // Draw new frame
            this.drawRequests.sort((r1, r2) => r1.compareTo(r2))
            this.graphics.clearFrame(this.clearColor);
            this.graphics.startFrame(this.width, this.height);
            for (const batch of this.drawRequests) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();

            this.processCallbacks("afterDraw");

            this.drawRequests = [];
            this.lastDeltaTime = deltaTime;
            this.timeElapsed += deltaTime;
        }
        catch (err) {
            this.errorHandler?.(RenderingErrorType, null, err);
        }
    }

    protected now() {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    resize(width: number, height: number) {
        this.height = height;
        this.width = width;

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
    }

    switchCamera(newCamera: ICamera) {
        newCamera.attachToRenderer(this);
        this.sceneCamera.dispose();
        this.sceneCamera = newCamera;
    }

    addSceneObject(object: IRenderObject) {
        object.attachToRenderer(this);
        object.once("disposed", () => {
            this.sceneObjects = this.sceneObjects.filter(x => !x.isDisposing);
        })
        if (isWorldPositionedObject(object)) {
            object.once("loaded", (obj) => {
                this.sceneBoundingBox = AABB.merge(this.sceneBoundingBox, obj.worldBoundingBox);
                this.processCallbacks("sceneBoundingBoxUpdate");
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
        this.processCallbacks("sceneBoundingBoxUpdate");
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
        return this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
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

    getSceneBoundingBox() {
        return this.sceneBoundingBox;
    }
}