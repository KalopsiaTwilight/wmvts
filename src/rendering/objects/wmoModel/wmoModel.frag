precision mediump float;

uniform vec3 u_cameraPos;

// Simple lighting params
uniform vec4 u_ambientColor;
uniform vec4 u_lightColor;
uniform vec3 u_lightDir;

uniform int u_pixelShader;
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
    if (u_blendMode == 1) {
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
;
    if (u_pixelShader == 21) {
        // None
        materialColor = texture1.rgb * texture2.rgb;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 0) {
        // DiffuseT1
        materialColor = texture1.rgb;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 1) {
        // Specular
        materialColor = texture1.rgb;
        specular = calculateSpecular(texture1.a);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 2) {
        // Metal
        materialColor = texture1.rgb;
        specular = calculateSpecular(((texture1 * 4.0) * texture1.a).x);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 3) {
        // Env
        materialColor = texture1.rgb ;
        emissiveColor = texture2.rgb * texture1.a * distFade;
        finalOpacity = 1.0;
    } else if (u_pixelShader == 4) {
        // Opaque
        materialColor = texture1.rgb ;
        finalOpacity = 1.0;
    } else if (u_pixelShader == 5) {
        // EnvMetal
        materialColor = texture1.rgb ;
        emissiveColor = (((texture1.rgb * texture1.a) * texture2.rgb) * distFade);
        finalOpacity = 1.0;
    } else if (u_pixelShader == 6) {
        // TwoLayerDiffuse
        vec3 layer1 = texture1.rgb;
        vec3 layer2 = mix(layer1, texture2.rgb, texture2.a);
        materialColor = mix(layer2, layer1, v_color2.a);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 7) {
        // TwoLayerEnvMetal
        vec4 colorMix = mix(texture1, texture2, 1.0 - v_color2.a);
        materialColor = colorMix.rgb ;
        emissiveColor = (colorMix.rgb * colorMix.a) * texture3.rgb * distFade;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 8) {
        // TwoLayerTerrain
        vec3 layer1 = texture1.rgb;
        vec3 layer2 = texture2.rgb;
        materialColor = mix(layer2, layer1, v_color2.a);
        specular = calculateSpecular(texture2.a * (1.0 - v_color2.a));
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 9) {
        // DiffuseEmissive
        materialColor = texture1.rgb ;
        emissiveColor = texture2.rgb * texture2.a * v_color2.a;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 10) {
        // MaskedEnvMetal
        float mixFactor = clamp((texture3.a * v_color2.a), 0.0, 1.0);
        materialColor =
            mix(mix(((texture1.rgb * texture2.rgb) * 2.0), texture3.rgb, mixFactor), texture1.rgb, texture1.a);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 11) {
        // EnvMetalEmissive
        materialColor = texture1.rgb ;
        emissiveColor =
            (
                ((texture1.rgb * texture1.a) * texture2.rgb) +
                ((texture3.rgb * texture3.a) * v_color2.a)
            );
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 12) {
        // TwoLayerDiffuseOpaque
        materialColor = mix(texture2.rgb, texture1.rgb, v_color2.a);
        finalOpacity = 1.0;
    } else if (u_pixelShader == 13) {
        // TwoLayerDiffuseEmissive
        vec3 t1diffuse = (texture2.rgb * (1.0 - texture2.a));
        materialColor = mix(t1diffuse, texture1.rgb, v_color2.a);
        emissiveColor = (texture2.rgb * texture2.a) * (1.0 - v_color2.a);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 14) {
        // AdditiveMaskedEnvMetal
        materialColor = mix(
            (texture1.rgb * texture2.rgb * 2.0) + (texture3.rgb * clamp(texture3.a * v_color2.a, 0.0, 1.0)),
            texture1.rgb,
            vec3(texture1.a)
        );
        finalOpacity = 1.0;
    } else if (u_pixelShader == 15) {
        // TwoLayerDiffuseMod2x
        vec3 layer1 = texture1.rgb;
        vec3 layer2 = mix(layer1, texture2.rgb, vec3(texture2.a));
        vec3 layer3 = mix(layer2, layer1, vec3(v_color2.a));
        materialColor = layer3 * texture3.rgb * 2.0;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 16) {
        // TwoLayerDiffuseMod2xNA
        vec3 layer1 = ((texture1.rgb * texture2.rgb) * 2.0);
        materialColor = mix(texture1.rgb, layer1, vec3(v_color2.a)) ;
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 17) {
        // TwoLayerDiffuseAlpha
        vec3 layer1 = texture1.rgb;
        vec3 layer2 = mix(layer1, texture2.rgb, vec3(texture2.a));
        vec3 layer3 = mix(layer2, layer1, vec3(texture3.a));
        materialColor = ((layer3 * texture3.rgb) * 2.0);
        finalOpacity = texture1.a;
    } else if (u_pixelShader == 18) {
        // Lod
        materialColor = texture1.rgb;
        finalOpacity = texture1.a;
    } else {
        // unsupported shader
        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
        return;
    }
;
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