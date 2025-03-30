import { BinaryReader } from "./binaryReader";

export class BinaryWriter extends BinaryReader {

    writeBool(val: boolean) {
        this.dataView.setUint8(this.offset, val ? 1 : 0);
        this.offset += 1;
    }

    writeUInt8(val: number) {
        this.dataView.setUint8(this.offset, val);
        this.offset += 1;
    }

    writeInt8(val: number) {
        this.dataView.setInt8(this.offset, val);
        this.offset += 1;
    }

    writeUInt16BE(val: number) {
        this.dataView.setUint16(this.offset, val);
        this.offset += 2;
    }

    writeUInt16LE(val: number) {
        this.dataView.setUint16(this.offset, val, true);
        this.offset += 2;
    }

    writeInt16BE(val: number) {
        this.dataView.setInt16(this.offset, val);
        this.offset += 2;
    }

    writeInt16LE(val: number) {
        this.dataView.setInt16(this.offset, val, true);
        this.offset += 2;
    }

    writeUInt32BE(val: number) {
        this.dataView.setUint32(this.offset, val);
        this.offset += 4;
    }

    writeUInt32LE(val: number) {
        this.dataView.setUint32(this.offset, val, true);
        this.offset += 4;
    }

    writeInt32BE(val: number) {
        this.dataView.setInt32(this.offset, val, true);
        this.offset += 4;
    }

    writeInt32LE(val: number) {
        this.dataView.setInt32(this.offset, val, true);
        this.offset += 4;
    }

    writeFloatBE(val: number) {
        this.dataView.setFloat32(this.offset, val);
        this.offset += 4;
    }

    writeFloatLE(val: number) {
        this.dataView.setFloat32(this.offset, val, true);
        this.offset += 4;
    }
}