precision mediump float;
            
uniform float u_drawX;
uniform float u_drawY;
uniform float u_drawWidth;
uniform float u_drawHeight;

attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    
    vec2 pos = vec2(
        (u_drawX + a_texCoord.x * u_drawWidth)* 2.0 - 1.0,
        (u_drawY + a_texCoord.y * u_drawHeight)* 2.0 - 1.0
    );
    
    gl_Position = vec4(pos.x, pos.y, 0, 1);
}