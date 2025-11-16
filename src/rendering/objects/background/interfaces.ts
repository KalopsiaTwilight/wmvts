import { Float2, Float4 } from "@app/math";
import { ITexture, ITextureOptions } from "@app/rendering/graphics";

import { IRenderObject } from "../interfaces";

export interface IBackground extends IRenderObject {
    setOffset(offset: Float2): void;
    setScale(scale: Float2): void;
    setTransform(transform: Float4): void;
    useColor(color: Float4): void;
    useTexture(texture: ITexture): void;
    useImage(url: string, opts?: ITextureOptions): void;
}