import { AABB, Float3 } from "@app/math";
import { IRenderer } from "@app/rendering/interfaces"
import { ITexture } from "@app/rendering/graphics";

import { WorldPositionedObject } from "../worldPositionedObject";
import { LineSegment } from "./lineSegment";
import { ILine } from "./interfaces";


export class Line<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent> implements ILine<TParentEvent> {
    fileId: number
    isLoaded: boolean;
    isDisposing: boolean;

    renderer: IRenderer;
    lineWidth: number;
    texture: ITexture;

    segments: LineSegment[];

    constructor(lineWidth = 10) {
        super();
        this.fileId = -1;
        this.lineWidth = lineWidth;
        this.segments = [];
    }

    addSegment(startPos: Float3, endPos: Float3) {
        const segment = new LineSegment(this.lineWidth, startPos, endPos);
        this.segments.push(segment);
        this.addChild(segment);
        this.setBoundingBox(AABB.merge(this.localBoundingBox, segment.localBoundingBox));
    }

    attachToRenderer(renderer: IRenderer): void {
        if (this.isAttachedToRenderer) {
            return;
        }

        super.attachToRenderer(renderer);

        this.setTexture(this.renderer.getSolidColorTexture([1,0,0,1]));

        this.isLoaded = true
    }

    update(deltaTime: number): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        for(const child of this.children) {
            child.update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        for(const child of this.children) {
            child.draw();
        }
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
    }

    setTexture(texture: ITexture) {
        this.texture = texture;
        for(const segment of this.segments) {
            segment.setTexture(texture);
        }
    }
}