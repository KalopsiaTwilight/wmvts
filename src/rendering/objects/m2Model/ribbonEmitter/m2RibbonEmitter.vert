precision mediump float;
precision mediump int;

attribute vec3 a_position;
attribute vec4 a_color;
attribute vec2 a_texCoord1;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

varying vec4 v_color;
varying vec2 v_texCoord1;

void main() {
    vec4 aPositionVec4 = vec4(a_position, 1);

    v_color = a_color;
    v_texCoord1 = a_texCoord1;
    vec4 vertexViewSpace = u_viewMatrix * aPositionVec4;

    gl_Position = u_projectionMatrix * vertexViewSpace;
}
