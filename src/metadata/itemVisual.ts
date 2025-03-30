import { SpellVisualKitData } from "./spellVisualKit";

export interface ItemVisualMetadata
{
    ModelFileIds: number[];
    Effects?: ItemVisualEffectsData[];
}

export interface ItemVisualEffectsData
{
    AttachmentId: number;
    SubClassId: number;
    ModelFileDataId: number;
    SpellVisualKit?: SpellVisualKitData;
    Scale: number;
}