import { inflate } from "pako";

import { BinaryReader } from "@app/utils";
import { readArray, readColor, readFloat2, readFloat3, readFloat4, readInt2 } from "./compressedReading";
import { WoWWorldModelAmbientVolume, WoWWorldModelBatch, WoWWorldModelBspNode, WoWWorldModelData, WoWWorldModelDoodadDef, WoWWorldModelDoodadSet, WoWWorldModelFog, WoWWorldModelGroup, WoWWorldModelGroupInfo, WoWWorldModelLiquid, WoWWorldModelLiquidTile, WoWWorldModelLiquidVertex, WoWWorldModelMaterial, WoWWorldModelPortal, WoWWorldModelPortalRef } from "..";

export function parseCWMOFile(data: ArrayBuffer) {
    let reader = new BinaryReader(data);

    const magic = reader.readUInt32LE();
    if (magic != 0x43574D4F) {
        throw new Error("Encountered wrong magic number. File data is probably not CM2 data?");
    }

    const version = reader.readUInt32LE();
    if (version != 1000) {
        throw new Error("Incompatible version encountered in CM2. Supported versions are: 1000. Encountered: " + version);
    }

    const metaPos = reader.readUInt32LE();
    const materialsPos = reader.readUInt32LE();
    const groupInfoPos = reader.readUInt32LE();
    const doodadDefPos = reader.readUInt32LE();
    const doodIdsPos = reader.readUInt32LE();
    const fogsPos = reader.readUInt32LE();
    const doodadSetsPos = reader.readUInt32LE();
    const portalRefsPos = reader.readUInt32LE();
    const portalsPos = reader.readUInt32LE();
    const globalAmbientVolumePos = reader.readUInt32LE();
    const ambientVolumesPos = reader.readUInt32LE();
    const portalVerticesPos = reader.readUInt32LE();
    const groupsPos = reader.readUInt32LE();
    const dataEndPos = reader.readUInt32LE();

    let inflatedData: Uint8Array;
    const remainingBytes = reader.readRemainingBytes();
    inflatedData = inflate(remainingBytes)
    if (inflatedData.length < dataEndPos) {
        throw new Error("Compressed data appears to be smaller than expected? Received: " + inflatedData.length + " expected: " + dataEndPos);
    }

    reader = new BinaryReader(inflatedData.buffer);

    reader.seek(metaPos);
    const fileDataID = reader.readUInt32LE();
    const flags = reader.readInt16LE();
    const id = reader.readUInt32LE();
    const skyboxFileId = reader.readUInt32LE();
    const ambientColor = readColor(reader);
    const minBoundingBox = readFloat3(reader);
    const maxBoundingBox = readFloat3(reader);

    reader.seek(materialsPos);
    const materials = readArray(reader, readMaterial);
    reader.seek(groupInfoPos);
    const groupInfo = readArray(reader, readGroupInfo);
    reader.seek(doodadDefPos);
    const doodadDefs = readArray(reader, readDoodadDef);
    reader.seek(doodIdsPos);
    const doodadIds = readArray(reader, (r) => r.readUInt32LE());
    reader.seek(fogsPos);
    const fogs = readArray(reader, readFog);
    reader.seek(doodadSetsPos);
    const doodadSets = readArray(reader, readDoodadSet);
    reader.seek(portalRefsPos);
    const portalRefs = readArray(reader, readPortalRef);
    reader.seek(portalsPos);
    const portals = readArray(reader, readPortal);
    reader.seek(globalAmbientVolumePos);
    const globalAmbientVolumes = readArray(reader, readAmbientVolume);
    reader.seek(ambientVolumesPos);
    const ambientVolumes = readArray(reader, readAmbientVolume);
    reader.seek(portalVerticesPos);
    const portalVertices = readArray(reader, readFloat3);
    reader.seek(groupsPos);
    const groups = readArray(reader, readGroup);

    let modelData: WoWWorldModelData = {
        flags,
        fileDataID,
        id,
        skyboxFileId,
        ambientColor,
        minBoundingBox,
        maxBoundingBox,
        ambientVolumes,
        doodadDefs,
        doodadIds,
        materials,
        fogs,
        portalRefs,
        portals,
        globalAmbientVolumes,
        portalVertices,
        groups,
        doodadSets,
        groupInfo
    }

    return modelData;
}

function readMaterial(reader: BinaryReader) {
    const data: WoWWorldModelMaterial = {
        flags: reader.readUInt32LE(),
        shader: reader.readUInt32LE(),
        blendMode: reader.readUInt32LE(),
        texture1: reader.readUInt32LE(),
        sidnColor: readColor(reader),
        frameSidnColor: readColor(reader),
        texture2: reader.readUInt32LE(),
        diffColor: readColor(reader),
        groundTypeId: reader.readUInt32LE(),
        texture3: reader.readUInt32LE(),
        color2: reader.readUInt32LE(),
        flags2: reader.readUInt32LE(),
        runTimeData: [reader.readUInt32LE(), reader.readUInt32LE(), reader.readUInt32LE(), reader.readUInt32LE()]
    }
    return data;
}

function readGroupInfo(reader: BinaryReader) {
    const data: WoWWorldModelGroupInfo = {
        flags: reader.readUInt32LE(),
        minBoundingBox: readFloat3(reader),
        maxBoundingBox: readFloat3(reader)
    }
    return data;
}

function readDoodadDef(reader: BinaryReader) {
    const data: WoWWorldModelDoodadDef = {
        nameOffset: reader.readUInt32LE(),
        flags: reader.readUInt32LE(),
        position: readFloat3(reader),
        rotation: readFloat4(reader),
        scale: reader.readFloatLE(),
        color: readColor(reader)
    }
    return data;
}

function readFog(reader: BinaryReader) {
    const data: WoWWorldModelFog = {
        flags: reader.readUInt32LE(),
        position: readFloat3(reader),
        smallerRadius: reader.readFloatLE(),
        largerRadius: reader.readFloatLE(),
        fogEnd: reader.readFloatLE(),
        fogStartScalar: reader.readFloatLE(),
        fogColor: readColor(reader),
        uwFogEnd: reader.readFloatLE(),
        uwFogStartScalar: reader.readFloatLE(),
        uwFogColor: readColor(reader)
    }
    return data;
}

function readDoodadSet(reader: BinaryReader) {
    const data: WoWWorldModelDoodadSet = {
        startIndex: reader.readUInt32LE(),
        count: reader.readUInt32LE()
    }
    return data;
}

function readPortalRef(reader: BinaryReader) {
    const data: WoWWorldModelPortalRef = {
        portalIndex: reader.readUInt16LE(),
        groupIndex: reader.readUInt16LE(),
        side: reader.readInt16LE()
    }
    return data;
}

function readPortal(reader: BinaryReader) {
    const data: WoWWorldModelPortal = {
        startVertex: reader.readUInt16LE(),
        vertexCount: reader.readUInt16LE(),
        planeNormal: readFloat3(reader),
        planeDistance: reader.readFloatLE()
    }
    return data;
}

function readAmbientVolume(reader: BinaryReader) {
    const data: WoWWorldModelAmbientVolume = {
        position: readFloat3(reader),
        start: reader.readFloatLE(),
        end: reader.readFloatLE(),
        color1: readColor(reader),
        color2: readColor(reader),
        color3: readColor(reader),
        flags: reader.readUInt32LE(),
        doodadSetId: reader.readUInt16LE()
    }
    return data;
}

function readGroup(reader: BinaryReader) {
    const data: WoWWorldModelGroup = {
        fileDataID: reader.readUInt32LE(),
        flags: reader.readUInt32LE(),
        boundingBoxMin: readFloat3(reader),
        boundingBoxMax: readFloat3(reader),
        portalsOffset: reader.readUInt16LE(),
        portalCount: reader.readUInt16LE(),
        transBatchCount: reader.readUInt16LE(),
        intBatchCount: reader.readUInt16LE(),
        extBatchCount: reader.readUInt16LE(),
        unknownBatchCount: reader.readUInt16LE(),
        fogIndices: [reader.readUInt8(), reader.readUInt8(), reader.readUInt8(), reader.readUInt8()],
        groupLiquid: reader.readUInt32LE(),
        groupId: reader.readUInt32LE(),
        flags2: reader.readUInt32LE(),
        splitGroupindex: reader.readInt16LE(),
        nextSplitChildIndex: reader.readInt16LE(),
        headerReplacementColor: readColor(reader),
        indices: readArray(reader, (r) => r.readUInt16LE()),
        liquidData: readArray(reader, readLiquid),
        bspIndices: readArray(reader, (r) => r.readUInt16LE()),
        bspNodes: readArray(reader, readBspNode),
        vertices: readArray(reader, readFloat3),
        normals: readArray(reader, readFloat3),
        uvList: readArray(reader, readFloat2),
        vertexColors: readArray(reader, readColor),
        batches: readArray(reader, readBatch),
        doodadReferences: readArray(reader, (r) => r.readUInt16LE())
    }
    return data;
}

function readLiquid(reader: BinaryReader) {
    const data: WoWWorldModelLiquid = {
        liquidVertices: readInt2(reader),
        liquidTiles: readInt2(reader),
        position: readFloat3(reader),
        materialId: reader.readUInt16LE(),
        vertices: readArray(reader, readLiquidVertex),
        tiles: readArray(reader, readLiquidTile),
    }
    return data;
}

function readBspNode(reader: BinaryReader) {
    const data: WoWWorldModelBspNode = {
        flags: reader.readUInt16LE(),
        negChild: reader.readInt16LE(),
        posChild: reader.readInt16LE(),
        faces: reader.readUInt16LE(),
        faceStart: reader.readUInt32LE(),
        planeDistance: reader.readFloatLE()
    }
    return data;
}

function readBatch(reader: BinaryReader) {
    const data: WoWWorldModelBatch = {
        materialId: reader.readUInt16LE(),
        startIndex: reader.readUInt32LE(),
        indexCount: reader.readUInt16LE(),
        firstVertex: reader.readUInt16LE(),
        lastVertex: reader.readUInt16LE()
    }
    return data;
}

function readLiquidVertex(reader: BinaryReader) {
    const data: WoWWorldModelLiquidVertex = {
        data: reader.readUInt32LE(),
        height: reader.readFloatLE()
    }
    return data;
}

function readLiquidTile(reader: BinaryReader) {
    const data: WoWWorldModelLiquidTile = {
        legacyLiquidType: reader.readUInt8(),
        fishable: reader.readUInt8(),
        shared: reader.readUInt8(),
    }
    return data;
}