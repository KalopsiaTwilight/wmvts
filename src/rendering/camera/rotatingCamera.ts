import { RenderingEngine } from "../engine";
import { Float3, Float44 } from "../math";
import { Camera } from "./base";


export class RotatingCamera extends Camera {

    time: number;
    radius: number;
    rotateSpeed: number;

    constructor() {
        super();
    }

    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);

        this.time = 0;
        this.radius = 250;
        this.rotateSpeed = 50 * (1/1000);
    }

    override update(deltaTime: number) {
        this.time = (this.time + deltaTime) % (360 * this.rotateSpeed)
        let currentAngle = Math.floor(this.time / this.rotateSpeed);
        
        // // Compute a matrix for the camera
        var cameraAngleRadians = currentAngle * Math.PI / 180;
        var cameraMatrix = Float44.identity();
        Float44.rotateY(cameraMatrix, cameraAngleRadians, cameraMatrix);
        Float44.translate(cameraMatrix, Float3.create(0, 0, this.radius * 1.5), cameraMatrix);

        // // Make a view matrix from the camera matrix
        Float44.invert(cameraMatrix, this.viewMatrix);
    }
}