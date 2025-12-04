import { AABB, Float3, Float4, Float44, Frustrum, IPseudoRandomNumberGenerator } from "@app/math";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { CharacterMetadata, FileIdentifier, ItemMetadata, LiquidTypeMetadata, RecordIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { ErrorHandlerFn, IDataLoader, IDisposable, IProgressReporter } from "@app/interfaces";


import { DrawingBatchRequest, IAttribLocations, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, RenderMaterial } from "./graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";
import { ICharacterModel, IItemModel, IM2Model, ITextureVariantModel, IWMOModel } from "./objects";

export type RendererEvents = "beforeDraw" | "afterDraw" | "beforeUpdate" | "afterUpdate" | "sceneBoundingBoxUpdate"

export interface IBaseRendererOptions {
    progress?: IProgressReporter,
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

    // TODO: Do these belong here?
    debugPortals: boolean;
    doodadRenderDistance: number;

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
}

export type CacheKey = number | string;
export interface ICache extends IDisposable {
    update(deltaTime: number): void;
    delete(key: CacheKey): void;
    contains(key: CacheKey): boolean;
    get<TValue>(key: CacheKey): TValue|null;
    store<TValue>(key: CacheKey, value: TValue, ttl?: number): void;
}