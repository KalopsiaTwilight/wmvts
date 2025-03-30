export type Float2 = [number, number];
export type Float3 = [number, number, number]
export type Float4 = [number, number, number, number]

const FloatArrayType = "undefined" != typeof Float32Array ? Float32Array : Array;

export namespace Float4 {
    export function zero(dest?: Float4): Float4 {
        if (dest) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            return dest;
        }

        return create(0,0,0,0);
    }

    export function one(dest?: Float4): Float4 {
        if (dest) {
            dest[0] = 1;
            dest[1] = 1;
            dest[2] = 1;
            dest[3] = 1;
            return dest;
        }

        return create(1,1,1,1);
    }

    export function identity(dest?: Float4): Float4 {
        if (dest) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 1;
            return dest;
        }

        const result = new FloatArrayType(4);
        if (FloatArrayType != Float32Array) {
            result[0] = 0;
            result[1] = 0;
            result[2] = 0;
            result[3] = 1;
        }
        return result as Float4;
    }

    export function create(x: number, y: number, z: number, w: number): Float4 {
        const result = new FloatArrayType(4);
        result[0] = x;
        result[1] = y;
        result[2] = z;
        result[3] = w;
        return result as Float4;
    }

    export function copy(input: Float4, dest?: Float4): Float4 {
        dest = dest ? dest : identity();
        dest[0] = input[0];
        dest[1] = input[1];
        dest[2] = input[2];
        dest[3] = input[3];
        return dest;
    }

    export function set(dest: Float4, x: number, y: number, z: number, w: number) {
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;
        return dest;
    }

    export function add(vecA: Float4, vecB: Float4, dest?: Float4) {
        dest = dest ? dest : identity();
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        dest[2] = vecA[2] + vecB[2];
        dest[3] = vecA[3] + vecB[3];
        return dest;
    }

    export function subtract(vecA: Float4, vecB: Float4, dest?: Float4) {
        dest = dest ? dest : identity();
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        dest[2] = vecA[2] - vecB[2];
        dest[3] = vecA[3] - vecB[3];
        return dest;
    }

    export function scale(input: Float4, scalar: number, dest?: Float4) {
        dest = dest ? dest : identity();
        dest[0] = input[0] * scalar;
        dest[1] = input[1] * scalar;
        dest[2] = input[2] * scalar;
        dest[3] = input[3] * scalar;
        return dest;
    }

    export function length(vec4: Float4) {
        return Math.hypot(vec4[0], vec4[1], vec4[2], vec4[3]);
    }

    export function normalize(input: Float4, dest?: Float4) {
        dest = dest ? dest : identity();

        let scalar = input[0] * input[0] + input[1] * input[1] + input[2] * input[2] + input[3] * input[3];
        if (scalar > 0) {
            scalar = 1 / Math.sqrt(scalar)
        }

        return scale(input, scalar, dest);
    }

    export function dot(vecA: Float4, vecB: Float4) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1] + vecA[2] * vecB[2] + vecA[3] * vecB[3]
    }

    export function lerp(vecA: Float4, vecB: Float4, coEff: number, dest?: Float4) {
        dest = dest ? dest : identity();

        let x1 = vecA[0];
        let y1 = vecA[1];
        let z1 = vecA[2];
        let w1 = vecA[3];
        let x2 = vecB[0];
        let y2 = vecB[1];
        let z2 = vecB[2];
        let w2 = vecB[3];

        let dotProduct = dot(vecA, vecB);
        if (dotProduct < 0) {
            dotProduct = -dotProduct;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
            w2 = -w2;
        }

        let coEffA, coEffB;
        if (1 - dotProduct > 0.000001) {
            const a = Math.acos(dotProduct);
            const b = Math.sin(a);

            coEffA = Math.sin((1 - coEff) * a) / b;
            coEffB = Math.sin(coEff * a) / b;
        } else {
            coEffA = 1 - coEff;
            coEffB = coEff;
        }

        dest[0] = coEffA * x1 + coEffB * x2;
        dest[1] = coEffA * y1 + coEffB * y2;
        dest[2] = coEffA * z1 + coEffB * z2;
        dest[3] = coEffA * w1 + coEffB * w2;

        return dest;
    }

    export function cross(vecA: Float4, vecB: Float4, dest?: Float4) {
        dest = dest ? dest : zero();

        let x1 = vecA[0];
        let y1 = vecA[1];
        let z1 = vecA[2];

        let x2 = vecB[0];
        let y2 = vecB[1];
        let z2 = vecB[2];

        dest[0] = y1 * z2 - z1 * y2
        dest[1] = z1 * x2 - x1 * z2
        dest[2] = x1 * y2 - y1 * x2;
        dest[3] = 0;
        return dest;
    }

    export function createQuat(vec: Float3, theta: number, dest?: Float4) {
        dest = dest ? dest : identity();
        theta *= 0.5;
        let r = Math.sin(theta);
        dest[0] = r * vec[0];
        dest[1] = r * vec[1];
        dest[2] = r * vec[2];
        dest[3] = Math.cos(theta);
        return dest;
    }
}

export namespace Float3 {
    export function zero(dest?: Float3): Float3 {
        if (dest) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }
        return create(0,0,0);
    }

    export function one(dest?: Float3): Float3 {
        if (dest) {
            dest[0] = 1;
            dest[1] = 1;
            dest[2] = 1;
            return dest;
        }
        return create(1,1,1);
    }

    export function create(x: number, y: number, z: number): Float3 {
        const result = new FloatArrayType(3);
        result[0] = x;
        result[1] = y;
        result[2] = z;
        return result as Float3;
    }

    export function copy(input: Float3, dest?: Float3): Float3 {
        dest = dest ? dest : zero();
        dest[0] = input[0];
        dest[1] = input[1];
        dest[2] = input[2];
        return dest;
    }

    export function set(dest: Float3, x: number, y: number, z: number) {
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        return dest;
    }

    export function add(vecA: Float3, vecB: Float3, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        dest[2] = vecA[2] + vecB[2];
        return dest;
    }

    export function subtract(vecA: Float3, vecB: Float3, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        dest[2] = vecA[2] - vecB[2];
        return dest;
    }

    export function scale(input: Float3, scalar: number, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = input[0] * scalar;
        dest[1] = input[1] * scalar;
        dest[2] = input[2] * scalar;
        return dest;
    }

    export function length(vec: Float3) {
        return Math.hypot(vec[0], vec[1], vec[2]);
    }

    export function normalize(input: Float3, dest?: Float3) {
        dest = dest ? dest : zero();
        let scalar = input[0] * input[0] + input[1] * input[1] + input[2] * input[2]
        if (scalar > 0) {
            scalar = 1 / Math.sqrt(scalar)
        }

        return scale(input, scalar, dest);
    }

    export function multiply(vecA: Float3, vecB: Float3, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        dest[2] = vecA[2] * vecB[2];
        return dest;
    }

    export function negate(input: Float3, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = -input[0];
        dest[1] = -input[1];
        dest[2] = -input[2];
        return dest;
    }

    export function dot(vecA: Float3, vecB: Float3) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1] + vecA[2] * vecB[2];
    }

    export function cross(vecA: Float3, vecB: Float3, dest?: Float3) {
        dest = dest ? dest : zero();

        let x1 = vecA[0];
        let y1 = vecA[1];
        let z1 = vecA[2];

        let x2 = vecB[0];
        let y2 = vecB[1];
        let z2 = vecB[2];

        dest[0] = y1 * z2 - z1 * y2
        dest[1] = z1 * x2 - x1 * z2
        dest[2] = x1 * y2 - y1 * x2;
        return dest;
    }

    export function lerp(vecA: Float3, vecB: Float3, coEff: number, dest?: Float3) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] + coEff * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + coEff * (vecB[1] - vecA[1]);
        dest[2] = vecA[2] + coEff * (vecB[2] - vecA[2]);
        return dest;
    }

    
    export function fromSpherical(radius: number, theta: number, phi: number, dest?: Float3) {
        dest = dest ? dest : zero();

        dest[0] = radius * Math.sin(theta) * Math.cos(phi); 
        dest[1] = radius * Math.sin(theta) * Math.sin(phi);
        dest[2] = radius * Math.cos(theta);
        return dest;
    }
}

export namespace Float2 {
    export function zero(dest?: Float2): Float2 {
        if (dest) {
            dest[0] = 0;
            dest[1] = 0;
            return dest;
        }
        const result = new FloatArrayType(2);
        if (FloatArrayType != Float32Array) {
            result[0] = 0;
            result[1] = 0;
        }
        return result as Float2;
    }

    export function create(x: number, y: number): Float2 {
        const result = new FloatArrayType(2);
        result[0] = x;
        result[1] = y;
        return result as Float2;
    }

    export function copy(input: Float2, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = input[0];
        dest[1] = input[1];
        return dest;
    }

    export function set(dest: Float2, x: number, y: number) {
        dest[0] = x;
        dest[1] = y;
        return dest;
    }

    export function add(vecA: Float2, vecB: Float2, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        return dest;
    }

    export function subtract(vecA: Float2, vecB: Float2, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        return dest;
    }

    export function scale(input: Float2, scalar: number, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = input[0] * scalar;
        dest[1] = input[1] * scalar;
        return dest;
    }

    export function multiply(vecA: Float2, vecB: Float2, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        return dest;
    }

    export function negate(input: Float2, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = -input[0];
        dest[1] = -input[1];
        return dest;
    }

    export function lerp(vecA: Float2, vecB: Float2, coEff: number, dest?: Float2) {
        dest = dest ? dest : zero();
        dest[0] = vecA[0] + coEff * (vecB[0] - vecA[0]);
        dest[1] = vecA[0] + coEff * (vecB[1] - vecA[1]);
        return dest;
    }
}