import {
    AABB,
    BufferDataType, ColorMask, Float3, IShaderProgram, ITexture, IVertexArrayObject, M2BlendModeToEGxBlend, M2Model,
    RenderingBatchRequest, RenderingEngine
} from "@app/rendering";
import { BinaryWriter } from "@app/utils";
import { WoWWorldModelData, WoWWorldModelGroup, WowWorldModelGroupFlags, WoWWorldModelMaterialMaterialFlags } from "@app/modeldata";

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
    loadedTextures: { [key: number]: ITexture }
    // Used to cull / load doodads based on group
    groupDoodads: { [key: number]: M2Model[] }
    activeGroups: number[];
    lodGroupMap: number[];

    shaderProgram: IShaderProgram;
    groupVaos: IVertexArrayObject[]

    constructor(fileId: number) {
        super();
        this.isModelDataLoaded = false;
        this.isTexturesLoaded = false;
        this.fileId = fileId;

        this.doodadSetId = 0; //TODO: Investigate what this means.
        this.lodGroupMap = [];

        this.loadedTextures = {};
        this.groupDoodads = {};
        this.activeGroups = [];
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

        // Determine LOD levels per group
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const groupData = this.modelData.groupInfo[i];

            if (!(groupData.flags & WowWorldModelGroupFlags.Lod)) {
                this.activeGroups[i] = i;
                continue;
            }

            const distance = AABB.distanceToPoint(groupData.boundingBox, this.engine.cameraPosition);
            let lod = 0;
            if (distance > 800) {
                lod = 2;
            } else if (distance > 500) {
                lod = 1;
            }
            this.activeGroups[i] = this.lodGroupMap[lod * this.modelData.groupInfo.length + i];
        }

        // Update objects per group
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const groupDataIndex = this.activeGroups[i];

            for (const modelObj of this.groupDoodads[groupDataIndex]) {
                modelObj.update(deltaTime);
            }
        }

        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const cameraPos = this.engine.cameraPosition;

        let isInside = false;
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const groupInfo = this.modelData.groupInfo[i];
            if (groupInfo.flags & WowWorldModelGroupFlags.Interior && AABB.containsPoint(groupInfo.boundingBox, cameraPos)) {
                isInside = true;
                break;
            }
        }

        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const groupDataIndex = this.activeGroups[i];
            const groupData = this.modelData.groups[groupDataIndex];

            let drawGeometry = false;
            let drawObjects = false;
            if (groupData.flags & WowWorldModelGroupFlags.AlwaysDraw) {
                drawGeometry = true;
                drawObjects = true;
            }
            // Exterior
            else if (groupData.flags & WowWorldModelGroupFlags.Exterior) {
                if (AABB.visibleInFrustrum(groupData.boundingBox, this.engine.cameraFrustrum)) {
                    drawGeometry = true;
                    drawObjects = !isInside;
                }
            }
            // Interior
            else {
                if (AABB.visibleInFrustrum(groupData.boundingBox, this.engine.cameraFrustrum)) {
                    drawGeometry = true;
                    drawObjects = isInside;
                }
            }

            if (drawGeometry) {
                this.drawGroup(groupDataIndex, cameraPos)
            }

            if (drawObjects) {
                for (const modelObj of this.groupDoodads[groupDataIndex]) {
                    if (AABB.visibleInFrustrum(modelObj.worldBoundingBox, this.engine.cameraFrustrum)) {
                        modelObj.draw();
                    }
                }
            }
        }

        for (const child of this.children) {
            child.draw();
        }
    }

    override dispose(): void {
        super.dispose();
        for (let i = 0; i < this.modelData.groups.length; i++) {
            for (const model of this.groupDoodads[i]) {
                model.dispose();
            }
        }
        this.groupDoodads = null;
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
            this.dispose();
            return;
        }
        if (this.isDisposing) {
            return;
        }

        if (!this.parent) {
            this.resizeForBounds();
        }

        // TODO: This would be unneccesary with a data format closer to how WMOs are actually stored.
        this.makeLodMap();
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
        // TODO: Check if model references should be shared amongst LOD groups
        const refs = this.getDoodadSetRefs();
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const group = this.modelData.groups[i];
            this.groupDoodads[i] = [];
            const groupRefs = group.doodadReferences;
            for (let ref of groupRefs) {
                if (refs.indexOf(ref) !== -1) {
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

                    this.groupDoodads[i].push(doodadModel);
                }
            }
        }
    }

    private resizeForBounds() {
        this.engine.sceneCamera.resizeForBoundingBox(this.modelData.boundingBox);
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
                            if (!this.isDisposing) {
                                this.loadedTextures[fileId] = texture
                            }
                        })
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

    private drawGroup(i: number, cameraPos: Float3) {
        const groupData = this.modelData.groups[i];
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
            batchRequest.useColorMask(ColorMask.Alpha | ColorMask.Red | ColorMask.Blue | ColorMask.Green);

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

    private makeLodMap() {
        this.activeGroups = Array(this.modelData.groupInfo.length);
        this.lodGroupMap = Array(3 * this.modelData.groupInfo.length);
        const totalGroups = this.modelData.groupInfo.length;

        const skipGroups = [];
        for (let i = 0; i < this.lodGroupMap.length; i++) {
            if (i < totalGroups) {
                const groupInfo = this.modelData.groupInfo[i % totalGroups];
                if (!(groupInfo.flags & WowWorldModelGroupFlags.Lod)) {
                    skipGroups.push(i + totalGroups);
                    skipGroups.push(i + totalGroups + totalGroups);
                }
                this.lodGroupMap[i] = i % totalGroups;
                continue;
            }

            if (skipGroups.indexOf(i) > -1) {
                this.lodGroupMap[i] = i % totalGroups;
                continue;
            }

            const skipGroupsPassed = skipGroups.filter(x => x < i).length;
            this.lodGroupMap[i] = i - skipGroupsPassed;
        }
    }
}