import { Float3, Float44 } from "@app/math"
import { IRenderer } from "@app/rendering";
import { CallbackFn, ICamera } from "@app/interfaces";

import { Disposable } from "../disposable";

export enum DragOperation {
    None,
    Rotation,
    Translation
}

export class OrbitalCamera extends Disposable implements ICamera {
    resizeCallbackFn: CallbackFn<IRenderer>
    resizeOnSceneExpand: boolean;
    renderer: IRenderer;

    containerElement: HTMLElement;
    containerWidth: number;
    containerHeight: number;

    currentDragOperation: DragOperation;
    lastDragX: number;
    lastDragY: number;

    viewMatrix: Float44;
    cameraMatrix: Float44;

    position: Float3;
    targetLocation: Float3;
    upDir: Float3;

    cameraTranslation: Float3;
    currentRadius: number;
    startingRadius: number;
    theta: number;
    phi: number;

    // Zoom in
    zoomFactor: number;
    minRadius: number;
    maxRadius: number;
    currentZoom: number;
    zoomDecay: number;

    // Bound functions
    onContextMenu: (ev: MouseEvent) => void;
    onWheel: (ev: MouseEvent) => void;
    onMouseDown: (ev: MouseEvent) => void;
    onMouseMove: (ev: MouseEvent) => void;
    onMouseUp: (ev: MouseEvent) => void;
    onTouchStart: (ev: TouchEvent) => void;
    onTouchMove: (ev: TouchEvent) => void;;
    onTouchEnd: (ev: TouchEvent) => void;;

    constructor(containerElement: HTMLElement, resizeOnSceneExpand = true) {
        super();

        this.resizeOnSceneExpand = resizeOnSceneExpand;
        this.containerElement = containerElement;
        this.cameraMatrix = Float44.identity();
        this.viewMatrix = Float44.identity();
        this.currentDragOperation = DragOperation.None;
        this.targetLocation = Float3.create(0, 0, 0);
        this.upDir = Float3.create(0, 0, 1);

        this.cameraTranslation = Float3.zero();
        this.theta = Math.PI / 2;
        this.phi = 1.5 * Math.PI;
        this.startingRadius = 500;
        
        this.currentRadius = this.startingRadius;
        this.minRadius = 200;
        this.maxRadius = 1000;
        this.zoomFactor = 20;
        this.currentZoom = 0;
        this.zoomDecay = 0.7;

        // Spherical to cartesian 
        this.position = Float3.fromSpherical(this.startingRadius, this.theta, this.phi);
        Float3.add(this.position, this.targetLocation);

        Float44.lookAt(this.position, this.targetLocation, this.upDir, this.cameraMatrix);
    }

    getViewMatrix(): Float44 {
        if (this.isDisposing) {
            return Float44.identity();
        }

        return this.viewMatrix;
    }

    attachToRenderer(renderer: IRenderer) {
        if (this.isDisposing) {
            return;
        }

        this.renderer = renderer;

        this.onContextMenu = (evt) => { evt.preventDefault(); return false; };
        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onTouchStart = this.handleTouchStart.bind(this);
        this.onWheel = this.handleWheel.bind(this);

        this.containerElement.addEventListener('contextmenu', this.onContextMenu);
        this.containerElement.addEventListener('mousedown', this.onMouseDown);
        this.containerElement.addEventListener('touchstart', this.onTouchStart);
        this.containerElement.addEventListener('wheel', this.onWheel);
        
        const containerBounds = this.containerElement.getBoundingClientRect();
        this.containerWidth = containerBounds.width;
        this.containerHeight = containerBounds.height;

        if (document) {
            this.onMouseUp = this.handleDragRelease.bind(this);
            this.onTouchEnd = this.handleDragRelease.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this)
            this.onTouchMove = this.handleTouchMove.bind(this);

            document.addEventListener('mouseup', this.onMouseUp);
            document.addEventListener('touchend', this.onTouchEnd);
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('touchmove', this.onTouchMove);
        }

        if (this.resizeOnSceneExpand) {
            this.scaleToSceneBoundingBox();
            this.resizeCallbackFn = () => {
                this.scaleToSceneBoundingBox();
            };
            this.renderer.on("sceneBoundingBoxUpdate", this.resizeCallbackFn)
        }
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }

        if (this.currentZoom != 0) {
            this.currentRadius = this.currentRadius + this.currentZoom * this.zoomFactor;
            this.currentRadius = Math.min(Math.max(this.minRadius, this.currentRadius), this.maxRadius);
            this.currentZoom *= this.zoomDecay;

            if (this.currentZoom < 0.0001) {
                this.currentZoom = 0;
            }

            Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position)
        }

        Float44.lookAt(this.position, this.targetLocation, this.upDir, this.cameraMatrix);
        Float44.translate(this.cameraMatrix, this.cameraTranslation, this.cameraMatrix);
        Float44.invert(this.cameraMatrix, this.viewMatrix);
    }

    override dispose() {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        this.renderer.off("sceneBoundingBoxUpdate", this.resizeCallbackFn)

        this.containerElement.removeEventListener('contextmenu', this.onContextMenu);
        this.containerElement.removeEventListener('mousedown', this.onMouseDown);
        this.containerElement.removeEventListener('touchstart', this.onTouchStart);
        this.containerElement.removeEventListener('wheel', this.onWheel);

        this.onContextMenu = null;
        this.onMouseDown = null;
        this.onTouchStart = null;
        this.onWheel = null;
        if (document) {
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('touchend', this.onTouchEnd);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('touchmove', this.onTouchMove);

            this.onMouseUp = null;
            this.onTouchEnd = null;
            this.onMouseMove = null;
            this.onTouchMove = null;
        }

        this.containerElement = null;
        this.viewMatrix = null;
        this.cameraMatrix = null;
        this.targetLocation = null;
        this.upDir = null;
        this.cameraTranslation = null;
        this.renderer = null;
    }

    private handleMouseDown(eventArgs: MouseEvent) {
        if (eventArgs.button == 2 || eventArgs.ctrlKey) {
            this.currentDragOperation = DragOperation.Translation
        } else {
            this.currentDragOperation = DragOperation.Rotation
        }
        this.lastDragX = eventArgs.clientX;
        this.lastDragY = eventArgs.clientY;

        eventArgs.preventDefault();
    }

    private handleTouchStart(eventArgs: TouchEvent) {
        this.currentDragOperation = DragOperation.Rotation;
        this.lastDragX = eventArgs.touches[0].clientX;
        this.lastDragY = eventArgs.touches[0].clientY;

        eventArgs.preventDefault();
    }

    private handleMouseMove(eventArgs: MouseEvent) {
        this.handleDrag(eventArgs.x, eventArgs.y);
    }

    private handleTouchMove(eventArgs: TouchEvent) {
        this.handleDrag(eventArgs.touches[0].clientX, eventArgs.touches[0].clientY);
    }

    private handleDrag(currentX: number, currentY: number) {
        if (this.isDisposing) {
            return;
        }

        if (this.currentDragOperation === DragOperation.None) {
            return;
        }

        const xPct = (currentX - this.lastDragX) / this.containerWidth
        const yPct = (currentY - this.lastDragY) / this.containerHeight
        if (this.currentDragOperation === DragOperation.Translation) {

            const deltaTranslation = Float3.create(-xPct * this.currentRadius, yPct * this.currentRadius, 0);
            Float3.add(this.cameraTranslation, deltaTranslation, this.cameraTranslation);
        } else {
            const rotationScale = Math.PI;
            const deltaPhi = xPct * rotationScale;
            const deltaTheta = yPct *rotationScale;

            this.theta = Math.min(Math.max(this.theta - deltaTheta - deltaTheta, 0.01), Math.PI);
            this.phi -= deltaPhi;

            Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position);
        }

        this.lastDragX = currentX;
        this.lastDragY = currentY;
    }

    private handleDragRelease() {
        this.currentDragOperation = DragOperation.None;
    }

    private handleWheel(eventArgs: WheelEvent) {
        this.currentZoom = eventArgs.deltaY < 0 ? -1 : 1;
        eventArgs.preventDefault();
    }

    private scaleToSceneBoundingBox(): void {
        if (this.isDisposing) {
            return;
        }

        const { min, max } = this.renderer.getSceneBoundingBox();
        const diff = Float3.subtract(max, min);
        const distance = Float3.length(diff)

        this.startingRadius = distance;
        this.currentRadius = this.startingRadius;
        this.minRadius = 0.25 * distance;
        this.maxRadius = 2 * distance;
        this.zoomFactor = this.maxRadius / 50;
        Float3.zero(this.cameraTranslation);

        Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position);
    }
}