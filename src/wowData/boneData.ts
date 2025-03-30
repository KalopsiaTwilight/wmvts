import { Float44 } from "@app/index";

export interface WoWBoneFileData {
    boneIds: number[];
    boneOffsetMatrices: Float44[];
}