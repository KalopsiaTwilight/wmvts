import { inflate } from "pako";

import { 
    WoWModelData, WoWAnimationData, WoWVertexData, WoWLocalTrackData, WoWTrackData, WoWBoneData, 
    WoWSubmeshData, WoWTextureUnitData, WoWMaterialData, WoWTextureData, WoWTextureTransformData, 
    WoWAttachmentData, WoWColorData, WoWTextureWeightData, WoWParticleEmitterData, WoWExtendedParticleData, 
    WoWRibbonEmiterData, WoWAnimatedValue, WoWBoneFileData 
} from "@app/modeldata";
import { BinaryReader } from "@app/utils";

import { readAABB, readArray, readFloat2, readFloat3, readFloat4, readFloat44, readQuaternion } from "./compressedReading";

export function parseCM2File(data: ArrayBuffer) {
    let reader = new BinaryReader(data);

    const magic = reader.readUInt32LE();
    if (magic != 0x434D3246) {
        throw new Error("Encountered wrong magic number. File data is probably not CM2 data?");
    }

    const version = reader.readUInt32LE();
    if (version != 1000) {
        throw new Error("Incompatible version encountered in CM2. Supported versions are: 1000. Encountered: " + version);
    }

    const flags = reader.readUInt32LE();
    const vertexPos = reader.readUInt32LE();
    const skinTrianglesPos = reader.readUInt32LE();
    const subMeshesPos = reader.readUInt32LE();
    const bonesPos = reader.readUInt32LE();
    const boneCombosPos = reader.readUInt32LE();
    const boneLookupPos = reader.readUInt32LE();
    const textureUnitsPos = reader.readUInt32LE();
    const materialsPos = reader.readUInt32LE();
    const texturesPos = reader.readUInt32LE();
    const textureCombosPos = reader.readUInt32LE();
    const textureLookupPos = reader.readUInt32LE();
    const globalLoopsPos = reader.readUInt32LE();
    const animationsPos = reader.readUInt32LE();
    const animationLookupPos = reader.readUInt32LE();
    const textureWeightsPos = reader.readUInt32LE();
    const textureWeightCombosPos = reader.readUInt32LE();
    const textureTransformsPos = reader.readUInt32LE();
    const textureTransformCombosPos = reader.readUInt32LE();
    const attachmentsPos = reader.readUInt32LE();
    const attachmentLookupPos = reader.readUInt32LE();
    const colorsPos = reader.readUInt32LE();
    const particleEmittersPos = reader.readUInt32LE();
    const particleEmitterGeosetsPos = reader.readUInt32LE();
    const particleDataPos = reader.readUInt32LE();
    const ribbonEmitterPos = reader.readUInt32LE();
    const dataEndPos = reader.readUInt32LE();

    let inflatedData: Uint8Array;
    const remainingBytes = reader.readRemainingBytes();
    try {
        inflatedData = inflate(remainingBytes)
    } catch (err) {
        throw new Error("Error while inflating zlib compressed data: " + err);
    }
    
    if (inflatedData.length < dataEndPos) {
        throw new Error("Compressed data appears to be smaller than expected? Received: " + inflatedData.length + " expected: " + dataEndPos);
    }

    reader = new BinaryReader(inflatedData.buffer);

    reader.seek(animationLookupPos);
    const animationLookup = readArray(reader, (r) => r.readUInt16LE());
    reader.seek(animationsPos);
    const animations = readArray(reader, readAnimation);
    reader.seek(attachmentLookupPos);
    const attachmentIdLookup = readArray(reader, (r) => r.readInt16LE());
    reader.seek(attachmentsPos);
    const attachments = readArray(reader, readAttachment);
    reader.seek(boneCombosPos);
    const boneCombos = readArray(reader, (r) => r.readInt16LE());
    reader.seek(boneLookupPos);
    const boneIdLookup = readArray(reader, (r) => r.readInt16LE());
    reader.seek(bonesPos);
    const bones = readArray(reader, readBone);
    reader.seek(colorsPos);
    const colors = readArray(reader, readColor);
    reader.seek(globalLoopsPos);
    const globalLoops =  readArray(reader, (r) => r.readUInt32LE());
    reader.seek(materialsPos);
    const materials = readArray(reader, readMaterial);
    reader.seek(particleEmitterGeosetsPos);
    const particleEmitterGeosets =  readArray(reader, (r) => r.readInt16LE());
    reader.seek(particleEmittersPos);
    const particleEmitters = readArray(reader, readParticleEmitter)
    reader.seek(particleDataPos);
    const particles = readArray(reader, readParticle)
    reader.seek(ribbonEmitterPos);
    const ribbonEmitters = readArray(reader, readRibbonEmitter)
    reader.seek(skinTrianglesPos);
    const skinTriangles =  readArray(reader, (r) => r.readUInt16LE());
    reader.seek(subMeshesPos);
    const submeshes = readArray(reader, readSubmesh);
    reader.seek(textureCombosPos);
    const textureCombos =  readArray(reader, (r) => r.readInt16LE());
    reader.seek(textureLookupPos);
    const textureIdLookup =  readArray(reader, (r) => r.readInt16LE());
    reader.seek(texturesPos);
    const textures = readArray(reader, readTexture);
    reader.seek(textureTransformCombosPos);
    const textureTransformCombos =  readArray(reader, (r) => r.readInt16LE());
    reader.seek(textureTransformsPos);
    const textureTransforms = readArray(reader, readTextureTransform);
    reader.seek(textureUnitsPos);
    const textureUnits = readArray(reader, readTextureUnit);
    reader.seek(textureWeightCombosPos);
    const textureWeightCombos =  readArray(reader, (r) => r.readInt16LE());
    reader.seek(textureWeightsPos);
    const textureWeights = readArray(reader, readTextureWeight)
    reader.seek(vertexPos);
    const vertices = readArray(reader, readVertex);

    let modelData: WoWModelData = {
        flags,
        animationLookup,
        animations,
        attachmentIdLookup,
        attachments,
        boneCombos,
        boneIdLookup,
        bones,
        colors,
        globalLoops,
        materials,
        particleEmitterGeosets,
        particleEmitters,
        particles,
        ribbonEmitters,
        skinTriangles,
        submeshes,
        textureCombos,
        textureIdLookup,
        textures,
        textureTransformCombos,
        textureTransforms,
        textureUnits,
        textureWeightCombos,
        textureWeights,
        vertices
    }

    return modelData;
}

export function parseCM2BoneFile(data: ArrayBuffer) {
    let inflatedData: Uint8Array;
    try {
        inflatedData = inflate(data)
    } catch (err) {
        throw new Error("Error while inflating zlib compressed data: " + err);
    }

    var reader = new BinaryReader(inflatedData.buffer);
    var boneIds = readArray(reader, (r) => r.readUInt16LE());
    var boneOffsetMatrices = readArray(reader, readFloat44);

    const boneData: WoWBoneFileData = {
        boneIds,
        boneOffsetMatrices
    }
    return boneData;
}

function readLocalTrack<T>(reader: BinaryReader, deserializeFn: (binaryReader: BinaryReader, index?: number) => T) {
    const track: WoWLocalTrackData<T> = {
        keys: readArray(reader, (r) => r.readInt16LE()),
        values: readArray(reader, deserializeFn)
    }
    return track;
}

function readTrack<T>(reader: BinaryReader, deserializeFn: (binaryReader: BinaryReader, index?: number) => T) {
    const track: WoWTrackData<T> = {
        interpolationType: reader.readInt16LE(),
        globalSequence: reader.readInt16LE(),
        animations: readArray(reader, (r) => readAnimatedValue(r, deserializeFn))
    }
    return track;
}

function readAnimatedValue<T>(reader: BinaryReader, deserializeFn: (binaryReader: BinaryReader, index?: number) => T) {
    const animValue: WoWAnimatedValue<T> = {
        timeStamps: readArray(reader, (r) => r.readInt32LE()),
        values: readArray(reader, deserializeFn)
    }
    return animValue;
}

function readVertex(reader: BinaryReader) {
    const vertex: WoWVertexData = {
        position: readFloat3(reader),
        normal: readFloat3(reader),
        texCoords1: readFloat2(reader),
        texCoords2: readFloat2(reader),
        boneWeights: [reader.readUInt8(), reader.readUInt8(), reader.readUInt8(), reader.readUInt8()],
        boneIndices: [reader.readUInt8(), reader.readUInt8(), reader.readUInt8(), reader.readUInt8()]
    }
    return vertex;
}

function readAnimation(reader: BinaryReader) {
    const animation: WoWAnimationData = {
        id: reader.readUInt16LE(),
        variationIndex: reader.readUInt16LE(),
        duration: reader.readUInt32LE(),
        flags: reader.readUInt32LE(),
        frequency: reader.readUInt16LE(),
        blendTimeIn: reader.readUInt16LE(),
        blendTimeOut: reader.readUInt16LE(),
        extentBox: readAABB(reader),
        variationNext: reader.readInt16LE(),
        aliasNext: reader.readUInt16LE()
    }
    return animation;
}

function readBone(reader: BinaryReader) {
    const bone: WoWBoneData = {
        keyBoneId: reader.readInt32LE(),
        flags: reader.readUInt32LE(),
        parentBoneId: reader.readInt16LE(),
        subMeshId: reader.readInt16LE(),
        boneNameCRC: reader.readUInt32LE(),
        pivot: readFloat3(reader),
        translation: readTrack(reader, readFloat3),
        rotation: readTrack(reader, readQuaternion),
        scale: readTrack(reader, readFloat3)
    }
    return bone;
}

function readSubmesh(reader: BinaryReader) {
    const subMesh: WoWSubmeshData = {
        submeshId: reader.readUInt16LE(),
        level: reader.readUInt16LE(),
        vertexStart: reader.readUInt16LE(),
        vertexCount: reader.readUInt16LE(),
        triangleStart: reader.readUInt16LE(),
        triangleCount: reader.readUInt16LE(),
        centerBoneIndex: reader.readUInt16LE(),
        centerPosition: readFloat3(reader),
        sortCenterPosition: readFloat3(reader),
        sortRadius: reader.readFloatLE(),
    }
    return subMesh;
}

function readTextureUnit(reader: BinaryReader) {
    const textureUnit: WoWTextureUnitData = {
        flags: reader.readUInt8(),
        priority: reader.readUInt8(),
        shaderId: reader.readUInt16LE(),
        skinSectionIndex: reader.readUInt16LE(),
        flags2: reader.readUInt16LE(),
        colorIndex: reader.readInt16LE(),
        materialIndex: reader.readUInt16LE(),
        materialLayer: reader.readUInt16LE(),
        textureCount: reader.readUInt16LE(),
        textureComboIndex: reader.readUInt16LE(),
        textureCoordComboIndex: reader.readUInt16LE(),
        textureWeightComboIndex: reader.readUInt16LE(),
        textureTransformComboIndex: reader.readUInt16LE(),
    }
    return textureUnit;
}

function readMaterial(reader: BinaryReader) {
    const material: WoWMaterialData = {
        flags: reader.readUInt16LE(),
        blendingMode: reader.readUInt16LE()
    }
    return material;
}

function readTexture(reader: BinaryReader) {
    const texture: WoWTextureData = {
        type: reader.readInt32LE(),
        flags: reader.readUInt32LE(),
        textureId: reader.readUInt32LE(),
    }
    return texture;
}

function readTextureTransform(reader: BinaryReader) {
    const textureTransform: WoWTextureTransformData = {
        translation: readTrack(reader, readFloat3),
        rotation: readTrack(reader, readFloat4),
        scaling: readTrack(reader, readFloat3)
    }
    return textureTransform;
}

function readAttachment(reader: BinaryReader) {
    const attachment: WoWAttachmentData = {
        id: reader.readInt32LE(),
        bone: reader.readInt32LE(),
        position: readFloat3(reader)
    }
    return attachment;
}

function readColor(reader: BinaryReader) {
    const color: WoWColorData = {
        color: readTrack(reader, readFloat3),
        alpha: readTrack(reader, (r) => r.readUInt16LE()),
    }
    return color;
}

function readTextureWeight(reader: BinaryReader) {
    const textureWeight: WoWTextureWeightData = {
        weights: readTrack(reader, (r) => r.readUInt16LE()),
    }
    return textureWeight;
}

function readParticleEmitter(reader: BinaryReader) {
    const particleEmitter: WoWParticleEmitterData = {
        particleId: reader.readInt32LE(),
        flags: reader.readUInt32LE(),
        position: readFloat3(reader),
        bone: reader.readInt16LE(),
        texture: reader.readInt16LE(),
        blendingType: reader.readUInt8(),
        emitterType: reader.readUInt8(),
        particleColorIndex: reader.readUInt16LE(),
        textureTileRotation: reader.readUInt16LE(),
        textureDimensionsRows: reader.readUInt16LE(),
        textureDimensionsColumns: reader.readUInt16LE(),
        lifespanVary: reader.readFloatLE(),
        emissionRateVary: reader.readFloatLE(),
        colorTrack: readLocalTrack(reader, readFloat3),
        alphaTrack: readLocalTrack(reader, (r) => r.readUInt16LE()),
        scaleTrack: readLocalTrack(reader, readFloat2),
        scaleVary: readFloat2(reader),
        headCellTrack: readLocalTrack(reader, (r) => r.readUInt16LE()),
        tailCellTrack: readLocalTrack(reader, (r) => r.readUInt16LE()),
        tailLength: reader.readFloatLE(),
        twinkleSpeed: reader.readFloatLE(),
        twinklePercent: reader.readFloatLE(),
        twinkleScale: readFloat2(reader),
        burstMultiplier: reader.readFloatLE(),
        drag: reader.readFloatLE(),
        baseSpin: reader.readFloatLE(),
        baseSpinVary: reader.readFloatLE(),
        spin: reader.readFloatLE(),
        spinVary: reader.readFloatLE(),
        tumbleModelRotationSpeedMin: readFloat3(reader),
        tumbleModelRotationSpeedMax: readFloat3(reader),
        windVector: readFloat3(reader),
        windTime: reader.readFloatLE(),
        followSpeed1: reader.readFloatLE(),
        followScale1: reader.readFloatLE(),
        followSpeed2: reader.readFloatLE(),
        followScale2: reader.readFloatLE(),
        multiTextureParamX: readFloat2(reader),
        multiTextureParam0: [readFloat2(reader), readFloat2(reader)],
        multiTextureParam1: [readFloat2(reader), readFloat2(reader)],
        emissionSpeed: readTrack(reader, (r) => r.readFloatLE()),
        speedVariation: readTrack(reader, (r) => r.readFloatLE()),
        verticalRange: readTrack(reader, (r) => r.readFloatLE()),
        horizontalRange: readTrack(reader, (r) => r.readFloatLE()),
        gravity: readTrack(reader, readFloat3),
        lifespan: readTrack(reader, (r) => r.readFloatLE()),
        emissionAreaLength: readTrack(reader, (r) => r.readFloatLE()),
        emissionAreaWidth: readTrack(reader, (r) => r.readFloatLE()),
        zSource: readTrack(reader, (r) => r.readFloatLE()),
        emissionRate: readTrack(reader, (r) => r.readFloatLE()),
        splinePoints: readArray(reader, readFloat3),
        enabledIn: readTrack(reader, (r) => r.readUInt8()),
    }
    return particleEmitter;
}

function readParticle(reader: BinaryReader) {
    const particle: WoWExtendedParticleData = {
        zSource: reader.readFloatLE(),
        colorMult: reader.readFloatLE(),
        alphaMult: reader.readFloatLE(),
        alphaCutoff: readLocalTrack(reader, (r) => r.readUInt16LE())
    }
    return particle;
}

function readRibbonEmitter(reader: BinaryReader) {
    const ribbonEmitter: WoWRibbonEmiterData = {
        ribbonId: reader.readInt32LE(),
        boneIndex: reader.readInt32LE(),
        position: readFloat3(reader),
        edgesPerSecond: reader.readFloatLE(),
        edgeLifetime: reader.readFloatLE(),
        gravity: reader.readFloatLE(),
        textureRows: reader.readInt16LE(),
        textureCols: reader.readInt16LE(),
        priorityPlane: reader.readInt16LE(),
        texSlotTrack: readTrack(reader, (r) => r.readUInt16LE()),
        visibilityTrack: readTrack(reader, (r) => r.readUInt8()),
        textureIndices: readArray(reader, (r) => r.readInt16LE()),
        materialIndices: readArray(reader, (r) => r.readInt16LE()),
        colorTrack: readTrack(reader, readFloat3),
        alphaTrack: readTrack(reader, (r) => r.readUInt16LE()),
        heightAboveTrack: readTrack(reader, (r) => r.readFloatLE()),
        heightBelowTrack: readTrack(reader, (r) => r.readFloatLE()),
    }
    return ribbonEmitter;
}