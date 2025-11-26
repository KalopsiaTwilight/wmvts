import { Float2, Float4 } from "@app/math";
import { 
    BufferDataType, ColorMask, DrawingBatchRequest, GenericBatchRequest, GxBlend, 
    IDataBuffers, IShaderProgram, ITexture, ITextureOptions, RenderMaterial 
} from "@app/rendering/graphics";
import { IRenderer } from "@app/rendering/interfaces"

import { IBackground } from "./interfaces";
import vsProgramText from "./background.vert";
import fsProgramText from "./background.frag";
import { RenderObject } from "../renderObject";

const BATCH_IDENTIFIER = "BACKGROUND"
const BACKGROUND_LAYER_ID = -100;

export class Background extends RenderObject implements IBackground {
    fileId: number
    isLoaded: boolean;
    isDisposing: boolean;

    renderer: IRenderer;

    private material: RenderMaterial;
    private program: IShaderProgram;
    private dataBuffers: IDataBuffers
    private texture: ITexture;
    private transform: Float4;

    constructor() {
        super();
        this.fileId = -1;
        this.transform = Float4.create(0, 0, 1, 1);
    }

    attachToRenderer(renderer: IRenderer): void {
        this.renderer = renderer;
        
        this.program = this.renderer.getShaderProgram("BG", vsProgramText, fsProgramText);
        this.dataBuffers = this.renderer.getDataBuffers("BG-RECT", (graphics) => {
            const vertexDataBuffer = graphics.createVertexDataBuffer([
                { index: this.program.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 16, offset: 0 },
                { index: this.program.getAttribLocation('a_position'), size: 2, type: BufferDataType.Float, normalized: false, stride: 16, offset: 8 },
            ], true);

            vertexDataBuffer.setData(new Float32Array([
                0, 0, 1, 1, 
                1, 0, -1, 1, 
                0, 1, 1, -1, 
                1, 1, -1, -1
            ]));
            
            const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
            vertexIndexBuffer.setData(new Uint16Array([0, 1, 2, 1, 3, 2]));

            return graphics.createDataBuffers(vertexDataBuffer, vertexIndexBuffer);
        })
        this.texture = this.renderer.getSolidColorTexture([1,0,0,1]);
        this.createMaterial();
        this.isLoaded = true
    }

    update(deltaTime: number): void {
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, BACKGROUND_LAYER_ID, 0, 0)
        batchRequest.useMaterial(this.material)
            .useDataBuffers(this.dataBuffers)
            .drawIndexedTriangles(0, 6);
        this.renderer.submitDrawRequest(batchRequest)
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        this.isDisposing = true;
        this.material = null;
        this.program = null;
        this.dataBuffers = null;
        this.renderer = null;
        this.transform = null;
    }

    setOffset(offset: Float2) {
        if (this.isDisposing) {
            return;
        }
        this.transform[0] = offset[0];
        this.transform[1] = offset[1];
    }

    setScale(scale: Float2) {
        if (this.isDisposing) {
            return;
        }
        this.transform[2] = scale[0];
        this.transform[3] = scale[1];
    }

    setTransform(transform: Float4) {
        if (this.isDisposing) {
            return;
        }
        Float4.copy(transform, this.transform);
    }

    useColor(color: Float4) {
        if (this.isDisposing) {
            return;
        }
        this.texture = this.renderer.getSolidColorTexture(color);
        this.createMaterial();
    }

    useTexture(texture: ITexture) {
        if (this.isDisposing) {
            return;
        }
        this.texture = texture;
        this.createMaterial();
    }

    useImage(url: string, opts?: ITextureOptions) {
        if (this.isDisposing) {
            return;
        }
        const img = new Image();
        img.onload = () => {
            const genericRequest = new GenericBatchRequest(BATCH_IDENTIFIER, BACKGROUND_LAYER_ID, 0, 0);
            genericRequest.do((graphics) => {
                const texture = graphics.createTextureFromImg(img, opts);
                this.texture = texture;
                this.createMaterial();
            })
            this.renderer.submitOtherGraphicsRequest(genericRequest);
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