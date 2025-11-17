export type FileIdentifier = number | string;
export type RecordIdentifier = number;

export interface TextureFileData
{
    fileDataId: FileIdentifier;
    classId: number;
    genderId: number;
    raceId: number;
    usageType: number;
}

export interface ModelFileData
{
    fileDataId: FileIdentifier;
    classId: number;
    genderId: number;
    raceId: number;
    positionIndex: number;
}