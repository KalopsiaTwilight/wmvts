import { 
    ColorMask, GxBlend, IDataBuffers, IFrameBuffer, IGraphics, IShaderProgram, ITexture, IUniformsData, 
} from "./abstractions";

export type BatchRequestGraphicsFn = (graphics: IGraphics) => void;
export class BatchRequestKey {
    ownerIdentifier: string;
    ownerId: string | number;
    materialId: number;
    batchIdentifier: number;

    constructor(ownerIdentifier: string, ownerId: string | number, materialId: number, batchIdentifier: number = 0) {
        this.ownerIdentifier = ownerIdentifier;
        this.ownerId = ownerId;
        this.materialId = materialId;
        this.batchIdentifier = batchIdentifier;
    }

    compareTo(other: BatchRequestKey | null) {
        const ownerIdentDiff = this.ownerIdentifier.localeCompare(other.ownerIdentifier);
        if (ownerIdentDiff != 0) {
            return ownerIdentDiff;
        }

        if (this.ownerId !== other.ownerId) {
            return (this.ownerId < other.ownerId) ? -1 : 1;
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

export type BatchRequestType = "draw" | "offMainDraw" | "generic";


export abstract class RenderingBatchRequest {
    key: BatchRequestKey
    abstract type: BatchRequestType;

    constructor(ownerIdentifier: string, ownerId: string | number, ownerType: number, batchIdentifier: number = 0) {
        this.key = new BatchRequestKey(ownerIdentifier, ownerId, ownerType, batchIdentifier);
    }

    submit(graphics: IGraphics) {
        this.beforeMain(graphics);
        this.main(graphics);
        this.afterMain(graphics);
    }

    protected beforeMain(graphics: IGraphics) {

    }
    protected main(graphics: IGraphics) {

    }

    protected afterMain(graphics: IGraphics) {

    }

    compareTo(other: RenderingBatchRequest) {
        return this.key.compareTo(other.key);
    }
}

export class DrawingBatchRequest extends RenderingBatchRequest {
    type: "draw";

    private material?: RenderMaterial;
    private dataBuffers?: IDataBuffers;

    protected override beforeMain(graphics: IGraphics): void {
        if (this.material) {
            this.material.bind(graphics);
        }

        if (this.dataBuffers) {
            graphics.useDataBuffers(this.dataBuffers);
        }
    }
    
    useMaterial(material: RenderMaterial) {
        this.material = material
        return this;
    }

    drawTriangles(offset: number, count: number) {
        this.main = (graphics) => graphics.drawTriangles(offset, count);
        return this;
    }

    drawIndexedTriangles(offset: number, count: number) {
        this.main = (graphics) => graphics.drawIndexedTriangles(offset, count);
        return this;
    }

    drawIndexedTriangleStrip(offset: number, count: number) {
        this.main = (graphics) => graphics.drawIndexedTriangleStrip(offset, count);
        return this;
    }

    useDataBuffers(dataBuffers: IDataBuffers) {
        this.dataBuffers = dataBuffers;
        return this;
    }

    override compareTo(other?: DrawingBatchRequest) {
        if (!other) {
            return 0;
        }
        
        if (this.material && other.material) {
            // Ensure Opaque batches are drawn before alpha blend batches.
            const layer1 = this.material.blendMode > GxBlend.GxBlend_Opaque ?
                this.material.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2 : 0
            const layer2 = other.material.blendMode > GxBlend.GxBlend_Opaque ?
                other.material.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2 : 0

            const layerDiff = layer1 - layer2;
            if (layerDiff != 0) {
                return layerDiff;
            }
        }

        return this.key.compareTo(other.key);
    }
}

export function isDrawingRequest(request: RenderingBatchRequest): request is RenderingBatchRequest {
    return request.type === "draw";
}

export class OffMainDrawingRequest extends RenderingBatchRequest {
    type: "offMainDraw";

    private material?: RenderMaterial;
    private frameBuffer?: IFrameBuffer;
    private colorOutputTexture?: ITexture;
    private copyToTexture?: ITexture;
    private dataBuffers?: IDataBuffers;

    protected override beforeMain(graphics: IGraphics) {
        if (this.frameBuffer) {
            graphics.useFrameBuffer(this.frameBuffer);
        }

        if (this.colorOutputTexture) {
            graphics.setColorBufferToTexture(this.colorOutputTexture);
        }

        if (this.copyToTexture) {
            graphics.copyFrameToTexture(this.copyToTexture, 0, 0, this.copyToTexture.width, this.copyToTexture.height)
        }
        
        if (this.material) {
            this.material.bind(graphics);
        }
        
        if (this.dataBuffers) {
            graphics.useDataBuffers(this.dataBuffers);
        }
    }

    useMaterial(material: RenderMaterial) {
        this.material = material;
        return this;
    }

    useFrameBuffer(frameBuffer: IFrameBuffer) {
        this.frameBuffer = frameBuffer;
        return this;
    }

    writeColorOutputToTexture(texture: ITexture) {
        this.colorOutputTexture = texture;
        return this;
    }

    captureCurrentFrameToTexture(texture: ITexture) {
        this.copyToTexture = texture;
        return this;
    }

    drawTriangles(offset: number, count: number) {
        this.main = (graphics) => graphics.drawTriangles(offset, count);
        return this;
    }

    drawIndexedTriangles(offset: number, count: number) {
        this.main = (graphics) => graphics.drawIndexedTriangles(offset, count);
        return this;
    }

    drawIndexedTriangleStrip(offset: number, count: number) {
        this.main = (graphics) => graphics.drawIndexedTriangleStrip(offset, count);
        return this;
    }

    
    useDataBuffers(dataBuffers: IDataBuffers) {
        this.dataBuffers = dataBuffers;
        return this;
    }
}

export function isOffMainDrawingRequest(request: RenderingBatchRequest): request is RenderingBatchRequest {
    return request.type === "offMainDraw";
}

export class GenericBatchRequest extends RenderingBatchRequest {
    type: "generic";

    do(fn: (graphics: IGraphics) => void) {
        this.main = fn;
    }
}

export function isGenericRequest(request: RenderingBatchRequest): request is RenderingBatchRequest {
    return request.type === "generic";
}
