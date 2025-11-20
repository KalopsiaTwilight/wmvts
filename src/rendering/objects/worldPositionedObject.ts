import { AABB, Float3, Float4, Float44 } from "@app/math";

import { IRenderingEngine } from "../interfaces";
import { IWorldPositionedObject } from "./interfaces";

export abstract class WorldPositionedObject implements IWorldPositionedObject {
    isDisposing: boolean;

    parent?: IWorldPositionedObject;
    children: IWorldPositionedObject[];

    localModelMatrix: Float44;
    worldModelMatrix: Float44;
    invWorldModelMatrix: Float44;
    localBoundingBox: AABB;
    worldBoundingBox: AABB;

    renderer: IRenderingEngine;

    get isAttachedToRenderer() {
        return this.renderer != null;
    }

    constructor() {
        this.children = [];
        this.worldModelMatrix = Float44.identity();
        this.localModelMatrix = Float44.identity();

        this.localBoundingBox = AABB.create(Float3.zero(), Float3.zero());
        this.worldBoundingBox = AABB.create(Float3.zero(), Float3.zero());

        this.invWorldModelMatrix = Float44.invert(this.worldModelMatrix);
        this.isDisposing = false;
    }

    attachToRenderer(engine: IRenderingEngine): void {
        this.renderer = engine;
        for(const child of this.children) {
            if (!child.isAttachedToRenderer) {
                child.attachToRenderer(engine);
            }
        }
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }

        const toRemove: IWorldPositionedObject[] = [];
        for (const child of this.children) {
            if (child.isDisposing) {
                toRemove.push(child);
            }
        }
        this.children = this.children.filter(x => toRemove.indexOf(x) === -1)
    }

    abstract draw(): void;
    abstract get isLoaded(): boolean;
    
    dispose(): void {
        this.isDisposing = true;
        if (this.children) {
            for(const child of this.children) {
                child.dispose();
            };
        }
        this.children = null;
        this.renderer = null;
        this.worldModelMatrix = null;
        this.invWorldModelMatrix = null;
        this.localBoundingBox = null;
        this.worldBoundingBox = null;
    }

    updateModelMatrixFromParent() {
        Float44.copy(this.localModelMatrix, this.worldModelMatrix);
        let parent = this.parent;
        while (parent) {
            Float44.multiply(this.worldModelMatrix, parent.worldModelMatrix, this.worldModelMatrix);
            parent = parent.parent;
        }
        Float44.invert(this.worldModelMatrix, this.invWorldModelMatrix);
    }
    
    setModelMatrix(position: Float3|null, rotation: Float4|null, scale: Float3|null) {
        Float44.identity(this.localModelMatrix);
        if (position !== null) {
            Float44.translate(this.localModelMatrix, position, this.localModelMatrix);
        }
        if (rotation != null) {
            Float44.multiply(this.localModelMatrix, Float44.fromQuat(rotation), this.localModelMatrix);
        }
        if (scale != null) {
            Float44.scale(this.localModelMatrix, scale, this.localModelMatrix);
        }
        
        this.updateModelMatrixFromParent();

        for(const child of this.children) {
            child.updateModelMatrixFromParent();
        }
    }

    setModelMatrixFromMatrix(matrix: Float44) {
        Float44.copy(matrix, this.localModelMatrix);
        
        this.updateModelMatrixFromParent();

        for(const child of this.children) {
            child.updateModelMatrixFromParent();
        }
    }

    addChild(obj: IWorldPositionedObject) {
        obj.parent = this;
        this.children.push(obj);
        if (this.isAttachedToRenderer) {
            obj.attachToRenderer(this.renderer);
        }
    }

    protected setBoundingBox(boundingBox: AABB) {
        this.localBoundingBox = boundingBox; 
        this.worldBoundingBox = AABB.transform(this.localBoundingBox, this.worldModelMatrix);
        this.renderer.processNewBoundingBox(this.worldBoundingBox);
    }
}