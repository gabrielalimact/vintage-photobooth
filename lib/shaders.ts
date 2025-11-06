export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform float u_time;
  varying vec2 v_texCoord;
  
  // Função de ruído pseudo-aleatório
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    // Converter para grayscale puro (preto e branco)
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Aplicar contrast e brightness
    gray = (gray - 0.5) * 1.25 + 0.5; // contrast 1.25
    gray = gray * 1.1; // brightness 1.1
    
    // Manter apenas tons de cinza (sem sépia)
    vec3 bw = vec3(gray);
    
    // Adicionar ruído vintage
    float noise = (random(v_texCoord + u_time) - 0.5) * 0.12;
    bw += noise;
    
    gl_FragColor = vec4(bw, color.a * 0.95);
  }
`;
