import { SpellVisualKitMetadata, RecordIdentifier } from "@app/metadata";

import { IWorldPositionedObject } from "../interfaces";
import { IM2Model } from "../m2Model";
export type SpellVisualKitEvents = "metadataLoaded" | "effectsLoaded" 

export interface ISpellVisualKit<ParentEvent extends string = never> extends IWorldPositionedObject<ParentEvent | SpellVisualKitEvents>  {
    // TODO: Deprecate property access
    spellVisualKitId: RecordIdentifier;
    metadata: SpellVisualKitMetadata

    attachTo(model: IM2Model): void;
    loadSpellVisualKitId(id: RecordIdentifier): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
}