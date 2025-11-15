precision mediump float;
                
varying vec2 v_texCoord;

uniform vec4 u_transform;
uniform sampler2D u_texture;

void main() {
    gl_FragColor = texture2D( u_texture, v_texCoord * u_transform.zw + u_transform.xy);
}