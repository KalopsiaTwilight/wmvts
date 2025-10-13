import { createProgramInfo, createTexture, ProgramInfo, setUniforms } from "twgl.js";
import { IGraphics, IVertexDataBuffer, IVertexIndexBuffer, IShaderProgram, 
    IUniformsData, IVertexAttributePointer, ITexture, IVertexArrayObject,
    GxBlend, ColorMask, BufferDataType,
    ITextureOptions
} from "./abstractions";
import { CachedGraphics } from "./cachedGraphics";
import { Float4 } from "../math";

export class WebGlGraphics extends CachedGraphics implements IGraphics {
    gl: WebGLRenderingContext;
    glVaoExt: OES_vertex_array_object;

    lastUsedVertexDataBuffer: IVertexDataBuffer;
    lastUsedVertexIndexBuffer: IVertexIndexBuffer;
    lastUsedShaderProgram: IShaderProgram;

    constructor(gl: WebGLRenderingContext) {
        super();
        this.gl = gl;
        this.glVaoExt = gl.getExtension("OES_vertex_array_object");
    }

    override startFrame(width: number, height: number): void {
        super.startFrame(width, height);
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, width, height);
        
        this.gl.depthFunc(this.gl.LEQUAL);
    }

    clearFrame(color: Float4): void {
        this.gl.clearColor(color[0], color[1], color[2], color[3]);
        this.gl.depthMask(true);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    
    activateBlendMode(blendMode: GxBlend) 
    {
        if (blendMode === GxBlend.GxBlend_Opaque) {
            this.gl.disable(this.gl.BLEND);
        } else {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendEquation(this.gl.FUNC_ADD);
        }
        switch(blendMode) {
            case GxBlend.GxBlend_Opaque:
                break;
            case GxBlend.GxBlend_AlphaKey:
                this.gl.blendFuncSeparate(this.gl.ONE, this.gl.ZERO, this.gl.ONE, this.gl.ONE);
                break;
            case GxBlend.GxBlend_Alpha:
                this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
                break;
            case GxBlend.GxBlend_Add:
                this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE, this.gl.ZERO, this.gl.ONE);
                break;
            case GxBlend.GxBlend_Mod:
                this.gl.blendFuncSeparate(this.gl.DST_COLOR, this.gl.ZERO, this.gl.DST_ALPHA, this.gl.ZERO)
                break;
            case GxBlend.GxBlend_Mod2x:
                this.gl.blendFuncSeparate(this.gl.DST_COLOR, this.gl.SRC_COLOR, this.gl.DST_ALPHA, this.gl.SRC_ALPHA);
                break;
            case GxBlend.GxBlend_ModAdd:
                this.gl.blendFuncSeparate(this.gl.DST_COLOR, this.gl.ONE, this.gl.DST_ALPHA, this.gl.ONE);
                break;
            case GxBlend.GxBlend_InvSrcAlphaAdd:
                this.gl.blendFuncSeparate(this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE);
                break;
            case GxBlend.GxBlend_InvSrcAlphaOpaque:
                this.gl.blendFuncSeparate(this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ZERO, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ZERO);
                break;
            case GxBlend.GxBlend_SrcAlphaOpaque:
                this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ZERO, this.gl.SRC_ALPHA, this.gl.ZERO);
                break;
            case GxBlend.GxBlend_NoAlphaAdd:
                this.gl.blendFuncSeparate(this.gl.ONE, this.gl.ONE, this.gl.ZERO, this.gl.ONE);
                break;
            case GxBlend.GxBlend_ConstantAlpha:
                this.gl.blendFuncSeparate(this.gl.CONSTANT_ALPHA, this.gl.ONE_MINUS_CONSTANT_ALPHA, this.gl.CONSTANT_ALPHA, this.gl.ONE_MINUS_CONSTANT_ALPHA);
                break;
            case GxBlend.GxBlend_Screen:
                this.gl.blendFuncSeparate(this.gl.ONE_MINUS_DST_COLOR, this.gl.ONE, this.gl.ONE, this.gl.ZERO);
                break;
            case GxBlend.GxBlend_BlendAdd:
                this.gl.blendFuncSeparate(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
                break;
        }
    }

    activateDepthWrite(val: boolean) {
        this.gl.depthMask(val);
    }

    activateDepthTest(val: boolean) {
        this.useGlFeature(this.gl.DEPTH_TEST, val);
    }

    activateBackFaceCulling(val: boolean) {
        this.useGlFeature(this.gl.CULL_FACE, val);
    }

    activateCounterClockWiseFrontFaces(val: boolean) {
        if (val) {
            this.gl.frontFace(this.gl.CCW);
        } else {
            this.gl.frontFace(this.gl.CW);
        }
    }

    activateColorMask(mask: ColorMask) {
        this.gl.colorMask(
            (mask & ColorMask.Red) > 0, 
            (mask & ColorMask.Green) > 0, 
            (mask & ColorMask.Blue) > 0, 
            (mask & ColorMask.Alpha) > 0
        );
    }
    
    drawTriangles(offset: number, count: number): void {
        this.gl.drawArrays(this.gl.TRIANGLES, offset, count);
    }

    drawIndexedTriangles(offset: number, count: number): void {
        this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, offset);
    }
    
    drawIndexedTriangleStrip(offset: number, count: number): void {
        this.gl.drawElements(this.gl.TRIANGLE_STRIP, count, this.gl.UNSIGNED_SHORT, offset);
    }

    private useGlFeature(feature: GLenum, val: boolean) {
        if (val) {
            this.gl.enable(feature);
        } else {
            this.gl.disable(feature);
        }
    }

    createSolidColorTexture(color: Float4): ITexture {
        const gl = this.gl;
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(Float4.scale(color, 255)));
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new WebGLTextureAbstraction(this.gl, glTexture);
    }

    createTextureFromImg(img: HTMLImageElement, opts: ITextureOptions): ITexture {
        return new WebGLTextureAbstraction(this.gl, createTexture(this.gl, {
            premultiplyAlpha: 0,
            src: img,
            auto: true,
            wrapS: opts?.clampS ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT,
            wrapT: opts?.clampT ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT
        }));
    }
    createVertexIndexBuffer(dynamic: boolean): IVertexIndexBuffer {
        return new WebGLVertexIndexBuffer(this.gl, dynamic);
    }
    createVertexDataBuffer(pointers: IVertexAttributePointer[], dynamic: boolean): IVertexDataBuffer {
        return new WebGlVertexDataBuffer(this.gl, pointers.map(
            (x) => new WebGlVertexAttribPointer(this.gl, x.index, x.size, 
                x.type ? x.type : BufferDataType.Float, 
                x.normalized ? true : false, 
                x.stride ? x.stride : 0, 
                x.offset ? x.offset : 0
            )
        ), dynamic);
    }
    createShaderProgram(vertexShader: string, fragmentShader: string): IShaderProgram {
        return new WebGLShaderProgram(this.gl, vertexShader, fragmentShader);
    }
    createVertexArrayObject(): IVertexArrayObject {
        return new WebGlNativeVertexArrayObject(this.gl, this.glVaoExt);
    }
}

export class WebGLTextureAbstraction implements ITexture {
    gl: WebGLRenderingContext;
    texture: WebGLTexture

    constructor(gl: WebGLRenderingContext, texture: WebGLTexture) {
        this.gl = gl;
        this.texture = texture;
    }

    bind(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(): void {
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

export class WebGlVertexAttribPointer implements IVertexAttributePointer {
    index: number;
    size: number;
    type: number;
    normalized: boolean;
    stride: number;
    offset: number;

    gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext, index: number, size: number, type: BufferDataType, normalized: boolean, stride: number, offset: number) {
        this.gl = gl;
        this.index = index;
        this.size = size;
        this.normalized = normalized;
        this.stride = stride;
        this.offset = offset;
        switch(type) {
            case BufferDataType.UInt8: this.type = gl.UNSIGNED_BYTE; break;
            case BufferDataType.UInt16: this.type = gl.UNSIGNED_SHORT; break;
            case BufferDataType.UInt32: this.type = gl.UNSIGNED_INT; break;
            case BufferDataType.Int8: this.type = gl.BYTE; break;
            case BufferDataType.Int16: this.type = gl.SHORT; break;
            case BufferDataType.Int32: this.type = gl.INT; break;
            case BufferDataType.Float: this.type = gl.FLOAT; break;
        }
    }

    bind(): void {
        this.gl.enableVertexAttribArray(this.index);
        this.gl.vertexAttribPointer(this.index, this.size, this.type, this.normalized, this.stride, this.offset);
    }

    unbind(): void {

    }
}

export class WebGLVertexIndexBuffer implements IVertexIndexBuffer {
    gl: WebGLRenderingContext;
    size: number;
    dynamic: boolean;
    buffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, dynamic: boolean) {
        this.gl = gl;
        this.dynamic = dynamic;
        this.buffer = gl.createBuffer();
        this.size = 0;
    }

    setData(bytes: Uint16Array) {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
        if (this.size < bytes.byteLength) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bytes, this.dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW);
            this.size = bytes.byteLength;
        } else {
            this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, bytes);
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }

    bind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    }

    unbind() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
};

export class WebGlVertexDataBuffer implements IVertexIndexBuffer
{
    gl: WebGLRenderingContext;
    size: number;
    dynamic: boolean;
    buffer: WebGLBuffer;
    pointers: WebGlVertexAttribPointer[];

    constructor(gl: WebGLRenderingContext, pointers: WebGlVertexAttribPointer[], dynamic: boolean) {
        this.gl = gl;
        this.dynamic = dynamic;
        this.buffer = gl.createBuffer();
        this.size = 0;
        this.pointers = pointers;
    }
    bind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        for(const pointer of this.pointers) {
            pointer.bind();
        }
    }
    unbind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }
    setData(bytes: AllowSharedBufferSource) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        if (this.size < bytes.byteLength) {
            this.gl.bufferData(this.gl.ARRAY_BUFFER, bytes, this.dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW);
            this.size = bytes.byteLength;
        } else {
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, bytes)
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }
}

export class WebGLShaderProgram implements IShaderProgram
{
    gl: WebGLRenderingContext;
    programInfo: ProgramInfo;
    lastUniforms: IUniformsData;

    constructor(gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) {
        this.gl = gl
        this.programInfo = createProgramInfo(gl, [vertexShader, fragmentShader])
        if (!this.programInfo)
            throw "Failed to create program";
    }

    getAttribLocation(name: string) {
        return this.gl.getAttribLocation(this.programInfo.program, name);
    }

    bind() {
        this.gl.useProgram(this.programInfo.program);
    }

    useUniforms(uniforms: IUniformsData) {
        if (uniforms === this.lastUniforms) {
            return;
        }
        this.lastUniforms = uniforms;
        for(let prop in uniforms) {
            if (uniforms[prop] && uniforms[prop].texture) {
                uniforms[prop] = uniforms[prop].texture;
            }
        }
        setUniforms(this.programInfo, uniforms);
    }

    unbind(): void {
        this.gl.useProgram(null);
    }
}

export class WebGlNativeVertexArrayObject implements IVertexArrayObject {
    gl: WebGLRenderingContext;

    glVaoExt: OES_vertex_array_object;
    webGlVAO: WebGLVertexArrayObjectOES;

    constructor(gl: WebGLRenderingContext, glVaoExt: OES_vertex_array_object) {
        this.gl = gl;

        this.glVaoExt = glVaoExt;
        this.webGlVAO = glVaoExt.createVertexArrayOES();
    }

    setIndexBuffer(buffer: IVertexIndexBuffer): void {
        this.bind();
        buffer.bind();
        this.unbind();
    }

    addVertexDataBuffer(buffer: IVertexDataBuffer): void {
        this.bind();
        buffer.bind();
        this.unbind();
    }

    bind(): void {
        this.glVaoExt.bindVertexArrayOES(this.webGlVAO);
    }

    unbind(): void {
        this.glVaoExt.bindVertexArrayOES(null);
    }
}