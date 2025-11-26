import { IImmediateCallbackable, ISupportCallbacks } from "@app/utils";
import { ItemMetadata, RecordIdentifier } from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";

import { ICharacterModel } from "../characterModel";
import { IWorldPositionedObject } from "../interfaces";
import { IM2Model } from "../m2Model";

export type ItemModelCallbackType = "metadataLoaded" | "sectionTexturesLoaded" | "componentsLoaded" 

export interface IItemModel<Ct extends string = ItemModelCallbackType> extends 
     ISupportCallbacks<Ct>, IImmediateCallbackable<Ct>, IWorldPositionedObject  {
    // TODO: Deprecate property access
    itemMetadata: ItemMetadata
    component1?: IM2Model
    component2?: IM2Model
    component1Texture?: ITexture;
    component2Texture?: ITexture;
    sectionTextures: { [key: number]: [ITexture, ITexture, ITexture] };

    equipTo<TParentEvent extends string>(character: ICharacterModel<TParentEvent>): void;
    loadDisplayInfoId(displayInfoId: RecordIdentifier): void;
}