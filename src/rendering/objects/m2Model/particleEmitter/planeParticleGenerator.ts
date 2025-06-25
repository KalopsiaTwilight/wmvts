import { Float2, Float3 } from "@app/rendering/math";
import { BaseParticleGenerator, ParticleData } from "./baseParticleGenerator";

export class PlaneParticleGenerator extends BaseParticleGenerator {
    generateParticle(delta: number): ParticleData {
        let deltaVary = delta * this.rng.getFloat();
        let life = this.rng.getFloat();
        let state = life < 1 ? (life > -1 ? Math.trunc(32767 * life + 0.5) : -32767) : 32767;
        let nextLifeTime = this.getLifespan(state)
        if (nextLifeTime < 0.001) {
            nextLifeTime = 0.001
        }

        const age = deltaVary % nextLifeTime;
        const seed = 0xFFFF & this.rng.getInt();

        const position = Float3.zero();
        position[0] = this.rng.getSignedFloat() * this.animatedProps.emissionAreaX * 0.5;
        position[1] = this.rng.getSignedFloat() * this.animatedProps.emissionAreaY * 0.5;

        let velocity = this.getNextEmissionSpeed();
        const velocityVec = Float3.zero();
        let zSource = this.animatedProps.zSource;
        if (zSource < 0.001) {
            let polar = this.animatedProps.verticalRange * this.rng.getSignedFloat();
            let azimuth = this.animatedProps.horizontalRange * this.rng.getSignedFloat();
            let sinPolar = Math.sin(polar);
            let sinAzimuth = Math.sin(azimuth);
            let cosPolar = Math.cos(polar);
            let cosAzimuth = Math.cos(azimuth);
            Float3.set(velocityVec, 
                cosAzimuth * sinPolar * velocity, 
                sinAzimuth * sinPolar * velocity, 
                cosPolar * velocity
            );
        } else {
            let pos = Float3.zero();
            Float3.copy(position, pos);
            pos[2] = pos[2] - zSource;
            if (Float3.length(pos) > 0.0001) {
                Float3.normalize(pos, pos)
                Float3.scale(pos, velocity, velocityVec);
            }
        }

        return {
            age, 
            position, 
            seed,
            state, 
            texturePosition: [Float2.zero(), Float2.zero()],
            textureVelocity: [Float2.zero(), Float2.zero()],
            velocity: velocityVec
        };
    }

}