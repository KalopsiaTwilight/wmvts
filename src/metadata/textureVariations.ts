import { FileIdentifier, RecordIdentifier } from "./shared";

export enum TextureVariationDisplayType {
    Item,
    Creature
}

export interface TextureVariation
{
    displayId: RecordIdentifier;
    displayType: TextureVariationDisplayType
    textureIds: FileIdentifier[];
}

export interface TextureVariationsMetadata
{
    textureVariations: TextureVariation[];
}