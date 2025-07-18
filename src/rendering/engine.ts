import { AleaPrngGenerator, Float3, Float4, Float44, Frustrum } from "./math";
import { Camera } from "../cameras";
import { RenderObject, IDisposable } from "./objects";
import { GxBlend, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest } from "./graphics";
import { IProgressReporter, IDataLoader, WoWModelData, WoWWorldModelData, RequestFrameFunction } from "..";
import { SimpleCache } from "./cache";
import { LiquidTypeMetadata } from "@app/metadata/liquid";

const UNKNOWN_TEXTURE_ID = -123;

const DataLoadingErrorType = "dataFetching";
const DataProcessingErrorType = "dataProcessing";
const RenderingErrorType = "rendering"
export type ErrorType = "dataFetching" | "dataProcessing" | "rendering";

export type ErrorHandlerFn = (type: ErrorType, errorMsg: string) => void;

const LoadDataOperationText: string = "Loading model data..."

export interface RenderingEngineRequirements {
    graphics: IGraphics,
    dataLoader: IDataLoader,
    requestFrame: RequestFrameFunction,
}

export interface RenderingEngineOptions{
    progress?: IProgressReporter, 
    container?: HTMLElement, 
    errorHandler?: ErrorHandlerFn,
    cameraFov?: number;
    lightDirection?: Float3;
    lightColor?: Float4;
    ambientColor?: Float4;
    clearColor?: Float4;
    cacheTtl?: number;
    disableLighting?: boolean
}

export class RenderingEngine implements IDisposable {
    graphics: IGraphics;
    dataLoader: IDataLoader;
    requestFrame: RequestFrameFunction;

    containerElement?: HTMLElement;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;

    isDisposing: boolean;
    lastTime: number;

    sceneCamera: Camera;
    sceneObjects: RenderObject[];

    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;

    fov: number;
    width: number;
    height: number;
    clearColor: Float4;
    ambientColor: Float4;
    lightColor: Float4;
    lightDir: Float3;

    textureCache: SimpleCache<ITexture>;
    shaderCache: SimpleCache<IShaderProgram>;
    wmoCache: SimpleCache<WoWWorldModelData>;
    m2Cache: SimpleCache<WoWModelData>;
    liquidCache: SimpleCache<LiquidTypeMetadata>;
    runningRequests: { [key:string]: Promise<unknown> }

    batchRequests: RenderingBatchRequest[];

    framesDrawn: number;
    timeElapsed: number;

    // FPS calculation over avg of x frames
    maxFpsCounterSize: number;
    fpsCounter: number[];

    debugContainer?: HTMLDivElement;
    fpsElement?: HTMLParagraphElement;
    batchesElement?: HTMLParagraphElement;

    // various options
    debugPortals: boolean;
    lightingDisabled: boolean;
    doodadRenderDistance: number;

    constructor(graphics: IGraphics, dataLoader: IDataLoader, requestFrame: RequestFrameFunction,
        options: RenderingEngineOptions) {
        this.graphics = graphics;
        this.dataLoader = dataLoader;
        this.requestFrame = requestFrame;
        this.progress = options.progress;
        this.dataLoader.useProgressReporter(options.progress);
        this.errorHandler = options.errorHandler;
        this.containerElement = options.container;

        this.sceneObjects = [];

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.projViewMatrix = Float44.identity();
        this.cameraFrustrum = Frustrum.zero();
        this.cameraPosition = Float3.zero();

        const cacheTtl = options.cacheTtl ? options.cacheTtl : 1000 * 60 * 15;
        this.textureCache = new SimpleCache(cacheTtl);
        this.shaderCache = new SimpleCache(cacheTtl);
        this.wmoCache = new SimpleCache(cacheTtl);
        this.m2Cache = new SimpleCache(cacheTtl);
        this.liquidCache = new SimpleCache(cacheTtl);
        this.runningRequests = { };
        this.batchRequests = [];

        this.clearColor = options.clearColor ? options.clearColor : Float4.create(0.1, 0.1, 0.1, 1);
        this.fov = options.cameraFov ? options.cameraFov : 60;
        this.ambientColor = options.ambientColor ? options.ambientColor : Float4.create(1/3, 1/3, 1/3, 1);
        this.lightColor = options.lightColor ? options.lightColor : Float4.one()
        this.lightDir = Float3.normalize(options.lightDirection ? options.lightDirection : [0, 0, 1]);
        this.lightingDisabled = options.disableLighting ? options.disableLighting : false;

        this.framesDrawn = 0;
        this.timeElapsed = 0;
        this.maxFpsCounterSize = 100;
        this.fpsCounter = [];

        // Set opts to defaults
        this.debugPortals = false;
        this.doodadRenderDistance = 200;
    }

    dispose(): void {
        this.viewMatrix = null;
        this.invViewMatrix = null;
        this.sceneCamera.dispose();
        for(const object of this.sceneObjects) {
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

            // Only start drawing if all objects in the scene are loaded:
            for(const obj of this.sceneObjects) {
                if (!obj.isLoaded) {
                    return;
                }
            }

            this.graphics.startFrame(this.width, this.height);
            this.graphics.clearFrame(this.clearColor);
            
            this.sceneCamera.update(deltaTime);
            Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
            Float44.invert(this.viewMatrix, this.invViewMatrix);
            Float44.multiply(this.projectionMatrix, this.viewMatrix, this.projViewMatrix);
            Frustrum.fromViewMatrix(this.projViewMatrix, this.cameraFrustrum);
            Float44.getTranslation(this.invViewMatrix, this.cameraPosition);

            this.textureCache.update(deltaTime);
            this.wmoCache.update(deltaTime);
            this.m2Cache.update(deltaTime);
            this.liquidCache.update(deltaTime);
            for(const obj of this.sceneObjects) {
                obj.update(deltaTime);
            }
            for(const obj of this.sceneObjects) {
                obj.draw();
            }

            // Sort batches in draw order.
            const requests = this.batchRequests
                .sort((r1, r2) => {
                const layer1 = r1.blendMode > GxBlend.GxBlend_Opaque ?
                    r1.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2  : 0
                const layer2 = r2.blendMode > GxBlend.GxBlend_Opaque ?
                    r2.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2  : 0

                const layerDiff = layer1 - layer2;
                if (layerDiff != 0) {
                    return layerDiff;
                }
                return r1.priority - r2.priority;
            });
            for(const batch of requests) {
                batch.submit(this.graphics);
            }

            if (this.fpsElement) {
                this.fpsCounter.push(1/(deltaTime/1000));
                if (this.fpsCounter.length > this.maxFpsCounterSize) {
                    this.fpsCounter.splice(0, 1);
                }
                const avgFps = this.fpsCounter.reduce((acc, next)  => acc+next, 0) / this.fpsCounter.length;
                this.fpsElement.textContent = "FPS: " + Math.floor(avgFps);
            }
            if (this.batchesElement) {
                this.batchesElement.textContent = "Batches: " + requests.length;
            }
            this.batchRequests = [];

            if (requests.length > 0) {
                this.framesDrawn++;
            }
            this.timeElapsed+=deltaTime;
        }
        catch(err) {
            this.errorHandler?.(RenderingErrorType, err.toString());
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
        newCamera.resizeForBoundingBox(this.sceneCamera.getBoundingBox())
        this.sceneCamera.dispose();
        this.sceneCamera = newCamera;
    }

    addSceneObject(object: RenderObject, priority: number) {
        object.initialize(this);
        this.sceneObjects.push(object);
    }

    removeSceneObject(object: RenderObject) {
        this.sceneObjects = this.sceneObjects.filter((x) => x != object);
        object.dispose();
    }

    private async processTexture(fileId: number|string, imgData: string | null, opts?: ITextureOptions) {
        return new Promise<ITexture>((res, rej) => {
            if (imgData === null) {
                this.errorHandler?.(DataLoadingErrorType, "Unable to retrieve image data for file: " + fileId);
                this.progress?.removeFileFromOperation(fileId);
                delete this.runningRequests[fileId];
                res(this.getUnknownTexture());
            }

            const img = new Image();
            img.onload = () => {
                const texture = this.graphics.createTextureFromImg(img, opts);
                this.textureCache.store(fileId, texture); 
                this.progress?.removeFileFromOperation(fileId);
                delete this.runningRequests[fileId];
                res(texture);
            }
            img.onerror = (err) => {
                this.errorHandler?.(DataProcessingErrorType, "Unable to process image data for file: " + fileId);
                this.progress?.removeFileFromOperation(fileId);
                delete this.runningRequests[fileId];
                res(this.getUnknownTexture());
            }
            img.src = imgData;
        });
    } 

    async getTexture(fileId: number, opts?: ITextureOptions): Promise<ITexture> {
        if (this.runningRequests[fileId]) {
            const texture = await this.runningRequests[fileId];
            return texture as ITexture;
        }
        
        // Try to resolve from cache
        if(this.textureCache.contains(fileId)) {
            return this.textureCache.get(fileId);
        }
        
        // Retrieve texture from dataloader & process into WebGL Texture
        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(fileId);
        const req = this.dataLoader.loadTexture(fileId)
            .then((imgData) => this.processTexture(fileId, imgData, opts));
        
        this.runningRequests[fileId] = req;
        const texture = await req;
        return texture;
    }

    getUnknownTexture(): ITexture {
        if (this.textureCache.contains(UNKNOWN_TEXTURE_ID)) {
            return this.textureCache.get(UNKNOWN_TEXTURE_ID);
        }

        const unknownTexture = this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
        this.textureCache.store(UNKNOWN_TEXTURE_ID, unknownTexture, -1);
        return unknownTexture;
    }

    submitBatchRequest(request: RenderingBatchRequest) {
        request.useUniforms({
            "u_ambientColor": this.ambientColor,
            "u_lightColor": this.lightColor,
            "u_lightDir": this.lightDir,
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,
        });
        if (this.lightingDisabled) {
            request.useUniforms({
                "u_unlit": true
            })
        }
        this.batchRequests.push(request);
    }

    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram {
        if (this.shaderCache.contains(key)) {
            return this.shaderCache.get(key);
        }

        const program = this.graphics.createShaderProgram(vertexShader, fragmentShader);
        this.shaderCache.store(key, program, -1);
        return program;
    }

    async getM2ModelFile(fileId: number): Promise<WoWModelData|null> {
        if (this.runningRequests[fileId]) {
            const data = await this.runningRequests[fileId];
            return data as WoWModelData|null;
        }
        if (this.m2Cache.contains(fileId)) {
            return this.m2Cache.get(fileId);
        }

        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(fileId);
        const req = this.dataLoader.loadModelFile(fileId);
        this.runningRequests[fileId] = req;
        const data = await req;
        if (data === null) {
            this.errorHandler?.(DataLoadingErrorType, "Unable to retrieve M2 data for file: " + fileId);
        }
        delete this.runningRequests[fileId];
        this.m2Cache.store(fileId, data);
        this.progress?.removeFileFromOperation(fileId);
        return data;
    }

    async getWMOModelFile(fileId: number): Promise<WoWWorldModelData|null> {
        if (this.runningRequests[fileId]) {
            const data = await this.runningRequests[fileId];
            return data as WoWWorldModelData|null;
        }
        if (this.wmoCache.contains(fileId)) {
            return this.wmoCache.get(fileId);
        }
        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(fileId);
        const req = this.dataLoader.loadWorldModelFile(fileId);
        this.runningRequests[fileId] = req;
        const data = await req;
        if (data === null) {
            this.errorHandler?.(DataLoadingErrorType, "Unable to retrieve WMO data for file: " + fileId);
        }
        this.wmoCache.store(fileId, data);
        delete this.runningRequests[fileId];
        this.progress?.removeFileFromOperation(fileId);
        return data;
    }

    async getLiquidTypeMetadata(liquidId: number): Promise<LiquidTypeMetadata | null> {
        const key = liquidId;

        if (this.runningRequests[key]) {
            const data = await this.runningRequests[key];
            return data as LiquidTypeMetadata|null;
        }

        if (this.liquidCache.contains(liquidId)) {
            return this.liquidCache.get(liquidId);
        }

        this.progress?.setOperation(LoadDataOperationText);
        // TODO: Make this key based LIQUID - ID, FILE - ID etc.
        this.progress?.addFileToOperation(key);
        const req = this.dataLoader.loadLiquidTypeMetadata(liquidId);
        this.runningRequests[key] = req;
        const data = await req;
        if (data === null) {
            this.errorHandler?.(DataLoadingErrorType, "Unable to retrieve Liquid data for liquid: " + liquidId);
        }
        this.liquidCache.store(liquidId, data);
        delete this.runningRequests[key];
        this.progress?.removeFileFromOperation(key);
        return data;
    }

    getRandomNumberGenerator(seed?: number|string) {
        return new AleaPrngGenerator(seed ? seed : 0xb00b1e5);
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
        if(this.fpsElement) {
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