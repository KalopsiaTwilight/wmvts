import { CallbackFn, DisposableEvents, IDisposable } from "./interfaces";

export abstract class Disposable<TParentEvent extends string = never> implements IDisposable<TParentEvent> {
    isDisposing: boolean;

    private callbacks: { [key: string]: CallbackFn<Disposable<TParentEvent>>[] }

    constructor() {
        this.isDisposing = false;
        this.callbacks = {};
    }

    once(event: TParentEvent | DisposableEvents, callback: (obj: this) => void) {
        this.addCallback(event, callback);
    }

    protected canExecuteCallbackNow(type: TParentEvent | DisposableEvents): boolean {
        switch(type) {
            case "disposed": return this.isDisposing;
            default: return false;
        }
    }

    protected processCallbacks(type: TParentEvent | DisposableEvents): void {
        if (this.callbacks[type]) {
            for(let i = 0; i < this.callbacks[type].length; i++) {
                const fn = this.callbacks[type][i];
                fn(this);
            }
            delete this.callbacks[type];
        }
    }

    private addCallback(type: TParentEvent | DisposableEvents, fn: CallbackFn<this>): void {
        if (this.canExecuteCallbackNow(type)) {
            fn(this);
            return;
        } 

        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(fn);
    }

    dispose(): void {
        this.isDisposing = true;
        this.processCallbacks("disposed");
    }
}