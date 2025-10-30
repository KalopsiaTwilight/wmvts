export enum TextureVariationDisplayType {
    Item,
    Creature
}

export interface TextureVariation
{
    displayId: number;
    displayType: TextureVariationDisplayType
    textureIds: number[];
}

export interface TextureVariationsMetadata
{
    textureVariations: TextureVariation[];
}