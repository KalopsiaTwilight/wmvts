import { WoWBoneData, WoWBoneFlags, WoWMaterialFlags, WoWModelData, WoWTextureUnitData, WoWVertexData } from "@app/modeldata";
import { RenderingEngine, BufferDataType, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer, ColorMask, 
    Float4, Float3, ITexture, Float44, IShaderProgram, GxBlend, M2BlendModeToEGxBlend, 
    RenderingBatchRequest, AABB, MaterialKey,
    RenderMaterial,
    MaterialType,
} from "@app/rendering";
import { AnimationState } from "./animatedValue";

import fragmentShaderProgramText from "./m2Model.frag"; 
import vertexShaderProgramText from "./m2Model.vert";
import { getM2PixelShaderId, getM2VertexShaderId} from "./m2Shaders";
import { WorldPositionedObject } from "../worldPositionedObject";
import { M2ParticleEmitter } from "./particleEmitter/m2ParticleEmitter";
import { M2RibbonEmitter } from "./ribbonEmitter/m2RibbonEmitter";
import { IM2DataBuffers } from "./m2DataBuffers";

const MAX_BONES = 256;

export interface TextureUnitData {
    color: Float4;
    material: RenderMaterial,
    textureWeights: Float4;
    textures: ITexture[];
    textureMatrices: Float44[];
}

export interface BoneData {
    hasUpdatedThisTick: boolean;
    boneOffsetMatrix: Float44;
    positionMatrix: Float44;
}

export class M2Model extends WorldPositionedObject
{
    isModelDataLoaded: boolean;
    isTexturesLoaded: boolean;

    fileId: number;
    modelData: WoWModelData;

    shaderProgram: IShaderProgram;
    bonePositionBuffer: Float32Array;
    dataBuffers: IM2DataBuffers
    renderKey: MaterialKey;

    animationState: AnimationState;
    loadedTextures: { [key: number]: ITexture };
    textureUnitData: TextureUnitData[]
    boneData: BoneData[];

    modelViewMatrix: Float44;
    invModelViewMatrix: Float44;
    isMirrored: boolean;
    drawOrderTexUnits: WoWTextureUnitData[];
    particleEmitters: M2ParticleEmitter[];
    ribbonEmitters: M2RibbonEmitter[];

    localBoundingBox: AABB;
    worldBoundingBox: AABB;

    constructor(fileId: number) {
        super();
        this.fileId = fileId;
        this.isModelDataLoaded = false;
        this.isTexturesLoaded = false;
        this.isDisposing = false;
        this.isMirrored = false;

        this.modelViewMatrix = Float44.identity();
        this.invModelViewMatrix = Float44.identity();
        this.bonePositionBuffer = new Float32Array(16 * MAX_BONES);

        this.children = [];
        this.particleEmitters = [];
        this.ribbonEmitters = [];
    }

    get isLoaded() {
        return this.isModelDataLoaded && this.isTexturesLoaded;
    }

    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);
        this.shaderProgram = this.engine.getShaderProgram("M2", vertexShaderProgramText, fragmentShaderProgramText);

        this.engine.getM2ModelFile(this.fileId).then(this.onModelLoaded.bind(this));
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.animationState.update(deltaTime);

        Float44.multiply(this.worldModelMatrix, this.engine.viewMatrix, this.modelViewMatrix);
        Float44.invert(this.modelViewMatrix, this.invModelViewMatrix);

        for(const data of this.boneData) {
            data.hasUpdatedThisTick = false;
        }
        for (let i = 0; i < this.modelData.bones.length; i++) {
            this.updateBone(this.modelData.bones[i], i);
        }
        for(let i = 0; i < this.drawOrderTexUnits.length; i++) {
            this.updateTextureUnit(this.modelData.textureUnits[i], i);
        }
        for(let i = 0; i < this.modelData.particleEmitters.length; i++) {
            this.particleEmitters[i].update(deltaTime);
        }
        for(let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            this.ribbonEmitters[i].update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const numBones = Math.min(MAX_BONES, this.modelData.bones.length);
        for(let i = 0; i < numBones; i++) {
            this.bonePositionBuffer.set(this.boneData[i].positionMatrix, 16 * i);
        }

        for(let i = 0; i < this.drawOrderTexUnits.length; i++) {
            this.drawTextureUnit(this.modelData.textureUnits[i], i);
        }
        for(let i = 0; i < this.modelData.particleEmitters.length; i++) {
            this.particleEmitters[i].draw();
        }
        for(let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            this.ribbonEmitters[i].draw();
        }
    }

    // Referenced from https://github.com/Deamon87/WebWowViewerCpp/blob/master/wowViewerLib/src/engine/managers/animationManager.cpp#L398
    private updateBone(bone: WoWBoneData, index: number) {
        const data = this.boneData[index];
        if (data.hasUpdatedThisTick) {
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
                    for(let i = 0; i < 3; i++) {
                        Float44.setColumn(parentPosMatrix, i, Float44.getColumn4(this.modelViewMatrix, i))
                    }
                }
                // Ignore Rotation, i.e only apply scale 
                else if ((4 & bone.flags)) {
                    for(let i = 0; i < 3; i++) {
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
                    for(let i = 0; i < 3; i++) {
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
                        Float44.setColumn(positionMatrix, 1,this.isMirrored ? Float4.create(-1, 0, 0, 0) : Float4.create(1, 0, 0, 0));
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
            for(let i = 0; i < texUnit.textureCount; i++) {
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
            for(let i = 0; i < texUnit.textureCount; i++) {
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
        const batchRequest = new RenderingBatchRequest(texUnitData.material);
        const subMesh = this.modelData.submeshes[texUnit.skinSectionIndex];
        batchRequest.useVertexArrayObject(this.dataBuffers.vao);
        batchRequest.drawIndexedTriangles(2 * (subMesh.triangleStart + 65536 * subMesh.level), subMesh.triangleCount);
        this.engine.submitBatchRequest(batchRequest);
    }

    private resizeForBounds() {
        this.engine.sceneCamera.resizeForBoundingBox(this.worldBoundingBox);
    }

    override dispose(): void {
        for(const emitter of this.particleEmitters) {
            emitter.dispose();
        }
        super.dispose();
        this.modelData = null;
        this.shaderProgram = null;
        this.dataBuffers = null;
        this.bonePositionBuffer = null;
        this.animationState = null;
        this.loadedTextures = null;
        this.textureUnitData = null;
        this.boneData = null;
        this.worldModelMatrix = null;
        this.modelViewMatrix = null;
        this.invWorldModelMatrix = null;
        this.invModelViewMatrix = null;
        this.drawOrderTexUnits = null;
        this.renderKey = null;
    }

    onModelLoaded(data: WoWModelData|null) {
        if (data === null) {
            this.dispose();
            return;
        }
        if (this.isDisposing) {
            return;
        }

        this.modelData = data;

        this.localBoundingBox = AABB.fromVertices(this.modelData.vertices.map(x => x.position), 0);
        this.worldBoundingBox = AABB.transform(this.localBoundingBox, this.worldModelMatrix);
        
        this.animationState = new AnimationState(this);
        this.animationState.useAnimation(0);
        if (!this.parent) {
            this.resizeForBounds();
        }

        this.loadTextures();

        this.dataBuffers = this.engine.getM2DataBuffers(this.fileId, this.shaderProgram, this.modelData);

        this.boneData = new Array(this.modelData.bones.length);
        for (let i = 0; i < this.modelData.bones.length; i++) {
            this.boneData[i] = { 
                boneOffsetMatrix: null, 
                hasUpdatedThisTick: false, 
                positionMatrix: Float44.identity() 
            };
        }

        this.drawOrderTexUnits = this.modelData.textureUnits.sort((a, b) => a.priority != b.priority 
                ? a.priority - b.priority 
                : this.modelData.submeshes[a.skinSectionIndex].submeshId - this.modelData.submeshes[b.skinSectionIndex].submeshId
        );

        this.isModelDataLoaded = true;
    }

    private loadTextures() {
        this.loadedTextures = { }
        const loadingPromises: Promise<void>[] = []
        for (let i = 0; i < this.modelData.textures.length; i++) {
            const textureId = this.modelData.textures[i].textureId
            if(textureId > 0) {
                const promise = this.engine.getTexture(textureId).then((texture) => {
                    if (!this.isDisposing) {
                        this.loadedTextures[textureId] = texture
                    }
                })
                loadingPromises.push(promise);
            } else {
                this.loadedTextures[i] = this.engine.getUnknownTexture();
            }
        }

        Promise.all(loadingPromises).then(() => {
            this.isTexturesLoaded = true;
            this.onTexturesLoaded();
        })
    }

    private onTexturesLoaded() {
        for(let i = 0; i < this.modelData.particleEmitters.length; i++) {
            const exp2Data = this.modelData.particles[i];
            const emitterData = this.modelData.particleEmitters[i];
            // TODO: Refactor ctor to use parent.engine
            const emitter = new M2ParticleEmitter(this.engine, this, emitterData, exp2Data);
            this.particleEmitters.push(emitter)
        }

        for(let i = 0; i < this.modelData.ribbonEmitters.length; i++) {
            const emitterData = this.modelData.ribbonEmitters[i];
            const emitter = new M2RibbonEmitter(this, emitterData);
            this.ribbonEmitters.push(emitter)
        }

        
        this.textureUnitData = new Array(this.modelData.textureUnits.length);
        for(let i = 0; i < this.modelData.textureUnits.length; i++) {
            const texUnit = this.modelData.textureUnits[i];
            
            const materialKey = new MaterialKey(this.fileId, MaterialType.M2Material, i);
            let renderMaterial = new RenderMaterial(materialKey);

            const unkTexture = this.engine.getUnknownTexture();
            const texUnitData = { 
                color: Float4.one(),
                textureMatrices: [Float44.identity(), Float44.identity()],
                textureWeights: Float4.one(),
                textures: [unkTexture, unkTexture, unkTexture, unkTexture],
                material: renderMaterial
            }

            if (!(texUnit.textureComboIndex < 0 || texUnit.textureComboIndex > this.modelData.textureCombos.length)) {
                for(let j = 0; j < texUnit.textureCount; j++) {
                    const textureIndex = this.modelData.textureCombos[texUnit.textureComboIndex + j];
                    if (textureIndex > -1 && textureIndex < this.modelData.textures.length) {
                        const textureData = this.modelData.textures[textureIndex];
                        if (this.loadedTextures[textureData.textureId]) {
                            texUnitData.textures[j] = this.loadedTextures[textureData.textureId];
                        }
                    }
                }
            }

            // TODO: Check if these materials can be made static without reference to texunit data if no animated values.
            const material = this.modelData.materials[texUnit.materialIndex];
            const blendMode = M2BlendModeToEGxBlend(material.blendingMode);
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
                "u_texture1": texUnitData.textures[0],
                "u_texture2": texUnitData.textures[1],
                "u_texture3": texUnitData.textures[2],
                "u_texture4": texUnitData.textures[3],
                "u_textureWeights": texUnitData.textureWeights
            })

            this.engine.addEngineMaterialParams(renderMaterial);
            this.textureUnitData[i] = texUnitData;
        }
    }
}