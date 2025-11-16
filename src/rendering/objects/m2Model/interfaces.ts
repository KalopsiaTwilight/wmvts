import { Float44, Float3 } from "@app/math";
import { IImmediateCallbackable, ISupportCallbacks } from "@app/utils";
import { ITexture, IWorldPositionedObject } from "@app/rendering";
import { WoWModelData } from "@app/modeldata";

export interface IBoneData {
    hasUpdatedThisTick: boolean;
    isOverriden: boolean;
    crc: number;
    boneOffsetMatrix: Float44;
    positionMatrix: Float44;
}

export interface ISkinnedObject {
    boneData: IBoneData[];
}

export type ParticleColorOverride = [Float3, Float3, Float3] | null;
export type ParticleColorOverrides = [ ParticleColorOverride, ParticleColorOverride, ParticleColorOverride];

export type M2ModelCallbackType = "modelDataLoaded" | "texturesLoaded" | "texturesLoadStart"

export interface IM2Model<Ct extends string = M2ModelCallbackType> 
extends IWorldPositionedObject, ISkinnedObject, ISupportCallbacks<Ct>, IImmediateCallbackable<Ct> 
{
    // TODO: Deprecate direct property access
    modelData: WoWModelData

    attachTo(model: ISkinnedObject): void;
    setParticleColorOverride(overrides: ParticleColorOverrides): void;

    getAnimations(): number[];
    useAnimation(id: number): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
    setAnimationSpeed(speed: number): void;

    // TODO: Deprecate
    setTexture(index: number, fileId: number): void;
    swapTexture(index: number, texture: ITexture): void;
    swapTextureType(type: number, texture: ITexture): void;

    toggleGeoset(geosetId: number, show: boolean): void;
    toggleGeosets(start: number, end: number, show: boolean): void;

    loadBoneFile(id: number): void;
}