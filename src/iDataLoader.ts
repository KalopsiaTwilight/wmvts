import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "./metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./wowData";

export interface IDataLoader {
    loadModelFile(fileId: number): Promise<WoWModelData|null>
    loadBoneFile(fileId: number): Promise<WoWBoneFileData|null>
    loadTexture(fileId: number): Promise<string|null> 
    loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata|null>
    loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata|null>;
    loadCharacterMetadata(modelId: number): Promise<CharacterMetadata|null>;
    loadItemMetadata(displayId: number): Promise<ItemMetadata|null>;
    loadWorldModelFile(fileId: number): Promise<WoWWorldModelData|null>
    useProgressReporter(progress?: IProgressReporter): void;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
    setOperation(name: string): void;
    addFileIdToOperation(fileId: number): void;
    removeFileIdFromOperation(fileId: number): void;
    finishOperation(): void;
}
