import { AABB, Float3, Float4, Float44, Frustrum, IPseudoRandomNumberGenerator } from "@app/math";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { CharacterMetadata, FileIdentifier, ItemMetadata, ItemVisualMetadata, LiquidTypeMetadata, RecordIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { ErrorHandlerFn, ICamera, IDataLoader, IDisposable, IProgressReporter } from "@app/interfaces";


import { DrawingBatchRequest, IAttribLocations, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, RenderMaterial } from "./graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";
import { ICharacterModel, IItemModel, IItemVisual, IM2Model, IRenderObject, ITextureVariantModel, IWMOModel } from "./objects";

export type RendererEvents = "beforeDraw" | "afterDraw" | "beforeUpdate" | "afterUpdate" | "sceneBoundingBoxUpdate"

export interface IBaseRendererOptions {
    graphics: IGraphics;
    dataLoader: IDataLoader;
    dataManager: IDataManager; 
    objectIdentifier: IObjectIdentifier;

    progress?: IProgressReporter,
    errorHandler?: ErrorHandlerFn,
    cameraFov?: number;

    clearColor?: Float4;

    sunDir: Float3;
    exteriorAmbientColor: Float4;
    exteriorDirectColor: Float4;
    interiorSunDir: Float3;

    oceanCloseColor?: Float4;
    oceanFarColor?: Float4;
    riverCloseColor?: Float4;
    riverFarColor?: Float4;
    waterAlphas?: Float4;

    cacheTtl?: number;
}

export interface IRenderer<TParentEvent extends string = never> extends IDisposable<TParentEvent | RendererEvents> {
    graphics: IGraphics;
    
    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;
    // various rendering settings
    timeElapsed: number;
    
    // Light settings
    sunDir: Float3;
    exteriorAmbientColor: Float4;
    exteriorDirectColor: Float4;
    exteriorDirectColorDir: Float3;

    interiorSunDir: Float3;
    personalInteriorSunDir: Float4;
    interiorAmbientColor: Float4;
    interiorDirectColor: Float4;
    interiorDirectColorDir: Float3;

    // Water settings
    oceanCloseColor: Float4;
    oceanFarColor: Float4;
    riverCloseColor: Float4;
    riverFarColor: Float4;
    waterAlphas: Float4;

    // Rendering settings
    fov: number;
    width: number;
    height: number;
    clearColor: Float4;
    doodadRenderDistance: number;
    debugPortals: boolean;
    
    addSceneObject(object: IRenderObject): void;
    removeSceneObject(object: IRenderObject): void;

    resize(width: number, height: number): void;
    switchCamera(newCamera: ICamera): void;

    submitDrawRequest(request: DrawingBatchRequest): void;
    submitOtherGraphicsRequest(request: RenderingBatchRequest): void;

    getBaseMaterial(): RenderMaterial;
    getLightingUniforms(): string;
    getLightingFunction(): string;
    getSolidColorTexture(color: Float4): ITexture;
    getUnknownTexture(): ITexture;
    getTexture(requestor: IDisposable, fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture>;
    getShaderProgram(requestor: IDisposable, key: string, vertexShader: string, fragmentShader: string, attribLocations?: IAttribLocations): IShaderProgram;
    getDataBuffers(requestor: IDisposable, key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers;
    
    getSceneBoundingBox(): AABB;
}

export interface IDataManager {
    update(deltaTime: number): void;
    getM2ModelFile(fileId: FileIdentifier): Promise<WoWModelData | null>;
    getWMOModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData | null>;
    getLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata | null>;
    getCharacterMetadata(modelId: RecordIdentifier): Promise<CharacterMetadata | null>;
    getItemMetadata(displayInfoId: RecordIdentifier): Promise<ItemMetadata | null>;
    getItemVisualMetadata(itemVisualId: RecordIdentifier): Promise<ItemVisualMetadata | null>;
    getTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata | null>;
    getTextureImageData(fileId: FileIdentifier): Promise<Blob | null>
    getBoneFileData(fileId: FileIdentifier): Promise<WoWBoneFileData | null>;
}

export interface IObjectIdentifier {
    createIdentifier(object: unknown): number | string;
}

export interface IIoCContainer {
    getRandomNumberGenerator(seed?: number | string): IPseudoRandomNumberGenerator;
    getTexturePickingStrategy(): ITexturePickingStrategy;
    getModelPickingStrategy(): IModelPickingStrategy;
    getObjectFactory(): IObjectFactory;
    getDataLoader(): IDataLoader;
    getProgressReporter(): IProgressReporter | undefined;
    getErrorHandler(): ErrorHandlerFn | undefined;
    getDataManager(): IDataManager;
    getObjectIdentifier(): IObjectIdentifier;
}

export interface IObjectFactory {
    createM2Model(fileId: FileIdentifier): IM2Model;
    createWMOModel(fileId: FileIdentifier): IWMOModel;
    createItemModel(displayId: RecordIdentifier): IItemModel;
    createCharacterModel(displayId: RecordIdentifier): ICharacterModel;
    createTextureVariantModel(fileId: FileIdentifier): ITextureVariantModel;
    createCache(): ICache;
    createItemVisual(id: RecordIdentifier): IItemVisual;
}

export type CacheKey = number | string;
export interface ICache extends IDisposable {
    update(deltaTime: number): void;
    delete(key: CacheKey): void;
    contains(key: CacheKey): boolean;
    get<TValue>(key: CacheKey): TValue|null;
    store<TValue>(key: CacheKey, value: TValue, ttl?: number): void;
}