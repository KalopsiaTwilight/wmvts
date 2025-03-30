#ifndef MAX_BONES
#define MAX_BONES 256
#endif

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_bones;
attribute vec4 a_boneWeights;
attribute vec2 a_texcoord1;
attribute vec2 a_texcoord2;

uniform mat4 u_textureTransformMatrix1;
uniform mat4 u_textureTransformMatrix2;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projMatrix;
uniform vec4 u_color;
uniform int u_vertexShader;

uniform mat4 u_boneMatrices[MAX_BONES];

varying vec3 v_normal;
varying vec4 v_color;
varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;

mat4 invert(mat4 inputMatrix) {
    float
        m00 = inputMatrix[0][0], m01 = inputMatrix[0][1], m02 = inputMatrix[0][2], m03 = inputMatrix[0][3],
        m10 = inputMatrix[1][0], m11 = inputMatrix[1][1], m12 = inputMatrix[1][2], m13 = inputMatrix[1][3],
        m20 = inputMatrix[2][0], m21 = inputMatrix[2][1], m22 = inputMatrix[2][2], m23 = inputMatrix[2][3],
        m30 = inputMatrix[3][0], m31 = inputMatrix[3][1], m32 = inputMatrix[3][2], m33 = inputMatrix[3][3];

    float 
        t0 = m00 * m11 - m01 * m10,
        t1 = m00 * m12 - m02 * m10,
        t2 = m00 * m13 - m03 * m10,
        t3 = m01 * m12 - m02 * m11,
        t4 = m01 * m13 - m03 * m11,
        t5 = m02 * m13 - m03 * m12,
        t6 = m20 * m31 - m21 * m30,
        t7 = m20 * m32 - m22 * m30,
        t8 = m20 * m33 - m23 * m30,
        t9 = m21 * m32 - m22 * m31,
        t10 = m21 * m33 - m23 * m31,
        t11 = m22 * m33 - m23 * m32,
        determinant = t0 * t11 - t1 * t10 + t2 * t9 + t3 * t8 - t4 * t7 + t5 * t6;

    return mat4(
        m11 * t11 - m12 * t10 + m13 * t9,
        m02 * t10 - m01 * t11 - m03 * t9,
        m31 * t5 - m32 * t4 + m33 * t3,
        m22 * t4 - m21 * t5 - m23 * t3,
        m12 * t8 - m10 * t11 - m13 * t7,
        m00 * t11 - m02 * t8 + m03 * t7,
        m32 * t2 - m30 * t5 - m33 * t1,
        m20 * t5 - m22 * t2 + m23 * t1,
        m10 * t10 - m11 * t8 + m13 * t6,
        m01 * t8 - m00 * t10 - m03 * t6,
        m30 * t4 - m31 * t2 + m33 * t0,
        m21 * t2 - m20 * t4 - m23 * t0,
        m11 * t7 - m10 * t9 - m12 * t6,
        m00 * t9 - m01 * t7 + m02 * t6,
        m31 * t1 - m30 * t3 - m32 * t0,
        m20 * t3 - m21 * t1 + m22 * t0
    ) / determinant;
}

highp mat4 transpose(in highp mat4 inputMatrix) {
    return mat4(
        vec4(inputMatrix[0][0], inputMatrix[1][0], inputMatrix[2][0], inputMatrix[3][0]),
        vec4(inputMatrix[0][1], inputMatrix[1][1], inputMatrix[2][1], inputMatrix[3][1]),
        vec4(inputMatrix[0][2], inputMatrix[1][2], inputMatrix[2][2], inputMatrix[3][2]),
        vec4(inputMatrix[0][3], inputMatrix[1][3], inputMatrix[2][3], inputMatrix[3][3])
    );
}

vec2 posToTexCoord(vec3 pos, vec3 normal) {
    vec3 reflection = reflect(normalize(pos), normal);
    return normalize(reflection).xy * 0.5 + vec2(0.5);
}   

float edgeScan(vec3 position, vec3 normal){
    float dotProductClamped = clamp(dot(-normalize(position),normal), 0., 1.);
    return clamp(2.7 * dotProductClamped * dotProductClamped - 0.4, 0., 1.);
}

void main(void) {
    mat4 boneTransformMatrix =  mat4(1.0);
    if (length(a_boneWeights) > 0.0) {
        boneTransformMatrix =  mat4(0.0);
        for (int i = 0; i < 4; i++) {
            boneTransformMatrix += u_boneMatrices[int(a_bones[i])] * a_boneWeights[i];
        }
    }

    mat4 posMatrix = u_viewMatrix * u_modelMatrix * boneTransformMatrix;
    vec4 pos = posMatrix * vec4(a_position, 1);
    gl_Position = u_projMatrix * pos;

    mat4 normalMatrix = transpose(invert(posMatrix));
    v_normal = normalize((normalMatrix * vec4(a_normal, 0.0)).xyz);
    
    vec4 clampedColor = clamp(u_color, 0., 1.);
    vec4 halfColor = clampedColor * 0.5;

    if (u_vertexShader == 0) {
        //Diffuse_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if (u_vertexShader == 1) {
        //Diffuse_Env
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
    } else if (u_vertexShader == 2) {
        //Diffuse_T1_T2
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
    } else if (u_vertexShader == 3) {
        //Diffuse_T1_Env
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
    } else if (u_vertexShader == 4) {
        //Diffuse_Env_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
        v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if (u_vertexShader == 5 ) {
        //Diffuse_Env_Env
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
        v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
    } else if ( u_vertexShader == 6 ) {
        //Diffuse_T1_Env_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.) ).xy;
        v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
        v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if ( u_vertexShader == 7 ) {
        //Diffuse_T1_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if ( u_vertexShader == 8 ) {
        //Diffuse_T1_T1_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if ( u_vertexShader == 9 ) {
        //Diffuse_EdgeFade_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
        v_texCoord1 = ((u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy).xy;
    } else if ( u_vertexShader == 10 ) {
        //Diffuse_T2
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
    } else if ( u_vertexShader == 11 ) {
        //Diffuse_T1_Env_T2
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
        v_texCoord3 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
    } else if ( u_vertexShader == 12 ) {
        //Diffuse_EdgeFade_T1_T2
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
    } else if ( u_vertexShader == 13 ) {
        //Diffuse_EdgeFade_Env
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
        v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));;
    } else if ( u_vertexShader == 14 ) {
        //Diffuse_T1_T2_T1
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
        v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if ( u_vertexShader == 15 ) {
        //Diffuse_T1_T2_T3
        v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
        v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
        v_texCoord3 = v_texCoord3;
    } else if ( u_vertexShader == 16 ) {
        //Color_T1_T2_T3
        vec4 in_col0 = vec4(1.0, 1.0, 1.0, 1.0);
        v_color = vec4((in_col0.rgb * 0.5).r, (in_col0.rgb * 0.5).g, (in_col0.rgb * 0.5).b, in_col0.a);
        v_texCoord1 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
        v_texCoord2 = vec2(0., 0.);
        v_texCoord3 = v_texCoord3;
    } else if ( u_vertexShader == 17 ) {
        //BW_Diffuse_T1
        v_color = vec4(clampedColor.rgb * 0.5, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    } else if ( u_vertexShader == 18 ) {
        //BW_Diffuse_T1_T2
        v_color = vec4(clampedColor.rgb * 0.5, clampedColor.a);
        v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
    }
}
