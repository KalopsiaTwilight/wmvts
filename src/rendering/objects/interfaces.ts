import { RenderingEngine } from "../engine";

export interface IDisposable {
    isDisposing: boolean;
    dispose(): void;
}

export interface RenderObject extends IDisposable {
    initialize(engine: RenderingEngine): void;
    update(deltaTime: number): void;
    draw(): void;

    fileId: number;
    isLoaded: boolean;
}