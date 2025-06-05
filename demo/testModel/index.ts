import { BaseRenderObject, BufferDataType, Float44, GxBlend, IShaderProgram, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer, RenderingBatchRequest, RenderingEngine, RenderObject } from "@app/index";

import fs from "./testModel.frag";
import vs from "./testModel.vert";


export class TestModel extends BaseRenderObject {
    isLoaded: boolean;
    program: IShaderProgram;

    colors: IVertexDataBuffer;
    indices: IVertexIndexBuffer;
    vertices: IVertexDataBuffer;


    fileId: number;
    vao: IVertexArrayObject;

    uniforms: {
        u_matrix: Float44
    }

    viewProjectionMatrix: Float44;

    constructor() {
        super();
        this.fileId = -1;
    }

    initialize(engine: RenderingEngine): void {
        super.initialize(engine);
        this.isLoaded = true;

        this.program = engine.graphics.createShaderProgram(vs, fs);

        this.colors = engine.graphics.createVertexDataBuffer([
            { 
                index: this.program.getAttribLocation('a_color'), 
                size: 3, normalized: true, type: BufferDataType.UInt8
            }
        ], false);
        this.colors.setData(this.getColors());
        this.vertices = engine.graphics.createVertexDataBuffer([{
            index: this.program.getAttribLocation('a_position'),
            size: 3
        }], false);
        this.vertices.setData(this.getVertices());
        this.indices = engine.graphics.createVertexIndexBuffer(false);
        this.indices.setData(this.getVertexIndices());

        this.vao = engine.graphics.createVertexArrayObject();
        this.vao.setIndexBuffer(this.indices);
        this.vao.addVertexDataBuffer(this.colors);
        this.vao.addVertexDataBuffer(this.vertices);

        this.viewProjectionMatrix = Float44.identity();
        this.uniforms = {
            u_matrix: this.viewProjectionMatrix
        }
    }

    update(deltaTime: number): void {
        Float44.multiply(this.engine.projectionMatrix, this.engine.viewMatrix, this.viewProjectionMatrix);
    }

    draw() {
        const batchRequest = new RenderingBatchRequest();

        batchRequest.useBlendMode(GxBlend.GxBlend_Opaque);
        batchRequest.useBackFaceCulling(true);
        batchRequest.useDepthTest(true);
        batchRequest.useShaderProgram(this.program);
        batchRequest.useVertexArrayObject(this.vao);
        
        batchRequest.useUniforms(this.uniforms);

        batchRequest.drawIndexedTriangles(0, 16 * 6);
        batchRequest.useVertexArrayObject();

        this.engine.submitBatchRequest(batchRequest);
    }

    
    getVertexIndices() {
        return new Uint16Array([
            // left column front
            0, 1, 2,
            1, 3, 2,

            // top rung front
            4, 5, 6,
            5, 7, 6,

            // middle rung front
            8, 9, 10,
            9, 11, 10,

            // left column back
            12, 13, 14,
            14, 13, 15,

            // top rung back
            16, 17, 18,
            18, 17, 19,

            // middle rung back
            20, 21, 22,
            22, 21, 23,

            // top
            24, 25, 26,
            24, 26, 27,

            // top rung right
            28, 29, 30,
            28, 30, 31, 

            // under top rung
            32, 33, 34,
            32, 34, 35, 

            // between top rung and middle
            36, 37, 38,
            36, 39, 37, 

            // top of middle rung
            40, 41, 42,
            40, 43, 41,

            // right of middle rung
            44, 45, 46,
            44, 47, 45,

            // bottom of middle rung.
            48, 49, 50,
            48, 50, 51,

            // right of bottom
            52, 53, 54,
            52, 55, 53,

            // bottom
            56, 57, 58,
            56, 58, 59,

            // left side
            60, 61, 62,
            60, 62, 63,
        ])
    }

    getVertices() {
        return new Float32Array([
            // left column front
            -50, 75, 15,
            -50, -75, 15,
            -20, 75, 15,
            -20, -75, 15,

            // top rung front
            -20, 75, 15,
            -20, 45, 15,
            50, 75, 15,
            50, 45, 15,

            // middle rung front
            -20, 15, 15,
            -20, -15, 15,
            17, 15, 15,
            17, -15, 15,

            // left column back
            -50, 75, -15,
            -20, 75, -15,
            -50, -75, -15,
            -20, -75, -15,

            // top rung back
            -20, 75, -15,
            50, 75, -15,
            -20, 45, -15,
            50, 45, -15,

            // middle rung back
            -20, 15, -15,
            17, 15, -15,
            -20, -15, -15,
            17, -15, -15,

            // top
            -50, 75, 15,
            50, 75, 15,
            50, 75, -15,
            -50, 75, -15,

            // top rung right
            50, 75, 15,
            50, 45, 15,
            50, 45, -15,
            50, 75, -15,

            // under top rung
            -20, 45, 15,
            -20, 45, -15,
            50, 45, -15,
            50, 45, 15,

            // between top rung and middle
            -20, 45, 15,
            -20, 15, -15,
            -20, 45, -15,
            -20, 15, 15,

            // top of middle rung
            -20, 15, 15,
            17, 15, -15,
            -20, 15, -15,
            17, 15, 15,

            // right of middle rung
            17, 15, 15,
            17, -15, -15,
            17, 15, -15,
            17, -15, 15,

            // bottom of middle rung.
            -20, -15, 15,
            -20, -15, -15,
            17, -15, -15,
            17, -15, 15,

            // right of bottom
            -20, -15, 15,
            -20, -75, -15,
            -20, -15, -15,
            -20, -75, 15,

            // bottom
            -50, -75, 15,
            -50, -75, -15,
            -20, -75, -15,
            -20, -75, 15,

            // left side
            -50, 75, 15,
            -50, 75, -15,
            -50, -75, -15,
            -50, -75, 15
        ]);
    }

    getColors() {
        return new Uint8Array([
            // left column front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // top rung front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // middle rung front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // left column back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // middle rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            // top rung right
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,

            // under top rung
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,

            // between top rung and middle
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,

            // top of middle rung
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,

            // right of middle rung
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,

            // bottom of middle rung.
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,

            // right of bottom
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,

            // bottom
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,

            // left side
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220]);
    }
}