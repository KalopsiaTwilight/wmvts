import { IDisposable, isDisposable } from "@app/interfaces";

interface CacheEntry<TValue> {
    value: TValue
    ttl: number
}

export type CacheKey = number | string;
export class SimpleCache<TValue> implements IDisposable {
    items: { [index: CacheKey]: CacheEntry<TValue> };
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
            // Persist entry
            if (entry.ttl == -1) {
                continue;
            }
            entry.ttl -= deltaTime;
            if (entry.ttl < 0) {
                this.delete(key);
            }
        }
    }

    delete(key: CacheKey) {
        const obj = this.items[key];
        if (isDisposable(obj)) {
            obj.dispose();
        }
        delete this.items[key];
    }

    contains(key: CacheKey): boolean {
        if (this.isDisposing) {
            return false;
        }

        const entry = this.items[key];
        if (!entry) {
            return false;
        }
        return true;
    }

    get(key: CacheKey): TValue|null {
        if (this.isDisposing) {
            return null;
        }

        const entry = this.items[key];
        if (!entry) {
            return null;
        }
        entry.ttl = this.maxTtl;
        return entry.value;
    }

    store(key: CacheKey, value: TValue, ttl: number = this.maxTtl) {
        this.items[key] = {
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