precision highp float;
precision highp int;

uniform sampler2D u_texture;
uniform ivec2 u_waterParams;

varying vec3 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying float v_depth;

uniform vec4 u_oceanCloseColor;
uniform vec4 u_oceanFarColor;
uniform vec4 u_riverCloseColor;
uniform vec4 u_riverFarColor;
uniform vec4 u_waterAlphas; // riverShallow, riverDeep, oceanShallow, oceanDeep

// Simple lighting params, currently unused
uniform bool u_unlit;
uniform vec4 u_ambientColor;
uniform vec4 u_lightColor;
uniform vec3 u_lightDir;

float saturate(float v) { return clamp(v, 0.0, 1.0); }
vec3 saturate(vec3 v) { return clamp(v, vec3(0.0), vec3(1.0)); }

void main() {
    int liquidCategory = int(u_waterParams.x);
    vec4 tex = texture2D(u_texture, v_texCoord);
    vec4 finalColor;
    // Slime or Lava
    if (liquidCategory == 2 || liquidCategory == 3) {
        finalColor = vec4(saturate(tex.xyz), 1.0);
    } else {
        vec4 liquidColor, diffuseColor, specularColor;
        float depth = saturate(v_depth / 50.0);
        // Ocean
        if (liquidCategory == 1) {
            vec4 shallowColor = vec4(u_oceanCloseColor.rgb, u_waterAlphas.b);
            vec4 deepColor = vec4(u_oceanFarColor.rgb, u_waterAlphas.a);
            liquidColor = mix(shallowColor, deepColor, depth);
        } else {
            vec4 shallowColor = vec4(u_riverCloseColor.rgb, u_waterAlphas.r);
            vec4 deepColor = vec4(u_riverFarColor.rgb, u_waterAlphas.g);
            liquidColor = mix(shallowColor, deepColor, depth);
        }
        diffuseColor = vec4(liquidColor.rgb + tex.rgb, liquidColor.a);
        specularColor = vec4(vec3(0.25) * tex.a, 0.0);
        finalColor = diffuseColor + specularColor;
    }

    gl_FragColor = finalColor;
}