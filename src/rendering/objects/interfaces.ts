import { IRenderer } from "@app/rendering";
import { IDisposable } from "@app/interfaces";
import { AABB, Float3, Float4, Float44 } from "@app/math";

export interface IRenderObject extends IDisposable {
    renderer?: IRenderer;

    attachToRenderer(renderer: IRenderer): void;
    update(deltaTime: number): void;
    draw(): void;

    get isLoaded(): boolean;
    get isAttachedToRenderer(): boolean;
}

export interface IWorldPositionedObject extends IRenderObject {
    parent?: IWorldPositionedObject;
    children: IWorldPositionedObject[];
    localModelMatrix: Float44;
    worldModelMatrix: Float44;
    invWorldModelMatrix: Float44;
    localBoundingBox: AABB;
    worldBoundingBox: AABB;

    updateModelMatrixFromParent(): void;
    setModelMatrix(position: Float3|null, rotation: Float4|null, scale: Float3|null): void;
    setModelMatrixFromMatrix(matrix: Float44): void;
}

export function isWorldPositionedObject(obj: any): obj is IWorldPositionedObject {
    return obj && obj.worldModelMatrix && obj.worldBoundingBox;
} 