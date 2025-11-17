import { AABB, Float3, Float4, Float44, Frustrum, IPseudoRandomNumberGenerator } from "@app/math";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { CharacterMetadata, FileIdentifier, ItemMetadata, LiquidTypeMetadata, RecordIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { ICallbackManager, IImmediateCallbackable } from "@app/utils";


import { DrawingBatchRequest, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest, RenderMaterial } from "./graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./strategies";

export interface IRenderingEngine {
    graphics: IGraphics;

    // various
    timeElapsed: number;
    debugPortals: boolean;
    doodadRenderDistance: number;

    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;

    containerElement?: HTMLElement;

    processNewBoundingBox(boundingBox: AABB): void;

    texturePickingStrategy: ITexturePickingStrategy;
    modelPickingStrategy: IModelPickingStrategy;

    submitDrawRequest(request: DrawingBatchRequest): void;
    submitOtherGraphicsRequest(request: RenderingBatchRequest): void;

    getTexture(fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture>;
    getSolidColorTexture(color: Float4): ITexture;
    getUnknownTexture(): ITexture;
    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram;
    getDataBuffers(key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers;

    getM2ModelFile(fileId: FileIdentifier): Promise<WoWModelData | null>;
    getWMOModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData | null>;
    getLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata | null>;
    getCharacterMetadata(modelId: RecordIdentifier): Promise<CharacterMetadata | null>;
    getItemMetadata(displayInfoId: RecordIdentifier): Promise<ItemMetadata | null>;
    getTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata | null>;
    getBoneFileData(fileId: FileIdentifier): Promise<WoWBoneFileData | null>;
    
    addEngineMaterialParams(material: RenderMaterial): void;

    getRandomNumberGenerator(seed?: number | string): IPseudoRandomNumberGenerator;
    getCallbackManager<TKeys extends string, T extends IImmediateCallbackable<TKeys>>(obj: T): ICallbackManager<TKeys, T>;
}