import { AABB, Float3, Float4, Float44 } from "@app/math";

import { IRenderer } from "../interfaces";
import { IWorldPositionedObject, RenderObjectEvents } from "./interfaces";
import { RenderObject } from "./renderObject";

export abstract class WorldPositionedObject<TEvent extends string = never> extends RenderObject<TEvent> implements IWorldPositionedObject<TEvent> {
    parent?: IWorldPositionedObject;
    children: IWorldPositionedObject[];

    localModelMatrix: Float44;
    worldModelMatrix: Float44;
    invWorldModelMatrix: Float44;
    localBoundingBox: AABB;
    worldBoundingBox: AABB;

    constructor() {
        super();
        this.children = [];
        this.worldModelMatrix = Float44.identity();
        this.localModelMatrix = Float44.identity();

        this.localBoundingBox = AABB.create(Float3.zero(), Float3.zero());
        this.worldBoundingBox = AABB.create(Float3.zero(), Float3.zero());

        this.invWorldModelMatrix = Float44.invert(this.worldModelMatrix);
    }

    attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        for(const child of this.children) {
            if (!child.isAttachedToRenderer) {
                child.attachToRenderer(renderer);
            }
        }
    }

    update(deltaTime: number) {
        
    }

    abstract draw(): void;
    abstract get isLoaded(): boolean;
    
    dispose(): void {
        super.dispose();

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
        Float44.multiply(this.parent.worldModelMatrix, this.worldModelMatrix, this.worldModelMatrix);
        Float44.invert(this.worldModelMatrix, this.invWorldModelMatrix);

        for(const child of this.children) {
            child.updateModelMatrixFromParent();
        }
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
    }

    setModelMatrixFromMatrix(matrix: Float44) {
        Float44.copy(matrix, this.localModelMatrix);
        
        this.updateModelMatrixFromParent();
    }

    addChild<TChild extends RenderObjectEvents>(obj: IWorldPositionedObject<TChild>) {
        obj.parent = this;
        this.children.push(obj);
        if (this.isAttachedToRenderer) {
            obj.attachToRenderer(this.renderer);
        }
        obj.once("disposed", () => {
            this.children = this.children.filter(x => !x.isDisposing);
        })
    }

    protected setBoundingBox(boundingBox: AABB) {
        this.localBoundingBox = boundingBox; 
        this.worldBoundingBox = AABB.transform(this.localBoundingBox, this.worldModelMatrix);
    }
}