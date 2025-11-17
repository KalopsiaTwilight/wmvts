import { FileIdentifier } from "./shared";
import { SpellVisualKitData } from "./spellVisualKit";

export interface ItemVisualMetadata
{
    modelFileIds: FileIdentifier[];
    effects?: ItemVisualEffectsData[];
}

export interface ItemVisualEffectsData
{
    attachmentId: number;
    subClassId: number;
    modelFileDataId: FileIdentifier;
    spellVisualKit?: SpellVisualKitData;
    scale: number;
}