attribute vec3 a_position;
attribute vec4 a_color;
attribute vec2 a_texCoord1;
attribute vec2 a_texCoord2;
attribute vec2 a_texCoord3;
attribute float a_alphaCutoff;

varying vec4 v_color;
varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;
varying float v_alphaCutoff;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

void main(void) {
    vec4 pos = vec4(a_position, 1);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
    
    v_color = a_color;
    v_texCoord1 = a_texCoord1;
    v_texCoord2 = a_texCoord2;
    v_texCoord3 = a_texCoord3;
    v_alphaCutoff = a_alphaCutoff;
}