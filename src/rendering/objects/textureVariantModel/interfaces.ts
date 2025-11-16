import { IM2Model, M2ModelCallbackType } from "../m2Model";

export type TextureVariantModelCallbackType  = "textureVariationsLoaded" | M2ModelCallbackType;

export interface ITextureVariantModel extends IM2Model<TextureVariantModelCallbackType> {
    useTextureVariation(index: number): void;
}