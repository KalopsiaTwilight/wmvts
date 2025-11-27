import { CallbackFn, DisposableEvents, IDisposable } from "./interfaces";

interface ICallbackData<TParentEvent extends string> {
    callback: CallbackFn<Disposable<TParentEvent>>;
    persistent: boolean;
}

export abstract class Disposable<TParentEvent extends string = never> implements IDisposable<TParentEvent> {
    isDisposing: boolean;

    private callbacks: { [key: string]: ICallbackData<TParentEvent>[] }

    constructor() {
        this.isDisposing = false;
        this.callbacks = {};
    }

    on(event: TParentEvent | DisposableEvents, callback: (obj: this) => void) {
        this.addCallback(event, callback, true);
    }

    once(event: TParentEvent | DisposableEvents, callback: (obj: this) => void) {
        this.addCallback(event, callback, false);
    }

    protected canExecuteCallbackNow(type: TParentEvent | DisposableEvents): boolean {
        switch (type) {
            case "disposed": return this.isDisposing;
            default: return false;
        }
    }

    protected processCallbacks(type: TParentEvent | DisposableEvents): void {
        if (this.callbacks[type]) {
            for (let i = 0; i < this.callbacks[type].length; i++) {
                const data = this.callbacks[type][i];
                data.callback(this);
                if (!data.persistent) {
                    this.callbacks[type].splice(i, 1);
                    i--;
                }
            }
        }
    }

    private addCallback(type: TParentEvent | DisposableEvents, callback: CallbackFn<this>, persistent: boolean): void {
        if (this.canExecuteCallbackNow(type)) {
            callback(this);
            if (!persistent) {
                return;
            }
        }

        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push({ callback, persistent });
    }

    dispose(): void {
        this.isDisposing = true;
        this.processCallbacks("disposed");
    }
}