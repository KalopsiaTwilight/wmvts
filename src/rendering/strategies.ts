import { ModelFileData, TextureFileData } from "@app/metadata";

export type ITexturePickingStrategy = (textures: TextureFileData[], race: number, gender: number, charClass: number) => [number, number, number] | null;

const MAX_USED_TEXTURES = 3;

// TODO: Make sure to pick some texture if none match
export const defaultTexturePickingStrategy: ITexturePickingStrategy = (textures, race, gender, charClass) => {
    if (!textures) {
        return null;
    }

    const prefferedOrder = new Array(8 * MAX_USED_TEXTURES);
    for(let i = 0; i < textures.length; i++) {
        let textureData = textures[i];
        if (textureData.genderId !== gender && textureData.genderId < 2) {
            continue;
        }
        if (textureData.classId !== charClass && textureData.classId > 0) {
            continue;
        }
        if (textureData.raceId !== race && textureData.raceId > 0) {
            continue;
        }
        const genderMatch = textureData.genderId === gender ? 1 : 0;
        const raceMatch = textureData.raceId === race ? 1 : 0;
        const classMatch = textureData.classId === race ? 1 : 0;
        const textureIndex = MAX_USED_TEXTURES * (7 - 4 * raceMatch + 2 * classMatch + genderMatch) + textureData.usageType
        prefferedOrder[textureIndex] = textureData.fileDataId;
    }

    for(let i = 0; i < prefferedOrder.length; i += MAX_USED_TEXTURES) {
        if (prefferedOrder[i]) {
            return [prefferedOrder[i], prefferedOrder[i+1], prefferedOrder[i+2]]
        }
    }

    // No match
    return [0, 0, 0];
}

export type IModelPickingStrategy = (models: ModelFileData[], pos :number, race: number, gender: number, charClass: number) => number | null;

// TODO: Make sure to pick some model if none match
export const defaultModelPickingStrategy: IModelPickingStrategy = (models, pos, race, gender, charClass) => {
    if (!models) {
        return null;
    }

    const prefferedOrder = new Array(16);
    for(let i = 0; i < models.length; i++) {
        let modelData = models[i];
        if (modelData.genderId !== gender && modelData.genderId < 2) {
            continue;
        }
        if (modelData.classId !== charClass && modelData.classId > 0) {
            continue;
        }
        if (modelData.raceId !== race && modelData.raceId > 0) {
            continue;
        }
        if (pos !== -1 && modelData.positionIndex !== pos) {
            continue;
        }

        const genderMatch = modelData.genderId === gender ? 1 : 0;
        const raceMatch = modelData.raceId === race ? 1 : 0;
        const classMatch = modelData.classId === race ? 1 : 0;
        const posMatch = modelData.positionIndex === pos ? 1 : 0;
        const modelIndex = 15 - (8 * posMatch - 4 * raceMatch + 2 * classMatch + genderMatch)
        prefferedOrder[modelIndex] = modelData.fileDataId;
    }

    for(let i = 0; i < prefferedOrder.length; i++) {
        if (prefferedOrder[i]) {
            return prefferedOrder[i];
        }
    }

    // No match
    return 0;
}