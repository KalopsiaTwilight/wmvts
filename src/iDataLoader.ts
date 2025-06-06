import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "./metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./wowData";

export interface IDataLoader {
    loadModelFile(fileId: number): Promise<WoWModelData>
    loadBoneFile(fileId: number): Promise<WoWBoneFileData>
    loadTexture(fileId: number): Promise<string> 
    loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata>
    loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata>;
    loadCharacterMetadata(modelId: number): Promise<CharacterMetadata>;
    loadItemMetadata(displayId: number): Promise<ItemMetadata>;
    loadWorldModelFile(fileId: number): Promise<WoWWorldModelData>
    useProgressReporter(progress?: IProgressReporter): void;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
    setOperation(name: string): void;
    addFileIdToOperation(fileId: number): void;
    removeFileIdFromOperation(fileId: number): void;
    finishOperation(): void;
}
