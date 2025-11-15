import { 
    BufferDataType, ColorMask, GxBlend, IFrameBuffer, IShaderProgram, ITexture, RenderMaterial, 
    CharacterModel, Float4, RenderingEngine, OffMainDrawingRequest, GenericBatchRequest, IDataBuffers
} from "@app/rendering";

import vsProgramText from "./skinLayerTextureCombiner.vert";
import blendFsProgramText from "./skinLayerTextureCombiner.frag";

const BATCH_IDENTIFIER  = "CHAR-SKIN"

export class SkinLayerTextureCombiner {
    engine: RenderingEngine;
    width: number;
    height: number;
    textureType: number;

    blackTexture: ITexture;
    alphaTexture: ITexture;

    blendProgram: IShaderProgram;

    dataBuffers: IDataBuffers;

    frameBuffer: IFrameBuffer;

    // TODO: Possibly unnecessary
    parentId: number;

    outputTexture: ITexture;
    backgroundTexture: ITexture;

    currentBatchId: number;
    resolution: Float32Array;

    constructor(parent: CharacterModel, textureType: number, width: number, height: number) {
        this.parentId = parent.modelId;
        this.engine = parent.engine;
        this.textureType = textureType;
        this.width = width;
        this.height = height;

        this.blackTexture = this.engine.getSolidColorTexture([0,0,0,0]);
        this.alphaTexture = this.engine.getSolidColorTexture([0,0,0,1]);

        this.blendProgram = this.engine.getShaderProgram("SKIN_BLEND", vsProgramText, blendFsProgramText);
        this.dataBuffers = this.engine.getDataBuffers("SKIN-RECT", (graphics) => {
            const vertexDataBuffer = graphics.createVertexDataBuffer([
                { index: this.blendProgram.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 8, offset: 0 },
            ], true);
            vertexDataBuffer.setData(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));

            const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
            vertexIndexBuffer.setData(new Uint16Array([0, 1, 2, 1, 3, 2]));

            return {
                vertexDataBuffer,
                vertexIndexBuffer
            }
        })


        this.frameBuffer = this.engine.graphics.createFrameBuffer(this.width, this.height);

        this.outputTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.backgroundTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);

        this.currentBatchId = 0;
        this.resolution = new Float32Array([this.width, this.height]);
    }

    clear() {
        this.currentBatchId = 0;
        const clearRequest = new GenericBatchRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++)
        clearRequest.do((graphics) => {
            graphics.useFrameBuffer(this.frameBuffer);
            const blackColor = Float4.create(0,0,0,1);
            graphics.setColorBufferToTexture(this.outputTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.backgroundTexture);
            graphics.clearFrame(blackColor);
        });
        this.engine.submitOtherGraphicsRequest(clearRequest);
    }

    drawTextureSection(textures: [ITexture, ITexture, ITexture], x: number, y: number, width: number, height: number, blendMode: number) {
        const material = new RenderMaterial();

        const isUpscaled = textures[0].width < width || textures[0].height < height;

        const uniforms = {
            "u_drawX": x / this.width,
            "u_drawY": y / this.height, 
            "u_drawWidth": width / this.width,
            "u_drawHeight": height / this.height, 
            "u_blendMode": blendMode,
            "u_backgroundResolution": this.resolution,
            "u_isUpscaled": isUpscaled,
            "u_textureResolution": new Float32Array([textures[0].width, textures[0].height]),
            "u_diffuseTexture": textures[0] ? textures[0] : this.blackTexture,
            "u_specularTexture": textures[1] ? textures[1] : this.blackTexture,
            "u_emissiveTexture": textures[2] ? textures[2] : this.blackTexture,
            "u_backgroundTexture": this.backgroundTexture
        };

        material.useShaderProgram(this.blendProgram);
        material.useBlendMode(GxBlend.GxBlend_Opaque);
        material.useBackFaceCulling(false);
        material.useDepthTest(false);
        material.useDepthWrite(false);
        material.useColorMask(ColorMask.All);
        material.useUniforms(uniforms)

        const batchRequest = new OffMainDrawingRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++);
        batchRequest.useMaterial(material)
            .useDataBuffers(this.dataBuffers)
            .useFrameBuffer(this.frameBuffer)
            .writeColorOutputToTexture(this.outputTexture)
            .captureCurrentFrameToTexture(this.backgroundTexture)
            .drawIndexedTriangles(0, 6);
        this.engine.submitOtherGraphicsRequest(batchRequest);
    }
}