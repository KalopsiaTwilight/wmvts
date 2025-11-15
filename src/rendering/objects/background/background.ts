import { 
    BufferDataType, ColorMask, DrawingBatchRequest, Float2, Float4, GenericBatchRequest, GxBlend, 
    IDataBuffers, IShaderProgram, ITexture, ITextureOptions, RenderMaterial, RenderingEngine 
} from "@app/rendering";

import { RenderObject } from "../interfaces";

import vsProgramText from "./background.vert";
import fsProgramText from "./background.frag";

const BATCH_IDENTIFIER = "BACKGROUND"
const BACKGROUND_LAYER_ID = -100;

export class Background implements RenderObject {
    fileId: number;
    isLoaded: boolean;
    isDisposing: boolean;

    engine: RenderingEngine;

    private material: RenderMaterial;
    private program: IShaderProgram;
    private dataBuffers: IDataBuffers
    private texture: ITexture;
    private transform: Float4;

    constructor() {
        this.fileId = -1;
        this.transform = Float4.create(0, 0, 1, 1);
    }

    initialize(engine: RenderingEngine): void {
        this.engine = engine;
        
        this.program = this.engine.getShaderProgram("BG", vsProgramText, fsProgramText);
        this.dataBuffers = this.engine.getDataBuffers("BG-RECT", (graphics) => {
            const vertexDataBuffer = graphics.createVertexDataBuffer([
                { index: this.program.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 16, offset: 0 },
                { index: this.program.getAttribLocation('a_position'), size: 2, type: BufferDataType.Float, normalized: false, stride: 16, offset: 8 },
            ], true);

            // 
            vertexDataBuffer.setData(new Float32Array([
                0, 0, 1, 1, 
                1, 0, -1, 1, 
                0, 1, 1, -1, 
                1, 1, -1, -1
            ]));
            
            // vertexDataBuffer.setData(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));

            const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
            vertexIndexBuffer.setData(new Uint16Array([0, 1, 2, 1, 3, 2]));

            return {
                vertexDataBuffer,
                vertexIndexBuffer
            }
        })
        this.texture = this.engine.getSolidColorTexture([1,0,0,1]);
        this.createMaterial();
        this.isLoaded = true
    }

    update(deltaTime: number): void {
    }

    draw(): void {
        if (!this.isLoaded) {
            return;
        }

        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, BACKGROUND_LAYER_ID, 0, 0)
        batchRequest.useMaterial(this.material)
            .useDataBuffers(this.dataBuffers)
            .drawIndexedTriangles(0, 6);
        this.engine.submitDrawRequest(batchRequest)
    }

    dispose(): void {
        this.material = null;
        this.program = null;
        this.dataBuffers = null;
        this.engine = null;
    }

    setOffset(offset: Float2) {
        this.transform[0] = offset[0];
        this.transform[1] = offset[1];
    }

    setScale(scale: Float2) {
        this.transform[2] = scale[0];
        this.transform[3] = scale[1];
    }

    setTransform(transform: Float4) {
        Float4.copy(transform, this.transform);
    }

    useColor(color: Float4) {
        this.texture = this.engine.getSolidColorTexture(color);
        this.createMaterial();
    }

    useTexture(texture: ITexture) {
        this.texture = texture;
        this.createMaterial();
    }

    useImage(url: string, opts?: ITextureOptions) {
        const img = new Image();
        img.onload = () => {
            const genericRequest = new GenericBatchRequest(BATCH_IDENTIFIER, BACKGROUND_LAYER_ID, 0, 0);
            genericRequest.do((graphics) => {
                const texture = graphics.createTextureFromImg(img, opts);
                this.texture = texture;
                this.createMaterial();
            })
            this.engine.submitOtherGraphicsRequest(genericRequest);
        }
        if (new URL(url, window.location.href).origin != window.location.origin) {
            img.crossOrigin = "";
        }
        img.src = url;
    }

    private createMaterial() {
        this.material = new RenderMaterial();
        this.material.useShaderProgram(this.program);

        
        const uniforms = {
            "u_transform": this.transform,
            "u_texture": this.texture,
        };
        this.material.useBlendMode(GxBlend.GxBlend_Opaque);
        this.material.useBackFaceCulling(false);
        this.material.useDepthTest(false);
        this.material.useDepthWrite(false);
        this.material.useColorMask(ColorMask.All);
        this.material.useUniforms(uniforms);
    }
}