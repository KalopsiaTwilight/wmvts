import { WoWAnimationData, WoWAnimationFlags, WoWTrackData } from "@app/modeldata";
import { M2Model } from "./m2Model";
import { Float3, Float4 } from "@app/index";

const FALLBACK_ANIM_ID = 0;

export type LerpFn<T> =  (valA: T, valB: T, blendCoeff: number, dest?: T) => T;
export type CopyFn<T> = (from: T, to: T) => T;

const lerpNum: LerpFn<number> = (valA, valB, coEff) => valA + coEff * (valB - valA);
const copyNum: CopyFn<number> = (val) => val;

export class AnimationState {
    animations: WoWAnimationData[];
    globalTimers: number[];
    globalLoops: number[];

    currentAnimation: WoWAnimationData;
    nextAnimation?: WoWAnimationData;

    currentAnimActiveTime: number;
    nextAnimActiveTime: number;

    blendFactor: number;

    constructor(model: M2Model) {
        this.animations = model.modelData.animations;

        this.currentAnimActiveTime = 0;
        this.nextAnimActiveTime = 0;
        this.blendFactor = 1;

        this.globalLoops = model.modelData.globalLoops;
        this.globalTimers = new Array(this.globalLoops.length);
        for(let i = 0; i < this.globalTimers.length; i++) {
            this.globalTimers[i] = 0;
        }
    }

    useAnimation(animId: number) {
        this.currentAnimActiveTime = 0;
        this.currentAnimation = this.animations.find(x => x.id === animId && x.variationIndex === 0);
        if (!this.currentAnimation) {
            this.currentAnimation = this.animations.find(x => x.id === FALLBACK_ANIM_ID && x.variationIndex === 0);
        }
        this.blendFactor = 0;
        this.getNextVariation();
    }

    update(deltaTime: number) {
        this.currentAnimActiveTime += deltaTime;
        for(let i = 0; i < this.globalTimers.length; i++) {
            this.globalTimers[i] += deltaTime;
            if (this.globalLoops[i] > 0) {
                this.globalTimers[i] %= this.globalLoops[i];
            }
        }

        this.blendFactor = 1;

        let animTimeRemaining = this.currentAnimation.duration - this.currentAnimActiveTime;
        if (this.nextAnimation) {
            const blendTimeIn = this.nextAnimation.blendTimeIn;
            if (blendTimeIn > 0 && animTimeRemaining < blendTimeIn) {
                this.nextAnimActiveTime = (blendTimeIn - animTimeRemaining) % this.nextAnimation.duration;
                this.blendFactor = animTimeRemaining / blendTimeIn;
            }
        }

        if (this.currentAnimActiveTime >= this.currentAnimation.duration) {
            if (this.nextAnimation) {
                this.currentAnimation = this.nextAnimation;
                this.currentAnimActiveTime = this.nextAnimActiveTime;
                this.getNextVariation();
            } else {
                this.currentAnimActiveTime %= this.currentAnimation.duration;
            }
        }
    }

    private getNextVariation() {
        this.nextAnimation = this.currentAnimation;
        this.nextAnimActiveTime = 0;

        if (this.currentAnimation.variationNext > -1) {
            let targetFreq = 32767 * Math.random(),
                currentFreq = 0;
            
            currentFreq += this.animations[this.currentAnimation.id].frequency;
            while(currentFreq < targetFreq && this.nextAnimation.variationNext > -1) {
                this.nextAnimation = this.animations[this.currentAnimation.variationNext]
                currentFreq +=  this.nextAnimation.frequency;
            }
        } else {
            const baseVariation = this.animations.find((anim) => anim.id == this.currentAnimation.id && anim.variationIndex === 0);
            if (baseVariation) {
                this.nextAnimation = baseVariation;
            }
        }

        while (
            (WoWAnimationFlags.PrimaryBoneSequence & this.nextAnimation.flags) == 0 &&
            (WoWAnimationFlags.IsAlias & this.nextAnimation.flags) > 0
        ) {
            this.nextAnimation = this.animations[this.nextAnimation.aliasNext];
        }
    }

    hasAnimatedValuesForTrack<T>(track: WoWTrackData<T>) {
        if (!track || !track.animations.length) {
            return false;
        }

        let animId = this.currentAnimation.id
        if (this.currentAnimation.id > track.animations.length) {
            animId = FALLBACK_ANIM_ID;
        }

        return track.animations[animId].timeStamps.length > 0;
    }

    getFloat3TrackValue(track: WoWTrackData<Float3>, fallback?: Float3, dest?: Float3) {
        return this.getTrackValueInt<Float3>(Float3.lerp, Float3.copy, track, fallback, dest);
    }

    getFloat4TrackValue(track: WoWTrackData<Float4>, fallback?: Float4, dest?: Float4): Float4 {
        return this.getTrackValueInt<Float4>(Float4.lerp, Float4.copy, track, fallback, dest);
    }

    getNumberTrackValue(track: WoWTrackData<number>, fallback?: number): number {
        return this.getTrackValueInt<number>(lerpNum, copyNum, track, fallback, 0);
    }

    private getTrackValueInt<T>(lerpFn: LerpFn<T>, copyFn: CopyFn<T>, track: WoWTrackData<T>, fallback?: T, dest?: T) {
        if (!track || track.animations.length === 0) {
            return fallback;
        }

        const currentAnimId = this.currentAnimation.id;
        let currentValue = this.calculateAnimatedValue(lerpFn, copyFn, track, currentAnimId, this.currentAnimActiveTime, fallback, dest);
        if (this.blendFactor === 0 || this.blendFactor >= 1) {
            return currentValue;
        }
        
        let nextAnimId = this.nextAnimation.id;
        if (nextAnimId >= track.animations.length) {
            nextAnimId = FALLBACK_ANIM_ID;
        }

        const nextAnimValue = this.calculateAnimatedValue(lerpFn, copyFn, track, nextAnimId, this.nextAnimActiveTime, fallback, dest);
        return lerpFn(currentValue, nextAnimValue, this.blendFactor, dest);
    }

    private calculateAnimatedValue<T>(lerpFn: LerpFn<T>, copyFn: CopyFn<T>, track: WoWTrackData<T>, animId: number, activeTime: number, fallback?: T, dest?: T) {
        const animValues = track.animations[animId];

        if (animValues.values.length === 0) {
            return fallback;
        }
        if (animValues.values.length === 1) {
            return copyFn(animValues.values[0], dest);
        }
        if (animValues.values.length > 1) {
            if (track.globalSequence >= 0) {
                activeTime = track.globalSequence < this.globalTimers.length ? this.globalTimers[track.globalSequence] : this.globalTimers[FALLBACK_ANIM_ID];
            }

            const finalTimestamp = animValues.timeStamps[animValues.timeStamps.length - 1];
            if (finalTimestamp > 0 && activeTime >= finalTimestamp) {
                activeTime %= finalTimestamp;
            }
            let nextFrame = animValues.timeStamps.findIndex(x => x > activeTime);
            if (nextFrame < 0) {
                nextFrame = animValues.timeStamps.length - 1;
            }
            const currentFrame = nextFrame - 1;

            if (track.interpolationType !== 1) {
                return copyFn(animValues.values[currentFrame], dest);
            }

            const currentTimestamp = animValues.timeStamps[currentFrame];
            const nextTimestamp = animValues.timeStamps[nextFrame];
            let blendCoeff = 0;

            if (currentTimestamp !== nextTimestamp) {
                blendCoeff = (activeTime - currentTimestamp) / (nextTimestamp - currentTimestamp);
            }

            const currentValue = animValues.values[currentFrame];
            const nextValue = animValues.values[nextFrame];
            return lerpFn(currentValue, nextValue, blendCoeff, dest);
        }
    }
}
