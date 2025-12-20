import { ItemMetadata, RecordIdentifier } from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";

import { ICharacterModel } from "../characterModel";
import { IWorldPositionedObject } from "../interfaces";
import { IM2Model } from "../m2Model";

export type ItemModelEvents = "metadataLoaded" | "sectionTexturesLoaded" | "componentsLoaded" 

export interface IItemModel<ParentEvent extends string = never> extends IWorldPositionedObject<ParentEvent | ItemModelEvents>  {
    // TODO: Deprecate property access
    itemMetadata: ItemMetadata
    component1?: IM2Model
    component2?: IM2Model
    component1Texture?: ITexture;
    component2Texture?: ITexture;
    sectionTextures: { [key: number]: [ITexture, ITexture, ITexture] };

    character?: ICharacterModel;

    equipTo(character: ICharacterModel): void;
    loadDisplayInfoId(displayInfoId: RecordIdentifier): void;
    setItemVisual(itemVisualId: RecordIdentifier): void;

    classId: number;
    subClassId: number;
    inventoryType: number;
}