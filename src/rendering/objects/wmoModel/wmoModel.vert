precision mediump float;

uniform int u_vertexShader;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;
varying vec4 v_color1;
varying vec4 v_color2;
varying vec3 v_normal;
varying vec3 v_position;

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_color1;
attribute vec4 a_color2;
attribute vec2 a_texCoord1;
attribute vec2 a_texCoord2;
attribute vec2 a_texCoord3;

vec3 normalizedMatrixMultiply(mat4 matrix, vec3 vector) {
    // Pull out the squared scaling.
    vec3 t_SqScale = vec3(
        dot(matrix[0], matrix[0]), 
        dot(matrix[1], matrix[1]), 
        dot(matrix[2], matrix[2])
    );
    return normalize(matrix * vec4(vector / t_SqScale, 0.0)).xyz;
}

vec2 posToTexCoord(vec3 pos, vec3 normal) {
    vec3 reflection = reflect(normalize(pos), normal);
    return normalize(reflection).xy * 0.5 + vec2(0.5);
}   

void main() {
    v_position = (u_modelMatrix * vec4(a_position, 1.0)).xyz;
    v_normal = normalizedMatrixMultiply(u_modelMatrix, a_normal);
    v_color1 = a_color1.bgra;
    v_color2 = a_color2.rgba;

    vec3 viewPosition = (u_viewMatrix * vec4(v_position, 1.0)).xyz;
    vec3 viewNormal = (u_viewMatrix * vec4(v_normal, 0.0)).xyz;
    gl_Position = u_projectionMatrix * vec4(viewPosition, 1.0);

    if (u_vertexShader == 9) { 
        // None
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2;
       v_texCoord3 = a_texCoord3;
   } else if (u_vertexShader == 0) {
    //DiffuseT1;
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2; //not used
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 1) {
    //DiffuseT1Ref1
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = reflect(normalize(viewPosition), viewNormal).xy;
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 2) {
    //DiffuseT1EnvT2
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = posToTexCoord(viewPosition, viewNormal);
       v_texCoord3 = a_texCoord3;
   } else if (u_vertexShader == 3) {
    // SpecularT1
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2; //not used
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 4) {
    // DiffuseComp
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2; //not used
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 5) {
    //DiffuseCompRefl
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2;
       v_texCoord3 = reflect(normalize(viewPosition), viewNormal).xy;
   } else if (u_vertexShader == 6) {
    //DiffuseCompTerrain
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = viewPosition.xy * -0.239999995;
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 7) {
    //DiffuseCompAlpha
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = viewPosition.xy * -0.239999995;
       v_texCoord3 = a_texCoord3; //not used
   } else if (u_vertexShader == 8) {
    // Parralax
       v_texCoord1 = a_texCoord1;
       v_texCoord2 = a_texCoord2;
       v_texCoord3 = a_texCoord3;
   }
}