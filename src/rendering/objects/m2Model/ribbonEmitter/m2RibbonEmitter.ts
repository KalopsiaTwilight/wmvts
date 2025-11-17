import { WoWRibbonEmiterData } from "@app/modeldata";
import { Float2, Float3, Float4, Float44 } from "@app/math";
import { IDisposable } from "@app/interfaces";

import { 
    BufferDataType, ColorMask, DrawingBatchRequest, GxBlend, IShaderProgram, IDataBuffers, 
    IVertexDataBuffer, IVertexIndexBuffer, M2BlendModeToEGxBlend, RenderMaterial
} from "@app/rendering/graphics";
import { IRenderingEngine } from "@app/rendering/interfaces";

import type { M2Model } from "../m2Model";
import fragmentShaderProgramText from "./m2RibbonEmitter.frag";
import vertexShaderProgramText from "./m2RibbonEmitter.vert";

const BATCH_IDENTIFIER = "M2-RIBBON"

interface Rect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

class RibbonVertex {
    pos: Float3;
    color: Float4;
    texCoord: Float2;

    constructor() {
        this.pos = Float3.zero();
        this.color = Float4.zero();
        this.texCoord = Float2.zero();
    }
}


export class M2RibbonEmitter implements IDisposable {
    index: number;
    isDisposing: boolean;
    parent: M2Model;
    m2data: WoWRibbonEmiterData;
    engine: IRenderingEngine;

    materials: RenderMaterial[];
    indexBuffer: IVertexIndexBuffer;
    vertexBuffer: IVertexDataBuffer;
    dataBuffers: IDataBuffers;
    shaderProgram: IShaderProgram;

    vertices: RibbonVertex[];
    edgeLifetimes: number[];
    invLifespan: number;
    texBox: Rect;
    colLength: number;
    rowLength: number;
    rows: number;
    cols: number;
    edgesPerSecond: number;
    edgeLifetime: number;
    texSlotBox: Rect;
    gravity: number;

    // animated props
    visible: boolean;
    color: Float4;
    texSlot: number;
    heightAbove: number;
    heightBelow: number;

    // working data
    edgeEnd: number;
    edgeStart: number;
    initializedPosition: boolean;
    didSingletonUpdate: boolean;
    prevPos: Float3;
    prevDir: Float3;
    prevVertical: Float3;
    currPos: Float3;
    currDir: Float3;
    currVertical: Float3;
    startTime: number;
    below0: Float3;
    below1: Float3;
    above0: Float3;
    above1: Float3;
    prevDirScaled: Float3;
    currDirScaled: Float3;
    minWorldBounds: Float3;
    maxWorldBounds: Float3;

    constructor(index: number, parent: M2Model, emitterData: WoWRibbonEmiterData) {
        this.index = index;
        this.isDisposing = false;
        this.parent = parent;
        this.m2data = emitterData;
        this.engine = parent.engine;

        this.initialize();
    }

    initialize() {
        this.texBox = {
            minX: 0,
            minY: 0,
            maxX: 1,
            maxY: 1
        }

        let edgePs = Math.ceil(this.m2data.edgesPerSecond);
        let edgeLife = Math.max(0.25, this.m2data.edgeLifetime);
        let maxEdges = Math.ceil(edgeLife * edgePs);
        let newEdgesCount = Math.max(maxEdges + 2, 0);
        this.edgeLifetimes = new Array(newEdgesCount);
        this.vertices = new Array(2 * newEdgesCount);
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i] = new RibbonVertex();
        }
        this.invLifespan = 1 / edgeLife;

        let cols = this.m2data.textureCols;
        if ((cols & 0x80000000) != 0) {
            cols = ((cols & 1) | (cols >> 1)) + ((cols & 1) | (cols >> 1));
        }
        let rows = this.m2data.textureRows;
        if ((rows & 0x80000000) != 0) {
            rows = ((rows & 1) | (rows >> 1)) + ((rows & 1) | (rows >> 1))
        }
        this.colLength = (this.texBox.maxX - this.texBox.minX) / cols;
        this.rowLength = (this.texBox.maxY - this.texBox.minY) / rows;
        this.rows = rows;
        this.cols = cols;
        this.edgesPerSecond = edgePs;
        this.edgeLifetime = edgeLife;
        this.color = Float4.create(1, 1, 1, 1);
        this.texSlot = 0;
        this.texSlotBox = {
            minX: this.texBox.minX,
            minY: this.texBox.minY,
            maxX: this.texBox.minX + this.colLength,
            maxY: this.texBox.minY + this.rowLength
        }
        this.heightAbove = 10;
        this.heightBelow = 10;
        this.gravity = this.m2data.gravity;
        this.visible = true;
        this.initializedPosition = false;
        this.didSingletonUpdate = false;

        this.edgeStart = 0;
        this.edgeEnd = 0;

        this.prevPos = Float3.zero();
        this.prevDir = Float3.zero();
        this.prevVertical = Float3.zero();
        this.currPos = Float3.zero();
        this.currDir = Float3.zero();
        this.currVertical = Float3.zero();
        this.startTime = 0;
    
        this.below0 = Float3.zero();
        this.below1 = Float3.zero();
        this.above0 = Float3.zero();
        this.above1 = Float3.zero();
        this.prevDirScaled = Float3.zero();
        this.currDirScaled = Float3.zero();
        this.minWorldBounds = Float3.zero();
        this.maxWorldBounds = Float3.zero();

        this.setupGraphics();
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        this.isDisposing = true;

        this.parent = null;
        this.m2data = null;
        this.engine = null;

        this.materials = null;
        this.dataBuffers.dispose();
        this.dataBuffers = null;
        this.indexBuffer = null;
        this.vertexBuffer = null;
        this.shaderProgram = null;

        this.vertices = null;
        this.edgeLifetimes = null;
        this.texBox = null;
        this.color = null;
        this.prevPos = null;
        this.prevDir = null;
        this.prevVertical = null;
        this.currPos = null;
        this.currDir = null;
        this.currVertical = null;
        this.below0 = null;
        this.below1 = null;
        this.above0 = null;
        this.above1 = null;
        this.prevDirScaled = null;
        this.currDirScaled = null;
        this.minWorldBounds = null;
        this.maxWorldBounds = null;
    }

    update(deltaTime: number): void {
        this.updateAnimatedProps();
        this.updatePosition();

        deltaTime *= 0.001;
        if (!this.didSingletonUpdate) {
            if (this.edgesPerSecond > 0) {
                deltaTime = 1/this.edgesPerSecond + 0.000099999997;
            }
        }
        if (deltaTime >= 0) {
            if (this.edgeLifetime <= deltaTime) {
                deltaTime = this.edgeLifetime;
            }
        } else {
            deltaTime = 0;
        }

        while((deltaTime + this.edgeLifetimes[this.edgeStart]) >= this.edgeLifetime && this.edgeStart != this.edgeEnd) {
            this.edgeStart = this.advance(this.edgeStart, 1);
        }

        if (this.visible && this.initializedPosition) {
            this.updateDeltas();

            const edgesToSpawn = deltaTime * this.edgesPerSecond + this.startTime;
            let noNewEdges = false;
            let ooDenom, prevLeftoverEdges, newEdges, curQuad = 0;
            if (edgesToSpawn < 1) {
                noNewEdges = true;
            } else {
                prevLeftoverEdges = this.startTime;
                ooDenom = 1 / (edgesToSpawn - prevLeftoverEdges);
                newEdges = Math.max(Math.floor(edgesToSpawn - 1), 0);
            }

            if (!noNewEdges && newEdges > -1) {
                curQuad = 0;
                while (newEdges !== -1) {
                    curQuad += 1;
                    prevLeftoverEdges = this.startTime;

                    this.vertices[2 * this.edgeEnd].color = this.color;
                    this.vertices[2 * this.edgeEnd + 1].color = this.color;
                    this.interpEdge((curQuad - prevLeftoverEdges) * ooDenom * -deltaTime, (curQuad - prevLeftoverEdges) * ooDenom, 1)
                    newEdges--;
                }
            }

            this.startTime = edgesToSpawn - Math.floor(edgesToSpawn);
            this.interpEdge(0, 1, 0);

            const vertexA = this.vertices[2 * this.edgeEnd];
            vertexA.texCoord[0] = this.texSlotBox.minX;
            vertexA.texCoord[1] = this.texSlotBox.minY;
            vertexA.color = this.color;

            const vertexB = this.vertices[2 * this.edgeEnd + 1];
            vertexB.texCoord[0] = this.texSlotBox.maxX;
            vertexB.texCoord[1] = this.texSlotBox.maxY;
            vertexB.color = this.color;
        }


        this.minWorldBounds[2] = 3.4028235e37;
        this.minWorldBounds[1] = 3.4028235e37;
        this.minWorldBounds[0] = 3.4028235e37;

        this.maxWorldBounds[2] = -3.4028235e37;
        this.maxWorldBounds[1] = -3.4028235e37;
        this.maxWorldBounds[0] = -3.4028235e37;

        let currentEdge = this.edgeStart;
        while (currentEdge != this.edgeEnd) {
            const vertexA = this.vertices[2 * currentEdge];
            const vertexB = this.vertices[2 * currentEdge + 1];

            const gravVal = this.gravity * 2 * this.edgeLifetimes[currentEdge] * deltaTime + deltaTime * this.gravity * deltaTime;
            vertexA.pos[2] = vertexA.pos[2] + gravVal;
            vertexB.pos[2] = gravVal + vertexB.pos[2];

            this.minWorldBounds[0] = Math.min(this.minWorldBounds[0], vertexA.pos[0], vertexB.pos[0]);
            this.minWorldBounds[1] = Math.min(this.minWorldBounds[1], vertexA.pos[1], vertexB.pos[1]);
            this.minWorldBounds[2] = Math.min(this.minWorldBounds[2], vertexA.pos[2], vertexB.pos[2]);

            this.maxWorldBounds[0] = Math.max(this.maxWorldBounds[0], vertexA.pos[0], vertexB.pos[0]);
            this.maxWorldBounds[1] = Math.max(this.maxWorldBounds[1], vertexA.pos[1], vertexB.pos[1]);
            this.maxWorldBounds[2] = Math.max(this.maxWorldBounds[2], vertexA.pos[2], vertexB.pos[2]);

            this.edgeLifetimes[currentEdge] = deltaTime + this.edgeLifetimes[currentEdge];

            const nextCol = this.colLength * this.edgeLifetimes[currentEdge] * this.invLifespan + this.texSlotBox.minX;
            vertexA.texCoord[0] = nextCol;
            vertexA.texCoord[1] = this.texSlotBox.minY;
            vertexB.texCoord[0] = nextCol;
            vertexB.texCoord[1] = this.texSlotBox.maxY;


            const nextEdge = currentEdge + 1;
            currentEdge = nextEdge - this.edgeLifetimes.length;
            if (this.edgeLifetimes.length > nextEdge) {
                currentEdge = nextEdge;
            }
        }

        this.didSingletonUpdate = true;
        this.updateBuffers();
    }

    draw(): void {
        if (this.isDisposing) return;
        if (this.edgeStart == this.edgeEnd) {
            return;
        }

        for (let i = 0; i < this.materials.length; i++) {
            const count = this.edgeEnd > this.edgeStart 
                ? 2 * (this.edgeEnd - this.edgeStart) + 2 
                : 2 * (this.edgeLifetimes.length + this.edgeEnd - this.edgeStart) + 2;

            const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, this.parent.fileId, this.index, i);
            batchRequest.useMaterial(this.materials[i])
                .useDataBuffers(this.dataBuffers)
                .drawIndexedTriangleStrip(2 * this.edgeStart * 2, count);
            this.engine.submitDrawRequest(batchRequest);
        }
    }

    private updateAnimatedProps() {
        let color = Float3.zero();
        let alpha = 1;

        color = this.parent.animationState.getFloat3TrackValue(this.m2data.colorTrack, color);
        alpha = this.parent.animationState.getNumberTrackValue(this.m2data.alphaTrack, 0);

        Float3.copy(color, this.color);
        this.color[3] = Math.max(alpha / 32767, 0);

        this.heightAbove = this.parent.animationState.getNumberTrackValue(this.m2data.heightAboveTrack, 0);
        this.heightBelow = this.parent.animationState.getNumberTrackValue(this.m2data.heightBelowTrack, 0);
        const texSlot = this.parent.animationState.getNumberTrackValue(this.m2data.texSlotTrack, 0);

        if (this.texSlot != texSlot) {
            this.texSlot = texSlot;
            let texSlotMod = texSlot % this.cols
            if ((texSlotMod & 0x80000000) != 0) {
                texSlotMod = ((texSlotMod & 1) | (texSlotMod >> 1)) + ((texSlotMod & 1) | (texSlotMod >> 1));
            }

            const minX = texSlotMod * this.colLength + this.texBox.minX;
            this.texSlotBox.minX = minX;

            let texSlotDiv = texSlot / this.cols;
            if (0 != (0x80000000 & texSlotDiv)) {
                texSlotDiv = (1 & texSlotDiv) | (texSlotDiv >> 1);
                texSlotDiv = texSlotDiv + texSlotDiv;
            }
            let minY = texSlotDiv * this.rowLength + this.texBox.minY;
            this.texSlotBox.minY = minY;
            this.texSlotBox.maxX = minX + this.colLength;
            this.texSlotBox.maxY = minY + this.rowLength;
        }

        const visible = this.parent.animationState.getNumberTrackValue(this.m2data.visibilityTrack, 1) > 0;
        if (!visible) {
            this.initializedPosition = false;
        }
        this.visible = visible;
    }

    private updatePosition() {
        if (this.visible) {
            const posMatrix = Float44.identity();
            Float44.multiply(this.parent.worldModelMatrix, this.parent.boneData[this.m2data.boneIndex].positionMatrix, posMatrix);
            Float44.translate(posMatrix, this.m2data.position, posMatrix);

            const position = Float3.zero();
            Float44.getTranslation(posMatrix, position);
            if (this.initializedPosition) {
                Float3.copy(this.currPos, this.prevPos);
                Float3.copy(this.currDir, this.prevDir);
                Float3.copy(this.currVertical, this.prevVertical);
            } else {
                Float3.copy(position, this.prevPos);
                this.prevDir = Float44.getColumn3(posMatrix, 2);
                this.prevVertical = Float44.getColumn3(posMatrix, 1);
                this.startTime = 0;
                this.initializedPosition = true;
            }
            this.currPos = position;
            this.currDir = Float44.getColumn3(posMatrix, 2);
            this.currVertical = Float44.getColumn3(posMatrix, 1);
        }
    }

    private advance(currentIndex: number, steps: number) {
        let resultIndex = currentIndex + steps;
        let maxEdges = this.edgeLifetimes.length;
        if (resultIndex >= maxEdges) {
            resultIndex = resultIndex - maxEdges
        }
        return resultIndex;
    }

    private updateDeltas() {
        let tempVec = Float3.zero();
        Float3.subtract(this.prevPos, this.prevPos, tempVec);
        let scale = Float3.length(tempVec);

        Float3.scale(this.prevVertical, this.heightBelow, tempVec);
        Float3.subtract(this.prevPos, tempVec, this.below0);

        Float3.scale(this.currVertical, this.heightBelow, tempVec);
        Float3.subtract(this.currPos, tempVec, this.below1);

        Float3.scale(this.prevVertical, this.heightAbove, tempVec);
        Float3.add(this.prevPos, tempVec, this.above0);

        Float3.scale(this.currVertical, this.heightAbove, tempVec);
        Float3.add(this.currPos, tempVec, this.above1);

        Float3.scale(this.prevDir, scale, this.prevDirScaled);
        Float3.scale(this.currDir, scale, this.currDirScaled);
    }

    private interpEdge(age: number, t: number, advance: number) {
        const firstVertex = this.vertices[2 * this.edgeEnd];
        const secondVertex = this.vertices[2 * this.edgeEnd + 1];

        const tempVec = Float3.zero();

        Float3.scale(this.currDirScaled, 1 - t, tempVec);
        Float3.subtract(this.below1, tempVec, tempVec);
        Float3.scale(tempVec, t, firstVertex.pos);

        Float3.scale(this.prevDirScaled, t, tempVec);
        Float3.add(this.below0, tempVec, tempVec);
        Float3.scale(tempVec, 1 - t, tempVec);
        Float3.add(firstVertex.pos, tempVec, firstVertex.pos);

        Float3.scale(this.currDirScaled, 1 - t, tempVec);
        Float3.subtract(this.above1, tempVec, tempVec);
        Float3.scale(tempVec, t, secondVertex.pos);

        Float3.scale(this.prevDirScaled, t, tempVec);
        Float3.add(this.above0, tempVec, tempVec);
        Float3.scale(tempVec, 1 - t, tempVec);
        Float3.add(secondVertex.pos, tempVec, secondVertex.pos);

        this.edgeLifetimes[this.edgeEnd] = age;
        this.edgeEnd = this.edgeEnd + advance;
        if (this.edgeEnd >= this.edgeLifetimes.length) {
            this.edgeEnd -= this.edgeLifetimes.length;
        }
    }

    private updateBuffers() {
        let vertexData = new Array(this.vertices.length);
        let buffer = 0;
        for (let i = 0; i < this.vertices.length; ++i) {
            vertexData[buffer++] = this.vertices[i].pos[0];
            vertexData[buffer++] = this.vertices[i].pos[1];
            vertexData[buffer++] = this.vertices[i].pos[2];
            vertexData[buffer++] = this.vertices[i].color[0];
            vertexData[buffer++] = this.vertices[i].color[1];
            vertexData[buffer++] = this.vertices[i].color[2];
            vertexData[buffer++] = this.vertices[i].color[3];
            vertexData[buffer++] = this.vertices[i].texCoord[0];
            vertexData[buffer++] = this.vertices[i].texCoord[1];
        }
        this.vertexBuffer.setData(new Float32Array(vertexData));
    }

    private setupGraphics() {
        // Set up buffers
        this.shaderProgram = this.engine.getShaderProgram('M2RibbonEmitter',
            vertexShaderProgramText, fragmentShaderProgramText)

        this.vertexBuffer = this.engine.graphics.createVertexDataBuffer([
            { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 36, offset: 0 },
            { index: this.shaderProgram.getAttribLocation('a_color'), size: 4, type: BufferDataType.Float, normalized: false, stride: 36, offset: 12 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: 36, offset: 28 },
        ], true);
        this.indexBuffer = this.engine.graphics.createVertexIndexBuffer(true);

        let indexBufferData = new Uint16Array(4 * this.edgeLifetimes.length);
        for (let i = 0; i < indexBufferData.length; i++) {
            indexBufferData[i] = i % (2 * this.edgeLifetimes.length);
        }
        this.indexBuffer.setData(indexBufferData)

        this.dataBuffers = this.engine.graphics.createDataBuffers(this.vertexBuffer, this.indexBuffer);

        // Set up materials
        this.materials = [];
        for(let i = 0; i < this.m2data.textureIndices.length; i++) {
            const textureId = this.m2data.textureIndices[i];
            if (textureId <= -1 || textureId > this.parent.modelData.textures.length) {
                continue;
            }

            const texture = this.parent.textureObjects[textureId]

            let materialIndex = i;
            if (materialIndex >= this.m2data.materialIndices.length) {
                materialIndex = 0;
            }

            const material = this.parent.modelData.materials[this.m2data.materialIndices[materialIndex]];
            let blendMode = M2BlendModeToEGxBlend(material.blendingMode);
            // Assume ribbons are always at least transparent.
            if (blendMode === GxBlend.GxBlend_Opaque) {
                blendMode = GxBlend.GxBlend_Alpha;
            }

            let renderMaterial = new RenderMaterial();
            renderMaterial.useShaderProgram(this.shaderProgram);
            renderMaterial.useBackFaceCulling(false);
            renderMaterial.useCounterClockWiseFrontFaces(!this.parent.isMirrored);
            renderMaterial.useBlendMode(blendMode);
            renderMaterial.useDepthTest(true);
            renderMaterial.useDepthWrite(false);
            renderMaterial.useColorMask(ColorMask.Alpha | ColorMask.Blue | ColorMask.Green | ColorMask.Red);
            renderMaterial.useUniforms({
                "u_texture": texture
            });

            this.engine.addEngineMaterialParams(renderMaterial)
            this.materials.push(renderMaterial);
        }
    }
}