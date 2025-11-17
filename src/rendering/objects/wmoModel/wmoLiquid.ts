import { WoWWorldModelLiquid, WowWorldModelGroupFlags, WoWWorldModelGroup, WorldModelRootFlags } from "@app/modeldata"
import { Float2, Float3, Float4, AABB } from "@app/math";
import { BinaryWriter } from "@app/utils";
import { LiquidTypeMetadata } from "@app/metadata";

import { 
    ITexture, GxBlend, ColorMask, IShaderProgram, IDataBuffers, 
    BufferDataType, RenderMaterial, DrawingBatchRequest
} from "@app/rendering/graphics";
import { 
    IRenderingEngine
} from "@app/rendering/interfaces";
import { WorldPositionedObject } from "../worldPositionedObject"

import fragmentShaderProgramText from "./wmoLiquid.frag";
import vertexShaderProgramText from "./wmoLiquid.vert";

const TILE_SIZE = 1600 / 3;
const CHUNK_SIZE = TILE_SIZE / 16;
const UNIT_SIZE = CHUNK_SIZE / 8;

const BATCH_IDENTIFIER = "WMO-LIQUID"

export interface WMOLiquidVertexData {
    position: Float3;
    x: number;
    y: number;
    depth: number;
}

enum ProceduralTextureType {
    None,
    River,
    Ocean,
    Wmo
}

enum LiquidCategory {
    Water = 0,
    Ocean = 1,
    Lava = 2,
    Slime = 3,
}

const FIRST_NONBASIC_LIQUID_TYPE = 21;
const GREEN_LAVA = 15;
const MASKED_OCEAN = 1;
const MASKED_MAGMA = 2;
const MASKED_SLIME = 3;
const LIQUID_WMO_MAGMA = 19;
const LIQUID_WMO_OCEAN = 14;
const LIQUID_WMO_WATER = 13;
const LIQUID_WMO_SLIME = 20;

export class WMOLiquid extends WorldPositionedObject {
    fileId: number;
    data: WoWWorldModelLiquid
    groupData: WoWWorldModelGroup
    wmoFlags: WorldModelRootFlags;

    shaderProgram: IShaderProgram;
    dataBuffers: IDataBuffers;
    vertices: WMOLiquidVertexData[] = [];
    indices: number[] = [];
    materials: RenderMaterial[];

    liquidCategory: LiquidCategory;
    proceduralTextureType: ProceduralTextureType;
    liquidType: number;
    liquidTypeMetadata: LiquidTypeMetadata;
    metadataLoaded: boolean;
    texturesLoaded: boolean;

    textures: ITexture[];
    animatingTextureCount: number;

    constructor(data: WoWWorldModelLiquid, groupData: WoWWorldModelGroup, wmoFlags: WorldModelRootFlags) {
        super();
        this.fileId = -1;
        this.data = data;
        this.groupData = groupData;
        this.wmoFlags = wmoFlags;

        this.metadataLoaded = false;
        this.texturesLoaded = false;
    }

    override initialize(engine: IRenderingEngine): void {
        super.initialize(engine);

        this.shaderProgram = engine.getShaderProgram("WMOLiquid", vertexShaderProgramText, fragmentShaderProgramText);

        const potentialVertices: WMOLiquidVertexData[] = [];
        const [width, height] = this.data.liquidTiles;
        const depth = this.groupData.flags & WowWorldModelGroupFlags.Exterior ? 1000 : 0;
        for (let y = 0; y < height + 1; y++) {
            for (let x = 0; x < width + 1; x++) {
                const vertex = this.data.vertices[y * (width + 1) + x]
                const posX = this.data.position[0] + UNIT_SIZE * x;
                const posY = this.data.position[1] + UNIT_SIZE * y;
                const posZ = vertex.height;

                potentialVertices.push({ position: Float3.create(posX, posY, posZ), x, y, depth });
            }
        }

        this.setBoundingBox(AABB.fromVertices(potentialVertices.map(x => x.position)));

        let currentIndex = 0;
        let tempLiquidtype = -1;
        this.vertices = [];
        this.indices = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // UInt16.MaxValue -4
                if (currentIndex >= 65532) {
                    break;
                }

                const tileIndex = y * width + x;
                const tileData = this.data.tiles[tileIndex];
                // Tile invisible?
                if ((tileData.legacyLiquidType & 0x8) != 0) {
                    continue;
                }

                const p = y * (width + 1) + x;
                const vertexIndices = [p, p + 1, p + width + 2, p + width + 1];
                for (const vertexIndex of vertexIndices) {
                    if (vertexIndex > potentialVertices.length) {
                        continue;
                    }
                    this.vertices.push(potentialVertices[vertexIndex]);
                }
                // Make quad
                this.indices.push(currentIndex);
                this.indices.push(currentIndex + 1);
                this.indices.push(currentIndex + 2);
                this.indices.push(currentIndex + 2);
                this.indices.push(currentIndex + 3);
                this.indices.push(currentIndex);
                currentIndex += 4;

                if (tempLiquidtype < 0) {
                    tempLiquidtype = tileData.legacyLiquidType;
                }
            }
        }

        const vertexBuffer = this.engine.graphics.createVertexDataBuffer([
            { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 24, offset: 0 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 24, offset: 12 },
            { index: this.shaderProgram.getAttribLocation('a_depth'),    size: 1, type: BufferDataType.Float, normalized: false, stride: 24, offset: 20 },
        ], true);
        
        const buffer = new Uint8Array(this.vertices.length * 24);
        const writer = new BinaryWriter(buffer.buffer);
        for (let i = 0; i < this.vertices.length; i++) {
            writer.writeFloatLE(this.vertices[i].position[0]);
            writer.writeFloatLE(this.vertices[i].position[1]);
            writer.writeFloatLE(this.vertices[i].position[2]);
            writer.writeFloatLE(this.vertices[i].x);
            writer.writeFloatLE(this.vertices[i].y);
            writer.writeFloatLE(this.vertices[i].depth);
        }
        vertexBuffer.setData(buffer);

        const indexBuffer = this.engine.graphics.createVertexIndexBuffer(true);
        indexBuffer.setData(new Uint16Array(this.indices));
        
        this.dataBuffers = this.engine.graphics.createDataBuffers(vertexBuffer, indexBuffer);

        this.liquidType = this.getLiquidType(tempLiquidtype);
        this.engine.getLiquidTypeMetadata(this.liquidType).then(this.onMetadataLoaded.bind(this))
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        // Select material based upon time 
        const timePerTexture = 1000 / 10;
        const materialIndex = Math.floor((this.engine.timeElapsed / timePerTexture) % this.animatingTextureCount);
        const material = this.materials[materialIndex];

        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, this.liquidTypeMetadata.id, materialIndex);
        batchRequest.useMaterial(material);
        batchRequest.useDataBuffers(this.dataBuffers);
        batchRequest.drawIndexedTriangles(0, this.indices.length);
        this.engine.submitDrawRequest(batchRequest);
    }

    override dispose() {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        this.data = null;
        this.groupData = null;
        this.wmoFlags = null;

        this.dataBuffers.dispose();
        this.dataBuffers = null;
        this.vertices = null;
        this.indices = null;
        this.materials = null;

        this.liquidTypeMetadata = null;
        this.textures = null;
    }

    get isLoaded(): boolean {
        return this.metadataLoaded && this.texturesLoaded;
    }

    onMetadataLoaded(metadata: LiquidTypeMetadata) {
        if (metadata == null) {
            this.dispose();
            return;
        }
        
        if (this.isDisposing) {
            return;
        }

        this.liquidTypeMetadata = metadata;
        if (this.liquidTypeMetadata.name.includes("Slime")) {
            this.liquidCategory = LiquidCategory.Slime;
        } else if (this.liquidTypeMetadata.name.includes("Magma") || this.liquidTypeMetadata.name.includes("Lava")) {
            this.liquidCategory = LiquidCategory.Lava;
        } else if (this.liquidTypeMetadata.name.includes("Ocean")) {
            this.liquidCategory = LiquidCategory.Ocean;
        } else {
            this.liquidCategory = LiquidCategory.Water;
        }

        const texturePromises: Promise<void>[] = [];

        this.textures = new Array(metadata.textures.length);
        for (let i = 0; i < this.textures.length; i++) {
            const fileId = metadata.textures[i].fileDataId;
            if (fileId) {
                const promise = this.engine.getTexture(fileId).then((tex) => {
                    this.textures[i] = tex;
                });
                texturePromises.push(promise);
            }
        }

        this.animatingTextureCount = this.liquidTypeMetadata.namedTextures[0] ? metadata.textures.length : 0;

        const maybeProceduralTexture = this.liquidTypeMetadata.namedTextures[1];
        if (maybeProceduralTexture && maybeProceduralTexture.startsWith("procedural")) {
            if (maybeProceduralTexture.includes("River")) {
                this.proceduralTextureType = ProceduralTextureType.River;
            } else if (maybeProceduralTexture.includes("Ocean")) {
                this.proceduralTextureType = ProceduralTextureType.Ocean;
            } else if ((maybeProceduralTexture.includes("Wmo"))) {
                this.proceduralTextureType = ProceduralTextureType.Wmo;
            }
            this.animatingTextureCount--;
        } else {
            this.proceduralTextureType = ProceduralTextureType.None;
            if (maybeProceduralTexture) {
                this.animatingTextureCount--;
            }
        }

        for (let i = 2; i < metadata.namedTextures.length; i++) {
            if (metadata.namedTextures[i]) {
                this.animatingTextureCount--;
            }
        }

        this.animatingTextureCount = Math.max(0, this.animatingTextureCount);

        Promise.all(texturePromises).then(() => {
            this.setupMaterials();
            this.texturesLoaded = true;
        })
        this.metadataLoaded = true;
    }

    private getLiquidType(currentLiquidType: number) {
        let convertLiquid;
        if (this.wmoFlags & WorldModelRootFlags.UseLiquidTypeDbcId) {
            if (this.groupData.groupLiquid < FIRST_NONBASIC_LIQUID_TYPE) {
                convertLiquid = this.groupData.groupLiquid - 1;
            } else {
                return this.groupData.groupLiquid;
            }
        } else {
            if (this.groupData.groupLiquid === GREEN_LAVA) {
                convertLiquid = currentLiquidType;
            } else if (this.groupData.groupLiquid < FIRST_NONBASIC_LIQUID_TYPE) {
                convertLiquid = this.groupData.groupLiquid;
            } else {
                return this.groupData.groupLiquid + 1;
            }
        }

        const maskedLiquid = convertLiquid & 0x3;
        if (maskedLiquid === MASKED_OCEAN) {
            return LIQUID_WMO_OCEAN;
        } else if (maskedLiquid === MASKED_MAGMA) {
            return LIQUID_WMO_MAGMA;
        } else if (maskedLiquid === MASKED_SLIME) {
            return LIQUID_WMO_SLIME;
        } else if (this.groupData.flags & WowWorldModelGroupFlags.IsOceanWater) {
            return LIQUID_WMO_OCEAN;
        } else {
            return LIQUID_WMO_WATER;
        }
    }

    private setupMaterials() {
        this.materials = new Array(this.textures.length);
        for (let i = 0; i < this.textures.length; i++) {
            const texture = this.textures[i];
            const material = new RenderMaterial();
            material.useCounterClockWiseFrontFaces(true);
            material.useBackFaceCulling(false);
            material.useBlendMode(GxBlend.GxBlend_Alpha)
            material.useDepthTest(true);
            material.useDepthWrite(true);
            material.useColorMask(ColorMask.Alpha | ColorMask.Red | ColorMask.Blue | ColorMask.Green);
            material.useUniforms({
                "u_texture": texture,
                "u_modelMatrix": this.worldModelMatrix,
                "u_waterParams": Float2.create(this.liquidCategory, 0),
                // TODO: Make this configurable
                "u_oceanCloseColor": Float4.create(17 / 255, 75 / 255, 89 / 255, 1),
                "u_oceanFarColor": Float4.create(0, 29 / 255, 41 / 255, 1),
                "u_riverCloseColor": Float4.create(41 / 255, 76 / 255, 81 / 255, 1),
                "u_riverFarColor": Float4.create(26 / 255, 46 / 255, 51 / 255, 1),
                "u_waterAlphas": Float4.create(0.3, 0.8, 0.5, 1)
            })
            material.useShaderProgram(this.shaderProgram);
            this.engine.addEngineMaterialParams(material);
            this.materials[i] = material;
        }
    }
}