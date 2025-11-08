import { 
    BufferDataType, ColorMask, GxBlend, IFrameBuffer, IShaderProgram, ITexture, RenderMaterial, 
    CharacterModel, Float4, RenderingEngine, OffMainDrawingRequest, DrawingBatchRequest,
    GenericBatchRequest, IDataBuffers
} from "@app/rendering";

import vsProgramText from "./skinLayerTextureCombiner.vert";
import diffuseFsProgramText from "./skinLayerTextureCombiner_diffuse.frag"
import specularFsProgramText from "./skinLayerTextureCombiner_specular.frag"
import emmisiveFsProgramText from "./skinLayerTextureCombiner_emissive.frag"

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

    dataBuffers: IDataBuffers;

    frameBuffer: IFrameBuffer;

    // TODO: Possibly unnecessary
    parentId: number;

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

        this.blackTexture = this.engine.getSolidColorTexture([0,0,1,1]);
        this.alphaTexture = this.engine.getSolidColorTexture([0,0,0,1]);

        this.diffuseProgram = this.engine.getShaderProgram("SKIN_DIFFUSE", vsProgramText, diffuseFsProgramText);
        this.specularProgram = this.engine.getShaderProgram("SKIN_SPECULAR", vsProgramText, specularFsProgramText);
        this.emissiveProgram = this.engine.getShaderProgram("SKIN_EMISSIVE", vsProgramText, emmisiveFsProgramText);

        this.dataBuffers = this.engine.getDataBuffers("SKIN-RECT", (graphics) => {
            const vertexDataBuffer = graphics.createVertexDataBuffer([
                { index: this.diffuseProgram.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 8, offset: 0 },
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

        this.diffuseTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.emissiveTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.specularTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);
        this.backgroundTexture = this.engine.graphics.createEmptyTexture(this.width, this.height);

        this.currentBatchId = 0;
    }

    clear() {
        this.currentBatchId = 0;
        const clearRequest = new GenericBatchRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++)
        clearRequest.do((graphics) => {
            graphics.useFrameBuffer(this.frameBuffer);
            const blackColor = Float4.create(0,0,0,1);
            graphics.setColorBufferToTexture(this.diffuseTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.specularTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.emissiveTexture);
            graphics.clearFrame(blackColor);
            graphics.setColorBufferToTexture(this.backgroundTexture);
            graphics.clearFrame(blackColor);
        });
        this.engine.submitOtherGraphicsRequest(clearRequest);
    }

    drawTextureForDebug(index: number = 0) {
        const debugMaterial = new RenderMaterial();
        debugMaterial.useShaderProgram(this.specularProgram);

        let texture = this.diffuseTexture;
        switch(index) {
            case 1: texture = this.specularTexture;
            case 2: texture = this.emissiveTexture;
            case 3: texture = this.backgroundTexture;
        }
        
        const uniforms = {
            "u_drawX": 0,
            "u_drawY": 0, 
            "u_drawWidth": 1,
            "u_drawHeight": 1, 
            "u_specularTexture": texture,
        };
        debugMaterial.useBlendMode(GxBlend.GxBlend_Opaque);
        debugMaterial.useBackFaceCulling(false);
        debugMaterial.useDepthTest(false);
        debugMaterial.useDepthWrite(false);
        debugMaterial.useColorMask(ColorMask.All);
        debugMaterial.useUniforms(uniforms)

        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++)
        batchRequest.useMaterial(debugMaterial)
            .useDataBuffers(this.dataBuffers)
            .drawIndexedTriangles(0, 6);

        this.engine.submitDrawRequest(batchRequest);
    }

    drawTextureSection(textures: [ITexture, ITexture, ITexture], x: number, y: number, width: number, height: number, blendMode: number) {
        const diffuseMaterial = new RenderMaterial();
        diffuseMaterial.useShaderProgram(this.diffuseProgram);
        
        const specularMaterial = new RenderMaterial();
        specularMaterial.useShaderProgram(this.specularProgram);

        const emissiveMaterial = new RenderMaterial();
        emissiveMaterial.useShaderProgram(this.emissiveProgram);

        const materials = [diffuseMaterial, specularMaterial, emissiveMaterial];

        const uniforms = {
            "u_drawX": x / this.width,
            "u_drawY": y / this.height, 
            "u_drawWidth": width / this.width,
            "u_drawHeight": height / this.height, 
            "u_blendMode": blendMode,
            "u_backgroundResolution": new Float32Array([this.width, this.height]), // TODO: Instantiate once.
            "u_diffuseTexture": textures[0] ? textures[0] : this.blackTexture,
            "u_specularTexture": textures[1] ? textures[1] : this.blackTexture,
            "u_emissiveTexture": textures[2] ? textures[2]: this.alphaTexture,
            "u_backgroundTexture": this.backgroundTexture
        };

        for(const material of materials) {
            material.useBlendMode(GxBlend.GxBlend_Opaque);
            material.useBackFaceCulling(false);
            material.useDepthTest(false);
            material.useDepthWrite(false);
            material.useColorMask(ColorMask.All);
            material.useUniforms(uniforms)
        }

        const outputTextures = [this.diffuseTexture, this.specularTexture, this.emissiveTexture];

        for(let i = 0; i < materials.length; i++) {
            if (i > 0) {
                continue;
            }
            const batchRequest = new OffMainDrawingRequest(BATCH_IDENTIFIER, this.parentId, this.textureType, this.currentBatchId++);
            batchRequest.useMaterial(materials[i])
                .useDataBuffers(this.dataBuffers)
                .useFrameBuffer(this.frameBuffer)
                .writeColorOutputToTexture(outputTextures[i])
                .captureCurrentFrameToTexture(this.backgroundTexture)
                .drawIndexedTriangles(0, 6);
            this.engine.submitOtherGraphicsRequest(batchRequest);
        }
    }
}