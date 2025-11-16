import { WoWLocalTrackData } from "@app/modeldata";
import { Float2, Float3, Float4 } from "@app/math";

export abstract class LocalAnimatedValue<T> {
    timestamps: number[];
    values: T[];

    constructor(track: WoWLocalTrackData<T>) {
        this.timestamps = track.keys;
        this.values = track.values;
    }

    dispose(): null {
        for(let i = 0; i < this.values.length; i++) {
            this.values[i] = null;
        }
        this.timestamps = null;
        this.values = null;
        return null;
    }

    getValueAtTimestamp(timestamp: number, fallback: T, dest?: T, override?: T[]) {
        if (!dest) {
            dest = this.getDefaultT();
        }
        let values = override || this.values;
        if (this.values.length > 1 && this.timestamps.length > 1) {
            var maxKey = this.timestamps[this.timestamps.length - 1];
            if (maxKey > 0 && timestamp > maxKey) {
                (timestamp %= maxKey);
            }
            var index = 0;
            for (let i = 0; i < this.timestamps.length - 1; ++i) {
                if (timestamp > this.timestamps[i] && timestamp <= this.timestamps[i + 1]) {
                    index = i;
                    break;
                }
            }
            var timeA = this.timestamps[index],
                timeB = this.timestamps[index + 1],
                blendCoeff = 0;
            if (timeA != timeB) {
                blendCoeff = (timestamp - timeA) / (timeB - timeA);
            }
            return this.lerpT(values[index], values[index + 1], blendCoeff, dest);
        }
        if (values.length > 0) {
            dest = this.copyT(values[0], dest);
            return dest;
        }
        return fallback;
    }

    abstract getDefaultT(): T;
    abstract copyT(inp: T, dest: T): T;
    abstract lerpT(inpA: T, inpB: T, coEff: number, dest: T): T;
}

export class LocalAnimatedFloat4 extends LocalAnimatedValue<Float4> {
    getDefaultT(): Float4 {
        return Float4.zero();
    }
    copyT(inp: Float4, dest: Float4): Float4 {
        return Float4.copy(inp, dest);
    }
    lerpT(inpA: Float4, inpB: Float4, coEff: number, dest: Float4): Float4 {
        return Float4.lerp(inpA, inpB, coEff, dest);
    }
}

export class LocalAnimatedFloat3 extends LocalAnimatedValue<Float3> {
    getDefaultT(): Float3 {
        return Float3.zero();
    }
    copyT(inp: Float3, dest: Float3): Float3 {
        return Float3.copy(inp, dest);
    }
    lerpT(inpA: Float3, inpB: Float3, coEff: number, dest: Float3): Float3 {
        return Float3.lerp(inpA, inpB, coEff, dest);
    }
}

export class LocalAnimatedValueFloat2 extends LocalAnimatedValue<Float2> {
    getDefaultT(): Float2 {
        return Float2.zero();
    }
    copyT(inp: Float2, dest: Float2): Float2 {
        return Float2.copy(inp, dest);
    }
    lerpT(inpA: Float2, inpB: Float2, coEff: number, dest: Float2): Float2 {
        return Float2.lerp(inpA, inpB, coEff, dest);
    }
}

export class LocalAnimatedValueNumber extends LocalAnimatedValue<number> {
    getDefaultT(): number {
        return 0;
    }

    copyT(inp: number, dest: number): number {
        return dest;
    }

    lerpT(inpA: number, inpB: number, coEff: number, dest: number): number {
        return inpA + coEff * (inpB - inpA);
    }
}