precision mediump float;
            
uniform float u_drawX;
uniform float u_drawY;
uniform float u_drawWidth;
uniform float u_drawHeight;
uniform bool u_isUpscaled;
uniform vec2 u_textureResolution;

attribute vec2 a_texCoord;
varying vec2 v_texCoord;

const float FUDGE_FACTOR = 0.3;

void main() {
    vec2 final_texCoord = a_texCoord.xy;
    // Fudge texture coords slightly to remove upscaling artifacts
    if (u_isUpscaled) {
        final_texCoord.x = max(
            min(final_texCoord.x, (u_textureResolution.x - FUDGE_FACTOR) / u_textureResolution.x),
            FUDGE_FACTOR / u_textureResolution.x);
        final_texCoord.y = max(
            min(final_texCoord.y, (u_textureResolution.y - FUDGE_FACTOR) / u_textureResolution.y),
            FUDGE_FACTOR / u_textureResolution.y
        );
    }

    v_texCoord = final_texCoord;
    
    vec2 pos = vec2(
        (u_drawX + a_texCoord.x * u_drawWidth)* 2.0 - 1.0,
        (u_drawY + a_texCoord.y * u_drawHeight)* 2.0 - 1.0
    );
    
    gl_Position = vec4(pos.x, pos.y, 0, 1);
}