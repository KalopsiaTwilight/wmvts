import { IAttribLocations } from "@app/rendering/graphics";
import { WMOShader } from "@app/modeldata";

import { getWMOPixelShader, getWMOVertexShader, WMOPixelShader, WMOVertexShader } from "./wmoShaders";

const wmoAttributeLocations: IAttribLocations = {
    "a_position": 0,
    "a_normal": 1,
    "a_color1": 2,
    "a_color2": 3,
    "a_texCoord1": 4,
    "a_texCoord2": 5,
    "a_texCoord3": 6,
}

export class WmoShaderBuilder {
    static getAttribLocations(): IAttribLocations {
        return wmoAttributeLocations;
    }

    static getShaderName(shaderId: WMOShader): string {
        const vertexShader = getWMOVertexShader(shaderId);
        const pixelShader = getWMOPixelShader(shaderId);

        return "WMO-" + WMOVertexShader[vertexShader] + "-" + WMOPixelShader[pixelShader];
    }

    static getShaderProgramTexts(shaderId: number): [string, string] {
        const vertexShader = getWMOVertexShader(shaderId);
        const pixelShader = getWMOPixelShader(shaderId);

        const vsText = this.getVertProgramText(vertexShader);
        const fragText = this.getFragProgramText(pixelShader);

        return [vsText, fragText];
    }

    static getAttribLocation(attribName: string) {
        return wmoAttributeLocations[attribName];
    }

    private static getVertProgramText(vertexShader: WMOVertexShader) {
        return `precision mediump float;

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
    v_color1 = a_color1.bgra * vec4(1/255);
    v_color2 = a_color2 * vec4(1/255);

    vec3 viewPosition = (u_viewMatrix * vec4(v_position, 1.0)).xyz;
    vec3 viewNormal = (u_viewMatrix * vec4(v_normal, 0.0)).xyz;
    gl_Position = u_projectionMatrix * vec4(viewPosition, 1.0);

    ${this.getVertexShaderText(vertexShader)}
}
`;
    }

    private static getFragProgramText(ps: WMOPixelShader) {
        return `
precision mediump float;

uniform vec3 u_cameraPos;

// Simple lighting params
uniform vec4 u_ambientColor;
uniform vec4 u_lightColor;
uniform vec3 u_lightDir;

uniform int u_blendMode;
uniform bool u_unlit;

uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;

varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;
varying vec4 v_color1;
varying vec4 v_color2;
varying vec3 v_normal;
varying vec3 v_position;

float saturate(float v) { return clamp(v, 0.0, 1.0); }

vec3 calculateSpecular(float texAlpha) {
    vec3 normal = normalize(v_normal);
    vec3 eyeDir = normalize(u_cameraPos - v_position.xyz);
    vec3 halfDir = normalize(u_lightDir + eyeDir);
    float attenuationDir = saturate(dot(normal, u_lightDir));
    float spec = (1.25 * pow(saturate(dot(normal, halfDir)), 8.0));
    vec3 specTerm = ((((vec3(mix(pow((1.0 - saturate(dot(u_lightDir, halfDir))), 5.0), 1.0, texAlpha)) * spec) * u_lightColor.rgb) * attenuationDir));
    return specTerm;
}

void main() {
    vec4 texture1 = texture2D(u_texture1, v_texCoord1);
    vec4 texture2 = texture2D(u_texture2, v_texCoord2);
    vec4 texture3 = texture2D(u_texture3, v_texCoord3);

    // BlendMode AlphaKey
    if (u_blendMode > 0) {
        if (texture1.a < 0.501960814) {
            discard;
        }
    }

    vec4 outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    vec3 materialColor = vec3(0.0);
    vec3 specular = vec3(0.0);
    vec3 emissiveColor = vec3(0.0);
    float finalOpacity = 0.0;
    float distFade = 1.0;

    ${this.getPixelShaderText(ps)}

    if (!u_unlit) {
        vec4 lightColor = u_ambientColor;
        float diffStrength = max(0.0, dot(v_normal, u_lightDir));
        lightColor += u_lightColor * diffStrength;
        lightColor = clamp(lightColor, vec4(0,0,0,0), vec4(1,1,1,1));
        outputColor.rgb = materialColor * lightColor.rgb;
        outputColor.a = 1.0;
    } else {
        outputColor = vec4(materialColor, 1.0);
    }
    outputColor += vec4(specular, 0.0);
    outputColor += vec4(emissiveColor, 0);

    gl_FragColor = outputColor;
}
`
    }

    private static getVertexShaderText(vs: WMOVertexShader) {
        switch(vs) {
            case WMOVertexShader.None: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2;
v_texCoord3 = a_texCoord3;
        `
            case WMOVertexShader.DiffuseT1: return `;
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2; 
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.DiffuseT1Refl: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = reflect(normalize(viewPosition), viewNormal).xy;
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.DiffuseT1EnvT2: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = posToTexCoord(viewPosition, viewNormal);
v_texCoord3 = a_texCoord3;
        `
            case WMOVertexShader.SpecularT1: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2; 
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.DiffuseComp: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2; 
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.DiffuseCompRefl: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2;
v_texCoord3 = reflect(normalize(viewPosition), viewNormal).xy;
        `
            case WMOVertexShader.DiffuseCompTerrain: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = viewPosition.xy * -0.239999995;
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.DiffuseCompAlpha: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = viewPosition.xy * -0.239999995;
v_texCoord3 = a_texCoord3; 
        `
            case WMOVertexShader.Parallax: return `
v_texCoord1 = a_texCoord1;
v_texCoord2 = a_texCoord2;
v_texCoord3 = a_texCoord3;
        `;
            default: throw new Error("Unknown WMO vertex shader: " + vs);
        }
    }

    private static getPixelShaderText(ps: WMOPixelShader) {
        switch(ps) {
            case WMOPixelShader.None: return `
materialColor = texture1.rgb * texture2.rgb;
finalOpacity = texture1.a;
`
            case WMOPixelShader.Diffuse: return `
materialColor = texture1.rgb;
finalOpacity = texture1.a;
`
            case WMOPixelShader.Specular: return `
materialColor = texture1.rgb;
specular = calculateSpecular(texture1.a);
finalOpacity = texture1.a;
`
            case WMOPixelShader.Metal: return `
materialColor = texture1.rgb;
specular = calculateSpecular(((texture1 * 4.0) * texture1.a).x);
finalOpacity = texture1.a;
`
            case WMOPixelShader.Env: return `
materialColor = texture1.rgb ;
emissiveColor = texture2.rgb * texture1.a * distFade;
finalOpacity = 1.0;
`
            case WMOPixelShader.Opaque: return `
materialColor = texture1.rgb ;
finalOpacity = 1.0;
`
            case WMOPixelShader.EnvMetal: return `
materialColor = texture1.rgb ;
emissiveColor = (((texture1.rgb * texture1.a) * texture2.rgb) * distFade);
finalOpacity = 1.0;
`
            case WMOPixelShader.TwoLayerDiffuse: return `
vec3 layer1 = texture1.rgb;
vec3 layer2 = mix(layer1, texture2.rgb, texture2.a);
materialColor = mix(layer2, layer1, v_color2.a);
finalOpacity = texture1.a;
`
            case WMOPixelShader.TwoLayerEnvMetal: return `
vec4 colorMix = mix(texture1, texture2, 1.0 - v_color2.a);
materialColor = colorMix.rgb ;
emissiveColor = (colorMix.rgb * colorMix.a) * texture3.rgb * distFade;
finalOpacity = texture1.a;
`
            case WMOPixelShader.TwoLayerTerrain: return `
vec3 layer1 = texture1.rgb;
vec3 layer2 = texture2.rgb;
materialColor = mix(layer2, layer1, v_color2.a);
specular = calculateSpecular(texture2.a * (1.0 - v_color2.a));
finalOpacity = texture1.a;
`
            case WMOPixelShader.DiffuseEmissive: return `
materialColor = texture1.rgb ;
emissiveColor = texture2.rgb * texture2.a * v_color2.a;
finalOpacity = texture1.a;
`
            case WMOPixelShader.MaskedEnvMetal: return `
float mixFactor = clamp((texture3.a * v_color2.a), 0.0, 1.0);
materialColor =
    mix(mix(((texture1.rgb * texture2.rgb) * 2.0), texture3.rgb, mixFactor), texture1.rgb, texture1.a);
finalOpacity = texture1.a;
`
            case WMOPixelShader.EnvMetalEmissive: return `
materialColor = texture1.rgb ;
emissiveColor =
    (
        ((texture1.rgb * texture1.a) * texture2.rgb) +
        ((texture3.rgb * texture3.a) * v_color2.a)
    );
finalOpacity = texture1.a;
`
            case WMOPixelShader.TwoLayerDiffuseOpaque: return `
materialColor = mix(texture2.rgb, texture1.rgb, v_color2.a);
finalOpacity = 1.0;
`
            case WMOPixelShader.TwoLayerDiffuseEmissive: return `
vec3 t1diffuse = (texture2.rgb * (1.0 - texture2.a));
materialColor = mix(t1diffuse, texture1.rgb, v_color2.a);
emissiveColor = (texture2.rgb * texture2.a) * (1.0 - v_color2.a);
finalOpacity = texture1.a;
`
            case WMOPixelShader.AdditiveMaskedEnvMetal: return `
materialColor = mix(
    (texture1.rgb * texture2.rgb * 2.0) + (texture3.rgb * clamp(texture3.a * v_color2.a, 0.0, 1.0)),
    texture1.rgb,
    vec3(texture1.a)
);
finalOpacity = 1.0;
`
            case WMOPixelShader.TwoLayerDiffuseMod2x: return `
vec3 layer1 = texture1.rgb;
vec3 layer2 = mix(layer1, texture2.rgb, vec3(texture2.a));
vec3 layer3 = mix(layer2, layer1, vec3(v_color2.a));
materialColor = layer3 * texture3.rgb * 2.0;
finalOpacity = texture1.a;
`
            case WMOPixelShader.TwoLayerDiffuseMod2xNA: return `
vec3 layer1 = ((texture1.rgb * texture2.rgb) * 2.0);
materialColor = mix(texture1.rgb, layer1, vec3(v_color2.a));
finalOpacity = texture1.a;
`
            case WMOPixelShader.TwoLayerDiffuseAlpha: return `
vec3 layer1 = texture1.rgb;
vec3 layer2 = mix(layer1, texture2.rgb, vec3(texture2.a));
vec3 layer3 = mix(layer2, layer1, vec3(texture3.a));
materialColor = ((layer3 * texture3.rgb) * 2.0);
finalOpacity = texture1.a;
`
            case WMOPixelShader.Lod: return `
materialColor = texture1.rgb;
finalOpacity = texture1.a;
`;
            default: throw new Error("Unknown WMO Pixel Shader: " + ps);
        }
    }
}