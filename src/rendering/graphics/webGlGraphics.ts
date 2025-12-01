import { createProgramInfo, createProgramInfoFromProgram, createTexture, ProgramInfo, setUniforms } from "twgl.js";

import { Float4 } from "@app/math";
import { Disposable } from "@app/disposable";

import { IGraphics, IVertexDataBuffer, IVertexIndexBuffer, IShaderProgram, 
    IUniformsData, IVertexAttributePointer, ITexture,
    GxBlend, ColorMask, BufferDataType,
    ITextureOptions,
    IFrameBuffer,
    IDataBuffers,
    IAttribLocations,
    RawImageData,
    IDataTexture
} from "./abstractions";
import { CachedGraphics } from "./cachedGraphics";

export class WebGlGraphics extends CachedGraphics implements IGraphics {
    gl: WebGLRenderingContext;
    glVaoExt: OES_vertex_array_object;
    glFloatTextures: OES_texture_float

    lastUsedVertexDataBuffer: IVertexDataBuffer;
    lastUsedVertexIndexBuffer: IVertexIndexBuffer;
    lastUsedShaderProgram: IShaderProgram;

    constructor(gl: WebGLRenderingContext) {
        super();
        this.gl = gl;
        this.glVaoExt = gl.getExtension("OES_vertex_array_object");
        this.glFloatTextures = this.gl.getExtension("OES_texture_float");
    }

    override startFrame(width: number, height: number): void {
        super.startFrame(width, height);
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, width, height);
        
        this.gl.depthFunc(this.gl.LEQUAL);
    }

    clearFrame(color?: Float4): void {
        if (color) {
            this.gl.clearColor(color[0], color[1], color[2], color[3]);
        }
        this.gl.depthMask(true);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    endFrame(): void {
        // Ensure no VAO is active when creating/altering databuffers outside of drawing
        if (this.lastUsedDatabuffers) {
            this.lastUsedDatabuffers.unbind();
        }
        // Ensure no frame buffer is bound after drawing
        if (this.lastUsedFrameBuffer) {
            this.lastUsedFrameBuffer.unbind();
        }
        // Ensure no texture is bound after done drawing
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
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

    setColorBufferToTexture(texture?: ITexture) {
        const glTexture = (texture as WebGLTextureAbstraction).texture 
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, glTexture, 0);
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
    
    copyFrameToTexture(texture: ITexture, x: number, y: number, width: number, height: number) {
        texture.bind();
        this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, x, y, width, height, 0);
        texture.unbind();
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
        const result = new WebGLTextureAbstraction(this.gl, glTexture);
        result.width = 1;
        result.height = 1;
        return result;
    }

    createEmptyTexture(width: number, height: number) {
        const gl = this.gl;
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        // TODO: Make this call part of texture abstraction?           
        gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
        const result = new WebGLTextureAbstraction(this.gl, glTexture);
        result.width = width;
        result.height = height;
        return result;
    }

    createDataTexture(width: number): IDataTexture {
        if (!this.glFloatTextures) {
            throw new Error("This function requires the OES_texture_float extension for WebGL");
        }

        return new WebGlDataTexture(this.gl, width);
    }

    createTextureFromImg(img: HTMLImageElement, opts: ITextureOptions): ITexture {
        const result = new WebGLTextureAbstraction(this.gl, createTexture(this.gl, {
            premultiplyAlpha: opts?.preMultiplyAlpha ? opts.preMultiplyAlpha : 0,
            src: img,
            auto: true,
            wrapS: opts?.clampS ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT,
            wrapT: opts?.clampT ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT,
            
        }));
        result.width = img.width;
        result.height = img.height;
        return result;
    }

    createTextureFromRawImgData(img: RawImageData, opts?: ITextureOptions): ITexture {
        const result = new WebGLTextureAbstraction(this.gl, createTexture(this.gl, {
            premultiplyAlpha: opts?.preMultiplyAlpha ? opts.preMultiplyAlpha : 0,
            src: img.pixelData,
            width: img.width,
            height: img.height,
            auto: true,
            wrapS: opts?.clampS ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT,
            wrapT: opts?.clampT ? this.gl.CLAMP_TO_EDGE : this.gl.REPEAT,
            
        }));
        result.width = img.width;
        result.height = img.height;
        return result;
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

    createShaderProgram(vertexShader: string, fragmentShader: string, attribLocations?: IAttribLocations): IShaderProgram {
        return new WebGLShaderProgram(this.gl, vertexShader, fragmentShader, attribLocations);
    }

    createDataBuffers(ib?: IVertexIndexBuffer, vb?: IVertexDataBuffer): IDataBuffers {
        const vao = new WebGlNativeVertexArrayObject(this.gl, this.glVaoExt);
        if (ib) {
            vao.setIndexBuffer(ib);
        }
        if (vb) {
            vao.addVertexDataBuffer(vb);
        }
        return vao;
    }

    createFrameBuffer(width: number, height: number): IFrameBuffer {
        return new WebGlFrameBuffer(this.gl, width, height);
    }
}

export class WebGLTextureAbstraction extends Disposable implements ITexture {
    gl: WebGLRenderingContext;
    texture: WebGLTexture

    fileId: number;
    width: number;
    height: number;

    constructor(gl: WebGLRenderingContext, texture: WebGLTexture) {
        super();
        this.gl = gl;
        this.texture = texture;

        this.fileId = 0;
        this.width = 0;
        this.height = 0;
    }

    bind(): void {
        if(this.isDisposing) {
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(): void {        
        if(this.isDisposing) {
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    swapFor(otherGlTexture?: WebGLTextureAbstraction): void {
        this.height = otherGlTexture.height;
        this.width = otherGlTexture.width;
        this.texture = otherGlTexture.texture;
        this.fileId = otherGlTexture.fileId;
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteTexture(this.texture);
        this.texture = null;
        this.gl = null;
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

    dispose() {
        this.gl = null;
    }
}

export class WebGLVertexIndexBuffer extends Disposable implements IVertexIndexBuffer {
    gl: WebGLRenderingContext;
    size: number;
    dynamic: boolean;
    buffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, dynamic: boolean) {
        super();
        this.gl = gl;
        this.dynamic = dynamic;
        this.buffer = gl.createBuffer();
        this.size = 0;
    }

    setData(bytes: Uint16Array) {
        if (this.isDisposing) {
            return;
        }
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
        if (this.isDisposing) {
            return;
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    }

    unbind() {
        if (this.isDisposing) {
            return;
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteBuffer(this.buffer)
    }
};

export class WebGlVertexDataBuffer extends Disposable implements IVertexIndexBuffer
{
    gl: WebGLRenderingContext;
    size: number;
    dynamic: boolean;
    buffer: WebGLBuffer;
    pointers: WebGlVertexAttribPointer[];

    constructor(gl: WebGLRenderingContext, pointers: WebGlVertexAttribPointer[], dynamic: boolean) {
        super();
        this.gl = gl;
        this.dynamic = dynamic;
        this.buffer = gl.createBuffer();
        this.size = 0;
        this.pointers = pointers;
    }

    bind() {
        if (this.isDisposing) {
            return;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        for(const pointer of this.pointers) {
            pointer.bind();
        }
    }

    unbind() {
        if (this.isDisposing) {
            return;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    setData(bytes: AllowSharedBufferSource) {
        if (this.isDisposing) {
            return;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        if (this.size < bytes.byteLength) {
            this.gl.bufferData(this.gl.ARRAY_BUFFER, bytes, this.dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW);
            this.size = bytes.byteLength;
        } else {
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, bytes)
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteBuffer(this.buffer);
        for(const pointer of this.pointers) {
            pointer.dispose();
        }
        this.pointers = null;
        this.buffer = null;
        this.gl = null;
    }
}
export class WebGLShaderProgram extends Disposable implements IShaderProgram
{
    gl: WebGLRenderingContext;
    programInfo: ProgramInfo;
    lastUniforms: IUniformsData;

    constructor(gl: WebGLRenderingContext, vsText: string, fsText: string, attribLocations?: IAttribLocations) {
        super();
        this.gl = gl
        this.programInfo = createProgramInfo(gl, [vsText, fsText], {
            attribLocations,
        })
        if (!this.programInfo)
            throw "Failed to create program";
    }

    getAttribLocation(name: string) {
        if (this.isDisposing) {
            return;
        }
        return this.gl.getAttribLocation(this.programInfo.program, name);
    }

    bind() {
        if (this.isDisposing) {
            return;
        }
        this.gl.useProgram(this.programInfo.program);
        this.lastUniforms = null;
    }

    useUniforms(uniforms: IUniformsData) {
        if (this.isDisposing) {
            return;
        }
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
        if (this.isDisposing) {
            return;
        }
        this.gl.useProgram(null);
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteProgram(this.programInfo.program)
        this.programInfo = null;
        this.lastUniforms = null;
        this.gl = null;
    }
}
export class WebGlNativeVertexArrayObject extends Disposable implements IDataBuffers {
    gl: WebGLRenderingContext;

    glVaoExt: OES_vertex_array_object;
    webGlVAO: WebGLVertexArrayObjectOES;

    vertexDataBuffers: IVertexDataBuffer[];
    vertexIndexBuffer: IVertexIndexBuffer;

    constructor(gl: WebGLRenderingContext, glVaoExt: OES_vertex_array_object) {
        super();
        this.gl = gl;

        this.glVaoExt = glVaoExt;
        this.webGlVAO = glVaoExt.createVertexArrayOES();
        this.vertexDataBuffers = [];
    }

    setIndexBuffer(buffer: IVertexIndexBuffer): void {
        if (this.isDisposing) {
            return;
        }
        this.bind();
        buffer.bind();
        this.unbind();
        this.vertexIndexBuffer = buffer;
    }

    addVertexDataBuffer(buffer: IVertexDataBuffer): void {
        if (this.isDisposing) {
            return;
        }
        this.bind();
        buffer.bind();
        this.unbind();
        this.vertexDataBuffers.push(buffer);
    }

    bind(): void {
        if (this.isDisposing) {
            return;
        }
        this.glVaoExt.bindVertexArrayOES(this.webGlVAO);
    }

    unbind(): void {
        if (this.isDisposing) {
            return;
        }
        this.glVaoExt.bindVertexArrayOES(null);
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.vertexIndexBuffer.dispose();
        this.glVaoExt.deleteVertexArrayOES(this.webGlVAO);
        for(const buffer of this.vertexDataBuffers) {
            buffer.dispose();
        }
        this.vertexDataBuffers = null;
        this.webGlVAO = null;
        this.glVaoExt = null;
        this.gl = null;
    }
}

export class WebGlFrameBuffer extends Disposable implements IFrameBuffer {    
    gl: WebGLRenderingContext;
    glFrameBuffer: WebGLFramebuffer;

    width: number;
    height: number;
    
    constructor(gl: WebGLRenderingContext, width: number, height: number) {
        super();
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.glFrameBuffer = gl.createFramebuffer();
    }

    bind(): void {
        if (this.isDisposing) {
            return;
        }
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glFrameBuffer);
        this.gl.viewport(0, 0, this.width, this.height);
    }
    
    unbind(): void {
        if (this.isDisposing) {
            return;
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteFramebuffer(this.glFrameBuffer);
        this.glFrameBuffer = null;
        this.gl = null;
    }
}

export class WebGlDataTexture extends Disposable implements IDataTexture {
    gl: WebGLRenderingContext;
    texture: WebGLTexture;
    width: number;

    constructor(gl: WebGLRenderingContext, width: number) {
        super();

        this.gl = gl;
        this.texture = this.gl.createTexture();
        this.width = width;
        this.bind();
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.unbind();
    }

    setData(data: Float32Array, numComponents: number, numElements: number): void {
        let textureData = data;
        if (data.length % 4 !== 0) {
            // Ensure data is arranged in 4 byte blocks.
            textureData = new Float32Array(numElements * 4);
            for(let i = 0; i < numElements; i++) {
                const srcOffset = i * numComponents;
                const destOffset = i * 4;
                for(let j = 0; j < numComponents; j++) {
                    textureData[destOffset + j] = data[srcOffset + j];
                }
            }
        }
        this.bind();
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, numElements, 0, this.gl.RGBA, this.gl.FLOAT, textureData);
        this.unbind();
    }

    bind(): void {
        if (this.isDisposing) {
            return;
        }
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    
    unbind(): void {
        if (this.isDisposing) {
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.gl.deleteTexture(this.texture);
    }
}