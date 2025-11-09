import { RenderingEngine } from "../engine";
import { Float3, Float4, Float44 } from "../math";
import { RenderObject } from "./interfaces";

export abstract class WorldPositionedObject implements RenderObject {
    isDisposing: boolean;
    abstract fileId: number;

    parent?: WorldPositionedObject;
    children: WorldPositionedObject[];
    localModelMatrix: Float44;
    worldModelMatrix: Float44;
    invWorldModelMatrix: Float44;
    engine: RenderingEngine;

    constructor() {
        this.children = [];
        this.worldModelMatrix = Float44.identity();
        this.localModelMatrix = Float44.identity();
        this.invWorldModelMatrix = Float44.invert(this.worldModelMatrix);
        this.isDisposing = false;
    }

    initialize(engine: RenderingEngine): void {
        this.engine = engine;
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }

        const toRemove: RenderObject[] = [];
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
        this.engine = null;
        this.worldModelMatrix = null;
        this.invWorldModelMatrix = null;
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

    protected addChild(obj: WorldPositionedObject) {
        obj.parent = this;
        this.children.push(obj);
        obj.initialize(this.engine);
    }
}