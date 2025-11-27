import { WoWParticleEmitterData } from "@app/modeldata";
import { Float2, Float3, IPseudoRandomNumberGenerator } from "@app/math";
import { IDisposable } from "@app/interfaces";
import { Disposable } from "@app/disposable";

export interface ParticleData {
    position: Float3;
    age: number;
    velocity: Float3;
    state: number;
    seed: number;
    texturePosition: [Float2, Float2];
    textureVelocity: [Float2, Float2];
}

export class AnimatedParticleGeneratorProps {
    emissionSpeed: number;
    speedVariation: number;
    lifespan: number;
    emissionRate: number;
    gravity: Float3;
    zSource: number;
    emissionAreaX: number;
    emissionAreaY: number;
    verticalRange: number;
    horizontalRange: number;
    
    constructor() {
        this.emissionSpeed = 0;
        this.speedVariation = 0;
        this.lifespan = 0;
        this.emissionRate = 0;
        this.gravity = Float3.zero();
        this.zSource = 0;
        this.emissionAreaX = 0;
        this.emissionAreaY = 0;
        this.verticalRange = 0;
        this.horizontalRange = 0;
    }
}

export abstract class BaseParticleGenerator extends Disposable implements IDisposable {
    rng: IPseudoRandomNumberGenerator;
    animatedProps: AnimatedParticleGeneratorProps;
    m2Data: WoWParticleEmitterData;
    
    constructor(rng: IPseudoRandomNumberGenerator, generatorData: WoWParticleEmitterData) {
        super()
        this.rng = rng;
        this.m2Data = generatorData;
        this.animatedProps = new AnimatedParticleGeneratorProps();
    }


    dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.rng = null;
        this.animatedProps = null;
        this.m2Data = null;
    }

    getNextEmissionRate() {
        return this.animatedProps.emissionRate + this.rng.getSignedFloat() * this.m2Data.emissionRateVary;
    }

    getMaxEmissionRate() {
        return this.animatedProps.emissionRate + this.m2Data.emissionRateVary;
    }
    
    getMaxLifespan() {
        return this.animatedProps.lifespan + this.m2Data.lifespanVary;
    }

    getLifespan(state: number) {
        return this.animatedProps.lifespan + (1/32767) * state * this.m2Data.lifespanVary;
    }

    getNextEmissionSpeed() {
        return this.animatedProps.emissionSpeed + this.animatedProps.speedVariation * this.rng.getSignedFloat()
    }

    getAnimatedProps() {
        return this.animatedProps;
    }

    getGravity(dest: Float3) {
        Float3.copy(this.animatedProps.gravity, dest);
    }

    abstract generateParticle(timeFrame: number): ParticleData;
}