import { ColorMask, GxBlend, IFrameBuffer, IGraphics, IShaderProgram, ITexture, IUniformsData, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer } from "./abstractions";

export enum DrawInstructionType {
    Triangle,
    TriangleStrip
}

export interface DrawInstruction {
    indexed: boolean;
    offset: number;
    count: number;
    type: DrawInstructionType
}

export type BatchRequestGraphicsFn = (graphics: IGraphics) => void;
export class BatchRequestKey {
    ownerIdentifier: string;
    ownerId: number;
    materialId: number;
    batchIdentifier: number;

    constructor(ownerIdentifier: string, ownerId: number, materialId: number, batchIdentifier: number = 0) {
        this.ownerIdentifier = ownerIdentifier;
        this.ownerId = ownerId;
        this.materialId = materialId;
        this.batchIdentifier = batchIdentifier;
    }

    compare(other: BatchRequestKey | null) {
        const ownerIdentDiff = this.ownerIdentifier.localeCompare(other.ownerIdentifier);
        if (ownerIdentDiff != 0) {
            return ownerIdentDiff;
        }

        const ownerDiff = this.ownerId - other.ownerId;
        if (ownerDiff != 0) {
            return ownerDiff;
        }

        const ownerTypeDiff = this.materialId - other.materialId;
        if (ownerTypeDiff != 0) {
            return ownerTypeDiff;
        }

        return this.batchIdentifier - other.batchIdentifier;
    }

    toString() {
        return this.ownerIdentifier + "-" + this.ownerId + "-" + this.materialId + "-" + this.batchIdentifier;
    }
}

export class RenderMaterial {
    blendMode: GxBlend;
    depthWrite: boolean;
    depthTest: boolean;
    backFaceCulling: boolean;
    counterClockWiseFrontFaces: boolean;
    colorMask: ColorMask;
    uniforms: IUniformsData;

    shaderProgram?: IShaderProgram;

    useBlendMode(blendMode: GxBlend) {
        this.blendMode = blendMode;
    }
    useDepthWrite(val: boolean) {
        this.depthWrite = val;
    }
    useDepthTest(val: boolean) {
        this.depthTest = val;
    }
    useBackFaceCulling(val: boolean) {
        this.backFaceCulling = val;
    }
    useCounterClockWiseFrontFaces(val: boolean) {
        this.counterClockWiseFrontFaces = val;
    }
    useColorMask(mask: ColorMask) {
        this.colorMask = mask;
    }
    useShaderProgram(program?: IShaderProgram) {
        this.shaderProgram = program;
    }
    useUniforms(uniforms: IUniformsData) {
        this.uniforms = { ...this.uniforms, ...uniforms };
    }

    bind(graphics: IGraphics) {
        graphics.useBackFaceCulling(this.backFaceCulling);
        graphics.useBlendMode(this.blendMode);
        graphics.useColorMask(this.colorMask);
        graphics.useCounterClockWiseFrontFaces(this.counterClockWiseFrontFaces);
        graphics.useDepthTest(this.depthTest);
        graphics.useDepthWrite(this.depthWrite);

        if (this.shaderProgram) {
            graphics.useShaderProgram(this.shaderProgram);
            this.shaderProgram.useUniforms(this.uniforms);
        }
    }
}

export class RenderingBatchRequest {
    key: BatchRequestKey
    beforeDraw?: BatchRequestGraphicsFn;
    afterDraw?: BatchRequestGraphicsFn;

    vertexIndexBuffer?: IVertexIndexBuffer;
    vertexDataBuffer?: IVertexDataBuffer;
    vao?: IVertexArrayObject;
    frameBuffer?: IFrameBuffer;
    colorOutputTexture?: ITexture;
    material?: RenderMaterial;
    drawInstruction?: DrawInstruction;


    constructor(ownerIdentifier: string, ownerId: number, ownerType: number, batchIdentifier: number = 0) {
        this.key = new BatchRequestKey(ownerIdentifier, ownerId, ownerType, batchIdentifier);
    }

    useMaterial(material: RenderMaterial) {
        this.material = material
    }

    useFrameBuffer(frameBuffer: IFrameBuffer) {
        this.frameBuffer = frameBuffer;
    }

    writeColorOutputToTexture(texture: ITexture) {
        this.colorOutputTexture = texture;
    }

    drawTriangles(offset: number, count: number) {
        this.drawInstruction = {
            indexed: false,
            offset, count,
            type: DrawInstructionType.Triangle
        };
    }
    drawIndexedTriangles(offset: number, count: number) {
        this.drawInstruction = {
            indexed: true,
            offset, count,
            type: DrawInstructionType.Triangle
        };
    }
    drawIndexedTriangleStrip(offset: number, count: number) {
        this.drawInstruction = {
            indexed: true,
            offset, count,
            type: DrawInstructionType.TriangleStrip
        };
    }

    useVertexIndexBuffer(buffer?: IVertexIndexBuffer) {
        this.vertexIndexBuffer = buffer;
    }
    useVertexDataBuffer(buffer?: IVertexDataBuffer) {
        this.vertexDataBuffer = buffer;
    }
    useVertexArrayObject(vao?: IVertexArrayObject) {
        this.vao = vao;
    }

    doBeforeDraw(fn: BatchRequestGraphicsFn) {
        this.beforeDraw = fn;
    }
    doAfterDraw(fn: BatchRequestGraphicsFn) {
        this.afterDraw = fn;
    }

    submit(graphics: IGraphics) {
        if (this.frameBuffer) {
            graphics.useFrameBuffer(this.frameBuffer);
        }

        if (this.colorOutputTexture) {
            graphics.setColorBufferToTexture(this.colorOutputTexture);
        }

        if (this.beforeDraw) {
            this.beforeDraw(graphics);
        }

        if (this.material) {
            this.material.bind(graphics);
        }
        
        if (this.vertexDataBuffer) {
            graphics.useVertexDataBuffer(this.vertexDataBuffer);
        }
        if (this.vertexIndexBuffer) {
            graphics.useVertexIndexBuffer(this.vertexIndexBuffer);
        }
        if (this.vao) {
            graphics.useVertexArrayObject(this.vao);
        }

        if (this.drawInstruction) {
            if (this.drawInstruction.type === DrawInstructionType.Triangle) {
                if (this.drawInstruction.indexed) {
                    graphics.drawIndexedTriangles(this.drawInstruction.offset, this.drawInstruction.count);
                } else {
                    graphics.drawTriangles(this.drawInstruction.offset, this.drawInstruction.count);
                }
            }
            if (this.drawInstruction.type === DrawInstructionType.TriangleStrip) {
                graphics.drawIndexedTriangleStrip(this.drawInstruction.offset, this.drawInstruction.count)
            }
        }

        if (this.afterDraw) {
            this.afterDraw(graphics);
        }
    }
}