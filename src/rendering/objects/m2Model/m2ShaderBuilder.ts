import { IAttribLocations } from "@app/rendering/graphics";
import { getM2PixelShaderId, getM2VertexShaderId, M2PixelShader, M2VertexShader } from "./m2Shaders"

const m2AttributeLocations: IAttribLocations = {
    "a_position": 0,
    "a_normal": 1,
    "a_bones": 2,
    "a_boneWeights": 3,
    "a_texcoord1": 4,
    "a_texcoord2": 5
}

export class M2ShaderBuilder {
    static getAttribLocations(): IAttribLocations {
        return m2AttributeLocations;
    }

    static getShaderName(shaderId: number, textureCount: number): string {
        const vertexShader = getM2VertexShaderId(shaderId, textureCount);
        const pixelShader = getM2PixelShaderId(shaderId, textureCount);

        return "M2-" + M2VertexShader[vertexShader] + "-" + M2PixelShader[pixelShader];
    }

    static getShaderProgramTexts(shaderId: number, textureCount: number): [string, string] {
        const vertexShader = getM2VertexShaderId(shaderId, textureCount);
        const pixelShader = getM2PixelShaderId(shaderId, textureCount);

        const vsParams = this.getVertexShaderParams(vertexShader);
        const vsText = this.getVertProgramText(vertexShader, vsParams.numTexCoords, vsParams.hasEdgeScan, vsParams.hasPtt);
        const fragText = this.getFragProgramText(pixelShader, vsParams.numTexCoords);

        return [vsText, fragText];
    }

    static getAttribLocation(attribName: string) {
        return m2AttributeLocations[attribName];
    }

    private static getVertexShaderParams(shader: M2VertexShader) {
        const shaderName = M2VertexShader[shader];
        const nameParts = shaderName.split("_");

        let numTexCoords = 0;
        let hasEdgeScan = false;
        let hasPtt = false;
        if (nameParts[0] === "BW") {
            numTexCoords = 1;
        } else if (nameParts[0] === "Color") {
            numTexCoords = 3;
        } else {
            hasEdgeScan = nameParts.some(x => x === "EdgeFade");
            hasPtt = nameParts.some(x => x === "Env");
            numTexCoords = nameParts.length;
            if (hasEdgeScan) {
                numTexCoords -=1;
            }
        }

        return { numTexCoords, hasEdgeScan, hasPtt };
    }

    private static getVertProgramText(vertexShader: M2VertexShader, numTexCoords: number, hasEdgeScan: boolean, hasPtt: boolean) {
        return `attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_bones;
attribute vec4 a_boneWeights;
attribute vec2 a_texcoord1;
attribute vec2 a_texcoord2;

uniform mat4 u_textureTransformMatrix1;
uniform mat4 u_textureTransformMatrix2;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec4 u_color;
uniform int u_vertexShader;

uniform int u_numBones;
uniform sampler2D u_boneMatrices;

varying vec3 v_normal;
varying vec4 v_color;
${numTexCoords >= 1 ? "varying vec2 v_texCoord1;" : ""}
${numTexCoords >= 2 ? "varying vec2 v_texCoord2;" : ""}
${numTexCoords >= 3 ? "varying vec2 v_texCoord3;" : ""}

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

mat4 getBoneMatrix(float index) {
    float row = (index + 0.5) / float(u_numBones);
    return mat4(
        texture2D(u_boneMatrices, vec2(0.5/4., row)),
        texture2D(u_boneMatrices, vec2(1.5/4., row)),
        texture2D(u_boneMatrices, vec2(2.5/4., row)),
        texture2D(u_boneMatrices, vec2(3.5/4., row))
    );
}

${hasPtt ? this.getVsPosToTexCoordFn() : ""}
${hasEdgeScan ? this.getVsEdgeScanFn() : ""}
void main(void) {
    mat4 boneTransformMatrix =  mat4(1.0);
    if (length(a_boneWeights) > 0.0) {
        boneTransformMatrix =  mat4(0.0);
        for (int i = 0; i < 4; i++) {
            boneTransformMatrix += getBoneMatrix(a_bones[i]) * a_boneWeights[i];
        }
    }

    mat4 posMatrix = u_viewMatrix * u_modelMatrix * boneTransformMatrix;
    vec4 pos = posMatrix * vec4(a_position, 1);
    gl_Position = u_projectionMatrix * pos;

    mat4 normalMatrix = transpose(invert(posMatrix));
    v_normal = normalize((normalMatrix * vec4(a_normal, 0.0)).xyz);
    
    vec4 clampedColor = clamp(u_color, 0., 1.);
    vec4 halfColor = clampedColor * 0.5;

    ${numTexCoords >= 1 ? "v_texCoord1 = vec2(0.0, 0.0);" : ""}
    ${numTexCoords >= 2 ? "v_texCoord2 = vec2(0.0, 0.0);" : ""}
    ${numTexCoords >= 3 ? "v_texCoord3 = vec2(0.0, 0.0);" : ""}
    ${this.getVertexShaderText(vertexShader)}
}
`;
    }

    private static getFragProgramText(ps: M2PixelShader, numTexCoords: number) {
        return `precision mediump float;

varying vec3 v_normal;
varying vec4 v_color;
${numTexCoords >= 1 ? "varying vec2 v_texCoord1;" : ""}
${numTexCoords >= 2 ? "varying vec2 v_texCoord2;" : ""}
${numTexCoords >= 3 ? "varying vec2 v_texCoord3;" : ""}

uniform int u_blendMode;
uniform bool u_unlit;
uniform vec4 u_ambientColor;
uniform vec4 u_lightColor;
uniform vec3 u_lightDir;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform sampler2D u_texture4;
uniform vec4 u_textureWeights;
        
void main(void) {
    vec4 outputColor = vec4(1.0);
    vec3 specular = vec3(0.0);

    ${numTexCoords >= 1 ? "vec4 tex1 = texture2D(u_texture1, v_texCoord1.st);" : ""}
    ${numTexCoords >= 2 ? "vec4 tex2 = texture2D(u_texture2, v_texCoord2.st);" : ""}
    ${numTexCoords >= 3 ? "vec4 tex3 = texture2D(u_texture3, v_texCoord3.st);" : ""}

    vec3 materialColor;
    float discardAlpha = 1.0;
${this.getPixelShaderText(ps)}

    if (u_blendMode == 13) {
        outputColor.a = discardAlpha * v_color.a;
    } else if (u_blendMode == 1) {
        if (discardAlpha < (128.0 / 255.0))
            discard;
        outputColor.a = v_color.a;
    } else if (u_blendMode == 0) {
        outputColor.a = v_color.a;
    } else {
        outputColor.a = discardAlpha * v_color.a;
    }

    outputColor.rgb = materialColor;
    if (!u_unlit) {
        // Simple ambient + diffuse lighting
        // color = (ambient + diffuse) * objectColor 
        vec4 lightColor = u_ambientColor;
        float diffStrength = max(0.0, dot(v_normal, u_lightDir));
        lightColor += u_lightColor * diffStrength;
        lightColor = clamp(lightColor, vec4(0,0,0,0), vec4(1,1,1,1));
        outputColor.rgb *= lightColor.rgb;
    }
    outputColor += vec4(specular, 0.0);
    
    gl_FragColor = outputColor;
}
`
    }

    private static getPixelShaderText(ps: M2PixelShader) {
        switch (ps) {
            case M2PixelShader.Combiners_Opaque: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
`;
            case M2PixelShader.Combiners_Mod: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a;
`;
            case M2PixelShader.Combiners_Opaque_Mod: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
discardAlpha = tex2.a;
`;
            case M2PixelShader.Combiners_Opaque_Mod2x: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
discardAlpha = tex2.a * 2.0;
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
`;
            case M2PixelShader.Combiners_Opaque_Opaque: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
`;
            case M2PixelShader.Combiners_Mod_Mod: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
discardAlpha = tex1.a * tex2.a;
`;
            case M2PixelShader.Combiners_Mod_Mod2x: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
discardAlpha = tex1.a * tex2.a * 2.0;
`;
            case M2PixelShader.Combiners_Mod_Add: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a + tex2.a;
specular = tex2.rgb;
`;
            case M2PixelShader.Combiners_Mod_Mod2xNA: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
discardAlpha = tex1.a;
`;
            case M2PixelShader.Combiners_Mod_AddNA: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a;
specular = tex2.rgb;
`;
            case M2PixelShader.Combiners_Mod_Opaque: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
discardAlpha = tex1.a;
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a));
`;
            case M2PixelShader.Combiners_Opaque_AddAlpha: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
specular = tex2.rgb * tex2.a;
`;
            case M2PixelShader.Combiners_Opaque_AddAlpha_Alpha: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
specular = tex2.rgb * tex2.a * (1.0 - tex1.a);
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_Add: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a));
specular = tex3.rgb * tex3.a * u_textureWeights.b;
`;
            case M2PixelShader.Combiners_Mod_AddAlpha: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a;
specular = tex2.rgb * tex2.a;
`;
            case M2PixelShader.Combiners_Mod_AddAlpha_Alpha: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a + tex2.a * (0.3 * tex2.r + 0.59 * tex2.g + 0.11 * tex2.b);
specular = tex2.rgb * tex2.a * (1.0 - tex1.a);
`;
            case M2PixelShader.Combiners_Opaque_Alpha_Alpha: return `
materialColor = v_color.rgb * 2.0 * mix(mix(tex1.rgb, tex2.rgb, vec3(tex2.a)), tex1.rgb, vec3(tex1.a));
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_3s: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex3.rgb, vec3(tex3.a));
`;
            case M2PixelShader.Combiners_Opaque_AddAlpha_Wgt: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
specular = tex2.rgb * tex2.a * u_textureWeights.g;
`;
            case M2PixelShader.Combiners_Mod_Add_Alpha: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a + tex2.a;
specular = tex2.rgb * (1.0 - tex1.a);
`;
            case M2PixelShader.Combiners_Opaque_ModNA_Alpha: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb, tex1.rgb, vec3(tex1.a));
`;
            case M2PixelShader.Combiners_Mod_AddAlpha_Wgt: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a;
specular = tex2.rgb * tex2.a * u_textureWeights.g;
`;
            case M2PixelShader.Combiners_Opaque_Mod_Add_Wgt: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb, tex2.rgb, vec3(tex2.a));
specular = tex1.rgb * tex1.a * u_textureWeights.r;
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_UnshAlpha: return `
float glowOpacity = clamp(tex3.a * u_textureWeights.b, 0.0, 1.0);
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a)) * (1.0 - glowOpacity);
specular = tex3.rgb * glowOpacity;
`;
            case M2PixelShader.Combiners_Mod_Dual_Crossfade: return `
vec4 crossFaded = mix(mix(tex1, texture2D(u_texture2, v_texCoord1), vec4(clamp(u_textureWeights.g, 0.0, 1.0))), texture2D(u_texture3, v_texCoord1), vec4(clamp(u_textureWeights.b, 0.0, 1.0)));
materialColor = v_color.rgb * 2.0 * crossFaded.rgb;
discardAlpha = crossFaded.a;
`;
            case M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_Alpha: return `
materialColor = v_color.rgb * 2.0 * mix(mix(tex1.rgb * tex2.rgb * 2.0, tex3.rgb, vec3(tex3.a)), tex1.rgb, vec3(tex1.a));
`;
            case M2PixelShader.Combiners_Mod_Masked_Dual_Crossfade: return `
vec4 crossFaded = mix(mix(tex1, texture2D(u_texture2, v_texCoord1), vec4(clamp(u_textureWeights.g, 0.0, 1.0))), texture2D(u_texture3, v_texCoord1), vec4(clamp(u_textureWeights.b, 0.0, 1.0)));
materialColor = v_color.rgb * 2.0 * crossFaded.rgb;
discardAlpha = crossFaded.a * texture2D(u_texture4, v_texCoord2).a;
`;
            case M2PixelShader.Combiners_Opaque_Alpha: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb, tex2.rgb, vec3(tex2.a));
`;
            case M2PixelShader.Guild: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a)), tex3.rgb, vec3(tex3.a));
discardAlpha = tex1.a;
`;
            case M2PixelShader.Guild_NoBorder: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a));
discardAlpha = tex1.a;
`;
            case M2PixelShader.Guild_Opaque: return `
materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a)), tex3.rgb, vec3(tex3.a));
`;
            case M2PixelShader.Combiners_Mod_Depth: return `
materialColor = v_color.rgb * 2.0 * tex1.rgb;
discardAlpha = tex1.a;
`;
            case M2PixelShader.Illum: return `
discardAlpha = tex1.a;
`;
            case M2PixelShader.Combiners_Mod_Mod_Mod_Const: return `
materialColor = v_color.rgb * 2.0 * (tex1 * tex2 * tex3).rgb;
discardAlpha = (tex1 * tex2 * tex3).a;
`;
            default: throw new Error("Unknown M2 Pixel shader: " + ps);
        }
    }

    private static getVsPosToTexCoordFn() {
        return `
vec2 posToTexCoord(vec3 pos, vec3 normal) {
    vec3 reflection = reflect(normalize(pos), normal);
    return normalize(reflection).xy * 0.5 + vec2(0.5);
}
`;
    }

    private static getVsEdgeScanFn() {
        return `
float edgeScan(vec3 position, vec3 normal){
    float dotProductClamped = clamp(dot(-normalize(position),normal), 0., 1.);
    return clamp(2.7 * dotProductClamped * dotProductClamped - 0.4, 0., 1.);
}
`;
    }

    private static getVertexShaderText(vs: M2VertexShader) {
        switch(vs) {
            case M2VertexShader.Diffuse_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`;
            case M2VertexShader.Diffuse_Env: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
`;
            case M2VertexShader.Diffuse_T1_T2: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
`;
            case M2VertexShader.Diffuse_T1_Env: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
`;
            case M2VertexShader.Diffuse_Env_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`;
            case M2VertexShader.Diffuse_Env_Env: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
`
            case M2VertexShader.Diffuse_T1_Env_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_T1_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_T1_T1_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_EdgeFade_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
v_texCoord1 = ((u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy).xy;
`
            case M2VertexShader.Diffuse_T2: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_T1_Env_T2: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
v_texCoord3 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_EdgeFade_T1_T2: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_EdgeFade_Env: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a * edgeScan(pos.xyz, v_normal.rgb));
v_texCoord1 = posToTexCoord(pos.xyz,normalize(v_normal.xyz));
`
            case M2VertexShader.Diffuse_T1_T2_T1: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
v_texCoord3 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`
            case M2VertexShader.Diffuse_T1_T2_T3: return `
v_color = vec4(halfColor.r, halfColor.g, halfColor.b, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
v_texCoord2 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
v_texCoord3 = v_texCoord3;
`
            case M2VertexShader.Color_T1_T2_T3: return `
vec4 in_col0 = vec4(1.0, 1.0, 1.0, 1.0);
v_color = vec4((in_col0.rgb * 0.5).r, (in_col0.rgb * 0.5).g, (in_col0.rgb * 0.5).b, in_col0.a);
v_texCoord1 = (u_textureTransformMatrix2 * vec4(a_texcoord2, 0., 1.)).xy;
v_texCoord2 = vec2(0., 0.);
v_texCoord3 = v_texCoord3;
`
            case M2VertexShader.BW_Diffuse_T1: return `
v_color = vec4(clampedColor.rgb * 0.5, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`;
            case M2VertexShader.BW_Diffuse_T1_T2: return `
v_color = vec4(clampedColor.rgb * 0.5, clampedColor.a);
v_texCoord1 = (u_textureTransformMatrix1 * vec4(a_texcoord1, 0., 1.)).xy;
`
            default: throw Error("Unknown M2 vertex shader: " + vs);
        }
    }
}