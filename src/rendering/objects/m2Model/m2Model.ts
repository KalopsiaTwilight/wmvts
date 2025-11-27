import { WoWBoneData, WoWBoneFileData, WoWBoneFlags, WoWMaterialFlags, WoWModelData, WoWTextureUnitData } from "@app/modeldata";
import { Float4, Float3, Float44, AABB } from "@app/math"
import { BinaryWriter, distinct } from "@app/utils";
import { FileIdentifier } from "@app/metadata";

import { 
    ColorMask, ITexture, IShaderProgram, M2BlendModeToEGxBlend,
    RenderMaterial, DrawingBatchRequest, IDataBuffers, BufferDataType
} from "@app/rendering/graphics";
import { IDataManager, IIoCContainer, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";

import { IBoneData, IM2Model, ISkinnedObject, M2ModelEvents, ParticleColorOverrides } from "./interfaces";
import fragmentShaderProgramText from "./m2Model.frag";
import vertexShaderProgramText from "./m2Model.vert";
import { getM2PixelShaderId, getM2VertexShaderId } from "./m2Shaders";

import { M2ParticleEmitter } from "./particleEmitter/m2ParticleEmitter";
import { M2RibbonEmitter } from "./ribbonEmitter/m2RibbonEmitter";
import { AnimationState } from "./animatedValue";

const MAX_BONES = 256;

interface TextureUnitData {
    geoSetId: number;
    show: boolean;
    color: Float4;
    material: RenderMaterial,
    textureWeights: Float4;
    textureMatrices: Float44[];
}

const BATCH_IDENTIFIER = "M2";

export class M2Model<TParentEvent extends string = M2ModelEvents> extends WorldPositionedObject<TParentEvent | M2ModelEvents> implements IM2Model<TParentEvent> {
    iocContainer: IIoCContainer;
    dataManager: IDataManager;

    fileId: FileIdentifier;
    modelData: WoWModelData;
    boneFileId?: FileIdentifier;
    boneFileData?: WoWBoneFileData;

    isModelDataLoaded: boolean;
    isTexturesLoaded: boolean;

    particleEmitters: M2ParticleEmitter[];

    particleColorOverrides: ParticleColorOverrides;
    ribbonEmitters: M2RibbonEmitter[];

    // graphics data
    shaderProgram: IShaderProgram;
    bonePositionBuffer: Float32Array;
    dataBuffers: IDataBuffers;

    animationState: AnimationState;
    textureObjects: { [key: FileIdentifier]: ITexture };

    textureUnitData: TextureUnitData[]
    boneData: IBoneData[];
    attachedToModel?: ISkinnedObject;

    modelViewMatrix: Float44;
    invModelViewMatrix: Float44;
    isMirrored: boolean;


    constructor(iocContainer: IIoCContainer) {
        super();
        this.isModelDataLoaded = false;
        this.isTexturesLoaded = false;
        this.isDisposing = false;
        this.isMirrored = false;

        this.modelViewMatrix = Float44.identity();
        this.invModelViewMatrix = Float44.identity();
        this.bonePositionBuffer = new Float32Array(16 * MAX_BONES);

        this.children = [];
        this.particleColorOverrides = [null, null, null];
        this.iocContainer = iocContainer;
        this.dataManager = iocContainer.getDataManager();
    }

    get isLoaded() {
        return this.isModelDataLoaded && this.isTexturesLoaded;
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        this.modelData = null;
        this.boneFileData = null;
        if (this.particleEmitters) {
            for (const emitter of this.particleEmitters) {
                emitter.dispose();
            }
        }
        this.particleEmitters = null;
        this.particleColorOverrides = null;
        if (this.ribbonEmitters) {
            for (const emitter of this.ribbonEmitters) {
                emitter.dispose();
            }
        }
        this.ribbonEmitters = null;

        this.bonePositionBuffer = null;
        if (this.animationState) {
            this.animationState.dispose();
        }
        this.animationState = null;
        this.textureObjects = null;
        this.textureUnitData = null;
        this.boneData = null;
        this.attachedToModel = null;
        this.modelViewMatrix = null;
        this.invModelViewMatrix = null;
    }

    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        this.shaderProgram = this.renderer.getShaderProgram(this, "M2", vertexShaderProgramText, fragmentShaderProgramText);

        if (this.fileId) {
            this.dataManager.getM2ModelFile(this.fileId).then(this.onModelLoaded.bind(this));
        }
    }

    
    loadFileId(id: FileIdentifier) {
        if (this.fileId === id) {
            return;
        }
        
        this.fileId = id;
        if (this.renderer) {  
            this.dataManager.getM2ModelFile(this.fileId).then(this.onModelLoaded.bind(this));
        }
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.animationState.update(deltaTime);

        Float44.multiply(this.worldModelMatrix, this.renderer.viewMatrix, this.modelViewMatrix);
        Float44.invert(this.modelViewMatrix, this.invModelViewMatrix);

        for (const data of this.boneData) {
            data.hasUpdatedThisTick = false;
        }
        
        if (this.attachedToModel) {
            const parentBones = this.attachedToModel.boneData;
            if (parentBones) {
                const parentBoneMap: { [key: number]: number} = {};
                for(let i = 0; i < parentBones.length; i++) {
                    parentBoneMap[parentBones[i].crc] = i;
                }
                for(let i = 0; i < this.boneData.length; i++) {
                    const boneData = this.boneData[i];
                    const parentBoneIndex = parentBoneMap[boneData.crc];
                    if (!parentBoneIndex) {
                        continue;
                    }
                    boneData.isOverriden = true;
                    Float44.copy(parentBones[parentBoneIndex].positionMatrix, boneData.positionMatrix);
                }
            }
        }

        for (let i = 0; i < this.modelData.bones.length; i++) {
            this.updateBone(this.modelData.bones[i], i);
        }
        for (let i = 0; i < this.textureUnitData.length; i++) {
            if (this.textureUnitData[i].show) {
            this.updateTextureUnit(this.modelData.textureUnits[i], i);
            }
        }
        for (let i = 0; i < this.modelData.particleEmitters.length; i++) {
            this.particleEmitters[i].update(deltaTime);
        }
        for (let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            this.ribbonEmitters[i].update(deltaTime);
        }
    }

    attachTo(model: ISkinnedObject) {
        this.attachedToModel = model;
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const numBones = Math.min(MAX_BONES, this.modelData.bones.length);
        for (let i = 0; i < numBones; i++) {
            this.bonePositionBuffer.set(this.boneData[i].positionMatrix, 16 * i);
        }

        for (let i = 0; i < this.textureUnitData.length; i++) {
            const texUnitData = this.textureUnitData[i];
            if (texUnitData.show) {
                this.drawTextureUnit(this.modelData.textureUnits[i], i);
            }
        }
        for (let i = 0; i < this.modelData.particleEmitters.length; i++) {
            this.particleEmitters[i].draw();
        }
        for (let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            this.ribbonEmitters[i].draw();
        }
    }

    swapTexture(index: number, texture: ITexture) {
        if (!texture) {
            return;
        }

        this.once("texturesLoaded", () => {
            this.textureObjects[index] = texture;
            // Recreate materials for new texture(s)
            for (let i = 0; i < this.modelData.textureUnits.length; i++) {
                this.createMaterialForTexUnit(i);
            }
        })
    }

    swapTextureType(type: number, texture: ITexture) {
        if (!texture) {
            return;
        }

        this.once("modelDataLoaded", () => {
            const textureIndex = this.modelData.textures.findIndex(x => x.type === type);
            if (textureIndex < 0) {
                return;
            }

            this.swapTexture(textureIndex, texture);
        })
    }
    
    getAnimations(): number[] {
        if (!this.modelData) {
            return [];
        }

        return distinct(this.modelData.animations.map((x) => x.id)).sort((a, b) => a - b);
    }

    useAnimation(id: number) {
        this.animationState.useAnimation(id);
    }

    pauseAnimation() {
        this.animationState.isPaused = true;
    }

    resumeAnimation() {
        this.animationState.isPaused = false;
    }

    setAnimationSpeed(speed: number) {
        this.animationState.speed = speed;
    }

    toggleGeoset(geosetId: number, show: boolean) {
        return this.toggleGeosets(geosetId, geosetId, show);
    }

    toggleGeosets(start: number, end: number, show: boolean) {
        this.once("texturesLoaded", () => {
            for (let i = 0; i < this.textureUnitData.length; i++) {
                const texUnitData = this.textureUnitData[i];
                if (texUnitData.geoSetId >= start && texUnitData.geoSetId <= end) {
                    texUnitData.show = show;
                }
            }

            if (this.modelData.particleEmitterGeosets && this.modelData.particleEmitterGeosets.length > 0) {
                for (let i = 0; i < this.modelData.particleEmitterGeosets.length; ++i) {
                    let particleEmitterGeoset = this.modelData.particleEmitterGeosets[i];
                    if (particleEmitterGeoset >= start && particleEmitterGeoset <= end) {
                        this.particleEmitters[i].show = show;
                    }
                }
            }
        })
    }

    loadBoneFile(id: FileIdentifier) {
        if (this.boneFileId === id) {
            return;
        }

        this.boneFileId = id;

        if (!id) {
            this.boneData = null;
            this.resetBoneFileData();
        } else {
            this.dataManager.getBoneFileData(id).then(this.onBoneFileLoaded.bind(this));
        }
    }

    setParticleColorOverride(overrides: ParticleColorOverrides) {
        this.particleColorOverrides = overrides;
        // TODO: Reload particle emitters if necessary
    }

    // Referenced from https://github.com/Deamon87/WebWowViewerCpp/blob/master/wowViewerLib/src/engine/managers/animationManager.cpp#L398
    private updateBone(bone: WoWBoneData, index: number) {
        const data = this.boneData[index];
        if (data.hasUpdatedThisTick || data.isOverriden) {
            return;
        }

        Float44.identity(data.positionMatrix);

        // Do operations in modelview space
        Float44.multiply(data.positionMatrix, this.modelViewMatrix, data.positionMatrix);

        // Apply parent bone position
        if (bone.parentBoneId > -1) {
            // Ensure parentbone is updated;
            this.updateBone(this.modelData.bones[bone.parentBoneId], bone.parentBoneId);

            let parentPosMatrix = Float44.copy(this.boneData[bone.parentBoneId].positionMatrix);
            let originalPosMatrix = Float44.copy(parentPosMatrix);

            // Test if any parent ignore flags apply
            if (7 & bone.flags) {
                Float44.multiply(this.modelViewMatrix, parentPosMatrix, parentPosMatrix);

                // Ignore both scale & rot, i.e. just use original 3x3 col vectors
                if ((6 & bone.flags) === 6) {
                    for (let i = 0; i < 3; i++) {
                        Float44.setColumn(parentPosMatrix, i, Float44.getColumn4(this.modelViewMatrix, i))
                    }
                }
                // Ignore Rotation, i.e only apply scale 
                else if ((4 & bone.flags)) {
                    for (let i = 0; i < 3; i++) {
                        const col = Float44.getColumn4(this.modelViewMatrix, i);
                        const colLength = Float4.length(col);
                        const parentCol = Float44.getColumn4(parentPosMatrix, i);
                        const parentColLength = Float4.length(parentCol);

                        // Apply scale to original vector by multiplying by (|scaled vector| / |orig vector|)
                        Float4.scale(col, parentColLength / colLength, col);
                        Float44.setColumn(parentPosMatrix, i, col);
                    }
                }
                // Ignore Scale, i.e. only apply rotation
                else {
                    for (let i = 0; i < 3; i++) {
                        const col = Float44.getColumn4(this.modelViewMatrix, i);
                        const colLength = Float4.length(col);
                        const parentCol = Float44.getColumn4(parentPosMatrix, i);
                        const parentColLength = Float4.length(parentCol);

                        // Apply rotation to by scaling parent vector by (1 / |scaled vector| * |orig vector|)
                        Float4.scale(parentCol, 1 / parentColLength * colLength, col);
                        Float44.setColumn(parentPosMatrix, i, col);
                    }
                }

                let translate: Float4;
                // Ignore parent translate
                if (1 & bone.flags) {
                    translate = Float44.getColumn4(this.modelViewMatrix, 3);
                    Float44.setColumn(parentPosMatrix, 3, translate)
                } else {
                    const pivotVec4 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 1);
                    const pivotVec3 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 0);

                    const translationVec = Float4.identity();
                    Float4.subtract(Float44.transformDirection4(pivotVec4, originalPosMatrix), Float44.transformDirection4(pivotVec3, parentPosMatrix), translationVec);
                    translationVec[3] = 1;
                    Float44.setColumn(parentPosMatrix, 3, translationVec);
                }

                Float44.multiply(this.invWorldModelMatrix, parentPosMatrix, parentPosMatrix);
            }

            Float44.multiply(data.positionMatrix, parentPosMatrix, data.positionMatrix);
        }

        // Apply animation matrix
        let animationMatrix = Float44.identity();
        let isAnimated = false;
        // Test if bone is transformable
        if (0x280 & bone.flags) {
            Float44.translate(animationMatrix, bone.pivot, animationMatrix);

            if (this.animationState.hasAnimatedValuesForTrack(bone.translation)) {
                const translation = this.animationState.getFloat3TrackValue(bone.translation, Float3.zero());
                Float44.translate(animationMatrix, translation, animationMatrix);

                isAnimated = true;
            }

            if (this.animationState.hasAnimatedValuesForTrack(bone.rotation)) {
                const rotationQuat = this.animationState.getFloat4TrackValue(bone.rotation, Float4.identity());
                rotationQuat[0] = -rotationQuat[0];
                rotationQuat[1] = -rotationQuat[1];
                rotationQuat[2] = -rotationQuat[2];
                Float44.multiply(animationMatrix, Float44.fromQuat(rotationQuat), animationMatrix);

                isAnimated = true;
            }

            if (this.animationState.hasAnimatedValuesForTrack(bone.scale)) {
                const scale = this.animationState.getFloat3TrackValue(bone.scale, Float3.one());
                Float44.scale(animationMatrix, scale, animationMatrix);

                isAnimated = true;
            }

            Float44.translate(animationMatrix, Float3.negate(bone.pivot), animationMatrix);
        }

        if (data.boneOffsetMatrix != null) {
            Float44.translate(animationMatrix, bone.pivot, animationMatrix);
            Float44.multiply(animationMatrix, data.boneOffsetMatrix, animationMatrix);
            Float44.translate(animationMatrix, Float3.negate(bone.pivot), animationMatrix);
        }

        Float44.multiply(data.positionMatrix, animationMatrix, data.positionMatrix);

        // Process Billboard flags
        const billboardFlags = bone.flags & 0x78;
        if (billboardFlags) {
            const positionMatrix = data.positionMatrix;
            const positionMatrixCopy = Float44.copy(data.positionMatrix);
            const scaleVector = Float3.create(
                Float4.length(Float44.getColumn4(data.positionMatrix, 0)),
                Float4.length(Float44.getColumn4(data.positionMatrix, 1)),
                Float4.length(Float44.getColumn4(data.positionMatrix, 2)),
            )

            switch (billboardFlags) {
                case WoWBoneFlags.SphericalBillboard: {
                    if (isAnimated) {
                        const xAxis = Float44.getColumn4(animationMatrix, 0);
                        Float44.setColumn(positionMatrix, 0, Float4.normalize(
                            Float4.create(xAxis[1], xAxis[2], -xAxis[0], 0)
                        ));

                        const yAxis = Float44.getColumn4(animationMatrix, 1);
                        Float44.setColumn(positionMatrix, 1, Float4.normalize(
                            this.isMirrored
                                ? Float4.create(-yAxis[1], -yAxis[2], yAxis[0], 0)
                                : Float4.create(yAxis[1], yAxis[2], -yAxis[0], 0)
                        ))

                        const zAxis = Float44.getColumn4(animationMatrix, 2);
                        Float44.setColumn(positionMatrix, 2, Float4.normalize(
                            Float4.create(zAxis[1], zAxis[2], -zAxis[0], 0)
                        ))
                    } else {
                        Float44.setColumn(positionMatrix, 0, Float4.create(0, 0, -1, 0));
                        Float44.setColumn(positionMatrix, 1, this.isMirrored ? Float4.create(-1, 0, 0, 0) : Float4.create(1, 0, 0, 0));
                        Float44.setColumn(positionMatrix, 2, Float4.create(0, 1, 0, 0));
                    }
                }
                case WoWBoneFlags.CylindricalBillboardLockX: {
                    const xAxis = Float4.normalize(Float44.getColumn4(positionMatrix, 0));
                    Float44.setColumn(positionMatrix, 0, xAxis);

                    const yAxis = Float4.normalize(Float4.create(positionMatrix[4], -positionMatrix[0], 0, 0));
                    Float44.setColumn(positionMatrix, 1, yAxis);

                    const zAxis = Float4.cross(yAxis, xAxis);
                    zAxis[3] = 0;
                    Float44.setColumn(positionMatrix, 2, zAxis);
                }
                case WoWBoneFlags.CylindricalBillboardLockY: {
                    const yAxis = Float4.normalize(Float44.getColumn4(positionMatrix, 1));
                    Float44.setColumn(positionMatrix, 1, yAxis);

                    const xAxis = Float4.normalize(Float4.create(-positionMatrix[5], positionMatrix[1], 0, 0));
                    Float44.setColumn(positionMatrix, 0, xAxis);

                    const zAxis = Float4.cross(yAxis, xAxis);
                    zAxis[3] = 0;
                    Float44.setColumn(positionMatrix, 2, zAxis);
                }
                case WoWBoneFlags.CylindricalBillboardLockZ: {
                    const zAxis = Float4.normalize(Float44.getColumn4(positionMatrix, 2));
                    Float44.setColumn(positionMatrix, 2, zAxis);

                    const yAxis = Float4.normalize(Float4.create(positionMatrix[9], positionMatrix[8], 0, 0));
                    Float44.setColumn(positionMatrix, 1, yAxis);

                    const xAxis = Float4.cross(zAxis, yAxis);
                    xAxis[3] = 0;
                    Float44.setColumn(positionMatrix, 0, xAxis);
                }
            }

            const pivotVec4 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 1);
            const pivotVec3 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 0);

            Float44.setColumn(positionMatrix, 0, Float4.scale(Float44.getColumn4(positionMatrix, 0), scaleVector[0]));
            Float44.setColumn(positionMatrix, 1, Float4.scale(Float44.getColumn4(positionMatrix, 1), scaleVector[1]));
            Float44.setColumn(positionMatrix, 2, Float4.scale(Float44.getColumn4(positionMatrix, 2), scaleVector[2]));

            const translationVec = Float4.identity();
            Float4.subtract(Float44.transformDirection4(pivotVec4, positionMatrixCopy), Float44.transformDirection4(pivotVec3, positionMatrix), translationVec);
            translationVec[3] = 1;
            Float44.setColumn(positionMatrix, 3, translationVec);
        }

        // Revert from modelview space
        Float44.multiply(this.invModelViewMatrix, data.positionMatrix, data.positionMatrix);

        data.hasUpdatedThisTick = true;
    }

    private updateTextureUnit(texUnit: WoWTextureUnitData, index: number) {
        const data = this.textureUnitData[index];

        Float4.set(data.color, 1, 1, 1, 1);
        const colorData = this.modelData.colors[texUnit.colorIndex];
        if (colorData) {
            let rgb = Float3.one();
            let alpha = 1;
            if (this.animationState.hasAnimatedValuesForTrack(colorData.color)) {
                this.animationState.getFloat3TrackValue(colorData.color, Float3.one(), rgb);
            }
            if (this.animationState.hasAnimatedValuesForTrack(colorData.alpha)) {
                alpha = this.animationState.getNumberTrackValue(colorData.alpha) / 32767;
            }
            data.color[0] = rgb[0];
            data.color[1] = rgb[1];
            data.color[2] = rgb[2];
            data.color[3] = alpha;
        }

        for (let i = 0; i < texUnit.textureCount; i++) {
            data.textureWeights[i] = 1;
        }

        if (texUnit.textureWeightComboIndex > -1 && texUnit.textureWeightComboIndex < this.modelData.textureWeightCombos.length) {
            for (let i = 0; i < texUnit.textureCount; i++) {
                const weightIndex = this.modelData.textureWeightCombos[texUnit.textureWeightComboIndex + i];
                if (weightIndex > -1 && weightIndex < this.modelData.textureWeights.length) {
                    const weightData = this.modelData.textureWeights[weightIndex];
                    if (this.animationState.hasAnimatedValuesForTrack(weightData.weights)) {
                        const outputVal = this.animationState.getNumberTrackValue(weightData.weights, 32767) / 32767;
                        data.textureWeights[i] = outputVal;
                    }
                }
            }
        }

        data.color[3] *= data.textureWeights[0];

        if (texUnit.textureTransformComboIndex > -1 && texUnit.textureTransformComboIndex < this.modelData.textureTransformCombos.length) {
            for (let i = 0; i < texUnit.textureCount; i++) {
                const textureMatrix = data.textureMatrices[i];

                Float44.identity(textureMatrix);
                let transformIndex = this.modelData.textureTransformCombos[texUnit.textureTransformComboIndex + i];
                if (transformIndex > -1 && transformIndex < this.modelData.textureTransforms.length) {
                    const textureTransformData = this.modelData.textureTransforms[transformIndex];

                    Float44.translate(textureMatrix, Float3.create(0.5, 0.5, 0), textureMatrix);

                    if (this.animationState.hasAnimatedValuesForTrack(textureTransformData.scaling)) {
                        const scale = this.animationState.getFloat3TrackValue(textureTransformData.scaling);
                        Float44.scale(textureMatrix, scale, textureMatrix);
                    }

                    if (this.animationState.hasAnimatedValuesForTrack(textureTransformData.rotation)) {
                        const quat = this.animationState.getFloat4TrackValue(textureTransformData.rotation);
                        Float44.multiply(textureMatrix, Float44.fromQuat(quat), textureMatrix);
                    }

                    if (this.animationState.hasAnimatedValuesForTrack(textureTransformData.translation)) {
                        const translation = this.animationState.getFloat3TrackValue(textureTransformData.translation);
                        Float44.translate(textureMatrix, translation, textureMatrix);
                    }

                    Float44.translate(textureMatrix, Float3.create(-0.5, -0.5, 0), textureMatrix);
                }
            }
        }
    }

    private drawTextureUnit(texUnit: WoWTextureUnitData, index: number) {
        const texUnitData = this.textureUnitData[index];
        const subMesh = this.modelData.submeshes[texUnit.skinSectionIndex];
        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, this.fileId, index);
        batchRequest.useMaterial(texUnitData.material)
            .useDataBuffers(this.dataBuffers)
            .drawIndexedTriangles(2 * (subMesh.triangleStart + 65536 * subMesh.level), subMesh.triangleCount);
        this.renderer.submitDrawRequest(batchRequest);
    }

    protected onModelLoaded(data: WoWModelData | null) {
        if (data === null) {
            this.dispose();
            return;
        }
        if (this.isDisposing) {
            return;
        }

        this.modelData = data;
        this.setBoundingBox(AABB.fromVertices(this.modelData.vertices.map(x => x.position), 0));

        this.animationState = new AnimationState(this.modelData.animations, this.modelData.globalLoops);
        this.animationState.useAnimation(0);

        this.setupDataBuffers();

        this.boneData = new Array(this.modelData.bones.length);
        for (let i = 0; i < this.modelData.bones.length; i++) {
            this.boneData[i] = {
                boneOffsetMatrix: Float44.identity(),
                hasUpdatedThisTick: false,
                isOverriden: false,
                crc: this.modelData.bones[i].boneNameCRC,
                positionMatrix: Float44.identity()
            };
        }
        this.processBoneFileData();

        this.isModelDataLoaded = true;
        this.processCallbacks("modelDataLoaded");

        this.loadTextures();
    }

    private setupDataBuffers() {
        this.dataBuffers = this.renderer.getDataBuffers(this, "M2-" + this.fileId, (graphics) => {
            const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
            const vertexDataBuffer = graphics.createVertexDataBuffer([
                { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 0 },
                { index: this.shaderProgram.getAttribLocation('a_normal'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 12 },
                { index: this.shaderProgram.getAttribLocation('a_bones'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 24},
                { index: this.shaderProgram.getAttribLocation('a_boneWeights'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 28 },
                { index: this.shaderProgram.getAttribLocation('a_texcoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 32 },
                { index: this.shaderProgram.getAttribLocation('a_texcoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 40 },
            ], true);
            

            const vertices = this.modelData.vertices;
            const bufferSize = 48 * vertices.length;
            const buffer = new Uint8Array(bufferSize);

            const writer = new BinaryWriter(buffer.buffer);
            for (let i = 0; i < vertices.length; ++i) {
                writer.writeFloatLE(vertices[i].position[0]);
                writer.writeFloatLE(vertices[i].position[1]);
                writer.writeFloatLE(vertices[i].position[2]);
                writer.writeFloatLE(vertices[i].normal[0]);
                writer.writeFloatLE(vertices[i].normal[1]);
                writer.writeFloatLE(vertices[i].normal[2]);
                writer.writeUInt8(vertices[i].boneIndices[0]);
                writer.writeUInt8(vertices[i].boneIndices[1]);
                writer.writeUInt8(vertices[i].boneIndices[2]);
                writer.writeUInt8(vertices[i].boneIndices[3]);
                writer.writeUInt8(vertices[i].boneWeights[0]);
                writer.writeUInt8(vertices[i].boneWeights[1]);
                writer.writeUInt8(vertices[i].boneWeights[2]);
                writer.writeUInt8(vertices[i].boneWeights[3]);
                writer.writeFloatLE(vertices[i].texCoords1[0]);
                writer.writeFloatLE(vertices[i].texCoords1[1]);
                writer.writeFloatLE(vertices[i].texCoords2[0]);
                writer.writeFloatLE(vertices[i].texCoords2[1]);
            }
            vertexDataBuffer.setData(buffer);
            vertexIndexBuffer.setData(new Uint16Array(this.modelData.skinTriangles));

            return graphics.createDataBuffers(vertexDataBuffer, vertexIndexBuffer);
        });
    }

    private loadTextures() {
        this.isTexturesLoaded = false;
        this.textureObjects = {}

        const loadingPromises: Promise<void>[] = []
        for (let i = 0; i < this.modelData.textures.length; i++) {
            const textureId = this.modelData.textures[i].textureId
            if (textureId) {
                const promise = this.renderer.getTexture(this, textureId).then((texture) => {
                    if (!this.isDisposing) {
                        this.textureObjects[i] = texture
                    }
                })
                loadingPromises.push(promise);
            } else {
                this.textureObjects[i] = this.renderer.getSolidColorTexture([0,1,0,1]);
                this.textureObjects[i].fileId = i;
            }
        }

        Promise.all(loadingPromises).then(() => {
            this.isTexturesLoaded = true;
            this.onTexturesLoaded();
        })
    }

    private onTexturesLoaded() {
        if (this.isDisposing) {
            return;
        }

        this.particleEmitters = new Array(this.modelData.particleEmitters.length);
        this.ribbonEmitters = new Array(this.modelData.ribbonEmitters.length);
        for (let i = 0; i < this.modelData.particleEmitters.length; i++) {
            const exp2Data = this.modelData.particles[i];
            const emitterData = this.modelData.particleEmitters[i];
            const emitter = new M2ParticleEmitter(i, this, emitterData, exp2Data);
            this.particleEmitters[i] = emitter;
        }

        for (let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            const emitterData = this.modelData.ribbonEmitters[i];
            const emitter = new M2RibbonEmitter(i, this, emitterData);
            this.ribbonEmitters[i] = emitter;
        }


        this.textureUnitData = new Array(this.modelData.textureUnits.length);
        for (let i = 0; i < this.modelData.textureUnits.length; i++) {
            this.createTextureUnitData(i);
        }

        this.processCallbacks("texturesLoaded");
        this.processCallbacks("loaded");
    }

    private onBoneFileLoaded(data: WoWBoneFileData | null) {
        this.boneFileData = data;

        if (!data) {
            this.resetBoneFileData;
        } else {

            this.processBoneFileData();
        }
    }

    private processBoneFileData() {
        const data =this.boneFileData; 
        if (!data || !this.boneData?.length) {
            return;
        }

        for(let i = 0; i < data.boneIds.length; i++) {
            Float44.copy(data.boneOffsetMatrices[i], this.boneData[data.boneIds[i]].boneOffsetMatrix);
        }
    }

    private resetBoneFileData() {
        for(let i = 0; i < this.boneData.length; i++) {
            Float44.identity(this.boneData[i].boneOffsetMatrix);
        }
    }

    private createTextureUnitData(i: number) {
        const texUnit = this.modelData.textureUnits[i];

        let renderMaterial = this.renderer.getBaseMaterial();
        this.textureUnitData[i] = {
            color: Float4.one(),
            textureMatrices: [Float44.identity(), Float44.identity()],
            textureWeights: Float4.one(),
            material: renderMaterial,
            geoSetId: this.modelData.submeshes[texUnit.skinSectionIndex].submeshId,
            show: true
        };

        this.createMaterialForTexUnit(i);
    }

    private createMaterialForTexUnit(i: number) {
        const texUnit = this.modelData.textureUnits[i];
        const texUnitData = this.textureUnitData[i];
        const renderMaterial = texUnitData.material;

        const unkTexture = this.renderer.getUnknownTexture();
        const textures = [unkTexture, unkTexture, unkTexture, unkTexture];
           
        if (!(texUnit.textureComboIndex < 0 || texUnit.textureComboIndex > this.modelData.textureCombos.length)) {
            for (let j = 0; j < texUnit.textureCount; j++) {
                const textureIndex = this.modelData.textureCombos[texUnit.textureComboIndex + j];
                if (textureIndex > -1 && textureIndex < this.modelData.textures.length) {
                    textures[j] = this.textureObjects[textureIndex]
                }
            }
        }

        const material = this.modelData.materials[texUnit.materialIndex];
        const blendMode = M2BlendModeToEGxBlend(material.blendingMode);
        // TODO: Consider smaller shader programs per material VS/PS
        renderMaterial.useShaderProgram(this.shaderProgram);
        renderMaterial.useBackFaceCulling((4 & material.flags) == 0);
        renderMaterial.useCounterClockWiseFrontFaces(!this.isMirrored);
        renderMaterial.useBlendMode(blendMode);
        renderMaterial.useDepthTest((WoWMaterialFlags.DepthTest & material.flags) == 0);
        renderMaterial.useDepthWrite((WoWMaterialFlags.DepthWrite & material.flags) == 0);
        renderMaterial.useColorMask(ColorMask.Alpha | ColorMask.Blue | ColorMask.Green | ColorMask.Red);
        renderMaterial.useUniforms({
            "u_boneMatrices": this.bonePositionBuffer,
            "u_modelMatrix": this.worldModelMatrix,
            "u_textureTransformMatrix1": texUnitData.textureMatrices[0],
            "u_textureTransformMatrix2": texUnitData.textureMatrices[1],
            "u_color": texUnitData.color,
            "u_vertexShader": getM2VertexShaderId(texUnit.shaderId, texUnit.textureCount),
            "u_blendMode": blendMode,
            "u_pixelShader": getM2PixelShaderId(texUnit.shaderId, texUnit.textureCount),
            "u_unlit": 0 != (WoWMaterialFlags.Unlit & material.flags),
            "u_texture1": textures[0],
            "u_texture2": textures[1],
            "u_texture3": textures[2],
            "u_texture4": textures[3],
            "u_textureWeights": texUnitData.textureWeights
        })

    }

    protected override canExecuteCallbackNow(type: TParentEvent | M2ModelEvents): boolean {
        switch(type) {
            case "modelDataLoaded": return this.modelData != null;
            case "texturesLoaded": return this.isTexturesLoaded;
            default: return super.canExecuteCallbackNow(type);
        }
    }
}