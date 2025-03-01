import { Float4 } from "../math";
import { IGraphics, IShaderProgram, ITexture, IVertexArrayObject, IVertexAttributePointer, IVertexDataBuffer, IVertexIndexBuffer, ColorMask, GxBlend } from "./abstractions";

export abstract class CachedGraphics implements IGraphics {
    lastUsedVertexDataBuffer?: IVertexDataBuffer;
    lastUsedVertexIndexBuffer?: IVertexIndexBuffer;
    lastUsedShaderProgram?: IShaderProgram;
    lastUsedVertexArrayObject?: IVertexArrayObject;

    lastUsedBlendMode?: GxBlend;
    lastUsedDepthWrite?: boolean;
    lastUsedDepthTest?: boolean;
    lastUsedBackFaceCulling?: boolean;
    lastUsedColorMask?: ColorMask;
    lastUsedCounterClockWiseFrontFaces?: boolean;

    constructor() {
    }

    startFrame(width: number, height: number) {
        this.lastUsedShaderProgram = undefined;
        this.lastUsedVertexDataBuffer = undefined;
        this.lastUsedVertexIndexBuffer = undefined;
        this.lastUsedVertexArrayObject = undefined;

        this.lastUsedBlendMode = undefined;
        this.lastUsedDepthWrite = undefined;
        this.lastUsedDepthTest = undefined;
        this.lastUsedColorMask = undefined;
        this.lastUsedBackFaceCulling = undefined;
        this.lastUsedCounterClockWiseFrontFaces = undefined;
    }
    abstract clearFrame(color: Float4): void;


    useBlendMode(blendMode: GxBlend): void {
        if (this.lastUsedBlendMode != blendMode) {
            this.activateBlendMode(blendMode);
            this.lastUsedBlendMode = blendMode;
        }
    }
    abstract activateBlendMode(blendMode: GxBlend): void;

    useDepthWrite(val: boolean): void {
        if (this.lastUsedDepthWrite != val) {
            this.activateDepthWrite(val);
            this.lastUsedDepthWrite = val;
        }
    }
    abstract activateDepthWrite(val: boolean): void;

    useDepthTest(val: boolean): void {
        if (this.lastUsedDepthTest != val) {
            this.activateDepthTest(val);
            this.lastUsedDepthWrite = val;
        }
    }
    abstract activateDepthTest(val: boolean): void;
    
    useBackFaceCulling(val: boolean): void {
        if (this.lastUsedBackFaceCulling != val) {
            this.activateBackFaceCulling(val);
            this.lastUsedBackFaceCulling = val;
        }
    }
    abstract activateBackFaceCulling(val: boolean): void;

    useCounterClockWiseFrontFaces(val: boolean): void {
        if (this.lastUsedCounterClockWiseFrontFaces != val) {
            this.activateCounterClockWiseFrontFaces(val);
            this.lastUsedCounterClockWiseFrontFaces = val;
        }
    }
    abstract activateCounterClockWiseFrontFaces(val: boolean): void;

    useColorMask(mask: ColorMask): void {
        if (this.lastUsedColorMask != mask) {
            this.activateColorMask(mask);
            this.lastUsedColorMask = mask;
        }
    }
    abstract activateColorMask(mask: ColorMask): void;

    useVertexIndexBuffer(buffer?: IVertexIndexBuffer): void {
        if (buffer == this.lastUsedVertexIndexBuffer) {
            return;
        }

        if (buffer) {
            buffer.bind();
        } else {
            this.lastUsedVertexIndexBuffer.unbind();
        }
        this.lastUsedVertexIndexBuffer = buffer;
    }

    useVertexDataBuffer(buffer?: IVertexDataBuffer): void {
        if (buffer == this.lastUsedVertexDataBuffer) {
            return;
        }

        if (buffer) {
            buffer.bind();
        } else {
            this.lastUsedVertexDataBuffer.unbind();
        }
        this.lastUsedVertexDataBuffer = buffer;
    }

    useShaderProgram(program?: IShaderProgram): void {
        if (program == this.lastUsedShaderProgram) {
            return;
        }

        if (program) {
            program.bind()
        } else {
            this.lastUsedShaderProgram.unbind();
        }

        this.lastUsedShaderProgram = program;
    }

    useVertexArrayObject(vao?: IVertexArrayObject): void {
        if (vao == this.lastUsedVertexArrayObject) {
            return;
        }

        if (vao) {
            vao.bind();
        } else {
            this.lastUsedVertexDataBuffer.unbind();
        }

        this.lastUsedVertexArrayObject = vao;
    }

    abstract drawTriangles(offset: number, count: number): void;
    abstract drawIndexedTriangles(offset: number, count: number): void;

    abstract createTextureFromImg(img: HTMLImageElement): ITexture;
    abstract createSolidColorTexture(color: Float4): ITexture;

    abstract createVertexArrayObject(): IVertexArrayObject;
    abstract createVertexIndexBuffer(dynamic: boolean): IVertexIndexBuffer
    abstract createVertexDataBuffer(pointers: IVertexAttributePointer[], dynamic: boolean): IVertexDataBuffer
    abstract createShaderProgram(vertexShader: string, fragmentShader: string): IShaderProgram
}