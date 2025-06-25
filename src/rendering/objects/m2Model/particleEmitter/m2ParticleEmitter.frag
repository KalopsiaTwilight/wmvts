precision mediump float;

varying vec4 v_color;
varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;
varying float v_alphaCutoff;

uniform int u_pixelShader;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform float u_alphaTreshold;
uniform float u_alphaMult;
uniform float u_colorMult;

void main(void) {
    vec4 tex = vec4(1, 1, 1, 1);
    vec4 tex2 = vec4(1, 1, 1, 1);
    vec4 tex3 = vec4(1, 1, 1, 1);

    // gl_FragColor = color;
    tex = texture2D(u_texture1, v_texCoord1).rgba;
    tex2 = texture2D(u_texture2, v_texCoord2).rgba;
    tex3 = texture2D(u_texture3, v_texCoord3).rgba;

    vec3 matDiffuse = (tex * v_color).rgb; 
    float opacity = tex.a * v_color.a;

    if (u_pixelShader == 0) {
        matDiffuse = v_color.xyz * tex.rgb;
        opacity = tex.a*v_color.a;    
    } else if (u_pixelShader == 1) {
        vec4 textureMod = tex*tex2;
        float texAlpha = (textureMod.w * tex3.w);
        opacity = texAlpha*v_color.a;
        matDiffuse = v_color.xyz * textureMod.rgb;
    } else if (u_pixelShader == 2) {
        vec4 textureMod = tex*tex2*tex3;
        float texAlpha = textureMod.w;
        matDiffuse = v_color.xyz * textureMod.rgb;
        opacity = texAlpha*v_color.a;
    } else if (u_pixelShader == 3) {
        vec4 textureMod = tex*tex2*tex3;
        float texAlpha = textureMod.w;
        matDiffuse = v_color.xyz;
        opacity = texAlpha*v_color.a;
    } else if (u_pixelShader == 4) {
        discard; 
    }
    
    matDiffuse = matDiffuse.rgb * u_colorMult;
    opacity = opacity * u_alphaMult;

    if (opacity < u_alphaTreshold) {
        discard;
    }
    if (opacity < v_alphaCutoff) {
        discard;
    }
    
    gl_FragColor = vec4(matDiffuse.rgb, opacity);
}