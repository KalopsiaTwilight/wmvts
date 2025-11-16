import { Float44 } from "@app/math";

export interface WoWBoneFileData {
    boneIds: number[];
    boneOffsetMatrices: Float44[];
}