precision mediump float;

varying vec2 v_texCoord;

uniform sampler2D u_diffuseTexture;
uniform sampler2D u_backgroundTexture;
uniform int u_blendMode;
uniform vec2 u_backgroundResolution;

vec3 overlay(vec3 a, vec3 b) {
    vec3 outputColor = vec3(1.0);
    for(int i = 0; i < 3; i++) {
        if (a[i] < 0.5) {
            outputColor[i] = 2.0 * a[i] * b[i];
        } else {
            outputColor[i] = 1.0 - (2.0 * (1.0 - a[i]) * (1.0 - b[i]));
        }
    }
    return outputColor;
}

vec3 screen(vec3 a, vec3 b) {
    vec3 outputColor = vec3(1.0);
    for(int i = 0; i < 3; i++) {
        outputColor[i] = 1.0 - (1.0 - a[i]) * (1.0 - a[i]);
    }
    return outputColor;
}

void main() {
    vec4 diffuse = texture2D(u_diffuseTexture, v_texCoord);
    vec4 backGround = texture2D(u_backgroundTexture, gl_FragCoord.xy / u_backgroundResolution);
    
    // Default: Overlay diffuse on background   
    vec3 materialColor = diffuse.rgb;
    float opacity = 1.0;
    // Blit
    if (u_blendMode == 1) {
        opacity = diffuse.a;
    }
    // Multiply
    else if (u_blendMode == 4) {
        vec3 blendColor = backGround.rgb * diffuse.rgb;
        materialColor = mix(backGround.rgb, blendColor.rgb, diffuse.a);
    }
    // Overlay
    else if(u_blendMode == 6) {
        vec3 blendColor = overlay(diffuse.rgb, backGround.rgb);
        materialColor = mix(backGround.rgb, blendColor.rgb, diffuse.a);
    } 
    // Screen
    else if (u_blendMode == 7) {
        vec3 blendColor = screen(diffuse.rgb, backGround.rgb);
        materialColor = mix(backGround.rgb, blendColor.rgb, diffuse.a);
    }
    // Default: Blend layers 
    else {
        materialColor = mix(backGround.rgb, diffuse.rgb, diffuse.a);
    }
    gl_FragColor = vec4(materialColor, opacity);
}