precision mediump float;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

attribute vec3 a_position;

void main() {
    gl_Position = (u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1));
}