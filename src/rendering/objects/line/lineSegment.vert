precision mediump float;

attribute vec3 a_position;
attribute vec2 a_texCoord;

uniform float u_linewidth;
uniform vec3 u_segmentStart;
uniform vec3 u_segmentEnd;

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;

varying vec2 v_texCoord;
varying vec4 v_position;

void main() {
    vec3 position = a_position;
    v_texCoord = a_texCoord;

    mat4 modelViewMatrix = u_viewMatrix * u_modelMatrix;
    vec4 start = modelViewMatrix * vec4( u_segmentStart, 1.0 );
    vec4 end = modelViewMatrix * vec4( u_segmentEnd, 1.0 );

    vec3 worldDir = normalize( end.xyz - start.xyz );
    vec3 midPoint = normalize( mix( start.xyz, end.xyz, 0.5 ) );
    vec3 segLength = normalize( cross( worldDir, midPoint ) );
    v_position = position.y < 0.5 ? start: end;

    float segmentWidth = u_linewidth * 0.5;
    v_position.xyz += position.x * segmentWidth * segLength;

    vec4 clip = u_projectionMatrix * v_position;
    gl_Position = clip;
}