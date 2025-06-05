import { RenderingEngine } from "../engine";
import { Float3, Float4, Float44 } from "../math";

export interface IDisposable {
    dispose(): void;
}

export interface RenderObject extends IDisposable {
    initialize(engine: RenderingEngine): void;
    update(deltaTime: number): void;
    draw(): void;
    setModelMatrix(position: Float3, rotation: Float4, scale: Float3): void;

    fileId: number;
    isLoaded: boolean;
    parent?: RenderObject;
    children: RenderObject[];
    modelMatrix: Float44;
}