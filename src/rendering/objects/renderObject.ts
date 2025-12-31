import { Disposable } from "../../disposable";
import { IRenderer } from "../interfaces";
import { IRenderObject, RenderObjectEvents } from "./interfaces";


export abstract class RenderObject<TEvent extends string = never> extends Disposable<TEvent | RenderObjectEvents> implements IRenderObject<TEvent> {
    renderer: IRenderer;
    
    get isAttachedToRenderer() {
        return this.renderer != null;
    }

    attachToRenderer(engine: IRenderer): void {
        this.renderer = engine;
    }

    detachFromRenderer(): void {
        this.renderer = null;
    }

    abstract update(deltaTime: number): void;
    abstract draw(): void;
    abstract get isLoaded(): boolean;

    protected override canExecuteCallbackNow(type: TEvent | RenderObjectEvents): boolean {
        switch(type) {
            case "loaded": return this.isLoaded;
            default: return super.canExecuteCallbackNow(type);
        }
    }
}