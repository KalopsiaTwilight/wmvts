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
    choices: CharacterCustomizationChoiceData[];
}

export interface CharacterCustomizationChoiceData
{
    id: number;
    name: string;
    orderIndex: number;
    elements: CharacterCustomizationElementData[];
}

export interface CharacterCustomizationElementData
{
    id: number;
    conditionalModelFileDataId: number;
    relationChoiceID: number;
    relationIndex: number;
    boneSet?: CharacterCustomizationBoneSetData;
    geoset?: CharacterCustomizationGeosetData;
    material?: CharacterCustomizationElementMaterialData;
    skinnedModel?: CharacterCustomizationSkinnedModelData;
    custItemGeoModify?: CharacterCustomizationtItemGeoModifyData;
}

export interface CharacterCustomizationBoneSetData
{
    boneFileDataId: number;
    modelFileDataId: number;
}

export interface CharacterCustomizationElementMaterialData
{
    chrModelTextureTargetId: number;
    textureFiles: TextureFileData[];
}
export interface CharacterCustomizationGeosetData
{
    geosetType: number;
    geosetId: number;
    modifier: number;
}
export interface CharacterCustomizationSkinnedModelData
{
    collectionsFileDataId: number;
    geosetType: number;
    geosetId: number;
    modifier: number;
    flags: number;
}

export interface CharacterCustomizationtItemGeoModifyData
{
    geosetType: number;
    original: number;
    override: number;
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