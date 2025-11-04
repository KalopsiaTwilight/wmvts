import { RenderingEngine } from "@app/rendering/engine";
import { 
    BufferDataType, ColorMask, GxBlend, IFrameBuffer, IShaderProgram, ITexture, IVertexDataBuffer, IVertexIndexBuffer,
     RenderingBatchRequest, RenderMaterial
} from "@app/rendering/graphics";

import vsProgramText from "./skinLayerTextureCombiner.vert";
import diffuseFsProgramText from "./skinLayerTextureCombiner_diffuse.frag"
import specularFsProgramText from "./skinLayerTextureCombiner_specular.frag"
import emmisiveFsProgramText from "./skinLayerTextureCombiner_emissive.frag"
import { CharacterModel, Float4 } from "@app/rendering";

const BATCH_IDENTIFIER  = "CHAR-SKIN"

export class SkinLayerTextureCombiner {
    engine: RenderingEngine;
    width: number;
    height: number;
    textureType: number;

    blackTexture: ITexture;
    alphaTexture: ITexture;

    diffuseProgram: IShaderProgram;
    specularProgram: IShaderProgram;
    emissiveProgram: IShaderProgram;

    vertexDataBuffer: IVertexDataBuffer;
    vertexIndexBuffer: IVertexIndexBuffer;

    frameBuffer: IFrameBuffer;

    // TODO: Possibly unnecessary
    parentId: number;

    // TODO: Create textures for diffuse, spec, emiss & result
    diffuseTexture: ITexture;
    specularTexture: ITexture;
    emissiveTexture: ITexture;
    backgroundTexture: ITexture;

    currentBatchId: number;

    constructor(parent: CharacterModel, textureType: number, width: number, height: number) {
        this.parentId = parent.modelId;
        this.engine = parent.engine;
        this.textureType = textureType;
        this.width = width;
        this.height = height;

        this.blackTexture = this.engine.getSolidColorTexture([0,0,0,0]);
        this.alphaTexture = this.engine.getSolidColorTexture([0,0,0,1]);

        this.diffuseProgram = this.engine.getShaderProgram("SKIN_DIFFUSE", vsProgramText, diffuseFsProgramText);
        this.specularProgram = this.engine.getShaderProgram("SKIN_SPECULAR", vsProgramText, specularFsProgramText);
        this.emissiveProgram = this.engine.getShaderProgram("SKIN_EMISSIVE", vsProgramText, emmisiveFsProgramText);

        // TODO: Update this and program texts
        this.vertexDataBuffer = this.engine.graphics.createVertexDataBuffer([
            { index: this.diffuseProgram.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 8, offset: 0 },
        ], true);
        // 0,0 1,0 0,1 1,1
        this.vertexDataBuffer.setData(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));

        this.vertexIndexBuffer = this.engine.graphics.createVertexIndexBuffer(true);
        // 1 quad
        this.vertexIndexBuffer.setData(new Uint16Array([0, 1, 2, 1, 3, 2]))

        this.frameBuffer = this.engine.graphics.createFrameBuffer(this.width, this.height);

        this.diffuseTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.emissiveTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.specularTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.backgroundTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);

        this.currentBatchId = 0;
    }

    clear() {
        this.currentBatchId = 0;
        // TODO: Make this unique based off layer & requestOrder;
        const clearRequest = new RenderingBatchRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++)
        clearRequest.doBeforeDraw((graphics) => {
            graphics.useFrameBuffer(this.frameBuffer);
            const blackColor = Float4.create(0,1,0,1);
            graphics.setColorBufferToTexture(this.diffuseTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.specularTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.emissiveTexture);
            graphics.clearFrame(blackColor);
        });
        // TODO: Submit these somewhere in special queue
        this.engine.submitOtherGraphicsRequest(clearRequest);
    }

    drawTextureSection(textures: [ITexture, ITexture, ITexture], x: number, y: number, width: number, height: number, blendMode: number) {
        
        // TODO: Check if this can be instantiated once
        const diffuseMaterial = new RenderMaterial();
        diffuseMaterial.useShaderProgram(this.diffuseProgram);
        
        const specularMaterial = new RenderMaterial();
        specularMaterial.useShaderProgram(this.specularProgram);

        const emissiveMaterial = new RenderMaterial();
        specularMaterial.useShaderProgram(this.specularProgram);

        const materials = [diffuseMaterial, specularMaterial, emissiveMaterial]

        for(const material of materials) {
            material.useBlendMode(GxBlend.GxBlend_Opaque);
            material.useBackFaceCulling(false);
            material.useDepthTest(false);
            material.useDepthWrite(false);
            material.useColorMask(ColorMask.All);

            material.useUniforms({
                "u_drawX": x / this.width,
                "u_drawY": y / this.height, 
                "u_drawWidth": width / this.width,
                "u_drawHeight": height / this.height, 
                "u_diffuseResolution": new Float32Array([textures[0].width, textures[0].height]),
                "u_blendMode": blendMode,
                "u_backgroundResolution": new Float32Array([this.width, this.height]), // TODO: Instantiate once.
                "u_diffuseTexture": textures[0] ? textures[0] : this.blackTexture,
                "u_specularTexture": textures[1] ? textures[1] : this.blackTexture,
                "u_emissiveTexture": textures[2] ? textures[2]: this.alphaTexture,
                "u_backgroundTexture": this.backgroundTexture
            })
        }

        const outputTextures = [this.diffuseTexture, this.specularTexture, this.emissiveTexture];

        for(let i = 0; i < materials.length; i++) {

            const batchRequest = new RenderingBatchRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++);
            batchRequest.useMaterial(materials[i]);
            batchRequest.useVertexDataBuffer(this.vertexDataBuffer);
            batchRequest.useVertexIndexBuffer(this.vertexIndexBuffer);
            batchRequest.useFrameBuffer(this.frameBuffer);
            batchRequest.writeColorOutputToTexture(outputTextures[i]);
            batchRequest.doBeforeDraw((graphics) => graphics.copyFrameToTexture(this.backgroundTexture, 0, 0, this.width, this.height));
            batchRequest.drawIndexedTriangles(0, 6);

            // TODO: Submit these for processing somewhere
            this.engine.submitOtherGraphicsRequest(batchRequest);
        }
    }
}