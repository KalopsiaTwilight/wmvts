import { Float3, Float4 } from "./vectors"

export type Float44 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
]

export type Float33 = [
    number, number, number,
    number, number, number,
    number, number, number,
]

const FloatArrayType = "undefined" != typeof Float32Array ? Float32Array : Array;

export namespace Float33 {
    export function create(...args: number[]): Float33 {
        const result = new FloatArrayType(9);
        for (let i = 0; i < args.length && i < 9; i++) {
            result[i] = args[i];
        }
        return result as Float33;
    }

    export function identity(dest?: Float33): Float33 {
        if (dest) {
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;

            dest[3] = 0;
            dest[4] = 1;
            dest[5] = 0;

            dest[6] = 0;
            dest[7] = 0;
            dest[8] = 1;
            return dest;
        }

        const result = new FloatArrayType(9);
        if (FloatArrayType != Float32Array) {
            result[1] = 0;
            result[2] = 0;
            result[3] = 0;
            result[5] = 0;
            result[6] = 0;
            result[7] = 0;
        }
        result[0] = 1;
        result[4] = 1;
        result[8] = 1;
        return result as Float33;
    }

    export function from44(input: Float44, dest?: Float33) {
        dest = dest ? dest : identity();
        dest[0] = input[0];
        dest[1] = input[1];
        dest[2] = input[2];
        dest[3] = input[4];
        dest[4] = input[5];
        dest[5] = input[6];
        dest[6] = input[8];
        dest[7] = input[9];
        dest[8] = input[10];
        return dest;
    }

    export function fromQuat(quat: Float4, dest?: Float33) {
        dest = dest ? dest : identity();

        dest[0] = 1 - 2 * (quat[1] * quat[1] - quat[2] * quat[2]);
        dest[1] = 2 * (quat[1] * quat[0] + quat[3] * quat[2]);
        dest[2] = 2 * (quat[2] * quat[0] - quat[3] * quat[1]);
        dest[3] = 2 * (quat[1] * quat[0] - quat[3] * quat[2]);
        dest[4] = 1 - 2 * (quat[0] * quat[0] - quat[2] * quat[2]);
        dest[5] = 2 * (quat[2] * quat[1] + quat[3] * quat[0]);
        dest[6] = 2 * (quat[2] * quat[0] + quat[3] * quat[1]);
        dest[7] = 2 * (quat[2] * quat[1] - quat[3] * quat[0]);
        dest[8] = 1 - 2 * (quat[0] * quat[0] - quat[1] * quat[1]);

        return dest;
    }

    export function copy(input: Float33, dest?: Float33) {
        dest = dest ? dest : identity();
        dest[0] = input[0];
        dest[1] = input[1];
        dest[2] = input[2];
        dest[3] = input[3];
        dest[4] = input[4];
        dest[5] = input[5];
        dest[6] = input[6];
        dest[7] = input[7];
        dest[8] = input[8];
        return dest;
    }

    export function multiply(matA: Float33, matB: Float33, dest?: Float33) {
        dest = dest ? dest : identity();

        const a00 = matA[0];
        const a01 = matA[1];
        const a02 = matA[2];
        const a10 = matA[3];
        const a11 = matA[4];
        const a12 = matA[5];
        const a20 = matA[6];
        const a21 = matA[7];
        const a22 = matA[8];

        const b00 = matB[0];
        const b01 = matB[1];
        const b02 = matB[2];
        const b10 = matB[3];
        const b11 = matB[4];
        const b12 = matB[5];
        const b20 = matB[6];
        const b21 = matB[7];
        const b22 = matB[8];


        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;
        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;
        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;
        return dest;
    }

    export function scale(input: Float33, scalar: number, dest?: Float33) {
        dest = dest ? dest : identity();

        dest[0] = input[0] * scalar;
        dest[1] = input[1] * scalar;
        dest[2] = input[2] * scalar;
        dest[3] = input[3] * scalar;
        dest[4] = input[4] * scalar;
        dest[5] = input[5] * scalar;
        dest[6] = input[6] * scalar;
        dest[7] = input[7] * scalar;
        dest[8] = input[8] * scalar;

        return dest;
    }

    export function transformDir(inp: Float3, matrix: Float33, dest?: Float3) {
        let x = inp[0];
        let y = inp[1];
        let z = inp[2];

        dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
        dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
        dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];
        return dest;
    }
}

export namespace Float44 {
    export function identity(dest?: Float44): Float44 {
        if (dest) {
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;

            dest[4] = 0;
            dest[5] = 1;
            dest[6] = 0;
            dest[7] = 0;

            dest[8] = 0;
            dest[9] = 0;
            dest[10] = 1;
            dest[11] = 0;

            dest[12] = 0;
            dest[13] = 0;
            dest[14] = 0;
            dest[15] = 1;
            return dest;
        }

        const result = new FloatArrayType(16);
        if (FloatArrayType != Float32Array) {
            result[1] = 0;
            result[2] = 0;
            result[3] = 0;
            result[4] = 0;
            result[6] = 0;
            result[7] = 0;
            result[8] = 0;
            result[9] = 0;
            result[11] = 0;
            result[12] = 0;
            result[13] = 0;
            result[14] = 0;
        }
        result[0] = 1;
        result[5] = 1;
        result[10] = 1;
        result[15] = 1;
        return result as Float44;
    }

    export function create(...args: number[]): Float44 {
        const result = new FloatArrayType(16);
        for (let i = 0; i < args.length && i < 16; i++) {
            result[i] = args[i];
        }
        return result as Float44;
    }

    export function copy(input: Float44, dest?: Float44) {
        dest = dest ? dest : identity();
        dest[0] = input[0];
        dest[1] = input[1];
        dest[2] = input[2];
        dest[3] = input[3];
        dest[4] = input[4];
        dest[5] = input[5];
        dest[6] = input[6];
        dest[7] = input[7];
        dest[8] = input[8];
        dest[9] = input[9];
        dest[10] = input[10];
        dest[11] = input[11];
        dest[12] = input[12];
        dest[13] = input[13];
        dest[14] = input[14];
        dest[15] = input[15];
    }

    export function tranpose(input: Float44, dest?: Float44) {
        dest = dest ? dest : identity();
        if (input === dest) {
            let temp = dest[1];
            input[1] = dest[4];
            input[4] = temp;

            temp = dest[2];
            input[2] = dest[8];
            input[8] = temp;

            temp = input[3];
            input[3] = dest[12];
            input[12] = temp;

            temp = input[6];
            input[6] = dest[9];
            input[9] = temp;

            temp = input[7];
            input[7] = dest[13];
            input[13] = temp;

            temp = input[11];
            input[11] = dest[14];
            input[14] = temp;
            return dest;
        }

        input[0] = dest[0];
        input[1] = dest[4];
        input[2] = dest[8];
        input[3] = dest[12];
        input[4] = dest[1];
        input[5] = dest[5];
        input[6] = dest[9];
        input[7] = dest[13];
        input[8] = dest[2];
        input[9] = dest[6];
        input[10] = dest[10];
        input[11] = dest[14];
        input[12] = dest[3];
        input[13] = dest[7];
        input[14] = dest[11];
        input[15] = dest[15];
        return input;
    }

    export function invert(input: Float44, dest?: Float44) {
        dest = dest ? dest : identity();

        // https://stackoverflow.com/questions/155670/invert-4x4-matrix-numerical-most-stable-solution-needed (?)
        const m00 = input[0];
        const m01 = input[1];
        const m02 = input[2];
        const m03 = input[3];
        const m10 = input[4];
        const m11 = input[5];
        const m12 = input[6];
        const m13 = input[7];
        const m20 = input[8];
        const m21 = input[9];
        const m22 = input[10];
        const m23 = input[11];
        const m30 = input[12];
        const m31 = input[13];
        const m32 = input[14];
        const m33 = input[15];

        var t0 = m00 * m11 - m01 * m10,
            t1 = m00 * m12 - m02 * m10,
            t2 = m00 * m13 - m03 * m10,
            t3 = m01 * m12 - m02 * m11,
            t4 = m01 * m13 - m03 * m11,
            t5 = m02 * m13 - m03 * m12,
            t6 = m20 * m31 - m21 * m30,
            t7 = m20 * m32 - m22 * m30,
            t8 = m20 * m33 - m23 * m30,
            t9 = m21 * m32 - m22 * m31,
            t10 = m21 * m33 - m23 * m31,
            t11 = m22 * m33 - m23 * m32,
            determinant = t0 * t11 - t1 * t10 + t2 * t9 + t3 * t8 - t4 * t7 + t5 * t6;
            
        if (!determinant) {
            identity(dest);
            return dest;
        }
        
        determinant = 1 / determinant;

        dest[0] = (m11 * t11 - m12 * t10 + m13 * t9) * determinant;
        dest[1] = (m02 * t10 - m01 * t11 - m03 * t9) * determinant;
        dest[2] = (m31 * t5 - m32 * t4 + m33 * t3) * determinant;
        dest[3] = (m22 * t4 - m21 * t5 - m23 * t3) * determinant;
        dest[4] = (m12 * t8 - m10 * t11 - m13 * t7) * determinant;
        dest[5] = (m00 * t11 - m02 * t8 + m03 * t7) * determinant;
        dest[6] = (m32 * t2 - m30 * t5 - m33 * t1) * determinant;
        dest[7] = (m20 * t5 - m22 * t2 + m23 * t1) * determinant;
        dest[8] = (m10 * t10 - m11 * t8 + m13 * t6) * determinant;
        dest[9] = (m01 * t8 - m00 * t10 - m03 * t6) * determinant;
        dest[10] = (m30 * t4 - m31 * t2 + m33 * t0) * determinant;
        dest[11] = (m21 * t2 - m20 * t4 - m23 * t0) * determinant;
        dest[12] = (m11 * t7 - m10 * t9 - m12 * t6) * determinant;
        dest[13] = (m00 * t9 - m01 * t7 + m02 * t6) * determinant;
        dest[14] = (m31 * t1 - m30 * t3 - m32 * t0) * determinant;
        dest[15] = (m20 * t3 - m21 * t1 + m22 * t0) * determinant;
        return dest;
    }

    export function multiply(matA: Float44, matB: Float44, dest?: Float44) {
        dest = dest ? dest : identity();

        const a00 = matA[0];
        const a01 = matA[1];
        const a02 = matA[2];
        const a03 = matA[3];
        const a10 = matA[4];
        const a11 = matA[5];
        const a12 = matA[6];
        const a13 = matA[7];
        const a20 = matA[8];
        const a21 = matA[9];
        const a22 = matA[10];
        const a23 = matA[11];
        const a30 = matA[12];
        const a31 = matA[13];
        const a32 = matA[14];
        const a33 = matA[15];

        const b00 = matB[0];
        const b01 = matB[1];
        const b02 = matB[2];
        const b03 = matB[3];
        const b10 = matB[4];
        const b11 = matB[5];
        const b12 = matB[6];
        const b13 = matB[7];
        const b20 = matB[8];
        const b21 = matB[9];
        const b22 = matB[10];
        const b23 = matB[11];
        const b30 = matB[12];
        const b31 = matB[13];
        const b32 = matB[14];
        const b33 = matB[15];

        dest[0]  = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
        dest[1]  = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
        dest[2]  = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
        dest[3]  = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
        dest[4]  = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
        dest[5]  = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
        dest[6]  = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
        dest[7]  = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
        dest[8]  = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
        dest[9]  = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
        dest[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
        dest[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
        dest[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
        dest[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
        dest[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
        dest[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
        return dest;
    }

    export function translate(input: Float44, vec: Float3, dest?: Float44) {
        dest = dest ? dest : identity();

        if (input === dest) {
            dest[12] = input[0] * vec[0] + input[4] * vec[1] + input[8] * vec[2] + input[12];
            dest[13] = input[1] * vec[0] + input[5] * vec[1] + input[9] * vec[2] + input[13];
            dest[14] = input[2] * vec[0] + input[6] * vec[1] + input[10] * vec[2] + input[14];
            dest[15] = input[3] * vec[0] + input[7] * vec[1] + input[11] * vec[2] + input[15];
        } else {
            dest[0] = input[0];
            dest[1] = input[1];
            dest[2] = input[2];
            dest[3] = input[3];
            dest[4] = input[4];
            dest[5] = input[5];
            dest[6] = input[6];
            dest[7] = input[7];
            dest[8] = input[8];
            dest[9] = input[9];
            dest[10] = input[10];
            dest[11] = input[11];
            dest[12] = input[0] * vec[0] + input[4] * vec[1] + input[8] * vec[2] + input[12];
            dest[13] = input[1] * vec[0] + input[5] * vec[1] + input[9] * vec[2] + input[13];
            dest[14] = input[2] * vec[0] + input[6] * vec[1] + input[10] * vec[2] + input[14];
            dest[15] = input[3] * vec[0] + input[7] * vec[1] + input[11] * vec[2] + input[15];
        }
        return dest;
    }

    export function scale(input: Float44, scaleVec: Float3, dest?: Float44) {
        dest = dest ? dest : identity();

        dest[0] = input[0] * scaleVec[0];
        dest[1] = input[1] * scaleVec[0];
        dest[2] = input[2] * scaleVec[0];
        dest[3] = input[3] * scaleVec[0];
        dest[4] = input[4] * scaleVec[1];
        dest[5] = input[5] * scaleVec[1];
        dest[6] = input[6] * scaleVec[1];
        dest[7] = input[7] * scaleVec[1];
        dest[8] = input[8] * scaleVec[2];
        dest[9] = input[9] * scaleVec[2];
        dest[10] = input[10] * scaleVec[2];
        dest[11] = input[11] * scaleVec[2];
        dest[12] = input[12];
        dest[13] = input[13];
        dest[14] = input[14];
        dest[15] = input[15];
    }

    export function rotateX(input: Float44, rads: number, dest?: Float44) {
        dest = dest ? dest : identity();

        if (input !== dest) {
            dest[0] = input[0];
            dest[1] = input[1];
            dest[2] = input[2];
            dest[3] = input[3];
            dest[12] = input[12];
            dest[13] = input[13];
            dest[14] = input[14];
            dest[15] = input[15];
        }

        const sin = Math.sin(rads);
        const cos = Math.cos(rads);

        const m10 = input[4];
        const m11 = input[5];
        const m12 = input[6];
        const m13 = input[7];
        const m20 = input[8];
        const m21 = input[9];
        const m22 = input[10];
        const m23 = input[11];

        dest[4] = m10 * cos + m20 * sin;
        dest[5] = m11 * cos + m21 * sin;
        dest[6] = m12 * cos + m22 * sin;
        dest[7] = m13 * cos + m23 * sin;
        dest[8] = m20 * cos - m10 * sin;
        dest[9] = m21 * cos - m11 * sin;
        dest[10] = m22 * cos - m12 * sin;
        dest[11] = m23 * cos - m13 * sin;
        return (dest);
    }

    export function rotateY(input: Float44, rads: number, dest?: Float44) {
        dest = dest ? dest : identity();

        if (input !== dest) {
            dest[4] = input[4];
            dest[5] = input[5];
            dest[6] = input[6];
            dest[7] = input[7];
            dest[12] = input[12];
            dest[13] = input[13];
            dest[14] = input[14];
            dest[15] = input[15];
        }

        const sin = Math.sin(rads);
        const cos = Math.cos(rads);

        const m00 = input[0];
        const m01 = input[1];
        const m02 = input[2];
        const m03 = input[3];
        const m20 = input[8];
        const m21 = input[9];
        const m22 = input[10];
        const m23 = input[11];

        dest[0] = m00 * cos - m20 * sin;
        dest[1] = m01 * cos - m21 * sin;
        dest[2] = m02 * cos - m22 * sin;
        dest[3] = m03 * cos - m23 * sin;
        dest[8] = m00 * sin + m20 * cos;
        dest[9] = m01 * sin + m21 * cos;
        dest[10] = m02 * sin + m22 * cos;
        dest[11] = m03 * sin + m23 * cos;
        return dest;
    }

    export function rotateZ(input: Float44, rads: number, dest?: Float44) {
        dest = dest ? dest : identity();

        if (input !== dest) {
            dest[8] = input[8];
            dest[9] = input[9];
            dest[10] = input[10];
            dest[11] = input[11];
            dest[12] = input[12];
            dest[13] = input[13];
            dest[14] = input[14];
            dest[15] = input[15];
        }

        const sin = Math.sin(rads);
        const cos = Math.cos(rads);

        const m00 = input[0];
        const m01 = input[1];
        const m02 = input[2];
        const m03 = input[3];
        const m10 = input[4];
        const m11 = input[5];
        const m12 = input[6];
        const m13 = input[7];

        dest[0] = m00 * cos + m10 * sin;
        dest[1] = m01 * cos + m11 * sin;
        dest[2] = m02 * cos + m12 * sin;
        dest[3] = m03 * cos + m13 * sin;
        dest[4] = m10 * cos - m00 * sin;
        dest[5] = m11 * cos - m01 * sin;
        dest[6] = m12 * cos - m02 * sin;
        dest[7] = m13 * cos - m03 * sin;
        return dest;
    }

    export function createWithTranslation(vec: Float3, dest?: Float44) {
        dest = dest ? dest : identity();
        dest[12] = vec[0];
        dest[13] = vec[1];
        dest[14] = vec[2];
        return dest;
    }

    export function fromQuatAndTranslation(quat: Float4, translate: Float3, dest?: Float44) {
        dest = dest ? dest : identity();

        const x = quat[0];
        const y = quat[1];
        const z = quat[2];
        const w = quat[3];

        const xx = x + x;
        const yy = y + y;
        const zz = z + z;

        const x2x2 = x * xx;
        const xyxy = x * yy;
        const xzxz = x * zz;
        const y2y2 = y * yy;
        const yzyz = y * zz;
        const z2z2 = z * zz;
        const xwxw = w * xx;
        const ywyw = w * yy;
        const wzwz = w * zz;

        dest[0] = 1 - (y2y2 + z2z2);
        dest[1] = xyxy + wzwz;
        dest[2] = xzxz - ywyw;
        dest[3] = 0;
        dest[4] = xyxy - wzwz;
        dest[5] = 1 - (x2x2 + z2z2);
        dest[6] = yzyz + xwxw;
        dest[7] = 0;
        dest[8] = xzxz + ywyw;
        dest[9] = yzyz - xwxw;
        dest[10] = 1 - (x2x2 + y2y2);
        dest[11] = 0;
        dest[12] = translate[0];
        dest[13] = translate[1];
        dest[14] = translate[2];
        dest[15] = 1;

        return dest;
    }

    export function getTranslation(input: Float44, dest?: Float3 | Float4) {
        dest = dest ? dest : Float3.zero();
        dest[0] = input[12];
        dest[1] = input[13];
        dest[2] = input[14];
        return dest;
    }

    export function transformPoint(input: Float3, matrix: Float44, dest?: Float3) {
        dest = dest ? dest : Float3.zero();

        let x = input[0];
        let y = input[1];
        let z = input[2];

        let a = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
        a = a || 1;

        dest[0] = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / a;
        dest[1] = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / a;
        dest[2] = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / a;
        return dest;
    }
    
    export function transformDirection(input: Float4, matrix: Float44, dest?: Float4) {
        dest = dest ? dest : Float4.zero();

        const x = input[0];
        const y = input[1];
        const z = input[2];
        const w = input[3];

        dest[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12] * w;
        dest[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13] * w;
        dest[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14] * w;
        dest[3] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] * w;
        return dest;
    }

    export function perspective(fov: number, aspectRatio: number, nearClip: number, farClip: number, dest?: Float44) {
        dest = dest ? dest : Float44.identity();

        const a = 1 / Math.tan(fov / 2);
        dest[0] = a / aspectRatio;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = a;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[11] = -1;
        dest[12] = 0;
        dest[13] = 0;
        dest[15] = 0;
        if (farClip !== null && farClip !== Infinity) {
            const nearToFar = 1 / (nearClip - farClip);
            dest[10] = (farClip + nearClip) * nearToFar;
            dest[14] = 2 * farClip * nearClip * nearToFar;
        } else {
            dest[10] = -1;
            dest[14] = -2 * nearClip;
        }
        return dest;
    }

    export function getColumn(input: Float44, col: number) {
        return Float4.create(input[4 * col + 0], input[4 * col + 1], input[4 * col + 2], 0);
    }

    export function setColumn(input: Float44, col: number, colVal: Float4) {
        for (let i = 0; i < 4; i++) {
            input[4 * col + i] = colVal[i];
        }
    }

    export function lookAt(eye: Float3, target: Float3, up: Float3, dest?: Float44): Float44 {
        // https://webglfundamentals.org/webgl/lessons/webgl-3d-camera.html
        const zAxis = Float3.normalize(Float3.subtract(eye, target));
        const xAxis = Float3.normalize(Float3.cross(up, zAxis));
        const yAxis = Float3.normalize(Float3.cross(zAxis, xAxis));

        dest[0] = xAxis[0];
        dest[1] = xAxis[1];
        dest[2] = xAxis[2];
        dest[3] = 0;
        dest[4] = yAxis[0];
        dest[5] = yAxis[1];
        dest[6] = yAxis[2];
        dest[7] = 0;
        dest[8] = zAxis[0];
        dest[9] = zAxis[1];
        dest[10] = zAxis[2];
        dest[11] = 0;
        dest[12] = eye[0];
        dest[13] = eye[1];
        dest[14] = eye[2];
        dest[15] = 1;

        return dest;
    }
}