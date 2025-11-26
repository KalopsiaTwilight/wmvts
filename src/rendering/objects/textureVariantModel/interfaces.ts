import { IM2Model, M2ModelEvents } from "../m2Model";

export type TextureVariantModelEvents  = "textureVariationsLoaded";

export interface ITextureVariantModel<TParentEvent extends string = TextureVariantModelEvents> extends IM2Model<TParentEvent | TextureVariantModelEvents> {
    useTextureVariation(index: number): void;
}