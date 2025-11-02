import { TextureFileData } from "./shared";
export interface CharacterMetadata
{
    fileDataId: number;
    flags: number;
    raceId: number;
    genderId: number;
    chrModelId: number;
    characterCustomizationData: CharacterCustomizationMetadata;
}

export interface CharacterCustomizationMetadata
{
    modelMaterials: CharacterCustomizationMaterialsData[];
    options: CharacterCustomizationOptionData[];
    textureLayers: CharacterCustomizationTextureLayerData[];
    textureSections: CharacterCustomizationTextureSectionData[];
}

export interface CharacterCustomizationMaterialsData
{
    flags: number;
    height: number;
    textureType: number;
    width: number;
}

export interface CharacterCustomizationOptionData
{
    id: number;
    name: string;
    orderIndex: number;
    choices: CharacterCustomizationOptionChoiceData[];
}

export interface CharacterCustomizationOptionChoiceData
{
    id: number;
    name: string;
    orderIndex: number;
    elements: CharacterCustomizationOptionChoiceElementData[];
}

export interface CharacterCustomizationOptionChoiceElementData
{
    id: number;
    chrCustItemGeoModifyId: number;
    conditionalModelFileDataId: number;
    relationChoiceID: number;
    relationIndex: number;
    boneSet?: CharacterCustomizationOptionChoiceElementBoneSetData;
    geoset?: CharacterCustomizationOptionChoiceElementGeosetData;
    material?: CharacterCustomizationOptionChoiceElementMaterialData;
    skinnedModel?: CharacterCustomizationOptionChoiceElementSkinnedModelData;
}

export interface CharacterCustomizationOptionChoiceElementBoneSetData
{
    boneFileDataId: number;
    modelFileDataId: number;
}

export interface CharacterCustomizationOptionChoiceElementMaterialData
{
    chrModelTextureTargetId: number;
    textureFiles: TextureFileData[];
}
export interface CharacterCustomizationOptionChoiceElementGeosetData
{
    geosetType: number;
    geosetId: number;
    modifier: number;
}
export interface CharacterCustomizationOptionChoiceElementSkinnedModelData
{
    collectionsFileDataId: number;
    geosetType: number;
    geosetId: number;
    modifier: number;
    flags: number;
}

export interface CharacterCustomizationTextureLayerData
{
    blendMode: number;
    chrModelTextureTargetId: number;
    layer: number;
    textureSection: number;
    textureType: number;
}

export interface CharacterCustomizationTextureSectionData
{
    height: number;
    sectionType: number;
    width: number;
    x: number;
    y: number;
}