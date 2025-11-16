import { IRenderingEngine } from "@app/rendering";
import { IDisposable } from "@app/interfaces";
import { AABB, Float3, Float4, Float44 } from "@app/math";

export interface IRenderObject extends IDisposable {
    engine?: IRenderingEngine;

    initialize(engine: IRenderingEngine): void;
    update(deltaTime: number): void;
    draw(): void;

    fileId: number;
    isLoaded: boolean;
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