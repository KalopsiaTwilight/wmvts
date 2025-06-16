import { IDisposable } from "./objects";

interface CacheEntry<TValue> {
    value: TValue
    ttl: number
}

export class SimpleCache<TValue> implements IDisposable {
    items: { [index: number|string]: CacheEntry<TValue> };
    maxTtl: number

    constructor(maxTtl: number = 300000) {
        this.items = { };
        this.maxTtl = maxTtl
    }
    isDisposing: boolean;

    dispose(): void {
        this.isDisposing = true;
        this.items = null;
    }

    update(deltaTime: number) {
        const keys = this.getKeys();
        for(const key of keys) {
            const entry = this.items[key];
            if (entry.ttl != -1) {
                entry.ttl -= deltaTime;
                if (entry.ttl < 0) {
                    delete this.items[key];
                }
            }
        }
    }

    contains(id: number|string): boolean {
        if (this.isDisposing) {
            return false;
        }

        const entry = this.items[id];
        if (!entry) {
            return false;
        }
        return true;
    }

    get(id: number|string): TValue|null {
        if (this.isDisposing) {
            return null;
        }

        const entry = this.items[id];
        if (!entry) {
            return null;
        }
        entry.ttl = this.maxTtl;
        return entry.value;
    }

    store(id: number|string, value: TValue, ttl: number = this.maxTtl) {
        this.items[id] = {
            ttl,
            value
        }
    }

    getKeys(): string[] | null {
        if (this.isDisposing) {
            return null;
        }
        return Object.keys(this.items);
    }

    getValues(): TValue[] | null {
        if (this.isDisposing) {
            return null;
        }
        return this.getKeys().map(key => this.items[key].value);
    }
}