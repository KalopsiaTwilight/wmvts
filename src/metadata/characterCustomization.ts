import { TextureFileData } from "./shared";

export interface CharacterCustomizationMetadata
{
    ModelMaterials: CharacterCustomizationMaterialsData[];
    Options: CharacterCustomizationOptionData[];
    TextureLayers: CharacterCustomizationTextureLayerData[];
    TextureSections: CharacterCustomizationTextureSectionData[];
}

export interface CharacterCustomizationMaterialsData
{
    Flags: number;
    Height: number;
    TextureType: number;
    Width: number;
}

export interface CharacterCustomizationOptionData
{
    Id: number;
    Name: string;
    OrderIndex: number;
    Choices: CharacterCustomizationOptionChoiceData[];
}

export interface CharacterCustomizationOptionChoiceData
{
    Id: number;
    Name: string;
    OrderIndex: number;
    Elements: CharacterCustomizationOptionChoiceElementData[];
}

export interface CharacterCustomizationOptionChoiceElementData
{
    Id: number;
    ChrCustItemGeoModifyId: number;
    ConditionalModelFileDataId: number;
    RelationChoiceID: number;
    RelationIndex: number;
    BoneSet?: CharacterCustomizationOptionChoiceElementBoneSetData;
    Geoset?: CharacterCustomizationOptionChoiceElementGeosetData;
    Material?: CharacterCustomizationOptionChoiceElementMaterialData;
    SkinnedModel?: CharacterCustomizationOptionChoiceElementSkinnedModelData;
}

export interface CharacterCustomizationOptionChoiceElementBoneSetData
{
    BoneFileDataId: number;
    ModelFileDataId: number;
}

export interface CharacterCustomizationOptionChoiceElementMaterialData
{
    ChrModelTextureTargetId: number;
    TextureFiles: TextureFileData[];
}
export interface CharacterCustomizationOptionChoiceElementGeosetData
{
    GeosetType: number;
    GeosetId: number;
    Modifier: number;
}
export interface CharacterCustomizationOptionChoiceElementSkinnedModelData
{
    CollectionsFileDataId: number;
    GeosetType: number;
    GeosetId: number;
    Modifier: number;
    Flags: number;
}

export interface CharacterCustomizationTextureLayerData
{
    BlendMode: number;
    ChrModelTextureTargetId: number;
    Layer: number;
    TextureSection: number;
    TextureType: number;
}

export interface CharacterCustomizationTextureSectionData
{
    Height: number;
    SectionType: number;
    Width: number;
    X: number;
    Y: number;
}