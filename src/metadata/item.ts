import { ModelFileData, TextureFileData } from "./shared";

export interface ItemMetadata
{
    Flags: number;
    InventoryType: number;
    ClassId: number;
    SubclassId: number;
    GeosetGroup: number[];
    AttachmentGeosetGroup: number[];
    GeosetGroupOverride: number;
    ItemVisual: number;
    ComponentSections: ComponentSectionData[];
    ParticleColor?: ItemParticleColorOverrideData;
    HideGeoset1?: ItemHideGeosetData[];
    HideGeoset2?: ItemHideGeosetData[];
    Component1?: ItemComponentData;
    Component2?: ItemComponentData;
}

export interface ComponentSectionData
{
    Section: number;
    Textures: TextureFileData[];
}

export interface ItemComponentData
{
    ModelFiles: ModelFileData[];
    TextureFiles: TextureFileData[];
}

export interface ItemHideGeosetData
{
    RaceId: number;
    GeosetGroup: number;
    RaceBitSelection?: number;
}

export interface ItemParticleColorOverrideData
{
    Id: number;
    Start: number[];
    Mid: number[];
    End: number[];
}