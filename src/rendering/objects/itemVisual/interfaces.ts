import { ItemVisualMetadata, RecordIdentifier } from "@app/metadata";

import { IItemModel } from "../itemModel";
import { IWorldPositionedObject } from "../interfaces";
export type ItemVisualEvents = "metadataLoaded" | "effectsLoaded" 

export interface IItemVisual<ParentEvent extends string = never> extends IWorldPositionedObject<ParentEvent | ItemVisualEvents>  {
    // TODO: Deprecate property access
    itemVisualId: RecordIdentifier;
    itemVisualMetadata: ItemVisualMetadata
    attachedItemModel: IItemModel;

    attachTo(item: IItemModel): void;
    loadItemVisualId(itemVisualId: RecordIdentifier): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
}