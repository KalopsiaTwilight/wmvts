import { FileIdentifier, RecordIdentifier } from "./shared";

export interface ItemVisualMetadata
{
    effects?: ItemVisualEffectsData[];
}

export interface ItemVisualEffectsData
{
    attachmentId: number;
    subClassId: number;
    modelFileDataId: FileIdentifier;
    spellVisualKitId: RecordIdentifier;
    scale: number;
}