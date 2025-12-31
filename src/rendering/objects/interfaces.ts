import { IRenderer } from "@app/rendering";
import { AABB, Float3, Float4, Float44 } from "@app/math";

import { IDisposable } from "../../interfaces";


export type RenderObjectEvents = "loaded"

export interface IRenderObject<TParentEvent extends string = never> extends IDisposable<TParentEvent | RenderObjectEvents> {
    renderer?: IRenderer;

    attachToRenderer(renderer: IRenderer): void;
    detachFromRenderer(): void;
    update(deltaTime: number): void;
    draw(): void;

    get isLoaded(): boolean;
    get isAttachedToRenderer(): boolean;
}

export interface IWorldPositionedObject<TEvent extends string = never> extends IRenderObject<TEvent> {
    parent?: IWorldPositionedObject;
    children: IWorldPositionedObject[];
    localModelMatrix: Float44;
    worldModelMatrix: Float44;
    invWorldModelMatrix: Float44;
    localBoundingBox: AABB;
    worldBoundingBox: AABB;
    scale: Float3;

    updateModelMatrixFromParent(): void;
    setModelMatrix(position: Float3|null, rotation: Float4|null, scale: Float3|null): void;
    setModelMatrixFromMatrix(matrix: Float44): void;
    addChild(obj: IWorldPositionedObject): void;
}

export function isWorldPositionedObject(obj: any): obj is IWorldPositionedObject {
    return obj && obj.worldModelMatrix && obj.worldBoundingBox;
} 