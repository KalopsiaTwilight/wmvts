import { BufferDataType, Float3, Float4, Float44, GxBlend, IShaderProgram, ITexture, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer, M2BlendModeToEGxBlend, M2Model, RenderingBatchRequest, RenderingEngine, RenderObject } from "@app/rendering";
import { BinaryWriter } from "@app/utils";
import { WoWWorldModelData, WowWorldModelGroupFlags, WoWWorldModelMaterialMaterialFlags } from "@app/wowData";

import fragmentShaderProgramText from "./wmoModel.frag";
import vertexShaderProgramText from "./wmoModel.vert";
import { getWMOPixelShader, getWMOVertexShader } from "./wmoShaders";
import { BaseRenderObject } from "../baseRenderObject";

export class WMOModel extends BaseRenderObject {
    isModelDataLoaded: boolean;
    isTexturesLoaded: boolean;

    fileId: number;
    modelData: WoWWorldModelData;
    doodadSetId: number;
    // Used to cull / load doodads based on group
    groupDoodads: { [key: number]: number[] }
    loadedTextures: { [key: number]: ITexture }

    shaderProgram: IShaderProgram;
    groupVaos: IVertexArrayObject[]

    currentLod: number;

    constructor(fileId: number) {
        super();
        this.isModelDataLoaded = false;
        this.isTexturesLoaded = false;
        this.fileId = fileId;

        this.doodadSetId = 0; //TODO: Investigate what this means.
        this.currentLod = 0;

        this.loadedTextures = {};
        this.groupDoodads = {};
    }

    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);
        this.shaderProgram = this.engine.getShaderProgram("WMO", vertexShaderProgramText, fragmentShaderProgramText);

        this.engine.getWMOModelFile(this.fileId).then(this.onModelLoaded.bind(this))
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        // Todo: cull visible objects/groups

        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const cameraPos = this.engine.sceneCamera.getPosition();

        for (let i = 0; i < this.modelData.groups.length; i++) {
            const groupData = this.modelData.groups[i];
            if (groupData.lod !== this.currentLod) {
                continue;
            } 
            for (let j = 0; j < groupData.batches.length; j++) {
                const batchData = groupData.batches[j];
                const material = this.modelData.materials[batchData.materialId];

                const blendMode = M2BlendModeToEGxBlend(material.blendMode);
                const vs = getWMOVertexShader(material.shader);
                const ps = getWMOPixelShader(material.shader);
                const unlit = (material.flags & WoWWorldModelMaterialMaterialFlags.Unlit) ? true : false
                const doubleSided = (material.flags & WoWWorldModelMaterialMaterialFlags.Unculled) != 0;

                const batchRequest = new RenderingBatchRequest();
                batchRequest.useCounterClockWiseFrontFaces(true);
                batchRequest.useBackFaceCulling(!doubleSided);
                batchRequest.useBlendMode(blendMode)
                batchRequest.useDepthTest(true);
                batchRequest.useDepthWrite(true);

                batchRequest.useShaderProgram(this.shaderProgram);
                batchRequest.useUniforms({
                    "u_modelMatrix": this.modelMatrix,
                    "u_cameraPos": cameraPos,
                    "u_pixelShader": ps,
                    "u_vertexShader": vs,
                    "u_blendMode": material.blendMode,
                    "u_unlit": unlit,
                    "u_texture1": this.loadedTextures[material.texture1],
                    "u_texture2": this.loadedTextures[material.texture2],
                    "u_texture3": this.loadedTextures[material.texture3]
                });

                batchRequest.useVertexArrayObject(this.groupVaos[i]);
                batchRequest.drawIndexedTriangles(batchData.startIndex * 2, batchData.indexCount);
                this.engine.submitBatchRequest(batchRequest);
            }
        }

        
        for (const child of this.children) {
            child.draw();
        }
    }

    override dispose(): void {
        super.dispose();
        this.modelData = null;
        if (this.groupVaos) {
            for (let i = 0; i < this.groupVaos.length; i++) {
                // TODO: Implement dispose
                this.groupVaos[i] = null;
            }
        }
        this.groupVaos = null;
        this.shaderProgram = null;
    }

    get isLoaded() {
        return this.isModelDataLoaded && this.isTexturesLoaded && this.children.every((x) => x.isLoaded);
    }

    onModelLoaded(data: WoWWorldModelData) {
        this.modelData = data;

        if (this.modelData == null) {
            // TODO: Raise model loading error evt?
            this.dispose();
            return;
        }

        if (!this.parent) {
            this.calculateBounds();
        }

        this.loadTextures();
        this.loadDoodads();

        this.groupVaos = new Array(this.modelData.groups.length);
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const vao = this.engine.graphics.createVertexArrayObject();

            const vb = this.uploadVertexDataForGroup(i);
            const ib = this.engine.graphics.createVertexIndexBuffer(true);
            ib.setData(new Uint16Array(this.modelData.groups[i].indices));

            vao.setIndexBuffer(ib);
            vao.addVertexDataBuffer(vb);

            this.groupVaos[i] = vao;
        }
        this.isModelDataLoaded = true;
    }

    private uploadVertexDataForGroup(index: number) {
        const group = this.modelData.groups[index];

        const vertexDataSize = 56;

        const vb = this.engine.graphics.createVertexDataBuffer([
            { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 0 },
            { index: this.shaderProgram.getAttribLocation('a_normal'), size: 3, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 12 },
            { index: this.shaderProgram.getAttribLocation('a_color1'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: vertexDataSize, offset: 24 },
            { index: this.shaderProgram.getAttribLocation('a_color2'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: vertexDataSize, offset: 28 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 32 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 40 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord3'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 48 },
        ], true)

        const numVertices = group.vertices.length;
        const bufferSize = vertexDataSize * numVertices;
        const buffer = new Uint8Array(bufferSize);
        const writer = new BinaryWriter(buffer.buffer);

        const numColors = group.vertexColors.length / group.vertices.length;
        if (numColors != Math.floor(numColors)) {
            throw new Error("Unexpected situation. Number of Vertex Colors is not cleanly divisible by number of vertices.")
        }

        const numUv = group.uvList.length / group.vertices.length;
        if (numUv != Math.floor(numUv)) {
            throw new Error("Unexpected situation. Number of UV coordinates is not cleanly divisible by number of vertices.");
        }

        for (let j = 0; j < group.vertices.length; j++) {
            writer.writeFloatLE(group.vertices[j][0]);
            writer.writeFloatLE(group.vertices[j][1]);
            writer.writeFloatLE(group.vertices[j][2]);
            writer.writeFloatLE(group.normals[j][0]);
            writer.writeFloatLE(group.normals[j][1]);
            writer.writeFloatLE(group.normals[j][2]);
            writer.writeUInt8(numColors > 0 ? group.vertexColors[j][0] : 0);
            writer.writeUInt8(numColors > 0 ? group.vertexColors[j][1] : 0);
            writer.writeUInt8(numColors > 0 ? group.vertexColors[j][2] : 0);
            writer.writeUInt8(numColors > 0 ? group.vertexColors[j][3] : 255);
            writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][0] : 0);
            writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][1] : 0);
            writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][2] : 0);
            writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][3] : 255);
            writer.writeFloatLE(numUv > 0 ? group.uvList[j][0] : 0);
            writer.writeFloatLE(numUv > 0 ? group.uvList[j][1] : 0);
            writer.writeFloatLE(numUv > 1 ? group.uvList[j + group.vertices.length][0] : 0);
            writer.writeFloatLE(numUv > 1 ? group.uvList[j + group.vertices.length][1] : 0);
            writer.writeFloatLE(numUv > 2 ? group.uvList[j + 2 * group.vertices.length][0] : 0);
            writer.writeFloatLE(numUv > 2 ? group.uvList[j + 2 * group.vertices.length][1] : 0);
        }
        vb.setData(buffer);
        return vb;
    }

    private loadDoodads() {
        const refs = this.getDoodadSetRefs();
        const refsToLoad = []

        // Calculate doodads per group and load active LOD group
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const group = this.modelData.groups[i];
            this.groupDoodads[i] = [];
            const groupRefs = group.doodadReferences;
            for (let ref of groupRefs) {
                if (refs.indexOf(ref) !== -1) {
                    this.groupDoodads[i].push(ref);
                    if (group.lod === this.currentLod) {
                        refsToLoad.push(ref);
                    }
                }
            }
        }

        for (const ref of refsToLoad) {
            const doodadDef = this.modelData.doodadDefs[ref];
            const modelId = this.modelData.doodadIds[doodadDef.nameOffset];
            if (modelId === 0) {
                continue;
            }
            const doodadModel = new M2Model(modelId);
            doodadModel.parent = this;
            const scale = Float3.create(doodadDef.scale, doodadDef.scale, doodadDef.scale);
            doodadModel.setModelMatrix(doodadDef.position, doodadDef.rotation, scale);
            doodadModel.initialize(this.engine);
            this.children.push(doodadModel);
        }
    }

    private calculateBounds() {
        const max = this.modelData.maxBoundingBox
        const min = this.modelData.minBoundingBox
        const diff = Float3.subtract(max, min);

        this.engine.sceneCamera.setDistance(Float3.length(diff));
    }

    private loadTextures() {
        const loadingPromises: Promise<void>[] = []
        this.loadedTextures[0] = this.engine.getUnknownTexture();
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const group = this.modelData.groups[i];
            for (let j = 0; j < group.batches.length; j++) {
                const batch = group.batches[j];
                const material = this.modelData.materials[batch.materialId];
                for (const fileId of [material.texture1, material.texture2, material.texture3]) {
                    if (fileId !== 0) {
                        const clampS = (material.flags & WoWWorldModelMaterialMaterialFlags.ClampS) > 0;
                        const clampT = (material.flags & WoWWorldModelMaterialMaterialFlags.ClampT) > 0;
                        const texturePromise = this.engine.getTexture(fileId, {
                            clampS, clampT
                        }).then((texture) => {
                            this.loadedTextures[fileId] = texture
                        }).catch(() => {
                            this.loadedTextures[fileId] = this.engine.getUnknownTexture();
                        });
                        loadingPromises.push(texturePromise)
                    }
                }
            }
        }
        Promise.all(loadingPromises).then(() => {
            this.isTexturesLoaded = true;
        })
    }

    private getDoodadSetRefs() {
        let defaultSet = this.modelData.doodadSets[0];
        if (this.doodadSetId > this.modelData.doodadSets.length) {
            this.doodadSetId = 0;
        }
        let refs = Array.from({ length: defaultSet.count }, (x, i) => i + defaultSet.startIndex);
        if (this.doodadSetId != 0) {
            const set = this.modelData.doodadSets[this.doodadSetId];
            refs.concat(Array.from({ length: set.count }, (x, i) => i + set.startIndex));
        }
        return refs;
    }
}