import { AABB, Plane, Float2, Float3, Float4 } from "@app/math";
import { FileIdentifier } from "@app/metadata";

export type Color = [number, number, number, number];
export type Int2 = [number, number];

export enum WorldModelRootFlags {
    DoNoAttenuateVerticesBasedOnDistanceToPortal = 0x1,
    UseUnifiedRenderPath = 0x2,
    UseLiquidTypeDbcId = 0x4,
    DoNotFixVertexColorAlpha = 0x8,
    Lod = 0x10,
    DefaultMaxLod = 0x20,
    Unknown_0x40 = 0x40,
    Unknown_0x80 = 0x80,
    Unknown_0x100 = 0x100,
    Unknown_0x200 = 0x200,
    Unknown_0x400 = 0x400,
    Unknown_0x800 = 0x800
}

export interface WoWWorldModelData {
    fileDataID: number;
    flags: WorldModelRootFlags;
    id: number;
    skyboxFileId: number;
    ambientColor: Color;
    boundingBox: AABB;
    materials: WoWWorldModelMaterial[];
    groupInfo: WoWWorldModelGroupInfo[];
    doodadDefs: WoWWorldModelDoodadDef[];
    doodadIds: FileIdentifier[];
    fogs: WoWWorldModelFog[];
    doodadSets: WoWWorldModelDoodadSet[];
    portalRefs: WoWWorldModelPortalRef[];
    portals: WoWWorldModelPortal[];
    globalAmbientVolumes: WoWWorldModelAmbientVolume[];
    ambientVolumes: WoWWorldModelAmbientVolume[];
    portalVertices: Float3[];
    groups: WoWWorldModelGroup[];
}

export enum WowWorldModelGroupFlags {
    BspTree = 0x1,
    LightMap = 0x2,
    VertexColors = 0x4,
    Exterior = 0x8,
    Unknown_0x10 = 0x10,
    Unknown_0x20 = 0x20,
    ExteriorLit = 0x40,
    Unreachable = 0x80,
    ShowExteriorSky = 0x100,
    HasLights = 0x200,
    Lod = 0x400,
    HasDoodads = 0x800,
    HasWater = 0x1000,
    Interior = 0x2000,
    Unknown_0x4000 = 0x4000,
    Unknown_0x8000 = 0x8000,
    AlwaysDraw = 0x10000,
    Unknown_0x20000 = 0x20000,
    ShowSkybox = 0x40000,
    IsOceanWater = 0x80000,
    Unknown_0x100000 = 0x100000,
    IsMountAllowed = 0x200000,
    Unknown_0x400000 = 0x400000,
    Unknown_0x800000 = 0x800000,
    Has2VertexColors = 0x1000000,
    Has2UVs = 0x2000000,
    AntiPortal = 0x4000000,
    Unknown_0x8000000 = 0x8000000,
    Unknown_0x10000000 = 0x10000000,
    Unknown_0x20000000 = 0x20000000,
    Has3UVs = 0x40000000,
    Unknown_0x80000000 = 0x80000000
}


export enum WowWorldModelGroupFlags2 {
    CanCutTerrain = 0x1,
    Unknown_0x2 = 0x2,
    Unknown_0x4 = 0x4,
    Unknown_0x8 = 0x8,
    Unknown_0x10 = 0x10,
    Unknown_0x20 = 0x20,
    IsSplitGroupParent = 0x40,
    IsSplitGroupChild = 0x80,
    AttachmentMesh = 0x100,
}

export interface WoWWorldModelGroup {
    fileDataID: FileIdentifier;
    lod: number;
    flags: WowWorldModelGroupFlags;
    boundingBox: AABB;
    portalsOffset: number;
    portalCount: number;
    transBatchCount: number;
    intBatchCount: number;
    extBatchCount: number;
    unknownBatchCount: number;
    fogIndices: number[];
    groupLiquid: number;
    groupId: number;
    flags2: WowWorldModelGroupFlags2;
    splitGroupindex: number;
    nextSplitChildIndex: number;
    indices: number[];
    headerReplacementColor: Color;
    liquidData: WoWWorldModelLiquid[];
    bspIndices: number[];
    bspNodes: WoWWorldModelBspNode[];
    vertices: Float3[];
    normals: Float3[];
    uvList: Float2[];
    vertexColors: Color[];
    batches: WoWWorldModelBatch[];
    doodadReferences: number[];
}

export enum WMODoodadFlags {
    AcceptProjTexture = 0x1,
    UseInteriorLighting = 0x2,
    Unknown_0x4 = 0x4,
    Unknown_0x8 = 0x8,
    Unknown_0x10 = 0x10,
    Unknown_0x20 = 0x20,
    Unknown_0x40 = 0x40,
    Unknown_0x80 = 0x80
}

export interface WoWWorldModelDoodadDef {
    nameOffset: number;
    flags: WMODoodadFlags;
    position: Float3;
    rotation: Float4;
    scale: number;
    color: Color;
}

export interface WoWWorldModelDoodadSet {
    startIndex: number;
    count: number;
}

export enum WoWWorldModelMaterialMaterialFlags {
    Unlit = 0x1,
    Unfogged = 0x2,
    Unculled = 0x4,
    Extlight = 0x8,
    Sidn = 0x10,
    Window = 0x20,
    ClampS = 0x40,
    ClampT = 0x80,
    Unknown_0x100 = 0x100,
    Unknown_0x200 = 0x200,
    Unknown_0x400 = 0x400,
    Unknown_0x800 = 0x800,
    Unknown_0x1000 = 0x1000,
    Unknown_0x2000 = 0x2000,
    Unknown_0x4000 = 0x4000,
    Unknown_0x8000 = 0x8000,
    Unknown_0x10000 = 0x10000,
    Unknown_0x20000 = 0x20000,
    Unknown_0x40000 = 0x40000,
    Unknown_0x80000 = 0x80000,
    Unknown_0x100000 = 0x100000,
    Unknown_0x200000 = 0x200000,
    Unknown_0x400000 = 0x400000,
    Unknown_0x800000 = 0x800000
}

export enum WMOShader {
    Diffuse = 0,
    Specular = 1,
    Metal = 2,
    Env = 3,
    Opaque = 4,
    EnvMetal = 5,
    TwoLayerDiffuse = 6,
    TwoLayerEnvMetal = 7,
    TwoLayerTerrain = 8,
    DiffuseEmissive = 9,
    WaterWindow = 10,
    MaskedEnvMetal = 11,
    EnvMetalEmissive = 12,
    TwoLayerDiffuseOpaque = 13,
    SubmarineWindow = 14,
    TwoLayerDiffuseEmissive = 15,
    DiffuseTerrain = 16,
    AdditiveMaskedEnvMetal = 17,
    TwoLayerDiffuseMod2x = 18,
    TwoLayerDiffuseMod2xNA = 19,
    TwoLayerDiffuseAlpha = 20,
    Lod = 21,
    Parallax = 22,
    Unknown_DF_Shader = 23
}

export interface WoWWorldModelMaterial {
    flags: WoWWorldModelMaterialMaterialFlags;
    shader: WMOShader;
    blendMode: number;
    texture1: number;
    sidnColor: Color;
    frameSidnColor: Color;
    texture2: number;
    diffColor: Color;
    groundTypeId: number;
    texture3: number;
    color2: number;
    flags2: number;
    runTimeData: number[];
}

export interface WoWWorldModelGroupInfo {
    flags: WowWorldModelGroupFlags;
    boundingBox: AABB;
}

export interface WoWWorldModelLodInfo {
    flags2: WowWorldModelGroupFlags2;
    lodIndex: number;
}

export interface WoWWorldModelFog {
    flags: number;
    position: Float3;
    smallerRadius: number;
    largerRadius: number;
    fogEnd: number;
    fogStartScalar: number;
    fogColor: Color;
    uwFogEnd: number;
    uwFogStartScalar: number;
    uwFogColor: Color;
}

export interface WoWWorldModelPortal {
    startVertex: number;
    vertexCount: number;
    plane: Plane;
}

export interface WoWWorldModelPortalRef {
    portalIndex: number;
    groupIndex: number;
    side: number;
}

export interface WoWWorldModelAmbientVolume {
    position: Float3;
    start: number;
    end: number;

    color1: Color;
    color2: Color;
    color3: Color;
    flags: number;
    doodadSetId: number;
}

export interface WoWWorldModelLiquidVertex {
    data: number;
    height: number;
}

export interface WoWWorldModelLiquidTile {
    legacyLiquidType: number;
    fishable: number;
    shared: number;
}

export interface WoWWorldModelLiquid {
    // Width, height    
    liquidVertices: Int2;
    // width, height
    liquidTiles: Int2;
    position: Float3;
    materialId: number;
    vertices: WoWWorldModelLiquidVertex[];
    tiles: WoWWorldModelLiquidTile[];
}

export enum WowWorldModelBspNodeFlags
{
    XAxis = 0x0,
    YAxis = 0x1,
    ZAxis = 0x2,
    AxisMask = 0x3,
    Leaf = 0x4,
    NoChild = 0xFFFF
}

export interface WoWWorldModelBspNode {
    flags: number;
    negChild: number;
    posChild: number;
    faces: number;
    faceStart: number;
    planeDistance: number;
}

export interface WoWWorldModelBatch {
    materialId: number;
    startIndex: number;
    indexCount: number;
    firstVertex: number;
    lastVertex: number;
}