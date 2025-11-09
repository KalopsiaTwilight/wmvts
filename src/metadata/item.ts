import { ModelFileData, TextureFileData } from "./shared";

export interface ItemMetadata
{
    flags: ItemFeatureFlag;
    inventoryType: InventoryType;
    classId: number;
    subclassId: number;
    geosetGroup: number[];
    attachmentGeosetGroup: number[];
    geosetGroupOverride: number;
    itemVisual: number;
    componentSections: ComponentSectionData[];
    particleColor?: ItemParticleColorOverrideData;
    hideGeoset1?: ItemHideGeosetData[];
    hideGeoset2?: ItemHideGeosetData[];
    component1?: ItemComponentData;
    component2?: ItemComponentData;
}

export enum InventoryType {
    Head = 1,
    Neck = 2,
    Shoulders = 3,
    Shirt = 4,
    Chest = 5,
    Waist = 6,
    Legs = 7,
    Feet = 8,
    Wrists = 9,
    Hands = 10,
    Finger = 11,
    Trinket = 12,
    OneHand = 13,
    Shield = 14,
    Ranged = 15,
    Back = 16,
    TwoHand = 17,
    Bag = 18,
    Tabard = 19,
    Robe = 20,
    MainHand = 21,
    OffHand = 22,
    HeldInOffHand = 23,
    Projectile = 24,
    Thrown = 25,
    RangedRight = 26,
    Quiver = 27,
    Relic = 28,
    ProfessionTool = 29,
    ProfessionAccesory = 30
}

export enum ItemFeatureFlag
{
    EmblazonedTabard = 1,
    NoSheathedKit = 2,
    HidePantsAndBelt = 4,
    EmblazonedTabardRare = 8,
    EmblazonedTabardEpic = 16,
    UseSpearRangedWeaponAttachment = 32,
    InheritCharacterAnimation = 64,
    MirrorAnimasFomRightShoulderToLeft = 128,
    MirrorModelWhenEquippedonOffHand = 256,
    DisableTabardGeo = 512,
    MirrorModelWhenEquippedonMainHand = 1024,
    MirrorModelWhenSheathed = 2048,
    FlipModelWhenSheathed = 4096,
    UseAlternateWeaponTrailEndpoint = 8192,
    ForceSheathedifequippedasweapon = 16384,
    DontCloseHands = 32768,
    ForceUnsheathedforSpellCombatAnims = 65536,
    BrewmasterUnsheathe = 131072,
    HideBeltBuckle = 262144,
    NoDefaultBowstring = 524288,
    UnknownEffect1 = 1048576,
    UnknownEffect2 = 2097152,
    UnknownEffect3 = 4194304,
    UnknownEffect4 = 8388608,
    UnknownEffect5 = 16777216,
    UnknownEffect6 = 33554432,
    UnknownEffect7 = 67108864,
    UnknownEffect8 = 134217728
}

export interface ComponentSectionData
{
    section: number;
    textures: TextureFileData[];
}

export interface ItemComponentData
{
    modelFiles: ModelFileData[];
    textureFiles: TextureFileData[];
}

export interface ItemHideGeosetData
{
    raceId: number;
    geosetGroup: number;
    raceBitSelection?: number;
}

export interface ItemParticleColorOverrideData
{
    id: number;
    start: number[];
    mid: number[];
    end: number[];
}