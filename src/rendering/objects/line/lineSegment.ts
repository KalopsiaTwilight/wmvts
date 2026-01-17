import { Float2, Float3, Float4 } from "@app/math";
import {
    BufferDataType, ColorMask, DrawingBatchRequest, GenericBatchRequest, GxBlend,
    IDataBuffers, IShaderProgram, ITexture, ITextureOptions, RenderMaterial
} from "@app/rendering/graphics";
import { IRenderer } from "@app/rendering/interfaces"

import vsProgramText from "./lineSegment.vert";
import fsProgramText from "./lineSegment.frag";
import { WorldPositionedObject } from "../worldPositionedObject";

const BATCH_IDENTIFIER = "LINESEGMENT"
const LAYER_ID = -50;

export class LineSegment extends WorldPositionedObject {
    fileId: number
    isLoaded: boolean;
    isDisposing: boolean;

    renderer: IRenderer;

    // Properties
    lineWidth: number;
    startPos: Float3;
    endPos: Float3;
    startColor: Float4;
    endColor: Float4;

    private material: RenderMaterial;
    private program: IShaderProgram;
    private dataBuffers: IDataBuffers
    private texture: ITexture;

    constructor(lineWidth: number, startPos: Float3, endPos: Float3) {
        super();
        this.fileId = -1;
        
        this.lineWidth = lineWidth;
        this.startPos = Float3.copy(startPos);
        this.endPos = Float3.copy(endPos);
        this.updateBoundingBox();
    }

    attachToRenderer(renderer: IRenderer): void {
        this.renderer = renderer;

        if (this.isLoaded) {
            return;
        }
        this.program = this.renderer.getShaderProgram(this, BATCH_IDENTIFIER, vsProgramText, fsProgramText);

        this.dataBuffers = this.renderer.getDataBuffers(this, BATCH_IDENTIFIER + "-RECT", (graphics) => {
            const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
            vertexIndexBuffer.setData(new Uint16Array([
                0, 2, 1,
                2, 3, 1,
                2, 4, 3,
                4, 5, 3,
                4, 6, 5,
                6, 7, 5
            ]));

            const positionBuffer = graphics.createVertexDataBuffer([
                { index: this.program.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 12, offset: 0 },
            ], true);
            positionBuffer.setData(new Float32Array([
                - 1, 2, 0,
                1, 2, 0,
                -1, 1, 0,
                1, 1, 0,
                -1, 0, 0,
                1, 0, 0,
                -1, -1, 0,
                1, -1, 0
            ]));


            const texCoordBuffer = graphics.createVertexDataBuffer([
                { index: this.program.getAttribLocation('a_texCoord'), size: 2, type: BufferDataType.Float, normalized: false, stride: 8, offset: 0 },
            ], true);
            texCoordBuffer.setData(new Float32Array([
                -1, 2,
                1, 2,
                -1, 1,
                1, 1,
                -1, -1,
                1, -1,
                -1, -2,
                1, -2
            ]));

            const dataBuffers = graphics.createDataBuffers(vertexIndexBuffer, positionBuffer);
            dataBuffers.addVertexDataBuffer(texCoordBuffer);
            return dataBuffers;
        })

        this.texture = this.renderer.getSolidColorTexture([1, 0, 0, 1]);
        this.createMaterial();
        this.isLoaded = true
    }

    update(deltaTime: number): void {
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, LAYER_ID, 0, 0)
        batchRequest.useMaterial(this.material)
            .useDataBuffers(this.dataBuffers)
            .drawIndexedTriangles(0, 18);
        this.renderer.submitDrawRequest(batchRequest)
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.material = null;
        this.program = null;
        this.dataBuffers = null;
        this.renderer = null;
        this.startPos = null;
        this.endPos = null;
        this.startColor = null;
        this.endColor = null;
    }

    setStartPos(pos: Float3) {
        Float3.copy(pos, this.startPos);
        this.updateBoundingBox();
    }

    setEndPos(pos: Float3) {
        Float3.copy(pos, this.endPos);
        this.updateBoundingBox();
    }

    setTexture(texture: ITexture) {
        this.texture = texture;
        
        if (this.isAttachedToRenderer) {
            this.createMaterial();
        }
    }

    private createMaterial() {
        this.material = this.renderer.getBaseMaterial();
        this.material.useShaderProgram(this.program);

        const uniforms = {
            "u_linewidth": this.lineWidth,
            "u_segmentStart": this.startPos,
            "u_segmentEnd": this.endPos,
            "u_modelMatrix": this.worldModelMatrix,
            "u_texture": this.texture
        };

        this.material.useBlendMode(GxBlend.GxBlend_Opaque);
        this.material.useBackFaceCulling(false);
        this.material.useDepthTest(false);
        this.material.useDepthWrite(false);
        this.material.useColorMask(ColorMask.All);
        this.material.useUniforms(uniforms);
    }

    private updateBoundingBox() {
        this.setBoundingBox({ min: this.startPos, max: this.endPos })
    }
}