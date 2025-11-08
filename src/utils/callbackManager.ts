
export type CallbackFn<T> = (obj: T) => void


export interface IImmediateCallbackable {
    canExecuteCallback(type: string): boolean;
}

export interface ICallbackData<T extends IImmediateCallbackable> {
    persistent: boolean;
    fn: CallbackFn<T>;
};

export interface ICallbackManager<T extends IImmediateCallbackable> {
    bind(obj: T): void;
    addCallback(type: string, callbackFn: CallbackFn<T>, persistent: boolean): void;
    processCallbacks(type: string): void;
}

export class CallbackManager<T extends IImmediateCallbackable> implements ICallbackManager<T> {
    private obj: T;
    private callbacks: { [key: string]: ICallbackData<T>[] }

    constructor() {
        this.callbacks = {};
    }

    bind(obj: T): void {
        this.obj = obj;
    }

    addCallback(type: string, fn: CallbackFn<T>, persistent: boolean): void {
        if (this.obj.canExecuteCallback(type)) {
            fn(this.obj);
            if (!persistent) {
                return;
            }
        } 

        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push({ persistent, fn});
    }
    processCallbacks(type: string): void {
        if (this.callbacks[type]) {
            for(let i = 0; i < this.callbacks[type].length; i++) {
                const data = this.callbacks[type][i];
                data.fn(this.obj);
                if(!data.persistent) {
                    this.callbacks[type].splice(i, 1);
                    i--;
                }
            }
        }
    }
}