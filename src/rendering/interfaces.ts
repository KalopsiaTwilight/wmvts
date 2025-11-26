import { AABB, Float3, Float4, Float44, Frustrum, IPseudoRandomNumberGenerator } from "@app/math";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { CharacterMetadata, FileIdentifier, ItemMetadata, LiquidTypeMetadata, RecordIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { ErrorHandlerFn, IDataLoader, IDisposable, IProgressReporter } from "@app/interfaces";


import { DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, RenderMaterial } from "./graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";
import { ICharacterModel, IItemModel, IM2Model, ITextureVariantModel, IWMOModel } from "./objects";

export interface IRenderer {
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
    debugPortals: boolean;
    doodadRenderDistance: number;

    submitDrawRequest(request: DrawingBatchRequest): void;
    submitOtherGraphicsRequest(request: RenderingBatchRequest): void;

    getBaseMaterial(): RenderMaterial;
    getSolidColorTexture(color: Float4): ITexture;
    getUnknownTexture(): ITexture;
    getTexture(fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture>;
    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram;
    getDataBuffers(key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers;
}

export interface IDataManager {
    update(deltaTime: number): void;
    getM2ModelFile(fileId: FileIdentifier): Promise<WoWModelData | null>;
    getWMOModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData | null>;
    getLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata | null>;
    getCharacterMetadata(modelId: RecordIdentifier): Promise<CharacterMetadata | null>;
    getItemMetadata(displayInfoId: RecordIdentifier): Promise<ItemMetadata | null>;
    getTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata | null>;
    getTextureImageData(fileId: FileIdentifier): Promise<string | null>
    getBoneFileData(fileId: FileIdentifier): Promise<WoWBoneFileData | null>;
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

// TODO: Remove this special case used only by cameras
export interface IRenderingEngine extends IRenderer {
    containerElement?: HTMLElement;
}