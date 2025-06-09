import { WoWBoneData, WoWBoneFlags, WoWMaterialFlags, WoWModelData, WoWTextureUnitData, WoWVertexData } from "@app/wowData";
import { BinaryWriter } from "@app/utils";
import { RenderingEngine, BufferDataType, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer, RenderObject, ColorMask, 
    Float4, Float3, ITexture, Float44, IShaderProgram, GxBlend, M2BlendModeToEGxBlend, 
    RenderingBatchRequest
} from "@app/rendering";
import { AnimationState } from "./animatedValue";

import fragmentShaderProgramText from "./m2Model.frag"; 
import vertexShaderProgramText from "./m2Model.vert";
import { getM2PixelShaderId, getM2VertexShaderId} from "./m2Shaders";
import { BaseRenderObject } from "../baseRenderObject";

const MAX_BONES = 256;

export interface TextureUnitData {
    texturesLoaded: boolean;
    color: Float4;
    textureWeights: Float4;
    textures: ITexture[];
    textureMatrices: Float44[];
}

export interface BoneData {
    hasUpdatedThisTick: boolean;
    boneOffsetMatrix: Float44;
    positionMatrix: Float44;
}

export class M2Model extends BaseRenderObject
{
    isModelDataLoaded: boolean;
    isTexturesLoaded: boolean;

    fileId: number;
    modelData: WoWModelData;

    shaderProgram: IShaderProgram;
    vertexDataBuffer: IVertexDataBuffer
    vertexIndexBuffer: IVertexIndexBuffer
    vao: IVertexArrayObject
    bonePositionBuffer: Float32Array; 

    animationState: AnimationState;
    loadedTextures: { [key: number]: ITexture };
    textureUnitData: TextureUnitData[]
    boneData: BoneData[];

    modelViewMatrix: Float44;
    invModelViewMatrix: Float44;
    isMirrored: boolean;
    drawOrderTexUnits: WoWTextureUnitData[];

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
    }

    get isLoaded() {
        return this.isModelDataLoaded && this.isTexturesLoaded;
    }

    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);
        this.shaderProgram = this.engine.getShaderProgram("M2", vertexShaderProgramText, fragmentShaderProgramText);

        this.vao = this.engine.graphics.createVertexArrayObject();
        this.vertexIndexBuffer = this.engine.graphics.createVertexIndexBuffer(true);
        this.vertexDataBuffer = this.engine.graphics.createVertexDataBuffer([
            { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 0 },
            { index: this.shaderProgram.getAttribLocation('a_normal'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 12 },
            { index: this.shaderProgram.getAttribLocation('a_bones'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 24},
            { index: this.shaderProgram.getAttribLocation('a_boneWeights'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 28 },
            { index: this.shaderProgram.getAttribLocation('a_texcoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 32 },
            { index: this.shaderProgram.getAttribLocation('a_texcoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 40 },
        ], true);


        this.engine.getM2ModelFile(this.fileId).then(this.onModelLoaded.bind(this));
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.animationState.update(deltaTime);

        Float44.multiply(this.modelMatrix, this.engine.viewMatrix, this.modelViewMatrix);
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
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const numBones = Math.min(MAX_BONES, this.modelData.bones.length);
        for(let i = 0; i < numBones; i++) {
            this.bonePositionBuffer.set(this.boneData[i].positionMatrix, 16 * i);
        }

        for(let i = 0; i < this.modelData.textureUnits.length; i++) {
            this.drawTextureUnit(this.modelData.textureUnits[i], i);
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
                        Float44.setColumn(parentPosMatrix, i, Float44.getColumn(this.modelViewMatrix, i))
                    }
                }
                // Ignore Rotation, i.e only apply scale 
                else if ((4 & bone.flags)) {
                    for(let i = 0; i < 3; i++) {
                        const col = Float44.getColumn(this.modelViewMatrix, i);
                        const colLength = Float4.length(col);
                        const parentCol = Float44.getColumn(parentPosMatrix, i);
                        const parentColLength = Float4.length(parentCol);
                        
                        // Apply scale to original vector by multiplying by (|scaled vector| / |orig vector|)
                        Float4.scale(col, parentColLength / colLength, col);
                        Float44.setColumn(parentPosMatrix, i, col);
                    }
                }
                // Ignore Scale, i.e. only apply rotation
                else {
                    for(let i = 0; i < 3; i++) {
                        const col = Float44.getColumn(this.modelViewMatrix, i);
                        const colLength = Float4.length(col);
                        const parentCol = Float44.getColumn(parentPosMatrix, i);
                        const parentColLength = Float4.length(parentCol);
                        
                        // Apply rotation to by scaling parent vector by (1 / |scaled vector| * |orig vector|)
                        Float4.scale(parentCol, 1 / parentColLength * colLength, col);
                        Float44.setColumn(parentPosMatrix, i, col);
                    }
                }

                let translate: Float4;
                // Ignore parent translate
                if (1 & bone.flags) {
                    translate = Float44.getColumn(this.modelViewMatrix, 3);
                } else {
                    const pivotVec4 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 1);
                    const pivotVec3 = Float4.create(bone.pivot[0], bone.pivot[1], bone.pivot[2], 0);

                    const translationVec = Float4.identity();
                    Float4.subtract(Float44.transformDirection(pivotVec4, originalPosMatrix), Float44.transformDirection(pivotVec3, parentPosMatrix), translationVec);
                    translationVec[3] = 1;
                    Float44.setColumn(parentPosMatrix, 3, translationVec);
                }
                translate[3] = 1;
                Float44.setColumn(parentPosMatrix, 3, translate)

                Float44.multiply(this.invModelMatrix, parentPosMatrix, parentPosMatrix);
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
                Float4.length(Float44.getColumn(data.positionMatrix, 0)),
                Float4.length(Float44.getColumn(data.positionMatrix, 1)),
                Float4.length(Float44.getColumn(data.positionMatrix, 2)),
            )

            switch (billboardFlags) {
                case WoWBoneFlags.SphericalBillboard: {
                    if (isAnimated) {
                        const xAxis = Float44.getColumn(animationMatrix, 0);
                        Float44.setColumn(positionMatrix, 0, Float4.normalize(
                            Float4.create(xAxis[1], xAxis[2], -xAxis[0], 0)
                        ));

                        const yAxis = Float44.getColumn(animationMatrix, 1);
                        Float44.setColumn(positionMatrix, 1, Float4.normalize(
                            this.isMirrored 
                                ? Float4.create(-yAxis[1], -yAxis[2], yAxis[0], 0) 
                                : Float4.create(yAxis[1], yAxis[2], -yAxis[0], 0) 
                        ))

                        const zAxis = Float44.getColumn(animationMatrix, 2);
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
                    const xAxis = Float4.normalize(Float44.getColumn(positionMatrix, 0));
                    Float44.setColumn(positionMatrix, 0, xAxis);

                    const yAxis = Float4.normalize(Float4.create(positionMatrix[4], -positionMatrix[0], 0, 0));
                    Float44.setColumn(positionMatrix, 1, yAxis);

                    const zAxis = Float4.cross(yAxis, xAxis);
                    zAxis[3] = 0;
                    Float44.setColumn(positionMatrix, 2, zAxis);
                }
                case WoWBoneFlags.CylindricalBillboardLockY: {
                    const yAxis = Float4.normalize(Float44.getColumn(positionMatrix, 1));
                    Float44.setColumn(positionMatrix, 1, yAxis);

                    const xAxis = Float4.normalize(Float4.create(-positionMatrix[5], positionMatrix[1], 0, 0));
                    Float44.setColumn(positionMatrix, 0, xAxis);

                    const zAxis = Float4.cross(yAxis, xAxis);
                    zAxis[3] = 0;
                    Float44.setColumn(positionMatrix, 2, zAxis);
                }
                case WoWBoneFlags.CylindricalBillboardLockZ: {
                    const zAxis = Float4.normalize(Float44.getColumn(positionMatrix, 2));
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

            Float44.setColumn(positionMatrix, 0, Float4.scale(Float44.getColumn(positionMatrix, 0), scaleVector[0]));
            Float44.setColumn(positionMatrix, 1, Float4.scale(Float44.getColumn(positionMatrix, 1), scaleVector[1]));
            Float44.setColumn(positionMatrix, 2, Float4.scale(Float44.getColumn(positionMatrix, 2), scaleVector[2]));

            const translationVec = Float4.identity();
            Float4.subtract(Float44.transformDirection(pivotVec4, positionMatrixCopy), Float44.transformDirection(pivotVec3, positionMatrix), translationVec);
            translationVec[3] = 1;
            Float44.setColumn(positionMatrix, 3, translationVec);
        }

        // Revert from modelview space
        Float44.multiply(this.invModelViewMatrix, data.positionMatrix, data.positionMatrix);

        data.hasUpdatedThisTick = true;
    }

    private updateTextureUnit(texUnit: WoWTextureUnitData, index: number) {
        const data = this.textureUnitData[index];

        if (!data.texturesLoaded) {
            const unkTexture = this.engine.getUnknownTexture();
            data.textures = [unkTexture, unkTexture, unkTexture, unkTexture];
            if (texUnit.textureComboIndex < 0 || texUnit.textureComboIndex > this.modelData.textureCombos.length) {
                data.texturesLoaded = true;
            }

            data.texturesLoaded = true;
            for(let i = 0; i < texUnit.textureCount; i++) {
                const textureIndex = this.modelData.textureCombos[texUnit.textureComboIndex + i];
                if (textureIndex > -1 && textureIndex < this.modelData.textures.length) {
                    const textureData = this.modelData.textures[textureIndex];
                    if (this.loadedTextures[textureData.textureId]) {
                        data.textures[i] = this.loadedTextures[textureData.textureId];
                    } else {
                        data.texturesLoaded = false;
                        return;
                    }
                }
            }
        }

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
        const material = this.modelData.materials[texUnit.materialIndex];
        const data = this.textureUnitData[index];

        const blendMode = M2BlendModeToEGxBlend(material.blendingMode);
        if (!data.texturesLoaded) {
            return;
        }

        const batchRequest = new RenderingBatchRequest();
        batchRequest.useVertexArrayObject(this.vao);
        batchRequest.useShaderProgram(this.shaderProgram);

        batchRequest.useBackFaceCulling((4 & material.flags) == 0);
        batchRequest.useCounterClockWiseFrontFaces(!this.isMirrored);
        batchRequest.useBlendMode(blendMode);
        batchRequest.useDepthTest((WoWMaterialFlags.DepthTest & material.flags) == 0);
        batchRequest.useDepthWrite((WoWMaterialFlags.DepthWrite & material.flags) == 0);

        batchRequest.useColorMask(ColorMask.Alpha | ColorMask.Blue | ColorMask.Green | ColorMask.Red);
        batchRequest.useUniforms({
            "u_boneMatrices": this.bonePositionBuffer,
            "u_modelMatrix": this.modelMatrix,
            "u_textureTransformMatrix1": data.textureMatrices[0],
            "u_textureTransformMatrix2": data.textureMatrices[1],
            "u_color": data.color,
            "u_vertexShader": getM2VertexShaderId(texUnit.shaderId, texUnit.textureCount), 
            "u_blendMode": blendMode,
            "u_pixelShader": getM2PixelShaderId(texUnit.shaderId, texUnit.textureCount),
            "u_unlit": 0 != (WoWMaterialFlags.Unlit & material.flags),
            "u_texture1": data.textures[0],
            "u_texture2": data.textures[1],
            "u_texture3": data.textures[2],
            "u_texture4": data.textures[3],
            "u_textureWeights": data.textureWeights
        })

        const subMesh = this.modelData.submeshes[texUnit.skinSectionIndex];
        batchRequest.drawIndexedTriangles(2 * (subMesh.triangleStart + 65536 * subMesh.level), subMesh.triangleCount);
        this.engine.submitBatchRequest(batchRequest);
    }

    private calculateBounds() {
        const max = this.animationState.currentAnimation.extentMax;
        const min = this.animationState.currentAnimation.extentMin
        const diff = Float3.subtract(max, min);

        this.engine.sceneCamera.setDistance(Float3.length(diff));
    }

    override dispose(): void {
        super.dispose();
        this.modelData = null;
        this.shaderProgram = null;
        this.vertexDataBuffer = null;
        this.vertexIndexBuffer = null;
        this.vao = null;
        this.bonePositionBuffer = null;
        this.animationState = null;
        this.loadedTextures = null;
        this.textureUnitData = null;
        this.boneData = null;
        this.modelMatrix = null;
        this.modelViewMatrix = null;
        this.invModelMatrix = null;
        this.invModelViewMatrix = null;
        this.drawOrderTexUnits = null;
    }

    onModelLoaded(data: WoWModelData|null) {
        if (data === null) {
            // TODO: Raise model loading error evt?
            this.dispose();
            return;
        }
        this.modelData = data;

        this.animationState = new AnimationState(this);
        this.animationState.useAnimation(0);
        if (!this.parent) {
            this.calculateBounds();
        }

        this.loadTextures();
        this.uploadVertexData(this.modelData.vertices);
        this.vertexIndexBuffer.setData(new Uint16Array(this.modelData.skinTriangles));
        this.vao.setIndexBuffer(this.vertexIndexBuffer);
        this.vao.addVertexDataBuffer(this.vertexDataBuffer);

        this.boneData = new Array(this.modelData.bones.length);
        for (let i = 0; i < this.modelData.bones.length; i++) {
            this.boneData[i] = { 
                boneOffsetMatrix: null, 
                hasUpdatedThisTick: false, 
                positionMatrix: Float44.identity() 
            };
        }

        this.textureUnitData = new Array(this.modelData.textureUnits.length);
        for(let i = 0; i < this.modelData.textureUnits.length; i++) {
            this.textureUnitData[i] = { 
                color: Float4.one(),
                textureMatrices: [Float44.identity(), Float44.identity()],
                textures: [],
                texturesLoaded: false,
                textureWeights: Float4.one()
            }
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
                this.engine.getTexture(textureId).then((texture) => {
                    this.loadedTextures[textureId] = texture
                }).catch(() => {
                    this.loadedTextures[textureId] = this.engine.getUnknownTexture();
                });
            } else {
                this.loadedTextures[i] = undefined;
            }
        }

        Promise.all(loadingPromises).then(() => {
            this.isTexturesLoaded = true;
        })
    }

    private uploadVertexData(vertices: WoWVertexData[]) {
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
        this.vertexDataBuffer.setData(buffer);
    }
}