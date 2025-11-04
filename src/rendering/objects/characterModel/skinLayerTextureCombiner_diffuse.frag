precision mediump float;

varying vec2 v_texCoord;

uniform sampler2D u_diffuseTexture;
uniform sampler2D u_backgroundTexture;
uniform int u_blendMode;
uniform vec2 u_backgroundResolution;

vec3 overlay(vec3 baseColor, vec3 blendColor) {
    vec3 outputColor = vec3(1.0);
    for(int i = 0; i < 3; i++) {
        if (baseColor[i] < 0.5) {
            outputColor[i] = 2.0 * baseColor[i] * blendColor[i];
        } else {
            outputColor[i] = 1.0 - (2.0 * (1.0 - baseColor[i]) * (1.0 - blendColor[i]));
        }
    }
    return outputColor;
}

const float MIN_ALPHA_FOR_BLEND = 0.001;

void main() {
    vec4 diffuse = texture2D(u_diffuseTexture, v_texCoord);
    vec4 backGround = texture2D(u_backgroundTexture, gl_FragCoord.xy / u_backgroundResolution);

    // Default: Sample texture
    vec3 materialColor = diffuse.rgb;
    float opacity = diffuse.a;
    
    // Multiply
    if(u_blendMode == 4) {
        if(diffuse.a < MIN_ALPHA_FOR_BLEND) 
            discard;
            
        materialColor = backGround.rgb * diffuse.rgb;
        opacity = 1.0;
    }
    // Overlay
    else if(u_blendMode == 6) {
        if(diffuse.a < MIN_ALPHA_FOR_BLEND) 
            discard;

        materialColor = mix(backGround.rgb, overlay(diffuse.rgb, backGround.rgb), diffuse.a);
        opacity = backGround.a;
    } 
    // Screen
    else if (u_blendMode == 7) {
        if(diffuse.a < MIN_ALPHA_FOR_BLEND) 
            discard;

        materialColor = vec3(1) - ((vec3(1)-diffuse.rgb) * (vec3(1)-backGround.rgb));
        opacity = 1.0;
    } 
    // None, InferAlphaBlend, Unknown
    else if(u_blendMode == 0 || u_blendMode == 9 || u_blendMode == 15 || u_blendMode == 16) {
        if(diffuse.a < MIN_ALPHA_FOR_BLEND) 
            discard;

        materialColor = mix(backGround.rgb, diffuse.rgb, diffuse.a);
        opacity = 1.0;
    }

    gl_FragColor = vec4(materialColor, opacity);
}