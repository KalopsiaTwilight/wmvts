import { WoWWorldModelBspNode, WowWorldModelBspNodeFlags } from "@app/modeldata";
import { Float44 } from "./matrices";
import { Axis, Float3, Float4 } from "./vectors";

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
    NEAR = 5,
    MAX = 6
}

export type Frustrum = Plane[];

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

    export function majorAxis(plane: Plane) {
        let maxAxis = Math.abs(plane[0]);
        let axis: Axis = 0;
        for(let i = 1; i < 3; i++) {
            if (Math.abs(plane[i]) > maxAxis) {
                maxAxis = Math.abs(plane[i]);
                axis = i;
            }
        }
        return axis;
    }

    export function normalize(plane: Plane): Plane {
        const normalLength = Float3.length(plane);
        for(let i = 0; i < 4; i++) {
            plane[i] /= normalLength;
        }
        return plane;
    }

    export function fromEyeAndVertices(eye: Float3|Float4, vertex1: Float3, vertex2: Float3) {
        const dir1 = Float3.subtract(vertex1, eye);
        const dir2 = Float3.subtract(vertex2, eye);

        const planeNorm = Float3.normalize(Float3.cross(dir2, dir1));
        const planeDist = Float3.dot(planeNorm, eye);
        return Plane.create(planeNorm, -planeDist);
    }

    export function distanceToPoint(plane: Plane, point: Float3) {
        return Float3.dot(plane, point) + plane[3];
    }

    export function sideFacingPoint(plane: Plane, point: Float3) {
        const dist = Plane.distanceToPoint(plane, point);
        return Math.sign(dist);
    }
}

export namespace Frustrum {
    export function zero(): Frustrum {
        return [];
    }

    export function copy(orig: Frustrum, dest?: Frustrum) {
        dest = dest ? dest : Frustrum.zero();
        dest.length = orig.length;
        for(let i = 0; i < orig.length; i++) {
            dest[i] = Float4.copy(orig[i]);
        }
        return dest;
    }

    export function fromViewMatrix(matrix: Float44, dest?: Frustrum): Frustrum {
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

        for(let i = 0; i < FrustrumSide.MAX; i++) {
            if (!dest[i]) {
                dest[i] = Float4.zero();
            }
        }
        
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

    export function transform(frustrum: Frustrum, matrix: Float44, dest?: Frustrum) {
        dest = dest ? dest : dest;
        dest.length = frustrum.length;

        const invTransposeMatrix = Float44.invert(matrix);
        Float44.tranpose(invTransposeMatrix, invTransposeMatrix);
        for(let i = 0; i < frustrum.length; i++) {
            dest[i] = Float44.transformDirection4(frustrum[i], invTransposeMatrix);
        }

        return dest;
    }

    export function transformSelf(frustrum: Frustrum, matrix: Float44) {
        const invTransposeMatrix = Float44.invert(matrix);
        Float44.tranpose(invTransposeMatrix, invTransposeMatrix);
        for(let i = 0; i < frustrum.length; i++) {
            Float44.transformDirection4(frustrum[i], invTransposeMatrix, frustrum[i]);
        }
    }
}

export namespace AABB {
    export function create(min: Float3, max: Float3) {
        return { min, max };
    }

    export function fromVertices(vertexPositions: Float3[], marginOfError = 0.1) {
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

        return AABB.create(
            Float3.create(minX-marginOfError, minY-marginOfError, minZ-marginOfError),
            Float3.create(maxX+marginOfError, maxY+marginOfError, maxZ+marginOfError),
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

    const bbPoints = [
        Float4.create(0,0,0,1), 
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
        Float4.create(0,0,0,1),
    ]

    export function visibleInFrustrum(aabb: AABB, frustrum: Frustrum) {
        Float4.set(bbPoints[0], aabb.min[0], aabb.min[1], aabb.min[2], 1);
        Float4.set(bbPoints[1], aabb.max[0], aabb.min[1], aabb.min[2], 1);
        Float4.set(bbPoints[2], aabb.min[0], aabb.max[1], aabb.min[2], 1);
        Float4.set(bbPoints[3], aabb.max[0], aabb.max[1], aabb.min[2], 1);
        Float4.set(bbPoints[4], aabb.min[0], aabb.min[1], aabb.max[2], 1);
        Float4.set(bbPoints[5], aabb.max[0], aabb.min[1], aabb.max[2], 1);
        Float4.set(bbPoints[6], aabb.min[0], aabb.max[1], aabb.max[2], 1);
        Float4.set(bbPoints[7], aabb.max[0], aabb.max[1], aabb.max[2], 1);
        
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

    export function containsPointIgnoreMaxZ(aabb: AABB, point: Float3) {
        for(let i = 0; i < 2; i++) {
            if (aabb.min[i] > point[i] || aabb.max[i] < point[i]) {
                return false;
            }
        }
        if (aabb.min[2] > point[2]) {
            return false;
        }
        return true;
    }

    export function containsBoundingBox(self: AABB, other: AABB) {
        return containsPoint(self, other.min) && containsPoint(self, other.max);
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

    export function distanceToPointIgnoreAxis(aabb: AABB, point: Float3, ignore: Axis) {
        if (containsPoint(aabb, point)) {
            return 0;
        }

        const deltas = Float3.zero();
        for(let i = 0; i < 3; i++) {
            if (i == ignore) {
                continue;
            }
            if (point[i] < aabb.min[i]) {
                deltas[i] = aabb.min[i] - point[i];
            } else {
                deltas[i] = point[i] - aabb.max[i];
            }
        }
        return Float3.length(deltas);
    }
}

export interface BspTree {
    nodes: WoWWorldModelBspNode[], // bspNodes
    faceIndices: number[], // faceIndices
    vertexIndices: number[], // indices.clone
    vertices: Float3[] // vertices.clone
}

export namespace BspTree {
    export interface ZLineIntersectData {
        dist: number,
        bary: Float3
    }

    function negZLineIntersect(point: Float3, [vertex0, vertex1, vertex2]: Float3[]) : ZLineIntersectData|null {
        let minX = Math.min(vertex0[0], vertex1[0], vertex2[0]);
        let maxX = Math.max(vertex0[0], vertex1[0], vertex2[0]);
        if (point[0] < minX || point[0] > maxX) {
            return null;
        }

        let minY = Math.min(vertex0[1], vertex1[1], vertex2[1]);
        let maxY = Math.max(vertex0[1], vertex1[1], vertex2[1]);
        if (point[1] < minY || point[1] > maxY) {
            return null;
        }

        // check ray is above on z
        let minZ = Math.min(vertex0[2], vertex1[2], vertex2[2]);
        if (point[2] < minZ) {
            return null;
        }

        // inlined rayTriangleIntersect, assuming that axis = negative z
        let ab = Float3.subtract(vertex1, vertex0);
        const ac = Float3.subtract(vertex2, vertex0);
        const n = Float3.cross(ab, ac);
        if (n[2] < 0.0001) {
            return null;
        }

        const temp = Float3.subtract(point, vertex0);
        const dist = Float3.dot(temp, n) / n[2];
        if (dist < 0) {
            return null;
        }

        // inlined cross assuming dir = negative z
        const ex = -temp[1];
        const ey = temp[0];
        const v = (ac[0] * ex, + ac[1] * ey) / n[2];
        if (v < 0 || v > 1) {
            return null;
        }

        const w = (ab[0] * ex + ab[1] * ey) / -n[2];
        if (w < 0 || v + w > 1) {
            return null;
        }
        
        return {
            dist: dist,
            bary: Float3.create(v, w, 1 - v - w)
        };
    }

    function getFaceVertices(tree: BspTree, index: number) {
        const faceIndex = tree.faceIndices[index];
        const [index0, index1, index2] = getFaceIndices(tree, faceIndex);

        return [tree.vertices[index0], tree.vertices[index1], tree.vertices[index2]];
    }

    function getFaceIndices(tree: BspTree, faceIndex: number) {
        return [
            tree.vertexIndices[3 * faceIndex + 0],
            tree.vertexIndices[3 * faceIndex + 1],
            tree.vertexIndices[3 * faceIndex + 2],
        ]
    }

    function getNodeAxis(node: WoWWorldModelBspNode) {
        if (node.flags & WowWorldModelBspNodeFlags.YAxis) {
            return Axis.Y;
        }
        if (node.flags & WowWorldModelBspNodeFlags.ZAxis) {
            return Axis.Z;
        }
        return Axis.X;
    }

    export function pickClosestTriangle_NegZ(tree: BspTree, point: Float3, nodes: WoWWorldModelBspNode[]) {
        let minDist = Number.MAX_VALUE;
        let minBspIndex = -1;
        let resultBary = Float3.zero();

        for(const node of nodes) {
            const start = node.faceStart;
            const end = start + node.faces;

            for(let i = start; i < end; i++) {
                const intersect = negZLineIntersect(point, getFaceVertices(tree, i));
                if (intersect) {
                    if (intersect.dist < minDist) {
                        minDist = intersect.dist;
                        minBspIndex = i;
                        Float3.copy(intersect.bary, resultBary);
                    }
                }
            }
        }

        const faceIndex = tree.faceIndices[minBspIndex];
        const indices = getFaceIndices(tree, faceIndex);
        return {
            distance: minDist,
            baryocentricCoords: resultBary,
            vertexIndices: indices
        }
    }
    
    export function findNodesForPoint(tree: BspTree, point: Float3, nodes: WoWWorldModelBspNode[], startIndex: number) {
        if (startIndex < 0 || tree.nodes.length < startIndex) {
            return;
        }

        const node = tree.nodes[startIndex];
        if (node.flags & WowWorldModelBspNodeFlags.Leaf) {
            nodes.push(node);
            return;
        }

        const axis = getNodeAxis(node);
        if (axis === Axis.Z) {
            findNodesForPoint(tree, point, nodes, node.negChild);
            findNodesForPoint(tree, point, nodes, node.posChild);
        } else {
            const value = axis === Axis.X ? point[0] : point[1];
            if (value < node.planeDistance) {
                findNodesForPoint(tree, point, nodes, node.negChild);
            }
            else {
                findNodesForPoint(tree, point, nodes, node.posChild);
            }
        }
    }

    export function createBoundingBoxForNodes(tree: BspTree, nodes: WoWWorldModelBspNode[]) {
        const points = nodes.reduce((acc, next) => {
            const range = Array.from({ length: next.faces}, (_, i) => next.faceStart + i);
            const vertices = range.reduce((acc, next) => acc.concat(getFaceVertices(tree, next)), []);
            return acc.concat(vertices)
        }, [])
        return AABB.fromVertices(points, 0);
    }
}