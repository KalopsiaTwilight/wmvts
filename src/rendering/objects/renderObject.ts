import { IRenderingEngine } from "../interfaces";
import { CallbackFn, IRenderObject, RenderObjectEvents } from "./interfaces";


export abstract class RenderObject<TEvent extends string = RenderObjectEvents> implements IRenderObject<TEvent> {
    isDisposing: boolean;

    renderer: IRenderingEngine;
    private callbacks: { [key: string]: CallbackFn<RenderObject<TEvent>>[] }
    

    get isAttachedToRenderer() {
        return this.renderer != null;
    }

    constructor() {
        this.isDisposing = false;
        this.callbacks = {};
    }

    attachToRenderer(engine: IRenderingEngine): void {
        this.renderer = engine;
    }

    abstract update(deltaTime: number): void;
    abstract draw(): void;
    abstract get isLoaded(): boolean;

    once(event: TEvent | RenderObjectEvents, callback: (obj: this) => void) {
        this.addCallback(event, callback);
    }

    protected canExecuteCallbackNow(type: TEvent | RenderObjectEvents): boolean {
        switch(type) {
            case "disposed": return this.isDisposing;
            case "loaded": return this.isLoaded;
            default: return false;
        }
    }


    private addCallback(type: TEvent | RenderObjectEvents, fn: CallbackFn<this>): void {
        if (this.canExecuteCallbackNow(type)) {
            fn(this);
            return;
        } 

        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(fn);
    }

    protected processCallbacks(type: TEvent | RenderObjectEvents): void {
        if (this.callbacks[type]) {
            for(let i = 0; i < this.callbacks[type].length; i++) {
                const fn = this.callbacks[type][i];
                fn(this);
            }
            delete this.callbacks[type];
        }
    }

    dispose(): void {
        this.isDisposing = true;
        this.processCallbacks("disposed");
    }
}