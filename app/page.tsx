"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { gsap } from "gsap";

// Shader para filtros vintage
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
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

export default function Photobooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [openCamera, setOpenCamera] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Função para criar shader
  function createShader(gl: WebGLRenderingContext, type: number, source: string) {
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

  // Função para criar programa WebGL
  function createProgram(gl: WebGLRenderingContext) {
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

  // Função para aplicar filtros WebGL
  function applyWebGLFilters(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return sourceCanvas;
    
    glCanvas.width = sourceCanvas.width;
    glCanvas.height = sourceCanvas.height;
    
    const gl = glCanvas.getContext('webgl');
    if (!gl) return sourceCanvas; // Fallback para canvas normal
    
    const program = createProgram(gl);
    if (!program) return sourceCanvas;
    
    // Setup dos vértices
    const positions = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Setup dos atributos
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
    
    // Criar textura da imagem
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    // Usar programa
    gl.useProgram(program);
    
    // Setup uniforms
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    
    gl.uniform1i(textureLocation, 0);
    gl.uniform1f(timeLocation, Math.random());
    
    // Render
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    return glCanvas;
  }

  // Animação inicial do título
  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, 
        { 
          opacity: 0, 
          y: -50,
          scale: 0.8
        },
        { 
          opacity: 1, 
          y: 0,
          scale: 1,
          duration: 1,
          ease: "bounce.out"
        }
      );
    }
  }, []);

  // Animação para novas fotos
  useEffect(() => {
    if (photos.length > 0) {
      const lastPhotoIndex = photos.length - 1;
      const lastPhoto = document.querySelector(`[data-photo-index="${lastPhotoIndex}"]`);
      
      if (lastPhoto) {
        gsap.fromTo(lastPhoto,
          {
            scale: 0,
            rotation: -180,
            opacity: 0,
            x: 100
          },
          {
            scale: 1,
            rotation: 1,
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: "back.out(1.7)"
          }
        );
      }
    }
  }, [photos.length]);

  async function startCamera() {
    setOpenCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }

  function capturePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capturar imagem original (sem filtros)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Aplicar filtros WebGL
    const filteredCanvas = applyWebGLFilters(canvas);
    
    // Se WebGL falhar, aplicar filtros básicos via Canvas 2D
    if (filteredCanvas === canvas) {
      // Fallback para Safari e outros browsers sem WebGL
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Converter para grayscale puro
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // Aplicar contrast e brightness
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.25 + 128 * 1.1));
        
        // Aplicar tons de cinza puros (sem sépia)
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G  
        data[i + 2] = enhanced; // B
        
        // Adicionar ruído sutil
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
    }

    const photoData = (filteredCanvas === canvas ? canvas : filteredCanvas).toDataURL("image/png");
    setPhotos((prev) => {
      const newPhotos = [...prev, photoData];
      
      // Animação de flash da câmera
      if (videoRef.current) {
        gsap.to(videoRef.current, {
          opacity: 0.3,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        });
      }
      
      return newPhotos;
    });
  }

  async function createStrip() {
    if (photos.length < 3) return;

    const imgElements = await Promise.all(
      photos.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new globalThis.Image();
            img.src = src;
            img.onload = () => resolve(img);
          })
      )
    );

    // dimensões da tira final
    const originalWidth = imgElements[0].width;
    const width = originalWidth + 80; // aumenta 40px no width
    const height = imgElements[0].height * 3;
    const bottomSpace = 120; // borda inferior maior
    const topSpace = 40;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height + bottomSpace + topSpace;

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // centraliza as imagens na tira (20px de cada lado)
    const offsetX = 40;
    const offsetY = topSpace;
    imgElements.forEach((img, i) => {
      ctx.drawImage(img, offsetX, offsetY + i * img.height, originalWidth, img.height);
    });

    ctx.fillStyle = "black";
    ctx.font = "bold 32px Bungee";
    ctx.textAlign = "center";
    ctx.fillText(new Date().toLocaleDateString(), width / 2, topSpace + height + 60);

    const stripData = outputCanvas.toDataURL("image/png");
    setFinalStrip(stripData);
    setShowModal(true);
    
    // Animação de entrada do modal
    setTimeout(() => {
      gsap.fromTo(".modal-content", 
        { 
          opacity: 0, 
          scale: 0.5,
          rotation: -5
        },
        { 
          opacity: 1, 
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: "back.out(1.7)"
        }
      );
    }, 50);
  }

  function downloadStrip() {
    if (!finalStrip) return;
    const a = document.createElement("a");
    a.href = finalStrip;
    a.download = "cabine.png";
    a.click();
    setShowModal(false);
  }

  function closeModal() {
    setShowModal(false);
    setFinalStrip(null);
    setPhotos([]);
  }

  function removePhoto(index: number) {
    const photoElement = document.querySelector(`[data-photo-index="${index}"]`);
    
    if (photoElement) {
      gsap.to(photoElement, {
        scale: 0,
        rotation: 180,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          setPhotos(prev => prev.filter((_, i) => i !== index));
        }
      });
    } else {
      setPhotos(prev => prev.filter((_, i) => i !== index));
    }
  }

 return (
  <div className="min-h-screen text-white flex flex-col items-center p-6 relative overflow-hidden" style={{backgroundColor: '#0a0a0a'}}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div 
        className="w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{background: 'radial-gradient(circle, #ffd9d9 0%, #bd7880 50%, transparent 100%)'}}
      ></div>
    </div>
    
    <div className="relative flex flex-col items-center justify-center w-full h-[95vh]  max-h-[100vh] z-10">
      <Image
        src="/logo.svg"
        alt="Photobooth"
        width={520}
        height={176}
      />
    <div className="flex gap-8">
      <div className="flex flex-col items-center">
        {openCamera && <video
          ref={videoRef}
          className="w-150 rounded-2xl shadow-2xl transform -scale-x-100"
          style={{border: '3px solid #bd7880'}}
          autoPlay
          muted
        />} 

        <div className="flex gap-3 mt-6">
          {openCamera ? (
            <button
            onClick={capturePhoto}
            disabled={photos.length >= 3}
            className="px-6 py-3 rounded-full cursor-pointer font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none "
            style={{backgroundColor: photos.length >= 3 ? '#4d0011' : '#bd7880', color: 'white'}}
          >
            📸 take the picture ({photos.length}/3)
          </button>
          ) : (
            <button
              onClick={startCamera}
              className="px-6 py-3 cursor-pointer rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{backgroundColor: '#102b1f', color: 'white'}}
            >
              🎥 open the camera
            </button>
          )}

          
        </div>

        {photos.length === 3 && (
          <button
            onClick={createStrip}
            className="mt-4 px-6 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            style={{backgroundColor: '#4d0011', color: 'white'}}
          >
            ✨ create the cabine strip
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {photos.map((p, i) => (
          <div key={`${i}-${photos.length}`} data-photo-index={i} className="relative rounded-2xl shadow-2xl transform rotate-1 hover:rotate-0 transition-all duration-300" style={{backgroundColor: '#ffd9d9', padding: '8px'}}>
            <Image
              src={p}
              width={250}
              height={100}
              alt={`Prévia ${i + 1}`}
              className="object-cover rounded-xl shadow-lg"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg" style={{backgroundColor: '#bd7880'}}>
              {i + 1}
            </div>
            <button
              onClick={() => removePhoto(i)}
              className="absolute cursor-pointer -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg hover:scale-110 transition-all duration-200"
              style={{backgroundColor: '#4d0011'}}
              title="Remove photo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>

    <canvas ref={canvasRef} className="hidden" />
    <canvas ref={glCanvasRef} className="hidden" />

    {showModal && finalStrip && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 backdrop-blur-md"
          style={{backgroundColor: 'rgba(10, 10, 10, 0.8)'}}
          onClick={closeModal}
        ></div>
        
        <div className="modal-content relative z-10 max-w-sm w-full h-[90vh] overflow-auto">
            <div className="flex justify-center mb-6">
              <Image
                src={finalStrip}
                width={250}
                height={600}
                alt="Cabine final"
                className="rounded-xl shadow-lg"
              />
            </div>
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={downloadStrip}
                className="px-6 py-3 cursor-pointer rounded-full font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{backgroundColor: '#102b1f', color: 'white'}}
              >
                💾 download
              </button>
              
              <button
                onClick={closeModal}
                className="px-6 py-3 cursor-pointer rounded-full font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{backgroundColor: '#bd7880', color: 'white'}}
              >
                ✨ close
              </button>
            </div>
        </div>
      </div>
    )}
    </div>
  </div>
);

}
