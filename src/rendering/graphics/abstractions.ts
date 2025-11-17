import { IDisposable } from "@app/interfaces";
import { Float4 } from "@app/math";

export enum BufferDataType {
    Float,
    UInt8,
    UInt16,
    UInt32,
    Int8,
    Int16,
    Int32,
}

export enum ColorMask {
    None = 0,
    Red = 1,
    Green = 2,
    Blue = 4,
    Alpha = 8,
    All = 15,
}

export enum GxBlend {
    GxBlend_Invalid = -1,
    GxBlend_Opaque = 0,
    GxBlend_AlphaKey = 1,
    GxBlend_Alpha = 2,
    GxBlend_Add = 3,
    GxBlend_Mod = 4,
    GxBlend_Mod2x = 5,
    GxBlend_ModAdd = 6,
    GxBlend_InvSrcAlphaAdd = 7,
    GxBlend_InvSrcAlphaOpaque = 8,
    GxBlend_SrcAlphaOpaque = 9,
    GxBlend_NoAlphaAdd = 10,
    GxBlend_ConstantAlpha = 11,
    GxBlend_Screen = 12,
    GxBlend_BlendAdd = 13
}

const blendModeMapping = [
    GxBlend.GxBlend_Opaque,
    GxBlend.GxBlend_AlphaKey,
    GxBlend.GxBlend_Alpha,
    GxBlend.GxBlend_NoAlphaAdd,
    GxBlend.GxBlend_Add,
    GxBlend.GxBlend_Mod,
    GxBlend.GxBlend_Mod2x,
    GxBlend.GxBlend_BlendAdd,
]

export const M2BlendModeToEGxBlend = (blendMode: number) => {
    return blendModeMapping[blendMode];
}


export interface IBindable extends IDisposable {
    bind(): void;
    unbind(): void;
}

export interface ITexture extends IBindable {
    width: number;
    height: number;
    fileId: number;

    swapFor(other?: ITexture): void;
}

export interface IFrameBuffer extends IBindable {
    width: number;
    height: number;
}


export interface IVertexIndexBuffer extends IBindable {
    setData(data: Uint16Array): void;
}

export interface IVertexDataBuffer extends IBindable {
    setData(data: AllowSharedBufferSource): void;
}

export interface IShaderProgram extends IBindable {
    getAttribLocation(name: string): number;
    useUniforms(uniforms: IUniformsData): void
}

export interface IVertexAttributePointer {
    index: number;
    size: number;
    type?: BufferDataType;
    normalized?: boolean;
    stride?: number;
    offset?: number;
}

export interface IUniformsData {
    [key: string]: any;
}


export interface IVertexArrayObject extends IBindable {
    setIndexBuffer(buffer: IVertexIndexBuffer): void;
    addVertexDataBuffer(buffer: IVertexDataBuffer): void;
}


export interface ITextureOptions {
    preMultiplyAlpha?: number,
    clampS?: boolean,
    clampT?: boolean,
}

export interface IGraphics {
    startFrame(width: number, height: number): void;
    clearFrame(color?: Float4): void;

    useBlendMode(blendMode: GxBlend): void 
    useDepthWrite(val: boolean): void;
    useDepthTest(val: boolean): void;
    useBackFaceCulling(val: boolean): void;
    useCounterClockWiseFrontFaces(val: boolean): void;
    useColorMask(mask: ColorMask): void;

    useVertexIndexBuffer(buffer?: IVertexIndexBuffer): void;
    useVertexDataBuffer(buffer?: IVertexDataBuffer): void;
    useShaderProgram(program?: IShaderProgram): void;
    useVertexArrayObject(vao?: IVertexArrayObject): void;
    useFrameBuffer(frameBuffer?: IFrameBuffer): void;
    setColorBufferToTexture(texture?: ITexture): void;

    drawTriangles(offset: number, count: number): void;
    drawIndexedTriangles(offset: number, count: number): void;
    drawIndexedTriangleStrip(offset: number, count: number): void;

    createTextureFromImg(img: HTMLImageElement, opts?: ITextureOptions): ITexture;
    createSolidColorTexture(color: Float4): ITexture;
    createEmptyTexture(width: number, height: number): ITexture;

    createVertexArrayObject(): IVertexArrayObject;
    createVertexIndexBuffer(dynamic: boolean): IVertexIndexBuffer;
    createVertexDataBuffer(pointers: IVertexAttributePointer[], dynamic: boolean): IVertexDataBuffer;
    createShaderProgram(vertexShader: string, fragmentShader: string): IShaderProgram;
    createFrameBuffer(width: number, height: number): IFrameBuffer;

    copyFrameToTexture(texture: ITexture, x: number, y: number, width: number, height: number): void;
}


export interface IDataBuffers {
    vertexDataBuffer: IVertexDataBuffer;
    vertexIndexBuffer: IVertexIndexBuffer;
    vao?: IVertexArrayObject;
}