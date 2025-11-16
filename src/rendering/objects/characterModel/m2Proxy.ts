import { CallbackFn, ICallbackManager } from "@app/utils";
import { ITexture } from "@app/rendering/graphics";
import { IRenderingEngine } from "@app/rendering/interfaces";

import { M2Model, IM2Model, ISkinnedObject, ParticleColorOverrides } from "../m2Model";

import { WorldPositionedObject } from "../worldPositionedObject";

import { IM2Proxy } from "./interfaces";

export type M2ProxyCallbackType = "modelCreated" | "modelDataLoaded" | "modelTexturesLoaded" ;

export class M2Proxy extends WorldPositionedObject implements IM2Proxy  {
    fileId: number;

    get isLoaded(): boolean {
        return this.m2Model && this.m2Model.isLoaded;
    }

    get modelData() {
        return this.m2Model?.modelData;
    }

    get boneData() {
        return this.m2Model?.boneData;
    }
    
    private m2Model: IM2Model;
    protected callbackMgr: ICallbackManager<M2ProxyCallbackType, M2Proxy>;
    
    override initialize(engine: IRenderingEngine): void {
        super.initialize(engine);

        this.callbackMgr = engine.getCallbackManager(this);
    }


    protected createM2Model(fileId: number, configureFn?: (model: IM2Model) => void) {
        if (this.m2Model) {
            if (this.m2Model.fileId == fileId) {
                return;
            }
            this.m2Model.dispose();
        }

        this.m2Model = new M2Model(fileId);
        this.addChild(this.m2Model);

        this.m2Model.on("modelDataLoaded", () => {
            this.callbackMgr.processCallbacks("modelDataLoaded")
        });
        this.m2Model.on("texturesLoaded", () => {
            this.callbackMgr.processCallbacks("modelTexturesLoaded")
        });
        this.callbackMgr.processCallbacks("modelCreated");
        this.m2Model.on("modelDataLoaded", () => {
            this.setBoundingBox(this.m2Model.localBoundingBox);
        })

        if (configureFn) {
            configureFn(this.m2Model);
        }
    }

    override update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.m2Model.update(deltaTime);
    }

    override dispose() {
        super.dispose();
        if (this.m2Model) {
            this.m2Model.dispose();
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }
        
        this.m2Model.draw();
    }

    on(type: M2ProxyCallbackType, fn: CallbackFn<M2Proxy>, persistent = false): void {
        this.callbackMgr.addCallback(type, fn, persistent);
    }

    setTexture(index: number, fileId: number) {
        this.on("modelCreated", () => {
            this.m2Model.setTexture(index, fileId);
        });
    }

    swapTexture(index: number, texture: ITexture) {
        this.on("modelCreated", () => {
            this.m2Model.swapTexture(index, texture);
        });
    }

    swapTextureType(index: number, texture: ITexture) {
        this.on("modelCreated", () => {
            this.m2Model.swapTextureType(index, texture);
        });
    }

    getAnimations(): number[] {
        if (!this.m2Model) {
            return [];
        }
        
        return this.m2Model.getAnimations();
    }

    useAnimation(id: number) {
        this.on("modelCreated", () => {
            this.m2Model.useAnimation(id);
        });
    }

    pauseAnimation() {
        this.on("modelCreated", () => {
            this.m2Model.pauseAnimation();
        });
    }

    resumeAnimation() {
        this.on("modelCreated", () => {
            this.m2Model.resumeAnimation();
        });
    }

    setAnimationSpeed(speed: number) {
        this.on("modelCreated", () => {
            this.m2Model.setAnimationSpeed(speed);
        });
    }

    toggleGeoset(geosetId: number, show: boolean) {
        this.on("modelCreated", () => {
            this.m2Model.toggleGeoset(geosetId, show);
        });
    }

    toggleGeosets(start: number, end: number, show: boolean) {
        this.on("modelCreated", () => {
            this.m2Model.toggleGeosets(start, end, show);
        });
    }

    loadBoneFile(id: number) {
        this.on("modelCreated", () => {
            this.m2Model.loadBoneFile(id);
        });
    }

    attachTo(model: ISkinnedObject): void {
        this.m2Model.attachTo(model);
    }

    setParticleColorOverride(overrides: ParticleColorOverrides): void {
        this.m2Model.setParticleColorOverride(overrides);
    }

    canExecuteCallback(type: M2ProxyCallbackType): boolean {
        switch(type) {
            case "modelCreated": return !!this.m2Model;
            case "modelDataLoaded": return this.m2Model?.canExecuteCallback("modelDataLoaded") != null;
            case "modelTexturesLoaded": return this.m2Model?.canExecuteCallback("texturesLoaded") != null;
            default: return false;
        }
    }
}