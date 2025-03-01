import { RenderingEngine } from "../engine";

export interface IDisposable {
    dispose(): void;
}

export interface RenderObject extends IDisposable {
    initialize(engine: RenderingEngine): void;
    update(deltaTime: number): void;
    draw(depthTest: boolean): void;
}