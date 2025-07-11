import { Float44 } from "./matrices";
import { Float3, Float4 } from "./vectors";

export enum PlaneElem {
   A = 0,
   B = 1,
   C = 2,
   D = 3
}

export type Plane = Float4;

export enum FrustrumSide {
    TOP = 0,
    BOTTOM = 1,
    RIGHT = 2,
    LEFT = 3,
    FAR = 4,
    NEAR = 5
}

export type Frustrum = [Plane, Plane, Plane, Plane, Plane, Plane];

export interface AABB {
    min: Float3;
    max: Float3;
}

export namespace Plane {
    export function zero(): Plane {
        return Float4.zero();
    }

    export function create(normal: Float3, distance: number): Plane {
        return Float4.create(normal[0], normal[1], normal[2], distance);
    }

    export function normalize(plane: Plane): Plane {
        const normalLength = Float3.length(plane);
        for(let i = 0; i < 4; i++) {
            plane[i] /= normalLength;
        }
        return plane;
    }
}

export namespace Frustrum {
    export function zero(): Frustrum {
        return [Plane.zero(),Plane.zero(),Plane.zero(),Plane.zero(),Plane.zero(),Plane.zero()];
    }

    export function fromMatrix(matrix: Float44, dest?: Frustrum): Frustrum {
        dest = dest ? dest : zero();

        const m11 = matrix[0];
        const m12 = matrix[4];
        const m13 = matrix[8];
        const m14 = matrix[12];
        const m21 = matrix[1];
        const m22 = matrix[5];
        const m23 = matrix[9];
        const m24 = matrix[13];
        const m31 = matrix[2];
        const m32 = matrix[6];
        const m33 = matrix[10];
        const m34 = matrix[14];
        const m41 = matrix[3];
        const m42 = matrix[7];
        const m43 = matrix[11];
        const m44 = matrix[15];

        Float4.set(dest[FrustrumSide.LEFT], m41+m11, m42+m12, m43+m13, m44+m14);
        Plane.normalize(dest[FrustrumSide.LEFT]);
        
        Float4.set(dest[FrustrumSide.RIGHT], m41-m11, m42-m12, m43-m13, m44-m14);
        Plane.normalize(dest[FrustrumSide.RIGHT]);
        
        Float4.set(dest[FrustrumSide.BOTTOM], m41+m21, m42+m22, m43+m23, m44+m24);
        Plane.normalize(dest[FrustrumSide.BOTTOM]);
        
        Float4.set(dest[FrustrumSide.TOP], m41-m21, m42-m22, m43-m23, m44-m24);
        Plane.normalize(dest[FrustrumSide.TOP]);
        
        Float4.set(dest[FrustrumSide.NEAR], m41+m31, m42+m32, m43+m33, m44+m34);
        Plane.normalize(dest[FrustrumSide.NEAR]);
        
        Float4.set(dest[FrustrumSide.FAR], m41-m31, m42-m32, m43-m33, m44-m34);
        Plane.normalize(dest[FrustrumSide.FAR]);
        
        return dest;
    }
}

export namespace AABB {
    export function create(min: Float3, max: Float3) {
        return { min, max };
    }

    export function fromVertices(vertexPositions: Float3[]) {
        let minX, minY, minZ;
        minX = minY = minZ = 9999;
        let maxX, maxY, maxZ;
        maxX = maxY = maxZ = -9999;

        for(let i = 0; i < vertexPositions.length; i++) {
            const vertexPos = vertexPositions[i];
            minX = Math.min(minX, vertexPos[0]);
            maxX = Math.max(maxX, vertexPos[0]);
            minY = Math.min(minY, vertexPos[1]);
            maxY = Math.max(maxY, vertexPos[1]);
            minZ = Math.min(minZ, vertexPos[2]);
            maxZ = Math.max(maxZ, vertexPos[2]);
        }

        // TODO: Change this margin
        return AABB.create(
            Float3.create(minX-10, minY-10, minZ-10),
            Float3.create(maxX+10, maxY+10, maxZ+10),
        );
    }

    // https://www.realtimerendering.com/resources/GraphicsGems/gems/TransBox.c
    export function transform(bb: AABB, transform: Float44): AABB {
        const bbMin = Float3.copy(bb.min);
        const bbMax = Float3.copy(bb.max);

        const newMin = Float3.create(transform[12], transform[13], transform[14])
        const newMax = Float3.create(transform[12], transform[13], transform[14])
        
        for(let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const a = transform[i * 4 + j] * bbMin[j];
                const b = transform[i * 4 + j] * bbMax[j];
                
                newMin[i] += a < b ? a : b;
                newMax[i] += a < b ? b : a;
            }
        }

        return {
            min: newMin,
            max: newMax
        }
    }

    export function visibleInFrustrum(aabb: AABB, frustrum: Frustrum) {
        const bbPoints = [
            Float4.create(aabb.min[0], aabb.min[1], aabb.min[2], 1),
            Float4.create(aabb.max[0], aabb.min[1], aabb.min[2], 1),
            Float4.create(aabb.min[0], aabb.max[1], aabb.min[2], 1),
            Float4.create(aabb.max[0], aabb.max[1], aabb.min[2], 1),
            Float4.create(aabb.min[0], aabb.min[1], aabb.max[2], 1),
            Float4.create(aabb.max[0], aabb.min[1], aabb.max[2], 1),
            Float4.create(aabb.min[0], aabb.max[1], aabb.max[2], 1),
            Float4.create(aabb.max[0], aabb.max[1], aabb.max[2], 1),
        ]
        for(const plane of frustrum) {
            let fallsInPlane = false;
            for(const point of bbPoints) {
                if (Float4.dot(plane, point) > 0) {
                    fallsInPlane = true;
                    break;
                }
            }   
            if (!fallsInPlane) {
                return false;
            }
        }
        return true;
    }

    export function containsPoint(aabb: AABB, point: Float3) {
        for(let i = 0; i < 3; i++) {
            if (aabb.min[i] > point[i] || aabb.max[i] < point[i]) {
                return false;
            }
        }
        return true;
    }

    export function distanceToPoint(aabb: AABB, point: Float3) {
        if (containsPoint(aabb, point)) {
            return 0;
        }

        const deltas = Float3.zero();
        for(let i = 0; i < 3; i++) {
            if (point[i] < aabb.min[i]) {
                deltas[i] = aabb.min[i] - point[i];
            } else {
                deltas[i] = point[i] - aabb.max[i];
            }
        }
        return Float3.length(deltas);
    }
}