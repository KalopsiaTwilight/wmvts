import { WoWParticleEmitterData } from "@app/modeldata";
import { Float2, Float3, IPseudoRandomNumberGenerator } from "@app/math";

import { BaseParticleGenerator, ParticleData } from "./baseParticleGenerator";

export class SphereParticleGenerator extends BaseParticleGenerator {
    particlesGoUp: boolean;
    constructor(rng: IPseudoRandomNumberGenerator, m2Data: WoWParticleEmitterData, particlesGoUp: boolean) {
        super(rng, m2Data);
        this.particlesGoUp = particlesGoUp;
    }
    generateParticle(delta: number): ParticleData {
        let deltaVary = delta * this.rng.getFloat();
        let randFloat = this.rng.getFloat();
        const state = randFloat < 1 ? (randFloat > -1 ? Math.trunc(32767 * randFloat + 0.5) : -32767) : 32767;

        let lifeSpan = this.getLifespan(state);
        if (lifeSpan < 0.001) {
            lifeSpan = 0.001
        }

        const age = deltaVary % lifeSpan;
        const seed = 0xFFFF & this.rng.getInt();

        const emissionArea = (this.animatedProps.emissionAreaY - this.animatedProps.emissionAreaX)
        let radius = this.animatedProps.emissionAreaX + emissionArea * this.rng.getFloat();
        let polar = this.animatedProps.verticalRange * this.rng.getFloat();
        let azimuth = this.animatedProps.horizontalRange * this.rng.getFloat();
        let cosPolar = Math.cos(polar);
        let emissionDirection = Float3.create(
            cosPolar * Math.cos(azimuth), 
            cosPolar * Math.sin(azimuth), 
            Math.sin(polar)
        );

        const position = Float3.zero();
        Float3.scale(emissionDirection, radius, position);
        let zSource = this.animatedProps.zSource;
        let direction = Float3.create(0.5, 0.5, 0.5);
        if (zSource == 0) {
            if (this.particlesGoUp) {
                Float3.set(direction, 0, 0, 1);
            } else {
                Float3.set(direction, 
                    cosPolar * Math.cos(azimuth), 
                    cosPolar * Math.sin(azimuth), 
                    Math.sin(polar)
                )
            }
        } else {
            Float3.set(direction, 0, 0, zSource);
            Float3.subtract(position, direction, direction);
            if (Float3.length(direction) > 0.0001) {
                Float3.normalize(direction, direction);
            }
        }
        
        const velocity = Float3.scale(direction, this.getNextEmissionSpeed());

        return {
            age, position, seed, state, velocity, 
            texturePosition: [Float2.zero(), Float2.zero()],
            textureVelocity: [Float2.zero(), Float2.zero()],
        }
    }
};