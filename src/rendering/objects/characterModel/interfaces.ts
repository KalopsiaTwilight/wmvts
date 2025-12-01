import { RecordIdentifier } from "@app/metadata";
import { IM2Model } from "../m2Model";

export type CharacterModelEvents = "characterMetadataLoaded" | "skinTexturesLoaded"
export interface ICharacterModel<TParentEvent extends string = never> extends IM2Model<TParentEvent | CharacterModelEvents> {
    modelId: RecordIdentifier;
    race: number;
    gender: number;
    class: number;

    setCustomizationChoice(optionId: number, choiceId: number): void;
    equipItem(slot: EquipmentSlot, displayId1: number, displayId2?: number): void;
    unequipItem(slot: EquipmentSlot): void;
}

export enum EquipmentSlot {
    Start        = 0,
    Head         = 0,
    Neck         = 1,
    Shoulders    = 2,
    Body         = 3,
    Shirt        = 4,
    Waist        = 5,
    Legs         = 6,
    Feet         = 7,
    Wrists       = 8,
    Hands        = 9,
    Finger1      = 10,
    Finger2      = 11,
    Trinket1     = 12,
    Trinket2     = 13,
    Back         = 14,
    MainHand     = 15,
    OffHand      = 16,
    Ranged       = 17,
    Tabard       = 18,
    End          = 19
}

export enum GeoSet 
{
    Hair = 0,
    Facial = 1,
    Facial2 = 2,
    Facial3 = 3,
    Wrists = 4,
    Boots = 5,
    Shirt = 6,
    Ears = 7, 
    Sleeves = 8,
    Legcuffs = 9,
    ShirtDoublet = 10,
    PantDoublet = 11,
    Tabard = 12,
    LowerBody = 13,
    Loincloth = 14,
    Cloak = 15,
    FacialJewelry = 16,
    EyeEffects = 17,
    Belt = 18,
    SkinTail = 19,
    Feet = 20,
    Head = 21,
    Torso = 22,
    HandAttachments = 23,
    HeadAttachments = 24,
    Facewear = 25,
    Shoulders = 26,
    Helmet = 27,
    ArmUpper = 28,
    ArmReplace = 29,
    LegsReplace = 30,
    FeetReplace = 31,
    HeadSwapGeoset = 32,
    Eyes = 33,
    Eyebrows = 34,
    Piercings = 35,
    Necklaces = 36,
    Headdress = 37,
    Tail = 38,
    MiscAccesory = 39,
    MiscFeature = 40,
    Noses = 41,
    HairDecoration = 42,
    HornDecoration = 43
}

export enum TextureSection {
    UpperArm = 0,
    LowerArm = 1,
    Hand = 2,
    UpperTorso = 3,
    LowerTorso = 4,
    UpperLeg = 5,
    LowerLeg = 6,
    Foot = 7,
    Accessory = 8
}