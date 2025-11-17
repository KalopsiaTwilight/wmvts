import { Camera } from "@app/cameras";
import { TextureVariationsMetadata, LiquidTypeMetadata, CharacterMetadata, ItemMetadata } from "@app/metadata";
import { AABB, AleaPrngGenerator, Float3, Float4, Float44, Frustrum } from "@app/math";
import { IDisposable, IProgressReporter, IDataLoader, RequestFrameFunction, ErrorHandlerFn, ErrorType } from "@app/interfaces";
import { CallbackManager, IImmediateCallbackable } from "@app/utils";
import { WoWModelData, WoWWorldModelData, WoWBoneFileData } from "@app/modeldata";

import { IRenderObject, isWorldPositionedObject } from "./objects";
import { 
    DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, 
    RenderMaterial 
} from "./graphics";
import { SimpleCache } from "./cache";

import { defaultModelPickingStrategy, defaultTexturePickingStrategy, IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";
import { IRenderingEngine } from "./interfaces";

const DataLoadingErrorType: ErrorType = "dataFetching";
const DataProcessingErrorType: ErrorType = "dataProcessing";
const RenderingErrorType: ErrorType = "rendering"

const LoadDataOperationText: string = "Loading model data..."

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
    lightDirection?: Float3;
    lightColor?: Float4;
    ambientColor?: Float4;
    clearColor?: Float4;
    cacheTtl?: number;
    disableLighting?: boolean
}

export class RenderingEngine implements IRenderingEngine, IDisposable {
    // Options / Configurables
    graphics: IGraphics;
    dataLoader: IDataLoader;
    requestFrame: RequestFrameFunction;
    containerElement?: HTMLElement;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;
    sceneCamera: Camera;
    texturePickingStrategy: ITexturePickingStrategy
    modelPickingStrategy: IModelPickingStrategy

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

    // Caching. TODO: Simplify into single united cache?
    caches: SimpleCache<unknown>[];
    textureCache: SimpleCache<ITexture>;
    shaderCache: SimpleCache<IShaderProgram>;
    wmoCache: SimpleCache<WoWWorldModelData>;
    m2Cache: SimpleCache<WoWModelData>;
    liquidCache: SimpleCache<LiquidTypeMetadata>;
    dataBuffersCache: SimpleCache<IDataBuffers>;
    materialCache: SimpleCache<RenderMaterial>;
    textureVariationsCache: SimpleCache<TextureVariationsMetadata>;
    characterMetadataCache: SimpleCache<CharacterMetadata>;
    itemMetadataCache: SimpleCache<ItemMetadata>;
    boneFileCache: SimpleCache<WoWBoneFileData>;
    runningRequests: { [key: string]: Promise<unknown> }

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
        this.sceneBoundingBox = AABB.zero();

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.projViewMatrix = Float44.identity();
        this.cameraFrustrum = Frustrum.zero();
        this.cameraPosition = Float3.zero();

        this.caches = [];
        const cacheTtl = options.cacheTtl ? options.cacheTtl : 1000 * 60 * 15;
        this.textureCache = new SimpleCache(cacheTtl);
        this.caches.push(this.textureCache);
        this.shaderCache = new SimpleCache(cacheTtl);
        this.caches.push(this.shaderCache);
        this.wmoCache = new SimpleCache(cacheTtl);
        this.caches.push(this.wmoCache);
        this.m2Cache = new SimpleCache(cacheTtl);
        this.caches.push(this.m2Cache);
        this.liquidCache = new SimpleCache(cacheTtl);
        this.caches.push(this.liquidCache);
        this.dataBuffersCache = new SimpleCache(cacheTtl);
        this.caches.push(this.dataBuffersCache);
        this.textureVariationsCache = new SimpleCache(cacheTtl);
        this.caches.push(this.textureVariationsCache);
        this.characterMetadataCache = new SimpleCache(cacheTtl);
        this.caches.push(this.characterMetadataCache);
        this.itemMetadataCache = new SimpleCache(cacheTtl);
        this.caches.push(this.itemMetadataCache);
        this.boneFileCache = new SimpleCache(cacheTtl);
        this.caches.push(this.boneFileCache);

        this.runningRequests = {};
        this.drawRequests = [];
        this.otherGraphicsRequests = [];

        this.clearColor = options.clearColor ? options.clearColor : Float4.create(0.1, 0.1, 0.1, 1);
        this.fov = options.cameraFov ? options.cameraFov : 60;
        this.ambientColor = options.ambientColor ? options.ambientColor : Float4.create(1 / 3, 1 / 3, 1 / 3, 1);
        this.lightColor = options.lightColor ? options.lightColor : Float4.one()
        this.lightDir = Float3.normalize(options.lightDirection ? options.lightDirection : [0, 0, 1]);

        this.framesDrawn = 0;
        this.timeElapsed = 0;
        this.maxFpsCounterSize = 100;
        this.fpsCounter = [];

        // Set opts to defaults
        this.debugPortals = false;
        this.doodadRenderDistance = 300;

        // TODO: make this configurable?
        this.texturePickingStrategy = defaultTexturePickingStrategy;
        this.modelPickingStrategy = defaultModelPickingStrategy;
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

            for(const cache of this.caches) {
                cache.update(deltaTime);
            }
            for (const obj of this.sceneObjects) {
                obj.update(deltaTime);
            }

            const otherGraphicsWork = this.otherGraphicsRequests.sort((a,b) => a.key.compareTo(b.key));
            for(const batch of otherGraphicsWork) {
                batch.submit(this.graphics);
            }
            this.otherGraphicsRequests = [];
            
            for (const obj of this.sceneObjects) {
                obj.draw();
            }

            // Sort batches in draw order.
            const drawOrderRequests = this.drawRequests.sort((r1, r2) => r1.compareTo(r2))
                
            // Draw new frame
            this.graphics.startFrame(this.width, this.height);
            this.graphics.clearFrame(this.clearColor);
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
        object.initialize(this);
        this.sceneObjects.push(object);
    }

    removeSceneObject(object: IRenderObject) {
        this.sceneObjects = this.sceneObjects.filter((x) => x != object);
        object.dispose();
        this.recalculateSceneBounds();
    }

    private recalculateSceneBounds() {
        this.sceneBoundingBox = AABB.zero();
        for(const obj of this.sceneObjects) {
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

    async getTexture(fileId: number, opts?: ITextureOptions): Promise<ITexture | null> {
        if (this.runningRequests[fileId]) {
            const texture = await this.runningRequests[fileId];
            return texture as ITexture;
        }

        // Try to resolve from cache
        if (this.textureCache.contains(fileId)) {
            return this.textureCache.get(fileId);
        }

        // Retrieve texture from dataloader & process into WebGL Texture
        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(fileId);
        const req = this.dataLoader.loadTexture(fileId)
            .then(async (imgData) => {
                if (imgData instanceof Error) {
                    return imgData;
                } else {
                    return this.processTexture(fileId, imgData, opts)
                }
            });

        this.runningRequests[fileId] = req;
        const texture = await req;
        if (texture instanceof Error) {
            this.errorHandler?.(DataProcessingErrorType, "TEXTURE-" + fileId, texture);
            return null;
        }
        return texture;
    }

    private async processTexture(fileId: number, imgData: string, opts?: ITextureOptions) {
        return new Promise<ITexture>((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const texture = this.graphics.createTextureFromImg(img, opts);
                texture.fileId = fileId;
                this.textureCache.store(fileId, texture);
                this.progress?.removeFileFromOperation(fileId);
                delete this.runningRequests[fileId];
                res(texture);
            }
            img.onerror = (evt, src, line, col, err) => {
                this.errorHandler?.(DataProcessingErrorType, "TEXTURE-" + fileId, err ? err : new Error("Unable to process image data for file: " + fileId));
                this.progress?.removeFileFromOperation(fileId);
                delete this.runningRequests[fileId];
                res(this.getUnknownTexture());
            }
            img.src = imgData;
        });
    }

    getSolidColorTexture(color: Float4) {
        return this.graphics.createSolidColorTexture(color);
    }

    getUnknownTexture(): ITexture {
        const unknownTexture = this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
        return unknownTexture;
    }

    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram {
        if (this.shaderCache.contains(key)) {
            return this.shaderCache.get(key);
        }

        const program = this.graphics.createShaderProgram(vertexShader, fragmentShader);
        this.shaderCache.store(key, program, -1);
        return program;
    }

    getM2ModelFile(fileId: number): Promise<WoWModelData | null> {
        const key = "M2-" + fileId;
        return this.getDataFromLoaderOrCache(this.m2Cache, key, (dl) => dl.loadModelFile(fileId))
    }

    getWMOModelFile(fileId: number): Promise<WoWWorldModelData | null> {
        const key = "WMO-" + fileId;
        return this.getDataFromLoaderOrCache(this.wmoCache, key, (dl) => dl.loadWorldModelFile(fileId))
    }

    getLiquidTypeMetadata(liquidId: number): Promise<LiquidTypeMetadata | null> {
        const key = "LIQUID-" + liquidId;
        return this.getDataFromLoaderOrCache(this.liquidCache, key, (dl) => dl.loadLiquidTypeMetadata(liquidId))
    }

    getCharacterMetadata(modelId: number): Promise<CharacterMetadata | null> {
        const key = "CHARACTER-" + modelId;
        return this.getDataFromLoaderOrCache(this.characterMetadataCache, key, (dl) => dl.loadCharacterMetadata(modelId));
    }

    getItemMetadata(displayInfoId: number): Promise<ItemMetadata | null> {
        const key = "ITEM-" + displayInfoId;
        return this.getDataFromLoaderOrCache(this.itemMetadataCache, key, (dl) => dl.loadItemMetadata(displayInfoId));
    }

    getTextureVariationsMetadata(fileId: number): Promise<TextureVariationsMetadata | null> {
        const key = "TextureVariations-" + fileId;
        return this.getDataFromLoaderOrCache(this.textureVariationsCache, key, (dl) => dl.loadTextureVariationsMetadata(fileId));
    }

    getBoneFileData(fileId: number): Promise<WoWBoneFileData | null> {
        const key = "BoneFile-" + fileId;
        return this.getDataFromLoaderOrCache(this.boneFileCache, key, (dl) => dl.loadBoneFile(fileId));
    }

    getDataBuffers(key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers {
        if (this.dataBuffersCache.contains(key)) {
            return this.dataBuffersCache.get(key);
        }

        const dataBuffers = createFn(this.graphics);
        this.dataBuffersCache.store(key, dataBuffers);
        return dataBuffers;
    }

    private async getDataFromLoaderOrCache<T>(cache: SimpleCache<T>, key: string, loadFn: (x: IDataLoader) => Promise<T|Error>): Promise<T|null> {
        if (this.runningRequests[key]) {
            const data = await this.runningRequests[key];
            if (data instanceof Error) {
                return null;  
            }
            return data as T;
        }

        if (cache.contains(key)) {
            return cache.get(key);
        }

        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(key);
        const req = loadFn(this.dataLoader);
        this.runningRequests[key] = req;
        const data = await req;
        delete this.runningRequests[key];
        this.progress?.removeFileFromOperation(key);

        if (data instanceof Error) {
            this.errorHandler?.(DataLoadingErrorType, key, data);
            return null;  
        }
        cache.store(key, data);
        return data;
    }

    addEngineMaterialParams(material: RenderMaterial) {
        material.useUniforms({
            "u_ambientColor": this.ambientColor,
            "u_lightColor": this.lightColor,
            "u_lightDir": this.lightDir,
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,
        });
    }

    getRandomNumberGenerator(seed?: number | string) {
        return new AleaPrngGenerator(seed ? seed : 0xb00b1e5);
    }

    getCallbackManager<TKeys extends string, T extends IImmediateCallbackable<TKeys>>(obj: T) {
        const mgr = new CallbackManager<TKeys, T>();
        mgr.bind(obj);
        return mgr;
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