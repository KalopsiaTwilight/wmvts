import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "./metadata";
import { WoWBoneFileData, WoWModelData } from "./wowData";

export interface IDataLoader {
    loadModelFile(fileId: number): Promise<WoWModelData>
    loadBoneFile(fileId: number): Promise<WoWBoneFileData>
    loadTexture(fileId: number): Promise<string> 
    loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata>
    loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata>;
    loadCharacterMetadata(modelId: number): Promise<CharacterMetadata>;
    loadItemMetadata(displayId: number): Promise<ItemMetadata>;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
}
