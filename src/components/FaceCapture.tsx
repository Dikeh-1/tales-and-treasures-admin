import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { ScanFace } from 'lucide-react';

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

      } catch (err) {
        if (isMounted) {
          console.error('Face Capture Init Error:', err);
          setError('Failed to initialize webcam or models. Please ensure camera permissions are granted.');
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
    setStatusText('Position your face in the center...');

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
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
      <Box 
        sx={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '4/3', 
          bgcolor: '#000', 
          borderRadius: 4, 
          overflow: 'hidden',
          mb: 2,
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.2)',
          border: '2px solid rgba(0, 212, 255, 0.4)'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlay={handleVideoPlay}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {initializing && !error && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.7)', flexDirection: 'column', gap: 2 }}>
            <CircularProgress sx={{ color: '#00d4ff' }} />
            <Typography variant="body2" color="white">{statusText}</Typography>
          </Box>
        )}

        {!initializing && !error && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60%', height: '60%', border: '2px dashed rgba(0, 212, 255, 0.6)', borderRadius: '50%', animation: 'pulseGlow 2s infinite alternate' }} />
        )}
      </Box>

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      ) : (
        <Typography sx={{ color: '#00d4ff', mb: 3, fontWeight: 600 }}>
          <ScanFace size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          {statusText}
        </Typography>
      )}

      <Button onClick={() => { stopCamera(); onCancel(); }} variant="outlined" fullWidth sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
        Cancel
      </Button>
    </Box>
  );
}
