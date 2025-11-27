import { isDisposable } from "@app/interfaces";
import { CacheKey, ICache } from "./interfaces";
import { Disposable } from "@app/disposable";

interface CacheEntry<TValue> {
    value: TValue
    ttl: number
}
export class SimpleCache extends Disposable implements ICache {
    items: { [index: CacheKey]: CacheEntry<unknown> };
    maxTtl: number

    constructor(maxTtl: number = 300000) {
        super();
        this.items = { };
        this.maxTtl = maxTtl
        this.isDisposing = false;
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
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
        const ref = this.items[key];
        if (isDisposable(ref.value)) {
            ref.value.dispose();
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

    get<TValue>(key: CacheKey): TValue|null {
        if (this.isDisposing) {
            return null;
        }

        const entry = this.items[key];
        if (!entry) {
            return null;
        }
        entry.ttl = this.maxTtl;
        return entry.value as TValue;
    }

    store<TValue>(key: CacheKey, value: TValue, ttl: number = this.maxTtl) {
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
}