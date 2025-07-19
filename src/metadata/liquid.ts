import { Float3 } from "@app/rendering";

export interface LiquidTypeMetadata {
    id: number,
    flags: number
    name: string,
    color0: Float3,
    color1: Float3;
    materialId: number;
    float0: number;
    float1: number;
    namedTextures: [string, string, string, string, string, string]
    textures: LiquidTypeTexture[]
}

export interface LiquidTypeTexture {
    id: number,
    fileDataId: number,
    orderIndex: number,
    type: number
}