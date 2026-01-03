import { Float3 } from "@app/math";
import { RecordIdentifier, TransformMatrixData } from "./shared";

export interface SpellVisualKitMetadata
{
    spellVisualKitId: RecordIdentifier;
    effects: SpellVisualKitEffectData[];
}

export enum SpellVisualKitEffectType
{
    None = 0,
    Procedural = 1,
    ModelAttach = 2,
    CameraEffect = 3,
    CameraEffect2 = 4,
    SoundKit = 5,
    SpellVisualAnim = 6,
    Shadowy = 7,
    Emission = 8,
    Outline = 9,
    UnitSoundType = 10,
    Dissolve = 11,
    EdgeGlow = 12,
    Beam = 13,
    ClientScene = 14,
    Unknown1 = 15,
    Gradient = 16,
    Barrage = 17,
    Rope = 18,
    Screen = 19,
}

export interface SpellVisualKitEffectData
{
    type: SpellVisualKitEffectType;
}

export interface ModelAttachVisualKitEffectData extends SpellVisualKitEffectData
{
    offset: Float3;
    offsetVariation: Float3;
    attachmentId: number;
    yaw: number;
    pitch: number;
    roll: number;
    yawVariation: number;
    pitchVariation: number;
    rollVariation: number;
    scale: number;
    scaleVariation: number;
    startAnimId: number;
    animId: number;
    endAnimId: number;
    animKitId: number;
    flags: number;
    startDelay: number;
    spellVisualEffectName?: SpellVisualEffectNameData;
    positioner?: PositionerData;
}

export enum SpellVisualEffectNameType
 {
     FileDataID = 0,
     Item = 1,
     CreatureDisplayInfo = 2,
     Unk1 = 3,
     Unk2 = 4,
     Unk3 = 5,
     Unk4 = 6,
     Unk5 = 7,
     Unk6 = 8,
     Unk7 = 9,
     Unk8 = 10,
 }
 export interface SpellVisualEffectNameData
 {
     id: number;
     modelFileDataId: number;
     baseMissileSpeed: number;
     scale: number;
     minAllowedScale: number;
     maxAllowedScale: number;
     alpha: number;
     flags: number;
     textureFileDataId: number;
     type: SpellVisualEffectNameType;
     genericId: number;
     dissolveEffectId: number;
     modelPosition: number;
 }

 export interface PositionerData
 {
     firstStateId: number;
     flags: number;
     startLife: number;
     states: PositionerStateData[];
 }

 export interface PositionerStateData
 {
     id: number;
     nextStateId: number;
     transformMatrix?: TransformMatrixData;
     positionEntry?: PositionerStateEntryData;
     rotationEntry?: PositionerStateEntryData;
     scaleEntry?: PositionerStateEntryData;
     flags: number;
     endLife: number;
     endLifePercent: number;
 }

 export enum PositionerStateEntryType
 {
     Position = 0,
     Rotation = 1,
     Scale = 2,
 }

 export interface PositionerStateEntryData
 {
     id: number;
     paramA: number;
     paramB: number;
     srcValType: number;
     srcVal: number;
     dstValType: number;
     dstVal: number;
     type: PositionerStateEntryType;
     style: number;
     srcType: number;
     dstType: number; 
 }