import { isDisposable } from "@app/interfaces";
import { CacheKey, ICache } from "./interfaces";
import { Disposable } from "@app/disposable";

interface CacheEntry<TValue> {
    value: TValue
    owners: OwnerIdentifier[];
    ttl: number
}

export type OwnerIdentifier = string | number;
export class WebGlCache extends Disposable implements ICache {
    items: { [index: CacheKey]: CacheEntry<unknown> };
    maxTtl: number

    constructor(maxTtl: number = 300000) {
        super();
        this.items = { };
        this.maxTtl = maxTtl
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        for(const key of this.getKeys()) {
            this.delete(key);
        }
        this.items = null;
    }

    update(deltaTime: number) {
        const keys = this.getKeys();
        for(const key of keys) {
            const entry = this.items[key];
            // Only invalidate objects that aren't 'owned'
            if (entry.owners.length > 0) {
                continue;
            }
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

    addOwner(key: CacheKey, owner: OwnerIdentifier) {
        if (this.isDisposing) {
            return;
        }

        if (this.items[key]) {
            this.items[key].owners.push(owner);
        }
    }

    removeOwner(key: CacheKey, owner: OwnerIdentifier) {
        if (this.isDisposing) {
            return;
        }

        if (this.items[key]) {
            this.items[key].owners = this.items[key].owners.filter(x => x !== owner);
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
            value,
            owners: []
        }
    }

    getKeys(): string[] | null {
        if (this.isDisposing) {
            return null;
        }
        return Object.keys(this.items);
    }
}