import { AABB, Float3, Float4, Float44 } from "@app/math"
import { IRenderer } from "@app/rendering";

import { Camera } from "./base";

enum MovementState {
    None = 0,
    Positive = 1,
    Negative = -1
}

export class FirstPersonCamera extends Camera {
    cameraMatrix: Float44;

    containerElement: HTMLElement;

    isDraggingMouse: boolean;
    yaw: number;
    pitch: number;

    xMovement: MovementState;
    yMovement: MovementState;
    zMovement: MovementState;
    movementSpeed: number;

    onMouseDown: (ev: MouseEvent) => void;
    onMouseMove: (ev: MouseEvent) => void;
    onMouseUp: (ev: MouseEvent) => void;
    onTouchStart: (ev: TouchEvent) => void;
    onTouchMove: (ev: TouchEvent) => void;
    onTouchEnd: (ev: TouchEvent) => void;
    onKeyDown: (ev: KeyboardEvent) => void;
    onKeyUp: (ev: KeyboardEvent) => void;

    constructor(containerElement: HTMLElement) {
        super();
        this.containerElement = containerElement;

        this.cameraMatrix = Float44.identity();
        this.position = Float3.create(0, 0, 0);

        this.pitch = 0;
        this.yaw = Math.PI;

        this.xMovement = MovementState.None;
        this.yMovement = MovementState.None;
        this.zMovement = MovementState.None;
        this.movementSpeed = 50;

        this.isDraggingMouse = false;
    }

    override initialize(renderer: IRenderer): void {
        super.initialize(renderer);

        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onTouchStart = this.handleTouchStart.bind(this);
        
        this.containerElement.addEventListener('mousedown', this.onMouseDown);
        this.containerElement.addEventListener('touchstart', this.onTouchStart);
    
        if (document) {
            this.onMouseUp = this.handleDragRelease.bind(this);
            this.onTouchEnd = this.handleDragRelease.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this)
            this.onTouchMove = this.handleTouchMove.bind(this);
            this.onKeyUp = this.handleKeyDown.bind(this);
            this.onKeyDown = this.handleKeyUp.bind(this)
            document.addEventListener('keydown', this.onKeyUp)
            document.addEventListener('keyup', this.onKeyDown);
            document.addEventListener('mouseup', this.onMouseUp);
            document.addEventListener('touchend', this.onTouchEnd);
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('touchmove', this.onTouchMove);
            document.addEventListener('pointerlockchange', () => {

            })
        }
    }

    override update(deltaTime: number) {
        if (deltaTime > 100) {
            deltaTime = 100;
        }

        const rotation = Float4.quatFromEulers(0, this.pitch, this.yaw);
        const rotMatrix = Float44.fromQuat(rotation);
        // Handle movement
        const movementDir = Float3.create(this.xMovement, this.yMovement, this.zMovement)
        // normalize to prevent speed gain from moving in multiple directions
        Float3.normalize(movementDir, movementDir);
        // Multiply speed * deltaTime 
        const speedVec = Float3.create(this.movementSpeed, this.movementSpeed, this.movementSpeed);
        const deltaTimeVec = Float3.create(deltaTime/1000, deltaTime/1000, deltaTime/1000);
        Float3.multiply(speedVec, deltaTimeVec, speedVec);
        Float3.multiply(speedVec, movementDir, movementDir);
        // Transform movement with camera rotation to make axis relative to camera
        Float44.transformPoint(movementDir, rotMatrix, movementDir);
        Float3.add(movementDir, this.position, this.position);

        Float44.identity(this.cameraMatrix);    
        Float44.rotateX(this.cameraMatrix, Math.PI/180*90, this.cameraMatrix);
        Float44.translate(this.cameraMatrix, this.position, this.cameraMatrix);
        Float44.multiply(this.cameraMatrix, rotMatrix, this.cameraMatrix);
        
        Float44.invert(this.cameraMatrix, this.viewMatrix);
    }

    override dispose(): void {
        this.containerElement.removeEventListener('mousedown', this.onMouseDown);
        this.containerElement.removeEventListener('touchstart', this.onTouchStart);

        this.onMouseDown = null;
        this.onTouchStart = null;
        if (document) {
            document.removeEventListener('keydown', this.onKeyUp)
            document.removeEventListener('keyup', this.onKeyDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('touchend', this.onTouchEnd);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('touchmove', this.onTouchMove);

            this.onMouseUp = null;
            this.onTouchEnd = null;
            this.onMouseMove = null;
            this.onTouchMove = null;
            this.onKeyUp = null;
            this.onKeyDown = null;
        }
        super.dispose();
    }

    override scaleToBoundingBox(box?: AABB): void {
        const { min, max } = box;
        Float3.copy(max, this.position);
        const lookDir = Float3.negate(this.position);
        const horizontalDistance = Math.sqrt(lookDir[0] *lookDir[0] + lookDir[2]*lookDir[2])
        this.pitch = Math.atan2(lookDir[1], horizontalDistance)
        this.yaw = Math.atan2(lookDir[0], lookDir[2])
    }
    
    handleKeyDown(eventArgs: KeyboardEvent) {
        switch(eventArgs.key.toUpperCase()) {
            case 'W': {
                this.zMovement = MovementState.Negative;
                return false;
            }
            case 'S': {
                this.zMovement = MovementState.Positive;
                return false;
            }
            case 'A': {
                this.xMovement = MovementState.Negative;
                return false;
            }
            case 'D': {
                this.xMovement = MovementState.Positive;
                return false;
            }
            case 'Q': {
                this.yMovement = MovementState.Positive;
                return false;
            }
            case 'E': {
                this.yMovement = MovementState.Negative;
                return false;
            }
        }

        return true;
    }

    handleKeyUp(eventArgs: KeyboardEvent) {
        switch(eventArgs.key.toUpperCase()) {
            case 'W':
            case 'S': {
                this.zMovement = MovementState.None;
                return false;
            }
            case 'A':
            case 'D': {
                this.xMovement = MovementState.None;
                return false;
            }
            case 'Q':
            case 'E': {
                this.yMovement = MovementState.None;
                return false;
            }
        }

        return true;
    }

    handleMouseDown(eventArgs: MouseEvent) {
        if (eventArgs.button == 2) {
            return;
        }
        this.isDraggingMouse = true;

        eventArgs.preventDefault();

        if (document && !document.pointerLockElement) {
            this.containerElement.requestPointerLock()
        }
    }

    handleTouchStart(eventArgs: TouchEvent) {
        eventArgs.preventDefault();
        if (document && !document.pointerLockElement) {
            this.containerElement.requestPointerLock()
        }
    }

    handleMouseMove(eventArgs: MouseEvent) {
        if (!this.isDraggingMouse) {
            return;
        }

        this.handleDrag(eventArgs.movementX, eventArgs.movementY);
    }

    handleTouchMove(eventArgs: TouchEvent) {
        this.handleDrag(eventArgs.touches[0].clientX, eventArgs.touches[0].clientY);
    }

    handleDrag(xPct: number, yPct: number) {
        const rotationScale = Math.PI/180/4;
        const deltaX = xPct * rotationScale;
        const deltaY = yPct * rotationScale;

        this.pitch += deltaX;
        this.yaw += deltaY;
    }

    handleDragRelease() {
        this.isDraggingMouse = false;

        if (document && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
}