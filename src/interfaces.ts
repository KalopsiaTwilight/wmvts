import { AABB, Float44 } from "./math";
import { CharacterMetadata, ItemMetadata, ItemVisualMetadata, TextureVariationsMetadata, LiquidTypeMetadata } from "./metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./modeldata";
import { IRenderingEngine } from "./rendering";

export interface IDisposable {
    isDisposing: boolean;
    dispose(): void;
}

export type RequestFrameFunction = (callback: Function) => void;

export type ErrorType = "dataFetching" | "dataProcessing" | "rendering";
export type ErrorHandlerFn = (type: ErrorType, error: Error) => void;
export interface IDataLoader {
    loadBoneFile(fileId: number): Promise<WoWBoneFileData|Error>
    loadTexture(fileId: number): Promise<string|Error> 
    loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata|Error>
    loadCharacterMetadata(modelId: number): Promise<CharacterMetadata|Error>;
    loadItemMetadata(displayId: number): Promise<ItemMetadata|Error>;
    loadLiquidTypeMetadata(liquidId: number): Promise<LiquidTypeMetadata|Error>;
    loadTextureVariationsMetadata(fileId: number): Promise<TextureVariationsMetadata|Error>;
    loadModelFile(fileId: number): Promise<WoWModelData|Error>
    loadWorldModelFile(fileId: number): Promise<WoWWorldModelData|Error>
    useProgressReporter(progress?: IProgressReporter): void;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
    setOperation(name: string): void;
    addFileToOperation(file: number|string): void;
    removeFileFromOperation(file: number|string): void;
    finishOperation(): void;
}

export interface ICamera extends IDisposable {
    initialize(engine: IRenderingEngine): void;
    resizeForBoundingBox(boundingBox?: AABB): void;
    update(deltaTime: number): void;
    getViewMatrix(): Float44
}