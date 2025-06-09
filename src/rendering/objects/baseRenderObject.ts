import { RenderingEngine } from "../engine";
import { Float3, Float4, Float44 } from "../math";
import { RenderObject } from "./interfaces";

export abstract class BaseRenderObject implements RenderObject {
    isDisposing: boolean;
    abstract fileId: number;

    parent?: RenderObject;
    children: RenderObject[];
    modelMatrix: Float44;
    invModelMatrix: Float44;
    engine: RenderingEngine;

    constructor() {
        this.children = [];
        this.modelMatrix = Float44.identity();
        this.invModelMatrix = Float44.tranpose(this.modelMatrix);
        this.isDisposing = false;
    }

    initialize(engine: RenderingEngine): void {
        this.engine = engine;
    }

    update(deltaTime: number): void {
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
        for(const child of this.children) {
            child.dispose();
        };
        this.children = null;
        this.engine = null;
        this.modelMatrix = null;
    }
    
    setModelMatrix(position: Float3, rotation: Float4, scale: Float3) {
        Float44.identity(this.modelMatrix);
        Float44.translate(this.modelMatrix, position, this.modelMatrix);
        Float44.multiply(this.modelMatrix, Float44.fromQuat(rotation), this.modelMatrix);
        Float44.scale(this.modelMatrix, scale, this.modelMatrix);

        let parent = this.parent;
        while (parent) {
            Float44.multiply(this.modelMatrix, parent.modelMatrix, this.modelMatrix);
            parent = parent.parent;
        }

        Float44.tranpose(this.modelMatrix, this.invModelMatrix);
    }
}