import { ItemVisualMetadata, RecordIdentifier } from "@app/metadata";
import { Float3, Float44 } from "@app/math";
import { WoWAttachmentData } from "@app/modeldata";

import { IItemModel } from "../itemModel";
import { IWorldPositionedObject } from "../interfaces";
import { IM2Model } from "../m2Model";

export type ItemVisualEvents = "metadataLoaded" | "effectsLoaded" 

export interface IItemVisual<ParentEvent extends string = never> extends IWorldPositionedObject<ParentEvent | ItemVisualEvents>  {
    // TODO: Deprecate property access
    itemVisualId: RecordIdentifier;
    itemVisualMetadata: ItemVisualMetadata
    attachedItemModel: IItemModel;

    attachTo(item: IItemModel): void;
    loadItemVisualId(itemVisualId: RecordIdentifier): void;
}