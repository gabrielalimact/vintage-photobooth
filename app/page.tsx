"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { applyVintageFilters } from "@/lib/webgl-filters";

export default function Photobooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [openCamera, setOpenCamera] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

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
    const glCanvas = glCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !glCanvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const filteredCanvas = applyVintageFilters(canvas, glCanvas);

    const photoData = filteredCanvas.toDataURL("image/png");
    setPhotos((prev) => {
      const newPhotos = [...prev, photoData];
      
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

    const originalWidth = imgElements[0].width;
    const width = originalWidth + 80; 
    const height = imgElements[0].height * 3;
    const bottomSpace = 120;
    const topSpace = 40;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height + bottomSpace + topSpace;

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

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
