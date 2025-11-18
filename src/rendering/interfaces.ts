import { AABB, Float3, Float4, Float44, Frustrum, IPseudoRandomNumberGenerator } from "@app/math";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { CharacterMetadata, FileIdentifier, ItemMetadata, LiquidTypeMetadata, RecordIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { ICallbackManager, IImmediateCallbackable } from "@app/utils";


import { DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, RenderMaterial } from "./graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";
import { ICharacterModel, IItemModel, IM2Model, ITextureVariantModel, IWMOModel } from "./objects";

export interface IRenderingEngine {
    graphics: IGraphics;
    containerElement?: HTMLElement;
    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;
    // various
    timeElapsed: number;
    debugPortals: boolean;
    doodadRenderDistance: number;

    // Rendering methods
    processNewBoundingBox(boundingBox: AABB): void;
    submitDrawRequest(request: DrawingBatchRequest): void;
    submitOtherGraphicsRequest(request: RenderingBatchRequest): void;

    // Managing webgl resources
    getTexture(fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture>;
    getSolidColorTexture(color: Float4): ITexture;
    getUnknownTexture(): ITexture;
    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram;
    getDataBuffers(key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers;

    // Caching/unifying data management
    getBaseMaterial(): RenderMaterial;
    getM2ModelFile(fileId: FileIdentifier): Promise<WoWModelData | null>;
    getWMOModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData | null>;
    getLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata | null>;
    getCharacterMetadata(modelId: RecordIdentifier): Promise<CharacterMetadata | null>;
    getItemMetadata(displayInfoId: RecordIdentifier): Promise<ItemMetadata | null>;
    getTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata | null>;
    getBoneFileData(fileId: FileIdentifier): Promise<WoWBoneFileData | null>;

    // factory / DI
    getCallbackManager<TKeys extends string, T extends IImmediateCallbackable<TKeys>>(obj: T): ICallbackManager<TKeys, T>;
    getRandomNumberGenerator(seed?: number | string): IPseudoRandomNumberGenerator;
    texturePickingStrategy: ITexturePickingStrategy;
    modelPickingStrategy: IModelPickingStrategy;
    createM2Model(fileId: FileIdentifier): IM2Model;
    createWMOModel(fileId: FileIdentifier): IWMOModel;
    createItemModel(displayId: RecordIdentifier): IItemModel;
    createCharacterModel(displayId: RecordIdentifier): ICharacterModel;
    createTextureVariantModel(fileId: FileIdentifier): ITextureVariantModel;
}