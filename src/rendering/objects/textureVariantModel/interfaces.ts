import { IM2Model } from "../m2Model";

export type TextureVariantModelEvents  = "textureVariationsLoaded";

export interface ITextureVariantModel<TParentEvent extends string = never> extends IM2Model<TParentEvent | TextureVariantModelEvents> {
    useTextureVariation(index: number): void;
}