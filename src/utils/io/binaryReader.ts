export class BinaryReader {
    dataView: DataView;
    offset: number;

    constructor(buffer: ArrayBuffer) {
        this.dataView = new DataView(buffer);
        this.offset = 0;
    }

    readBool() {
        const result = 0 != this.dataView.getUint8(this.offset);
        this.offset += 1;
        return result;
    }

    readUInt8() {
        const result = this.dataView.getUint8(this.offset);
        this.offset += 1;
        return result;
    }

    readInt8() {
        const result = this.dataView.getInt8(this.offset);
        this.offset += 1;
        return result;
    }

    readUInt16BE() {
        const result = this.dataView.getUint16(this.offset);
        this.offset += 2;
        return result;
    }

    readUInt16LE() {
        const result = this.dataView.getUint16(this.offset, true);
        this.offset += 2;
        return result;
    }

    readInt16BE() {
        const result = this.dataView.getInt16(this.offset);
        this.offset += 2;
        return result;
    }

    readInt16LE() {
        const result = this.dataView.getInt16(this.offset, true);
        this.offset += 2;
        return result;
    }

    readUInt32BE() {
        const result = this.dataView.getUint32(this.offset);
        this.offset += 4;
        return result;
    }

    readUInt32LE() {
        const result = this.dataView.getUint32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readInt32BE() {
        const result = this.dataView.getInt32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readInt32LE() {
        const result = this.dataView.getInt32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readFloatBE() {
        const result = this.dataView.getFloat32(this.offset);
        this.offset += 4;
        return result;
    }

    readFloatLE() {
        const result = this.dataView.getFloat32(this.offset, true);
        this.offset += 4;
        return result;
    }

    readRemainingBytes() {
        return new Uint8Array(this.dataView.buffer, this.offset);
    }

    seek(offset: number) {
        this.offset = offset;
    }
};