import { TextureFileData } from "@app/metadata";

export type ITexturePickingStrategy = (textures: TextureFileData[], race: number, gender: number, charClass: number) => [number, number, number] | null;

const MAX_USED_TEXTURES = 3;
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