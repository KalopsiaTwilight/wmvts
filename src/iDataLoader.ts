import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "./metadata";
import { LiquidTypeMetadata } from "./metadata/liquid";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./modeldata";

export interface IDataLoader {
    loadModelFile(fileId: number): Promise<WoWModelData|null>
    loadBoneFile(fileId: number): Promise<WoWBoneFileData|null>
    loadTexture(fileId: number): Promise<string|null> 
    loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata|null>
    loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata|null>;
    loadCharacterMetadata(modelId: number): Promise<CharacterMetadata|null>;
    loadItemMetadata(displayId: number): Promise<ItemMetadata|null>;
    loadLiquidTypeMetadata(liquidId: number): Promise<LiquidTypeMetadata>;
    loadWorldModelFile(fileId: number): Promise<WoWWorldModelData|null>
    useProgressReporter(progress?: IProgressReporter): void;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
    setOperation(name: string): void;
    addFileToOperation(file: number|string): void;
    removeFileFromOperation(file: number|string): void;
    finishOperation(): void;
}
