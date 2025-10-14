import { ColorMask, GxBlend, IGraphics, IShaderProgram, IUniformsData, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer } from "./abstractions";

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

export enum MaterialType {
    Unknown,
    WMOMaterial,
    WMOPortal,
    WMOLiquid,
    M2Material,
    M2ParticleMaterial,
    M2RibbonMaterial
}

export class MaterialKey {
    ownerId: number;
    type: MaterialType;
    materialId: number;

    constructor(fileId: number, type: MaterialType, materialId: number = -1) {
        this.ownerId = fileId;
        this.type = type;
        this.materialId = materialId;
    }

    compare(other: MaterialKey | null) {
        const ownerDiff = this.ownerId - other.ownerId;
        if (ownerDiff != 0) {
            return ownerDiff;
        }

        const typeDiff = this.type - other.type;
        if (typeDiff != 0) {
            return typeDiff;
        }
        return this.materialId - other.materialId;
    }

    toString() {
        return this.ownerId + "-" + this.materialId;
    }
}

export class RenderMaterial {
    key: MaterialKey;
    blendMode: GxBlend;
    depthWrite: boolean;
    depthTest: boolean;
    backFaceCulling: boolean;
    counterClockWiseFrontFaces: boolean;
    colorMask: ColorMask;
    uniforms: IUniformsData;

    shaderProgram?: IShaderProgram;

    constructor(key: MaterialKey) {
        this.key = key;
    }

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
    material: RenderMaterial;
    drawInstruction: DrawInstruction;

    vertexIndexBuffer?: IVertexIndexBuffer;
    vertexDataBuffer?: IVertexDataBuffer;
    vao?: IVertexArrayObject;

    constructor(material: RenderMaterial) {
        this.material = material;
    }

    useMaterial(material: RenderMaterial) {
        this.material = material
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

    submit(graphics: IGraphics) {
        this.material.bind(graphics);
        
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
    }
}