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

export class RenderingBatchRequest {
 
    blendMode: GxBlend;
    depthWrite: boolean;
    depthTest: boolean;
    backFaceCulling: boolean;
    counterClockWiseFrontFaces: boolean;
    colorMask: ColorMask;
    priority: number;

    vertexIndexBuffer?: IVertexIndexBuffer;
    vertexDataBuffer?: IVertexDataBuffer;
    shaderProgram?: IShaderProgram;
    vao?: IVertexArrayObject;
    
    drawInstruction?: DrawInstruction;

    uniforms: IUniformsData;

    constructor() {
        this.blendMode = GxBlend.GxBlend_Opaque;
        this.depthWrite = true;
        this.depthTest = true;
        this.backFaceCulling = true;
        this.counterClockWiseFrontFaces = false;
        this.colorMask = ColorMask.Alpha | ColorMask.Blue | ColorMask.Green |ColorMask.Red;
        this.priority = 0;
        this.uniforms = { };
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
    useVertexIndexBuffer(buffer?: IVertexIndexBuffer) {
        this.vertexIndexBuffer = buffer;
    }
    useVertexDataBuffer(buffer?: IVertexDataBuffer) {
        this.vertexDataBuffer = buffer;
    }
    useShaderProgram(program?: IShaderProgram) {
        this.shaderProgram = program;
    }
    useVertexArrayObject(vao?: IVertexArrayObject) {
        this.vao = vao;
    }
    useUniforms(uniforms: IUniformsData) {
        this.uniforms = { ...this.uniforms, ...uniforms}
    }
    usePriority(priority: number) {
        this.priority = priority;
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

    submit(graphics: IGraphics) {
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

        graphics.useVertexArrayObject(undefined);
    }
}