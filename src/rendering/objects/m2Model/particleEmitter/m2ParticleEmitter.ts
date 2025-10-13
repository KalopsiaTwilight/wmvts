import { WoWExtendedParticleData, WoWParticleEmitterData } from "@app/modeldata";
import { BufferDataType, ColorMask, Float2, Float3, Float33, Float4, Float44, GxBlend, IDisposable, IPseudoRandomNumberGenerator, IShaderProgram, ITexture, IVertexArrayObject, IVertexDataBuffer, IVertexIndexBuffer, RenderingBatchRequest, RenderingEngine, RenderKey, RenderType } from "@app/rendering";
import { M2Model } from "../m2Model";

import fragmentShaderProgramText from "./m2ParticleEmitter.frag"; 
import vertexShaderProgramText from "./m2ParticleEmitter.vert";
import { BaseParticleGenerator, ParticleData } from "./baseParticleGenerator";
import { PlaneParticleGenerator } from "./planeParticleGenerator";
import { SphereParticleGenerator } from "./sphereParticleGenerator";
import { LocalAnimatedFloat3, LocalAnimatedValueNumber as LocalAnimatedNumber, LocalAnimatedValueFloat2 as LocalAnimatedFloat2 } from "./localAnimatedValue";

function intToColor(val: number) {
    return Float4.create(((val >> 16) & 255) / 255, ((val >> 8) & 255) / 255, ((val >> 0) & 255) / 255, ((val >> 24) & 255) / 255);
}

const MAX_QUADS_PER_EMITTER = 1000;

const shaderIdToPixelTable = [
    0, // Particle_Unlit_T1 - ParticleMod
    0, // Particle_Lit_T1 - ParticleMod
    1, // Particle_Unlit_2ColorTex_3AlphaTex - Particle_2ColorTex_3AlphaTex,
    2, // Particle_Unlit_3ColorTex_3AlphaTex - Particle_3ColorTex_3AlphaTex
    3, // Particle_Unlit_3ColorTex_3AlphaTex_UV - Particle_3ColorTex_3AlphaTex_UV
    4 // Particle_Refraction - Refraction
]

const particleBlendTypeToGxBlend = [
    0, //GxBlend.GxBlend_Opaque,
    1, //GxBlend.GxBlend_AlphaKey,
    2, //GxBlend.GxBlend_Alpha,
    10, //GxBlend.GxBlend_NoAlphaAdd,
    3, //GxBlend.GxBlend_Add,
    4, //GxBlend.GxBlend_Mod,
    5, //GxBlend.GxBlend_Mod2x,
    13, //GxBlend.GxBlend_BlendAdd
]

const randomnessTable = new Array(128);
for (let t = 0; t < 128; t++) {
    randomnessTable[t] = Math.random();
}

class ForcesData {
    windVector: [number, number, number];
    gravity: [number, number, number];
    position: [number, number, number];
    drag: number;
}

class ParticlePreRenderData {
    center: Float3;
    ageValues: {
        color: Float3;
        alpha: number;
        scale: Float2;
        headCell: number;
        tailCell: number;
        alphaCutoff: number;
    };

    constructor() {
        this.center = Float3.zero();
        this.ageValues = {
            scale: Float2.zero(),
            color: Float3.zero(),
            headCell: 0,
            tailCell: 0,
            alpha: 1,
            alphaCutoff: 0
        };
    }
}

const M2ParticleEmitterRandomTable = [];

export class M2ParticleEmitter implements IDisposable {
    // References
    parent: M2Model;
    engine: RenderingEngine;
    m2data: WoWParticleEmitterData;
    exp2Data: WoWExtendedParticleData;
    rng: IPseudoRandomNumberGenerator;
    particleGenerator: BaseParticleGenerator;
    isDisposing: boolean;

    // Graphics 
    renderKey: RenderKey;
    shaderProgram: IShaderProgram;
    indexBuffer: IVertexIndexBuffer
    vertexBuffer: IVertexDataBuffer;
    vao: IVertexArrayObject;

    // Operating data derivatives
    textures: ITexture[]
    followMult: number;
    followBase: number;
    textureIndexMask: number;
    textureColBits: number;
    textureColMask: number;
    randomizedTextureIndexMask: number;
    texScaleX: number;
    texScaleY: number;
    particleType: number;
    shaderId: number;
    particleColorOverride: [Float3, Float3, Float3];
    // Local Tracks
    colorTrack: LocalAnimatedFloat3;
    alphaTrack: LocalAnimatedNumber;
    scaleTrack: LocalAnimatedFloat2;
    headCellTrack: LocalAnimatedNumber;
    tailCellTrack: LocalAnimatedNumber;
    alphaCutOffTrack: LocalAnimatedNumber;

    // Animated props
    activeNow: boolean;

    // Calculation data
    particlesFixMat: Float44;
    isTexturesLoaded: boolean;
    particles: ParticleData[];
    emitterModelMatrix: Float44;
    previousPosition: Float3;
    zOrder: number;
    inheritedScale: number;
    burstTime: number;
    burstVec: Float3;
    fullDeltaPosition: Float3;
    stepDeltaPosition: Float3;
    emissionCounter: number;
    vertexData: number[];
    particleToView: Float44;
    quadToView: Float33;
    quadToViewZVector: Float3;
    nrQuads: number;

    constructor(engine: RenderingEngine, parent: M2Model, emitterData: WoWParticleEmitterData, exp2Data?: WoWExtendedParticleData) {
        this.engine = engine;
        this.parent = parent;
        this.m2data = emitterData;
        this.exp2Data = exp2Data;
        this.rng = engine.getRandomNumberGenerator();
        this.emitterModelMatrix = Float44.identity();
        this.previousPosition = Float3.zero();
        this.zOrder = 0;
        this.inheritedScale = 0;
        this.burstTime = 0;
        this.particles = [];
        this.burstVec = Float3.zero();
        this.fullDeltaPosition = Float3.zero();
        this.stepDeltaPosition = Float3.zero();
        this.emissionCounter = 0;
        this.vertexData = [];
        this.particleToView = Float44.identity();
        this.particlesFixMat = Float44.create(
            0,1,0,0,
            -1,0,0,0,
            0,0,1,0,
            0,0,0,1
        );
        this.quadToView = Float33.identity();
        this.quadToViewZVector = Float3.zero();
        this.nrQuads = 0;
        this.isTexturesLoaded = false;

        if (exp2Data?.alphaCutoff) {
            this.alphaCutOffTrack = new LocalAnimatedNumber(exp2Data.alphaCutoff)
        }
        this.colorTrack = new LocalAnimatedFloat3(this.m2data.colorTrack);
        this.alphaTrack = new LocalAnimatedNumber(this.m2data.alphaTrack);
        this.scaleTrack = new LocalAnimatedFloat2(this.m2data.scaleTrack);
        this.headCellTrack = new LocalAnimatedNumber(this.m2data.headCellTrack);
        this.tailCellTrack = new LocalAnimatedNumber(this.m2data.tailCellTrack);
        this.isDisposing = false;

        this.renderKey = new RenderKey(this.parent.fileId, RenderType.M2Particle);

        this.initialize();
    }

    dispose(): void {
        this.isDisposing = true;

        this.parent = null;
        this.engine = null;
        this.m2data = null;
        this.exp2Data = null;
        this.rng = null;
        this.particleGenerator = null;

        this.shaderProgram = null
        this.indexBuffer = null;
        this.vertexBuffer = null;
        this.vao = null;
        this.renderKey = null;

        this.textures = null;
        this.particleColorOverride = null;

        this.colorTrack = null;
        this.alphaTrack = null;
        this.scaleTrack = null;
        this.headCellTrack = null;
        this.tailCellTrack = null;
        this.alphaCutOffTrack = null;

        this.particles = null;
        this.emitterModelMatrix = null;
        this.previousPosition = null;
        this.burstVec = null;
        this.fullDeltaPosition = null;
        this.stepDeltaPosition = null;
        this.particleToView = null;
        this.quadToView = null;
        this.quadToViewZVector = null;
    }

    initialize() {
        if (this.m2data.particleColorIndex >= 11 && this.m2data.particleColorIndex <= 13) {
            // TODO: Load particle override if available in parent item / creature
        }

        switch (this.m2data.emitterType) {
            case 1:
                this.particleGenerator = new PlaneParticleGenerator(this.rng, this.m2data);
                break;
            case 2:
                this.particleGenerator = new SphereParticleGenerator(this.rng, this.m2data, 0 != (0x100 & this.m2data.flags))
                break;
            default:
                throw "Found unimplemented particle generator " + this.m2data.emitterType;
        }

        const followDev = this.m2data.followSpeed2 - this.m2data.followSpeed2;
        if (followDev != 0) {
            this.followMult = (this.m2data.followScale2 - this.m2data.followScale1) / followDev;
            this.followBase = this.m2data.followScale1 - this.m2data.followSpeed1 * this.followMult;
        } else {
            this.followMult = 0;
            this.followBase = 0;
        }

        let textureCols = this.m2data.textureDimensionsColumns;
        if (textureCols <= 0) {
            textureCols = 1
        }

        let textureRows = this.m2data.textureDimensionsRows;
        if (textureRows <= 0) {
            textureRows = 1;
        }
        this.textureIndexMask = textureCols * textureRows - 1;
        let textureColBits = textureCols,
            textureColsBitLength = -1;
        while (textureColBits) {
            ++textureColsBitLength;
            textureColBits >>= 1;
        };
        this.textureColBits = textureColsBitLength;
        this.textureColMask = textureCols - 1;

        this.randomizedTextureIndexMask = 0;
        // RandomizedParticles
        if ((0x8000 & this.m2data.flags) > 0) {
            let deffCellLong = (this.textureIndexMask + 1) * this.rng.getInt();
            this.randomizedTextureIndexMask = (deffCellLong / 0x100000000) | 0;
        }
        this.texScaleX = 1 / textureCols;
        this.texScaleY = 1 / textureRows;

        let isMultiTextured = false;
        if ((0x10100000 & this.m2data.flags) > 0) {
            isMultiTextured = 0 != (0x10000000 & (this.m2data.flags));
            this.particleType = isMultiTextured ? 2 : 3;
        } else {
            this.particleType = 0;
        }


        let hasFlag1 = false,
            hasFlag0x40000000 = false;
        // Particle uses multi-texturing
        if ((0x10000000 & this.m2data.flags) > 0) {
            hasFlag0x40000000 = (0x40000000 & this.m2data.flags) > 0;
        }
        else if (0 == (0x100000 & this.m2data.flags)) {
            hasFlag1 = (1 & this.m2data.flags) == 0;
        }

        if (this.particleType === 2 || (this.particleType === 2 && isMultiTextured)) {
            this.shaderId = hasFlag0x40000000 ? 3 : 2;
        } else if (3 == this.particleType) {
            this.shaderId = 5
        } else {
            this.shaderId = hasFlag1 ? 1 : 0
        }

        this.setupGraphics();
    }

    update(deltaTime: number) {
        if (this.isDisposing) return;
        if (!this.particleGenerator) return;

        deltaTime *= 0.001;

        if (this.parent.isTexturesLoaded && !this.isTexturesLoaded) {
            const textureId = this.m2data.texture
            this.textures = [null, null, null];
            if (this.m2data.flags & 0x10000000) {
                const multiTextureIds = [0, 0, 0];
                multiTextureIds[0] = 31 & textureId;
                multiTextureIds[1] = (textureId >> 5) & 31;
                multiTextureIds[2] = (textureId >> 10) & 31;
                for (let i = 0; i < multiTextureIds.length; i++) {
                    const textureId = multiTextureIds[i];
                    const textureData = this.parent.modelData.textures[textureId];
                    if (textureData.textureId > -1) {
                        this.textures[i] = this.parent.loadedTextures[textureData.textureId]
                    }
                }
            }
            else {
                if (textureId > -1) {
                    const textureData = this.parent.modelData.textures[textureId];
                    if (textureData.textureId > -1) {
                        this.textures[0] = this.parent.loadedTextures[textureData.textureId]
                    }
                }
            }
            this.isTexturesLoaded = true;
        }

        this.updateAnimatedProps();

        const currentModelMatrix = Float44.identity();
        Float44.multiply(currentModelMatrix, this.parent.worldModelMatrix, currentModelMatrix);
        Float44.multiply(currentModelMatrix, this.parent.boneData[this.m2data.bone].positionMatrix, currentModelMatrix);

        const offsetMatrix = Float44.identity();
        Float44.createWithTranslation(this.m2data.position, offsetMatrix);
        Float44.multiply(currentModelMatrix, offsetMatrix, currentModelMatrix);

        Float44.multiply(currentModelMatrix, this.particlesFixMat, currentModelMatrix);

        this.updateParticles(deltaTime, currentModelMatrix);
        
        // Load quads
    }

    draw() {
        if (this.isDisposing) return;
        if (this.particles.length <= 0) {
            return;
        }
        if (!this.isTexturesLoaded) {
            return;
        }
        
        this.updateVertexBuffer();
        this.vertexBuffer.setData(new Float32Array(this.vertexData));

        const batchRequest = new RenderingBatchRequest(this.renderKey);
        batchRequest.useVertexArrayObject(this.vao);
        batchRequest.useShaderProgram(this.shaderProgram);


        let blendMode = this.m2data.blendingType;
        let alphaTreshold;
        if (blendMode === 0) {
            alphaTreshold = -1;
        } else if (blendMode === 1)  {
            alphaTreshold = 0.501960814;
        } else {
            alphaTreshold = 0.0039215689;
        }
        batchRequest.useBackFaceCulling(false);
        batchRequest.useCounterClockWiseFrontFaces(!this.parent.isMirrored);
        batchRequest.useBlendMode(blendMode < particleBlendTypeToGxBlend.length 
            ? particleBlendTypeToGxBlend[blendMode] 
            : GxBlend.GxBlend_Opaque
        );
        batchRequest.useDepthTest(true);
        batchRequest.useDepthWrite(false);
        batchRequest.useColorMask(ColorMask.Alpha | ColorMask.Blue | ColorMask.Green | ColorMask.Red);

        batchRequest.useUniforms({
            "u_pixelShader": this.getPixelShader(),
            "u_texture1": this.textures[0],
            "u_texture2": this.textures[1],
            "u_texture3": this.textures[2],
            "u_alphaTreshold": alphaTreshold,
            "u_alphaMult": this.exp2Data ? this.exp2Data.alphaMult : 1,
            "u_colorMult": this.exp2Data ? this.exp2Data.colorMult : 1
        });
        batchRequest.drawIndexedTriangles(0, (6 * this.nrQuads) >> 0);
        this.engine.submitBatchRequest(batchRequest);
    }

    updateParticles(deltaTime: number, currentModelMatrix: Float44) {
        if (null == this.particleGenerator) return;

        Float44.getTranslation(this.emitterModelMatrix, this.previousPosition);
        let currentBonePosition = Float4.zero();
        Float44.getTranslation(currentModelMatrix, currentBonePosition);
        currentBonePosition[3] = 1;
        Float44.transformDirection4(currentBonePosition, this.engine.viewMatrix, currentBonePosition);
        // TODO: Use Z-Order in batch sorting.
        this.zOrder = currentBonePosition[2];

        Float44.copy(currentModelMatrix, this.emitterModelMatrix);
        this.inheritedScale = Float3.length(Float44.getColumn4(this.emitterModelMatrix, 0))

        if (deltaTime > 0) {
            const currentPosition = Float44.getTranslation(this.emitterModelMatrix);
            this.fullDeltaPosition = Float3.subtract(currentPosition, this.previousPosition)
            if (0x4000 & this.m2data.flags) {
                let scale = this.followMult * (Float3.length(this.fullDeltaPosition) / deltaTime) + this.followBase;
                if (scale >= 0) {
                    scale = Math.min(scale, 1)
                }
                Float3.scale(this.fullDeltaPosition, scale, this.stepDeltaPosition);
            }
            // USE BURST MULTIPLIER
            if (0x40 & this.m2data.flags) {
                this.burstTime += deltaTime;
                let frameTime = 0.03;
                if (this.burstTime > frameTime) {
                    this.burstTime = 0
                    if (this.particles.length == 0) {
                        let bursts = frameTime / this.burstTime;
                        let burst = bursts * this.m2data.burstMultiplier;
                        Float3.multiply(this.fullDeltaPosition, Float3.fromScalar(burst), this.burstVec);
                    } else {
                        Float3.set(this.burstVec, 0, 0, 0);
                    }
                }
            }
            this.processSteps(deltaTime);
        }
    }

    processSteps(deltaTime: number) {
        deltaTime = Math.max(deltaTime, 0);
        if (deltaTime < 0.1) {
            Float3.copy(this.fullDeltaPosition, this.stepDeltaPosition);
        }
        else {
            let deltaRounded = Math.floor(deltaTime / 0.1);
            deltaTime = -0.1 * deltaRounded + deltaTime;
            let updateSteps = Math.min(Math.floor(this.particleGenerator.getAnimatedProps().lifespan / 0.1), deltaRounded),
                totalUpdateSteps = updateSteps + 1,
                divider = 1;
            divider = totalUpdateSteps < 0 ? 1 : totalUpdateSteps
            Float3.scale(this.fullDeltaPosition, 1 / divider, this.stepDeltaPosition);
            for (let t = 0; t < updateSteps; t++) {
                this.processStep(0.1);
            }
        }
        this.processStep(deltaTime);
    }

    processStep(deltaStep: number) {
        let forcesData = new ForcesData();
        if (deltaStep < 0) return;

        this.calcForces(forcesData, deltaStep);
        this.emitNewParticles(deltaStep);
        for (let i = 0; i < this.particles.length; i++) {
            let particle = this.particles[i];
            particle.age = particle.age + deltaStep;
            if (particle.age > Math.max(this.particleGenerator.getLifespan(particle.seed), 0.001)) {
                this.particles.splice(i, 1);
                i--;
            } else {
                if (!this.updateParticle(particle, deltaStep, forcesData)) {
                    this.particles.splice(i, 1);
                    i--;
                }
            }
        }
    }

    calcForces(forces: ForcesData, deltaStep: number) {
        forces.windVector = Float3.zero();
        forces.gravity = Float3.zero();
        forces.position = Float3.zero();
        forces.drag = 0;

        Float3.multiply(this.m2data.windVector, Float3.fromScalar(deltaStep), forces.windVector);

        let gravity = Float3.zero();
        this.particleGenerator.getGravity(gravity);
        Float3.multiply(gravity, Float3.fromScalar(deltaStep), forces.gravity);
        Float3.multiply(gravity, Float3.fromScalar(deltaStep * deltaStep * 0.5), forces.position);
        forces.drag = Math.min(this.m2data.drag * deltaStep, 1);
    }

    emitNewParticles(deltaStep: number) {
        if (!this.activeNow) return;

        let emitRate = this.particleGenerator.getNextEmissionRate();
        this.emissionCounter = this.emissionCounter + deltaStep * emitRate;
        while (this.emissionCounter > 1) {
            this.createNewParticle(deltaStep);
            this.emissionCounter -= 1;
        }
    }

    createNewParticle(timeFrame: number) {
        const particle = this.particleGenerator.generateParticle(timeFrame);
        // DO NOT TRAIL
        if (!(this.m2data.flags & 0x10)) {
            Float44.transformDirection3_1(particle.position, this.emitterModelMatrix, particle.position);
            Float44.transformDirection3_0(particle.velocity, this.emitterModelMatrix, particle.velocity);
            // CLAMP TO GROUND
            if (0x2000 & this.m2data.flags) {
                particle.position[2] = 0;
            }
        }
        // Use Burst Multiplier
        if (this.m2data.flags & 0x40) {
            const speedMult = 1 + this.particleGenerator.animatedProps.speedVariation * this.rng.getSignedFloat();
            const r0 = Float3.zero();
            Float3.scale(this.burstVec, speedMult, r0);
            Float3.add(particle.velocity, r0, particle.velocity);
        }
        // Is multitextured
        if (this.particleType >= 2) {
            for (let i = 0; i < 2; i++) {
                particle.texturePosition[i][0] = this.rng.getFloat();
                particle.texturePosition[i][1] = this.rng.getFloat();
                // Todo check preprocessing
                let mtParam1 = Float2.scale(this.m2data.multiTextureParam1[i], this.rng.getSignedFloat());
                let mtParam0 = this.m2data.multiTextureParam0[i];
                particle.textureVelocity[i] = Float2.add(mtParam1, mtParam0);
            }
        }
        this.particles.push(particle);
    }

    updateParticle(particle: ParticleData, deltaStep: number, forces: ForcesData) {
        // Multi textured
        if (this.particleType >= 2) {
            for (let i = 0; i < 2; i++) {
                let val = particle.texturePosition[i][0] + deltaStep * 0.1 * particle.textureVelocity[i][0];
                particle.texturePosition[i][0] = val - Math.floor(val);

                val = particle.texturePosition[i][1] + deltaStep * 0.1 *particle.textureVelocity[i][1];
                particle.texturePosition[i][1] = val - Math.floor(val);
            }
        }

        Float3.add(particle.velocity, forces.windVector, particle.velocity);

        // MoveParticle
        if (this.m2data.flags & 0x4000 && (2 * deltaStep < particle.age)) {
            Float3.add(particle.position, this.stepDeltaPosition, particle.position);
        }

        const r0 = Float3.multiply(particle.velocity, Float3.fromScalar(deltaStep));

        Float3.add(particle.velocity, forces.gravity, particle.velocity);
        Float3.scale(particle.velocity, 1 - forces.drag, particle.velocity);
        Float3.add(particle.position, r0, particle.position);
        Float3.add(particle.position, forces.position, particle.position);
        // Particles in Model Space
        if (this.m2data.emitterType === 2 && this.m2data.flags & 0x80) {
            const r1 = Float3.copy(particle.position);
            // DO NOT TRAIL
            if (this.m2data.flags & 0x10) {
                if (Float3.dot(r1, r0) > 0) {
                    return false;
                }
            } else {
                Float3.subtract(particle.position, Float44.getTranslation(this.emitterModelMatrix), r1);
                if (Float3.dot(r1, r0) > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    updateVertexBuffer() {
        this.vertexData.length = 0;
        if (this.particles.length == 0 && this.particleGenerator != null) {
            return;
        }
        this.calculateQuadToViewEtc();
        let quads = 0;
        for (let i = 0; i < this.particles.length; i++) {
            let particle = this.particles[i];
            let twinkle = new ParticlePreRenderData();
            if (this.calculatePreRenderData(particle, twinkle)) {
                // Outward particles
                if (0x20000 & this.m2data.flags) {
                    this.buildVertex1(particle, twinkle);
                    quads++;
                }
                // Inward? particles
                if (0x40000 & this.m2data.flags) {
                    this.buildVertex2(particle, twinkle);
                    quads++;
                }
            }
            if (quads >= MAX_QUADS_PER_EMITTER) {
                break;
            }
        }
        this.nrQuads = quads;
    }

    calculateQuadToViewEtc() {
        // DO NOT TRAIL
        if (this.m2data.flags & 0x10) {
            Float44.multiply(this.engine.viewMatrix, this.emitterModelMatrix, this.particleToView)
        }
        else {
            Float44.copy(this.engine.viewMatrix, this.particleToView)
        }
        // XY QUAD Particles
        if (0x1000 & this.m2data.flags) {
            Float33.getRotationMatrix(this.particleToView, this.quadToView);
            // Do not trail
            if (this.m2data.flags & 0x10 && Math.abs(this.inheritedScale) > 0) {
                let scale = 1 / this.inheritedScale;
                Float33.scale(this.quadToView, scale, this.quadToView);
            }
            Float3.set(this.quadToViewZVector, this.quadToView[6], this.quadToView[7], this.quadToView[8])
            if (Float3.lengthSquared(this.quadToViewZVector) <= 2.3841858e-7) {
                Float3.set(this.quadToViewZVector, 0, 0, 1);
            } else {
                Float3.normalize(this.quadToViewZVector, this.quadToViewZVector)
            }
        }
    }

    calculatePreRenderData(particle: ParticleData, preRenderData: ParticlePreRenderData) {
        const twinklePercent = this.m2data.twinklePercent;
        const twinkleMin = this.m2data.twinkleScale[0];
        const twinkleVary = this.m2data.twinkleScale[1] - twinkleMin;

        let randIndex = 0;
        if (twinklePercent < 1 || 0 != twinkleVary) {
            randIndex = 127 & (particle.age * this.m2data.twinkleSpeed + particle.seed);
        }
        if (twinklePercent < randomnessTable[randIndex]) {
            return 0;
        }

        this.fillTimedParticleData(particle, preRenderData);

        const weight = twinkleVary * randomnessTable[randIndex] + twinkleMin;
        Float2.scale(preRenderData.ageValues.scale, weight, preRenderData.ageValues.scale);
        // Unlightning
        if (this.m2data.flags & 0x20) {
            Float2.scale(preRenderData.ageValues.scale, this.inheritedScale, preRenderData.ageValues.scale);
        }
        Float44.transformDirection3_1(particle.position, this.particleToView, preRenderData.center);
        return 1;
    }

    // This calculates the various trackstates
    fillTimedParticleData(particle: ParticleData, preRenderData: ParticlePreRenderData) {
        const rng = this.engine.getRandomNumberGenerator(particle.seed);

        let percentTime = particle.age / this.particleGenerator.getMaxLifespan();
        percentTime = Math.max(0, Math.min(1, percentTime));

        const defaultColor = Float3.create(255, 255, 255);
        const defaultScale = Float2.create(1, 1);
        const ageValues = preRenderData.ageValues;

        this.colorTrack.getValueAtTimestamp(percentTime * 32767, defaultColor, ageValues.color, this.particleColorOverride);
        if (!this.particleColorOverride) {
            Float3.scale(ageValues.color, 1 / 255, ageValues.color)
        }

        this.scaleTrack.getValueAtTimestamp(percentTime * 32767, defaultScale, ageValues.scale);
        ageValues.alpha = this.alphaTrack.getValueAtTimestamp(percentTime * 32767, 32767) / 32767;
        if (this.exp2Data) {
            ageValues.alphaCutoff = this.alphaCutOffTrack.getValueAtTimestamp(percentTime, 0) / 32767;
        } else {
            ageValues.alphaCutoff = 0;
        }

        if (this.headCellTrack.timestamps.length > 0) {
            ageValues.headCell = this.headCellTrack.getValueAtTimestamp(percentTime * 32767, 0);
            ageValues.headCell = this.textureIndexMask & ageValues.headCell + this.randomizedTextureIndexMask;
        }
        // ChooseRandomTexture
        else if (0x10000 & this.m2data.flags) {
            let randCell = Math.floor((this.textureIndexMask + 1) * rng.getFloat())
            ageValues.headCell = randCell;
        }
        else {
            ageValues.headCell = 0
        }
        ageValues.tailCell = this.tailCellTrack.getValueAtTimestamp(percentTime * 32767, 0);
        ageValues.tailCell = ageValues.tailCell + this.randomizedTextureIndexMask & this.textureIndexMask;
        // ScaleVary affects x and y independently
        if (this.m2data.flags & 0x80000) {
            ageValues.scale[0] = Math.max(1 + rng.getSignedFloat() * this.m2data.scaleVary[0], 0.000099999997) * ageValues.scale[0];
            ageValues.scale[1] = Math.max(1 + rng.getSignedFloat() * this.m2data.scaleVary[1], 0.000099999997) * ageValues.scale[1];
        }
        else {
            let scaleVary = Math.max(1 + rng.getSignedFloat() * this.m2data.scaleVary[0], 0.000099999997);
            ageValues.scale[0] = scaleVary * ageValues.scale[0];
            ageValues.scale[1] = scaleVary * ageValues.scale[1];
        }
    }

    buildVertex1(particle: ParticleData, particleRenderData: ParticlePreRenderData) {
        let texScaleVec = Float2.create(
            (particleRenderData.ageValues.headCell & this.textureColMask) * this.texScaleX,
            (particleRenderData.ageValues.headCell >> this.textureColBits) * this.texScaleY
        );
        let { baseSpin, deltaSpin } = this.calculateSpin(particle);
        let affectedByPlayerOrient = 0,
            xOffset = Float3.create(0, 0, 0),
            yOffset = Float3.create(0, 0, 0),
            dataFilled = false,
            hasFlag0x1000 = (this.m2data.flags & 0x1000) ? true : false;
        // On emission, particle orient is affected by player orient
        if (this.m2data.flags & 0x4 && Float3.lengthSquared(particle.velocity) > 0.00000023841858) {
            affectedByPlayerOrient = 1;
            // NOT XY QUAD 
            if (!(hasFlag0x1000)) {
                const viewSpaceVel = Float44.transformDirection3_0(Float3.negate(particle.velocity), this.particleToView);

                let normFactor = 0,
                    translatedVelLeng = Float3.lengthSquared(viewSpaceVel);
                normFactor = translatedVelLeng <= 0.00000023841858 ? 0 : 1 / Math.sqrt(translatedVelLeng);

                const viewSpaceVelNorm = Float3.scale(viewSpaceVel, normFactor);
                Float3.scale(viewSpaceVelNorm, particleRenderData.ageValues.scale[0], xOffset);
                Float3.set(yOffset, viewSpaceVelNorm[1], -viewSpaceVelNorm[0], 0);
                Float3.scale(yOffset, particleRenderData.ageValues.scale[1], yOffset);
                dataFilled = true;
            }
        }
        // XY QUAD 
        if (hasFlag0x1000 && !dataFilled) {
            let transformedQuadToView = Float33.copy(this.quadToView);
            let xScale = particleRenderData.ageValues.scale[0];
            if (affectedByPlayerOrient) {
                let normalizeFactor = 0;
                const negVelocity = Float3.negate(particle.velocity),
                      negVelocityLength = Float3.lengthSquared(negVelocity);
                normalizeFactor = negVelocityLength <= 0.00000023841858 ? 0 : 1 / Math.sqrt(negVelocityLength);
                Float33.multiply(
                    this.quadToView,
                    Float33.create(
                        negVelocity[0] * normalizeFactor, negVelocity[1] * normalizeFactor, 0,
                        -negVelocity[1] * normalizeFactor, negVelocity[0] * normalizeFactor, 0,
                        0, 0, 1
                    ),
                    transformedQuadToView
                );
                if (normalizeFactor > 0.00000023841858) {
                    xScale = particleRenderData.ageValues.scale[0] * (1 / Math.sqrt(Float3.lengthSquared(particle.velocity)) / normalizeFactor)
                }
            }

            
            Float33.getColumn(transformedQuadToView, 0, xOffset);
            Float3.scale(xOffset, xScale, xOffset);
            Float33.getColumn(transformedQuadToView, 1, yOffset);
            Float3.scale(yOffset, particleRenderData.ageValues.scale[1], yOffset);
            deltaSpin = yOffset[0];
            dataFilled = true;
            if (this.m2data.spin != 0 || this.m2data.spinVary != 0) {
                let theta = baseSpin + deltaSpin * particle.age;
                // Randomize spin ?
                if (this.m2data.flags & 0x200 && 1 & (particle.seed & 1)) {
                    theta = -theta
                }
                const zAxis = Float3.copy(this.quadToViewZVector);
                const rotMatrix = Float33.fromQuat(Float4.createQuat(zAxis, theta));
                Float33.transformDir(xOffset, rotMatrix, xOffset);
                Float3.set(yOffset, deltaSpin, yOffset[1], yOffset[2]);
                Float33.transformDir(yOffset, rotMatrix, yOffset);
            }
        }
        if (!dataFilled) {
            if (this.m2data.spin != 0 || this.m2data.spinVary != 0) {
                let theta = baseSpin + deltaSpin * particle.age;
                if (this.m2data.flags & 0x200 && 1 & (particle.seed & 1)) {
                    theta = -theta
                }
                let consTheta = Math.cos(theta),
                    sinTheta = Math.sin(theta);
                Float3.set(xOffset, consTheta, sinTheta, 0);
                Float3.scale(xOffset, particleRenderData.ageValues.scale[0], xOffset);
                Float3.set(yOffset, -sinTheta, consTheta, 0);
                Float3.scale(yOffset, particleRenderData.ageValues.scale[1], yOffset);
                if (this.m2data.flags & 0x8000000) {
                    Float3.add(particleRenderData.center, Float3.create(yOffset[0], yOffset[1], 0), particleRenderData.center);
                }
            } else {
                Float3.set(xOffset, particleRenderData.ageValues.scale[0], 0, 0);
                Float3.set(yOffset, 0, particleRenderData.ageValues.scale[1], 0);
            }
        }
        this.buildQuad(xOffset, yOffset,
            particleRenderData.center, particleRenderData.ageValues.color, particleRenderData.ageValues.alpha, particleRenderData.ageValues.alphaCutoff,
            texScaleVec[0], texScaleVec[1], particle.texturePosition)
        return 0;
    }

    buildVertex2(particle: ParticleData, particleRenderData: ParticlePreRenderData) {
        const texScaleVec = Float2.create(
            (particleRenderData.ageValues.tailCell & this.textureColMask) * this.texScaleX,
            (particleRenderData.ageValues.tailCell >> this.textureColBits) * this.texScaleY
        ),
        xOffset = Float3.create(0, 0, 0),
        yOffset = Float3.create(0, 0, 0);

        let trailTime = this.m2data.tailLength;
        // Pinned particles
        if (this.m2data.flags & 0x400) {
            trailTime = Math.min(particle.age, trailTime);
        }

        const viewVelocity = Float3.scale(particle.velocity, -1);
        Float44.transformDirection3_0(viewVelocity, this.particleToView, viewVelocity);
        Float3.scale(viewVelocity, trailTime, viewVelocity);

        const screenVelocity = Float3.create(viewVelocity[0], viewVelocity[1], 0);
        if (Float3.dot(screenVelocity, screenVelocity) > 0.0001) {
            let normalizeFactor = 1 / Float3.length(screenVelocity);
            Float2.scale(particleRenderData.ageValues.scale, normalizeFactor, particleRenderData.ageValues.scale);
            Float2.multiply(screenVelocity, particleRenderData.ageValues.scale, screenVelocity);
            Float3.set(yOffset, -screenVelocity[1], screenVelocity[0], 0);
            Float3.scale(viewVelocity, 0.5, xOffset);
            Float3.add(particleRenderData.center, xOffset, particleRenderData.center);
        } else {
            Float3.set(xOffset, 0.05 * particleRenderData.ageValues.scale[0], 0, 0);
            Float3.set(yOffset, 0, 0.05 * particleRenderData.ageValues.scale[1], 0);
        }
        this.buildQuad(xOffset, yOffset, particleRenderData.center,
            particleRenderData.ageValues.color, particleRenderData.ageValues.alpha, particleRenderData.ageValues.alphaCutoff,
            texScaleVec[0], texScaleVec[1], particle.texturePosition);
        return 1;
    }

    calculateSpin(particle: ParticleData) {
        const rng = this.engine.getRandomNumberGenerator(particle.seed);
        let baseSpin = this.m2data.baseSpin,
            deltaSpin = this.m2data.spin,
            spinVary = this.m2data.spinVary,
            baseSpinVary = this.m2data.baseSpinVary;
        if (baseSpin != 0 || spinVary != 0) {
            if (baseSpinVary != 0) {
                baseSpin = baseSpin + rng.getSignedFloat() * baseSpinVary;
            }
            if (spinVary != 0) {
                deltaSpin = deltaSpin + rng.getSignedFloat() * spinVary;
            }
        }
        return { deltaSpin, baseSpin };
    }

    buildQuad(
        xOffset: Float3, yOffset: Float3, viewPos: Float3, color: Float3, alpha: number,
        alphaCutOff: number, texStartX: number, textStartY: number, texturePos: Float2[]) {
        
        const vxs = [-1, -1, 1, 1],
            vys = [1, -1, 1, -1],
            txs = [0, 0, 1, 1],
            tys = [0, 1, 0, 1];
        let position = Float3.zero(),
            texCoord1 = Float2.zero(),
            texCoord2 = Float2.zero(),
            texCoord3 = Float2.zero();

        for (let i = 0; i < 4; i++) {
            Float3.scale(xOffset, vxs[i], position);
            Float3.add(Float3.scale(yOffset, vys[i]), position, position);
            Float3.add(position, viewPos, position);

            Float44.transformPoint(position, this.engine.invViewMatrix, position)

            Float2.set(texCoord1,
                txs[i] * this.texScaleX + texStartX,
                tys[i] * this.texScaleY + textStartY
            );
            Float2.set(texCoord2,
                txs[i] * this.m2data.multiTextureParamX[0] + texturePos[0][0],
                tys[i] * this.m2data.multiTextureParamX[0] + texturePos[0][1]
            );
            Float2.set(texCoord3,
                txs[i] * this.m2data.multiTextureParamX[1] + texturePos[1][0],
                tys[i] * this.m2data.multiTextureParamX[1] + texturePos[1][1]
            );

            this.vertexData.push(position[0]),
            this.vertexData.push(position[1]),
            this.vertexData.push(position[2]),
            this.vertexData.push(color[0]),
            this.vertexData.push(color[1]),
            this.vertexData.push(color[2]),
            this.vertexData.push(alpha),
            this.vertexData.push(texCoord1[0]),
            this.vertexData.push(texCoord1[1]),
            this.vertexData.push(texCoord2[0]),
            this.vertexData.push(texCoord2[1]),
            this.vertexData.push(texCoord3[0]),
            this.vertexData.push(texCoord3[1]),
            this.vertexData.push(alphaCutOff);
        }
    }

    updateAnimatedProps() {
        const animState = this.parent.animationState;
        let animProps = this.particleGenerator.getAnimatedProps();
        let enabled = true;

        if (animState.hasAnimatedValuesForTrack(this.m2data.enabledIn)) {
            enabled = animState.getNumberTrackValue(this.m2data.enabledIn) > 0;
        }

        this.activeNow = enabled;
        const fallback = Float3.zero();
        if (enabled) {
            animProps.emissionSpeed = animState.getNumberTrackValue(this.m2data.emissionSpeed, 0);
            animProps.speedVariation = animState.getNumberTrackValue(this.m2data.speedVariation, 0);
            animProps.verticalRange = animState.getNumberTrackValue(this.m2data.verticalRange, 0);
            animProps.horizontalRange = animState.getNumberTrackValue(this.m2data.horizontalRange, 0);

            animState.getFloat3TrackValue(this.m2data.gravity, fallback, animProps.gravity);
            animProps.lifespan = animState.getNumberTrackValue(this.m2data.lifespan, 0);
            animProps.emissionRate = animState.getNumberTrackValue(this.m2data.emissionRate, 0);
            animProps.emissionAreaY = animState.getNumberTrackValue(this.m2data.emissionAreaWidth, 0);
            animProps.emissionAreaX = animState.getNumberTrackValue(this.m2data.emissionAreaLength, 0);

            if (this.exp2Data) {
                animProps.zSource = this.exp2Data.zSource;
            } else {
                animProps.zSource = animState.getNumberTrackValue(this.m2data.zSource, 0);
            }
        }
    }

    getPixelShader() {
        return shaderIdToPixelTable[this.shaderId];
    }

    setupGraphics() {
        this.shaderProgram = this.engine.getShaderProgram('M2ParticleEmitter', 
            vertexShaderProgramText, fragmentShaderProgramText);

        this.vertexBuffer = this.engine.graphics.createVertexDataBuffer([
            { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 56, offset: 0 },
            { index: this.shaderProgram.getAttribLocation('a_color'), size: 4, type: BufferDataType.Float, normalized: false, stride: 56, offset: 12 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: 56, offset: 28 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: 56, offset: 36 },
            { index: this.shaderProgram.getAttribLocation('a_texCoord3'), size: 2, type: BufferDataType.Float, normalized: false, stride: 56, offset: 44 },
            { index: this.shaderProgram.getAttribLocation('a_alphaCutoff'), size: 1, type: BufferDataType.Float, normalized: false, stride: 56, offset: 52 },
        ], true);
        this.indexBuffer = this.engine.graphics.createVertexIndexBuffer(true);

        let indexBufferData = new Uint16Array(6 * MAX_QUADS_PER_EMITTER);
        // Load quads
        for (let i = 0; i < MAX_QUADS_PER_EMITTER; i++) {
            indexBufferData[i * 6 + 0] = (4 * i + 0);
            indexBufferData[i * 6 + 1] = (4 * i + 1);
            indexBufferData[i * 6 + 2] = (4 * i + 2);
            indexBufferData[i * 6 + 3] = (4 * i + 3);
            indexBufferData[i * 6 + 4] = (4 * i + 2);
            indexBufferData[i * 6 + 5] = (4 * i + 1);
        }
        this.indexBuffer.setData(indexBufferData)
        this.vao = this.engine.graphics.createVertexArrayObject();
        this.vao.addVertexDataBuffer(this.vertexBuffer);
        this.vao.setIndexBuffer(this.indexBuffer);
    }
}