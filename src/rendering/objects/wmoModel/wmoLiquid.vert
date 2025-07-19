precision mediump float;
precision mediump int;

attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute float a_depth;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

//out vec2 vTexCoord;
varying vec3 v_position;
varying vec2 v_texCoord;
varying float v_depth;
varying vec3 v_normal;

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

void main() {
    vec4 aPositionVec4 = vec4(a_position.xyz, 1);
    mat4 viewModelMat = u_viewMatrix * u_modelMatrix;

    vec4 cameraPoint = viewModelMat * aPositionVec4;

    mat4 viewModelMatForNormal = transpose(invert(viewModelMat));

    gl_Position = u_projectionMatrix * cameraPoint;
    v_position = cameraPoint.xyz;
    v_normal = normalize(viewModelMatForNormal * vec4(0,0,1.0, 0.0)).xyz;
    v_depth = a_depth;
    v_texCoord = a_texCoord;
}
