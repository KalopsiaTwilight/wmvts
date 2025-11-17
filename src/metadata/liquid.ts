import { Float3 } from "@app/math";

import { FileIdentifier, RecordIdentifier } from "./shared";

export interface LiquidTypeMetadata {
    id: RecordIdentifier,
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
    id: RecordIdentifier,
    fileDataId: FileIdentifier,
    orderIndex: number,
    type: number
}