import { WoWModelData, WoWVertexData } from "@app/modeldata";
import { BufferDataType, IGraphics, IShaderProgram, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer } from "@app/rendering"
import { BinaryWriter } from "@app/utils";


export interface IM2DataBuffers {
    fileId: number;
    vertexDataBuffer: IVertexDataBuffer;
    vertexIndexBuffer: IVertexIndexBuffer;
    vao: IVertexArrayObject;
}

export class StaticM2DataBuffers implements IM2DataBuffers {
    fileId: number;
    vertexDataBuffer: IVertexDataBuffer;
    vertexIndexBuffer: IVertexIndexBuffer;
    vao: IVertexArrayObject;

    createFromModelData(graphics: IGraphics, shaderProgram: IShaderProgram, modelData: WoWModelData|null) {
        this.vao = graphics.createVertexArrayObject();
        this.vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
        this.vertexDataBuffer = graphics.createVertexDataBuffer([
            { index: shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 0 },
            { index: shaderProgram.getAttribLocation('a_normal'), size: 3, type: BufferDataType.Float, normalized: false, stride: 48, offset: 12 },
            { index: shaderProgram.getAttribLocation('a_bones'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 24},
            { index: shaderProgram.getAttribLocation('a_boneWeights'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: 48, offset: 28 },
            { index: shaderProgram.getAttribLocation('a_texcoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 32 },
            { index: shaderProgram.getAttribLocation('a_texcoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: 48, offset: 40 },
        ], true);

        if (!modelData) {
            return;
        }

        this.uploadVertexData(modelData.vertices);
        this.vertexIndexBuffer.setData(new Uint16Array(modelData.skinTriangles));
        this.vao.setIndexBuffer(this.vertexIndexBuffer);
        this.vao.addVertexDataBuffer(this.vertexDataBuffer);
    }
    
    private uploadVertexData(vertices: WoWVertexData[]) {
        const bufferSize = 48 * vertices.length;
        const buffer = new Uint8Array(bufferSize);

        const writer = new BinaryWriter(buffer.buffer);
        for (let i = 0; i < vertices.length; ++i) {
            writer.writeFloatLE(vertices[i].position[0]);
            writer.writeFloatLE(vertices[i].position[1]);
            writer.writeFloatLE(vertices[i].position[2]);
            writer.writeFloatLE(vertices[i].normal[0]);
            writer.writeFloatLE(vertices[i].normal[1]);
            writer.writeFloatLE(vertices[i].normal[2]);
            writer.writeUInt8(vertices[i].boneIndices[0]);
            writer.writeUInt8(vertices[i].boneIndices[1]);
            writer.writeUInt8(vertices[i].boneIndices[2]);
            writer.writeUInt8(vertices[i].boneIndices[3]);
            writer.writeUInt8(vertices[i].boneWeights[0]);
            writer.writeUInt8(vertices[i].boneWeights[1]);
            writer.writeUInt8(vertices[i].boneWeights[2]);
            writer.writeUInt8(vertices[i].boneWeights[3]);
            writer.writeFloatLE(vertices[i].texCoords1[0]);
            writer.writeFloatLE(vertices[i].texCoords1[1]);
            writer.writeFloatLE(vertices[i].texCoords2[0]);
            writer.writeFloatLE(vertices[i].texCoords2[1]);
        }
        this.vertexDataBuffer.setData(buffer);
    }
}