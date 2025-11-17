import { FileIdentifier, RecordIdentifier, TextureFileData } from "./shared";
export interface CharacterMetadata
{
    fileDataId: FileIdentifier;
    flags: number;
    raceId: RecordIdentifier;
    genderId: number;
    chrModelId: RecordIdentifier;
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
    id: RecordIdentifier;
    name: string;
    orderIndex: number;
    choices: CharacterCustomizationChoiceData[];
}

export interface CharacterCustomizationChoiceData
{
    id: RecordIdentifier;
    name: string;
    orderIndex: number;
    elements: CharacterCustomizationElementData[];
}

export interface CharacterCustomizationElementData
{
    id: RecordIdentifier;
    conditionalModelFileDataId: FileIdentifier;
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
    boneFileDataId: FileIdentifier;
    modelFileDataId: FileIdentifier;
}

export interface CharacterCustomizationElementMaterialData
{
    chrModelTextureTargetId: RecordIdentifier;
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
    collectionsFileDataId: FileIdentifier;
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