import { RenderingEngine, M2Model, ITexture, ISkinnedModel } from "@app/rendering";

import { WorldPositionedObject } from "../worldPositionedObject";

export class M2Proxy extends WorldPositionedObject implements ISkinnedModel  {
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

    get textureObjects() {
        return this.m2Model?.textureObjects;
    }
    
    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);
    }

    private m2Model: M2Model;

    protected createM2Model(fileId: number, configureFn?: (model: M2Model) => void) {
        this.m2Model = new M2Model(fileId);
        this.addChild(this.m2Model);

        if (!this.parent) {
            this.m2Model.on("modelDataLoaded", () => {
                this.engine.sceneCamera.resizeForBoundingBox(this.m2Model.worldBoundingBox);
            })
        }

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

    setTexture(index: number, fileId: number) {
        this.m2Model.setTexture(index, fileId);
    }

    swapTexture(index: number, texture: ITexture) {
        this.m2Model.swapTexture(index, texture);
    }

    getAnimations(): number[] {
        return this.m2Model.getAnimations();
    }

    useAnimation(id: number) {
        this.m2Model.useAnimation(id);
    }

    pauseAnimation() {
        this.m2Model.pauseAnimation();
    }

    resumeAnimation() {
        this.m2Model.resumeAnimation();
    }

    setAnimationSpeed(speed: number) {
        this.m2Model.setAnimationSpeed(speed);
    }

    toggleGeoset(geosetId: number, show: boolean) {
        this.m2Model.toggleGeoset(geosetId, show);
    }

    toggleGeosets(start: number, end: number, show: boolean) {
        this.m2Model.toggleGeosets(start, end, show);
    }
}