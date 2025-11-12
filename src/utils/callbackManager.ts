
export type CallbackFn<T> = (obj: T) => void


export interface IImmediateCallbackable<TKey extends string> {
    canExecuteCallback(type: TKey): boolean;
}

export interface ICallbackData<TKey extends string, T extends IImmediateCallbackable<TKey>> {
    persistent: boolean;
    fn: CallbackFn<T>;
};

export interface ICallbackManager<TKeys extends string, T extends IImmediateCallbackable<TKeys>> {
    bind(obj: T): void;
    addCallback(type: TKeys, callbackFn: CallbackFn<T>, persistent: boolean): void;
    processCallbacks(type: TKeys): void;
}

export class CallbackManager<TKeys extends string, T extends IImmediateCallbackable<TKeys>> implements ICallbackManager<TKeys, T> {
    private obj: T;
    private callbacks: { [key: string]: ICallbackData<TKeys, T>[] }

    constructor() {
        this.callbacks = {};
    }

    bind(obj: T): void {
        this.obj = obj;
    }

    addCallback(type: TKeys, fn: CallbackFn<T>, persistent: boolean): void {
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
    processCallbacks(type: TKeys): void {
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