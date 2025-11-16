import { IImmediateCallbackable, ISupportCallbacks } from "@app/utils";
import { ItemMetadata } from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";

import { ICharacterModel } from "../characterModel";
import { IWorldPositionedObject } from "../interfaces";
import { IM2Model } from "../m2Model";

export type ItemModelCallbackType = "metadataLoaded" | "sectionTexturesLoaded" | "componentsLoaded" 

export interface IItemModel<Ct extends string = ItemModelCallbackType> extends IImmediateCallbackable<Ct>, ISupportCallbacks<Ct>, IWorldPositionedObject  {
    // TODO: Deprecate property access
    itemMetadata: ItemMetadata
    component1?: IM2Model
    component2?: IM2Model
    component1Texture?: ITexture;
    component2Texture?: ITexture;

    equipTo(character: ICharacterModel): void;
}