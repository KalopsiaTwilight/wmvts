import { AABB, Float2, Float3, Float4  } from "@app/math"
import { FileIdentifier } from "@app/metadata";

export interface WoWModelData {
    flags: number;
    vertices: WoWVertexData[];
    skinTriangles: number[];
    submeshes: WoWSubmeshData[];
    bones: WoWBoneData[];
    boneCombos: number[];
    boneIdLookup: number[];
    textureUnits: WoWTextureUnitData[];
    materials: WoWMaterialData[];
    textures: WoWTextureData[];
    textureCombos: number[];
    textureIdLookup: number[];
    globalLoops: number[];
    animations: WoWAnimationData[];
    animationLookup: number[];
    textureWeights: WoWTextureWeightData[];
    textureWeightCombos: number[];
    textureTransforms: WoWTextureTransformData[];
    textureTransformCombos: number[];
    attachments: WoWAttachmentData[];
    attachmentIdLookup: number[];
    colors: WoWColorData[];
    particleEmitters: WoWParticleEmitterData[];
    particleEmitterGeosets: number[];
    particles: WoWExtendedParticleData[];
    ribbonEmitters: WoWRibbonEmiterData[];
}

export interface WoWVertexData
{
    position: Float3;
    normal: Float3;

    texCoords1: Float2;
    texCoords2: Float2;

    boneWeights: number[];
    boneIndices: number[];
}

export enum WoWAnimationFlags {
    Init = 0x01,
    Unk_0x2 = 0x2,
    Unk_0x4 = 0x4,
    Unk_0x8 = 0x8,
    LowPrioritySequence = 0x10,
    PrimaryBoneSequence = 0x20,
    IsAlias = 0x40,
    BlendedAnimation = 0x80,
    SequenceInModel = 0x100,
    BlendTimeInAndOut = 0x200,
    Unk_0x400 = 0x400,
    Unk_0x800 = 0x800,
    Unk_0x1000 = 0x1000,
    Unk_0x2000 = 0x2000
}   

export interface WoWAnimationData
{
    id: number;
    variationIndex: number;
    duration: number;
    flags: WoWAnimationFlags;
    frequency: number;
    blendTimeIn: number;
    blendTimeOut: number;
    extentBox: AABB;
    variationNext: number;
    aliasNext: number;
}

export interface WoWAnimatedValue<T> {
    timeStamps: number[];
    values: T[];
}

export interface WoWTrackData<T>
{
    interpolationType: number;
    globalSequence: number;
    animations: WoWAnimatedValue<T>[];
}

export enum WoWBoneFlags {
    IgnoreParentTranslate = 0x1,
    IgnoreParentScale = 0x2,
    IgnoreParentRotation = 0x4,
    SphericalBillboard = 0x8,
    CylindricalBillboardLockX = 0x10,
    CylindricalBillboardLockY = 0x20,
    CylindricalBillboardLockZ = 0x40,
    Unk_0x80 = 0x80,
    UNK_0x100 = 0x100,
    Transformed = 0x200,
    KinematicBone = 0x400,       // MoP+: allow physics to influence this bone
    HelmetAnimScaled = 0x1000,  // set blend_modificator to helmetAnimScalingRec.m_amount for this bone
    SomethingSequenceId = 0x2000, // <=bfa+, parent_bone+submesh_id are a sequence id instead?!
}

export interface WoWBoneData
{
    keyBoneId: number;
    flags: WoWBoneFlags;
    parentBoneId: number;
    subMeshId: number;
    boneNameCRC: number;
    pivot: Float3;
    translation: WoWTrackData<Float3>;
    rotation: WoWTrackData<Float4>;
    scale: WoWTrackData<Float3>;
}

export interface WoWSubmeshData
{
    submeshId: number;
    level: number;
    vertexStart: number;
    vertexCount: number;
    triangleStart: number;
    triangleCount: number;
    centerBoneIndex: number;
    centerPosition: Float3;
    sortCenterPosition: Float3;
    sortRadius: number;
}


export interface WoWTextureUnitData
{
    flags: number;
    priority: number;
    shaderId: number;
    skinSectionIndex: number;
    flags2: number;
    colorIndex: number;
    materialIndex: number;
    materialLayer: number;
    textureCount: number;
    textureComboIndex: number;
    textureCoordComboIndex: number;
    textureWeightComboIndex: number;
    textureTransformComboIndex: number;
}

export enum WoWMaterialFlags
{
    None = 0x0,
    Unlit = 0x01,
    Unfogged = 0x02,
    TwoSided = 0x04,
    DepthTest = 0x08,
    DepthWrite = 0x10,
    Unknown_0x40 = 0x40,
    Unknown_0x80 = 0x80,
    Unknown_0x100 = 0x100,
    Unknown_0x200 = 0x200,
    Unknown_0x400 = 0x400,
    PreventAlphaForCustomElements = 0x800,
}

export interface WoWMaterialData
{
    flags: WoWMaterialFlags;
    blendingMode: number;
}


export enum WoWTextureType
{
    None = 0,
    Skin = 1,
    ObjectSkin = 2,
    WeaponBlade = 3,
    WeaponHandle = 4,
    Environment = 5,
    CharHair = 6,
    CharFacialHair = 7,
    SkinExtra = 8,
    UISkin = 9,
    TaurenMane = 10,
    Monster1 = 11,
    Monster2 = 12,
    Monster3 = 13,
    ItemIcon = 14,
    GuildBackgroundColor = 15,
    GuildEmblemColor = 16,
    GuildBorderColor = 17,
    GuildEmblem = 18,
    CharEyes = 19,
    CharJewelry = 20,
    CharSecondarySkin = 21,
    CharSecondaryHair = 22,
    CharSecondaryArmor = 23,
    Unknown24 = 24,
    Unknown25 = 25,
    Unknown26 = 26,
}

export enum WoWTextureFlags
{
    None = 0x0,
    TextureWrapX = 0x1,
    TextureWrapY = 0x2
}

export interface WoWTextureData
{
    type: WoWTextureType;
    flags: WoWTextureFlags;
    textureId: FileIdentifier;
}

export interface WoWTextureTransformData
{
    translation: WoWTrackData<Float3>;
    rotation: WoWTrackData<Float4>;
    scaling: WoWTrackData<Float3>;
}

export interface WoWAttachmentData
{
    id: number;
    bone: number;
    position: Float3;
}

export interface WoWColorData
{
    color: WoWTrackData<Float3>;
    alpha: WoWTrackData<number>;
}

export interface WoWTextureWeightData
{
    weights: WoWTrackData<number>;
}

export interface WoWLocalTrackData<T>
{
    keys: number[];
    values: T[];
}


export enum WoWParticleFlags
{
    AffectedByLighting = 0x01,
    Unknown_0x02 = 0x02,
    OrientationIsAffectedByPlayerOrientation = 0x04,
    TravelUpInWorldspace = 0x08,
    DoNotTrail = 0x10,
    Unlightning = 0x20,
    UseBurstMulitpler = 0x40,
    ParticlesInModelSpace = 0x80,
    Unknown_0x100 = 0x100,
    Unknown_0x200 = 0x200,
    PinnedParticles = 0x400,
    Unknown_0x800 = 0x800,
    XYQuadParticles = 0x1000,
    ClampToGround = 0x2000,
    Unknown_0x4000 = 0x4000,
    Unknown_0x8000 = 0x8000,
    ChooseRandomTexture = 0x10000,
    OutwardParticles = 0x20000,
    Unknown_0x40000 = 0x40000,
    ScaleVaryAffectsXAndYIndependently = 0x80000,
    Unknown_0x100000 = 0x100000,
    RandomFlipBookStart = 0x200000,
    IgnoreDistance = 0x400000,
    GravityValuesAreCompressedVectors = 0x800000,
    BoneGeneratorIsBoneAndNotJoint = 0x1000000,
    Unknown_0x2000000 = 0x2000000,
    DoNotThrottleEmissionRateBasedOnDistance = 0x4000000,
    Unknown_0x8000000 = 0x8000000,
    UsesMultiTexturing = 0x10000000,
}


export interface WoWParticleEmitterData
{
    particleId: number;
    flags: WoWParticleFlags;
    position: Float3;
    bone: number;
    texture: number;
    blendingType: number;
    emitterType: number;
    particleColorIndex: number;
    textureTileRotation: number;
    textureDimensionsRows: number;
    textureDimensionsColumns: number;
    emissionSpeed: WoWTrackData<number>;
    speedVariation: WoWTrackData<number>;
    verticalRange: WoWTrackData<number>;
    horizontalRange: WoWTrackData<number>;
    gravity: WoWTrackData<Float3>;
    lifespan: WoWTrackData<number>;
    lifespanVary: number;
    emissionRate: WoWTrackData<number>;
    emissionRateVary: number;
    emissionAreaLength: WoWTrackData<number>;
    emissionAreaWidth: WoWTrackData<number>;
    zSource: WoWTrackData<number>;
    colorTrack: WoWLocalTrackData<Float3>;
    alphaTrack: WoWLocalTrackData<number>;
    scaleTrack: WoWLocalTrackData<Float2>;
    scaleVary: Float2;
    headCellTrack: WoWLocalTrackData<number>;
    tailCellTrack: WoWLocalTrackData<number>;
    tailLength: number;
    twinkleSpeed: number;
    twinklePercent: number;
    twinkleScale: Float2;
    burstMultiplier: number;
    drag: number;
    baseSpin: number;
    baseSpinVary: number;
    spin: number;
    spinVary: number;
    tumbleModelRotationSpeedMin: Float3;
    tumbleModelRotationSpeedMax: Float3;
    windVector: Float3;
    windTime: number;
    followSpeed1: number;
    followScale1: number;
    followSpeed2: number;
    followScale2: number;
    splinePoints: Float3[];
    enabledIn: WoWTrackData<number>;
    multiTextureParamX: Float2;
    multiTextureParam0: [Float2, Float2];
    multiTextureParam1: [Float2, Float2];
}

export interface WoWExtendedParticleData
{
    zSource: number;
    colorMult: number;
    alphaMult: number;
    alphaCutoff: WoWLocalTrackData<number>;
}

export interface WoWRibbonEmiterData
{
    ribbonId: number;
    boneIndex: number;
    position: Float3;
    textureIndices: number[];
    materialIndices: number[];
    colorTrack: WoWTrackData<Float3>;
    alphaTrack: WoWTrackData<number>;
    heightAboveTrack: WoWTrackData<number>;
    heightBelowTrack: WoWTrackData<number>;
    edgesPerSecond: number;
    edgeLifetime: number;
    gravity: number;
    textureRows: number;
    textureCols: number;
    texSlotTrack: WoWTrackData<number>;
    visibilityTrack: WoWTrackData<number>;
    priorityPlane: number;
}