import { Float2, Float3, Float4, Float44 } from "@app/rendering";
import { BinaryReader } from "@app/utils";
import { Color, Int2 } from "@app/modeldata";

export function readInt2(reader: BinaryReader): Int2 {
    return [reader.readInt32LE(), reader.readInt32LE()];
}

export function readFloat2(reader: BinaryReader) {
    return Float2.create(reader.readFloatLE(), reader.readFloatLE());
}

export function readFloat3(reader: BinaryReader) {
    return Float3.create(reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE())
}

export function readFloat4(reader: BinaryReader) {
    return Float4.create(reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE())
}

export function readQuaternion(reader: BinaryReader) {
    return Float4.create(-reader.readFloatLE(), -reader.readFloatLE(), -reader.readFloatLE(), reader.readFloatLE())
}

export function readColor(reader: BinaryReader): Color {
    return [reader.readUInt8(), reader.readUInt8(), reader.readUInt8(), reader.readUInt8()]
}

export function readFloat44(reader: BinaryReader) {
    return Float44.create(
        reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(),
        reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(),
        reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(),
        reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE(), reader.readFloatLE()
    )
}

export function readArray<T>(reader: BinaryReader, deserializeFn: (binaryReader: BinaryReader, index?: number) => T): T[] {
    const numElems = reader.readInt32LE();
    if (numElems > 0) {
        const result = new Array(numElems);
        for (let i = 0; i < numElems; i++) {
            result[i] = deserializeFn(reader, i);
        }
        return result;
    }
    return [];
}
