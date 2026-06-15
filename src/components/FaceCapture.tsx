import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { ScanFace, AlertCircle, Camera, Loader2 } from 'lucide-react';

interface FaceCaptureProps {
  onCapture: (descriptor: string) => void;
  onCancel: () => void;
}

export default function FaceCapture({ onCapture, onCancel }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Loading AI Models...');
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModelsAndStart = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (!isMounted) return;
        setStatusText('Starting Camera...');

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
          });
          
          if (!isMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (camErr: any) {
          if (!isMounted) return;
          console.error('Camera Init Error:', camErr);
          if (camErr.name === 'NotAllowedError' || camErr.message?.includes('Permission')) {
            setError('Camera access denied. Please allow camera permissions in your browser.');
          } else if (camErr.name === 'NotFoundError' || camErr.message?.includes('Requested device not found')) {
            setError('No webcam detected. Please connect a camera to continue.');
          } else {
            setError('Could not access the camera. Ensure no other application is using it.');
          }
          setInitializing(false);
        }

      } catch (err) {
        if (isMounted) {
          console.error('Face Capture Init Error:', err);
          setError('Failed to load face recognition AI models.');
          setInitializing(false);
        }
      }
    };

    void loadModelsAndStart();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVideoPlay = () => {
    setInitializing(false);
    setStatusText('Position your face in the center');

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      
      if (detection && detection.detection.score > 0.8) {
        setStatusText('Face Recognized! Finalizing...');
        stopCamera();
        
        // Convert Float32Array to standard array for JSON serialization
        const descriptorArray = Array.from(detection.descriptor);
        onCapture(JSON.stringify(descriptorArray));
      }
    }, 500);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center mt-4">
      <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden mb-6 shadow-2xl border border-zinc-800 ring-1 ring-white/5">
        
        {/* Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlay={handleVideoPlay}
          className={`w-full h-full object-cover transition-opacity duration-500 ${initializing || error ? 'opacity-0' : 'opacity-100'}`}
        />
        
        {/* Overlay Scanner Animation (Only when active) */}
        {!initializing && !error && (
          <>
            {/* Target Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary-main/30 rounded-full relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-[#00d4ff] rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-1 bg-[#00d4ff] rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-4 bg-[#00d4ff] rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1 h-4 bg-[#00d4ff] rounded-full" />
              </div>
            </div>
            {/* Scanning Laser Line */}
            <div className="absolute inset-x-0 h-[2px] bg-[#00d4ff]/60 shadow-[0_0_15px_rgba(0,212,255,0.8)] animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />
          </>
        )}

        {/* Loading State */}
        {initializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm z-10">
            <Loader2 className="size-8 text-[#00d4ff] animate-spin mb-4" />
            <p className="text-sm font-medium text-zinc-300 animate-pulse">{statusText}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-6 text-center z-10">
            <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Camera className="size-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-400 mb-2">{error}</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {!error ? (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00d4ff]/10 rounded-full border border-[#00d4ff]/20 mb-6">
          <ScanFace className="size-4 text-[#00d4ff]" />
          <span className="text-sm font-medium text-[#00d4ff]">{statusText}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20 mb-6">
          <AlertCircle className="size-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">Capture Failed</span>
        </div>
      )}

      {/* Cancel Button */}
      <button 
        onClick={() => { stopCamera(); onCancel(); }} 
        className="h-11 px-8 rounded-xl bg-zinc-900 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white transition-colors border border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none w-full max-w-[200px]"
      >
        Cancel
      </button>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
