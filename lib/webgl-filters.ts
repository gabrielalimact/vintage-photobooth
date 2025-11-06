import { vertexShaderSource, fragmentShaderSource } from './shaders';

/**
 * Cria um shader WebGL
 */
export function createShader(
  gl: WebGLRenderingContext, 
  type: number, 
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Erro ao compilar shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

/**
 * Cria um programa WebGL com vertex e fragment shaders
 */
export function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  if (!vertexShader || !fragmentShader) return null;
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erro ao linkar programa:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

/**
 * Aplica filtros vintage preto e branco usando WebGL
 * Com fallback para Canvas 2D em caso de erro
 */
export function applyVintageFilters(
  sourceCanvas: HTMLCanvasElement,
  glCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  glCanvas.width = sourceCanvas.width;
  glCanvas.height = sourceCanvas.height;
  
  const gl = glCanvas.getContext('webgl');
  if (!gl) return applyCanvas2DFallback(sourceCanvas);
  
  const program = createProgram(gl);
  if (!program) return applyCanvas2DFallback(sourceCanvas);
  
  // Setup dos vértices (posição + coordenadas de textura)
  const positions = new Float32Array([
    -1, -1,  0, 1,  // bottom-left
     1, -1,  1, 1,  // bottom-right
    -1,  1,  0, 0,  // top-left
     1,  1,  1, 0,  // top-right
  ]);
  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
  
  // Criar e configurar textura
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  gl.useProgram(program);
  
  const textureLocation = gl.getUniformLocation(program, 'u_texture');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  
  gl.uniform1i(textureLocation, 0);
  gl.uniform1f(timeLocation, Math.random()); // Seed para ruído
  
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  return glCanvas;
}

/**
 * Fallback para Canvas 2D quando WebGL não está disponível
 */
function applyCanvas2DFallback(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Converter para grayscale puro
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.25 + 128 * 1.1));
    
    // preto & branco
    data[i] = enhanced;     // R
    data[i + 1] = enhanced; // G  
    data[i + 2] = enhanced; // B
    
    
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
