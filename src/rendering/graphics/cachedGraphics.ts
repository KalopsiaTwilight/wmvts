import { Float4 } from "@app/math";

import { 
    IGraphics, IShaderProgram, ITexture, IVertexAttributePointer, IVertexDataBuffer, 
    IVertexIndexBuffer, ColorMask, GxBlend, ITextureOptions, IFrameBuffer, 
    IDataBuffers
} from "./abstractions";

export abstract class CachedGraphics implements IGraphics {
    lastUsedVertexDataBuffer?: IVertexDataBuffer;
    lastUsedVertexIndexBuffer?: IVertexIndexBuffer;
    lastUsedShaderProgram?: IShaderProgram;
    lastUsedDatabuffers?: IDataBuffers;
    lastUsedFrameBuffer?: IFrameBuffer;

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
        this.lastUsedDatabuffers = undefined;

        this.lastUsedBlendMode = undefined;
        this.lastUsedDepthWrite = undefined;
        this.lastUsedDepthTest = undefined;
        this.lastUsedColorMask = undefined;
        this.lastUsedBackFaceCulling = undefined;
        this.lastUsedCounterClockWiseFrontFaces = undefined;
        this.lastUsedFrameBuffer = undefined;
    }

    abstract clearFrame(color: Float4): void;

    abstract endFrame(): void;


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

    useDataBuffers(db?: IDataBuffers): void {
        if (db == this.lastUsedDatabuffers) {
            return;
        }

        if (db) {
            db.bind();
        } else {
            this.lastUsedDatabuffers.unbind();
        }

        this.lastUsedDatabuffers = db;
    }

    useFrameBuffer(frameBuffer?: IFrameBuffer): void {
        if (frameBuffer == this.lastUsedFrameBuffer) {
            return;
        }

        if (frameBuffer) {
            frameBuffer.bind();
        } else {
            this.lastUsedFrameBuffer.unbind();
        }

        this.lastUsedFrameBuffer = frameBuffer;
    }

    abstract drawTriangles(offset: number, count: number): void;
    abstract drawIndexedTriangles(offset: number, count: number): void;
    abstract drawIndexedTriangleStrip(offset: number, count: number): void;

    abstract createTextureFromImg(img: HTMLImageElement, opts?: ITextureOptions): ITexture;
    abstract createSolidColorTexture(color: Float4): ITexture;
    abstract createEmptyTexture(width: number, height: number): ITexture;
    abstract setColorBufferToTexture(texture: ITexture): void;

    abstract createVertexIndexBuffer(dynamic: boolean): IVertexIndexBuffer
    abstract createVertexDataBuffer(pointers: IVertexAttributePointer[], dynamic: boolean): IVertexDataBuffer
    abstract createDataBuffers(indexBuffer?: IVertexIndexBuffer, dataBuffer?: IVertexDataBuffer): IDataBuffers;
    abstract createShaderProgram(vertexShader: string, fragmentShader: string): IShaderProgram
    abstract createFrameBuffer(width: number, height: number): IFrameBuffer;

    abstract copyFrameToTexture(texture: ITexture, x: number, y: number, width: number, height: number): void;
}