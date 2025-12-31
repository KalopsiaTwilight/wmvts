import { Float44, Float3 } from "@app/math";
import { WoWAttachmentData, WoWModelData } from "@app/modeldata";
import { FileIdentifier } from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";

import { IWorldPositionedObject } from "../interfaces";
import { AnimationState } from "./animatedValue";

export interface IBoneData {
    hasUpdatedThisTick: boolean;
    isOverriden: boolean;
    crc: number;
    boneOffsetMatrix: Float44;
    positionMatrix: Float44;
    animationState?: AnimationState
}

export interface ISkinnedObject {
    boneData: IBoneData[];
    
    getBone(id: number): IBoneData;
    getBones(): IBoneData[];
    getBoneById(id: number): IBoneData;
}

export type ParticleColorOverride = [Float3, Float3, Float3] | null;
export type ParticleColorOverrides = [ ParticleColorOverride, ParticleColorOverride, ParticleColorOverride];

export type M2ModelEvents = "modelDataLoaded" | "texturesLoaded"

export interface IM2Model<TParentEvent extends string = never> extends IWorldPositionedObject<TParentEvent | M2ModelEvents>, ISkinnedObject
{
    fileId: FileIdentifier;
    // TODO: Deprecate direct property access
    modelData: WoWModelData

    attachTo(model: ISkinnedObject): void;
    addAttachedModel(model: IWorldPositionedObject, attachment: WoWAttachmentData): void;
    setParticleColorOverride(overrides: ParticleColorOverrides): void;

    getAnimations(): number[];
    useAnimation(id: number): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
    setAnimationSpeed(speed: number): void;

    getAttachments(): WoWAttachmentData[];
    getAttachment(id: number): WoWAttachmentData;

    getBone(id: number): IBoneData;
    getBones(): IBoneData[];
    getBoneById(id: number): IBoneData;

    swapTexture(index: number, texture: ITexture): void;
    swapTextureType(type: number, texture: ITexture): void;

    toggleGeoset(geosetId: number, show: boolean): void;
    toggleGeosets(start: number, end: number, show: boolean): void;

    loadBoneFile(id: FileIdentifier): void;
    loadFileId(id: FileIdentifier): void;
}