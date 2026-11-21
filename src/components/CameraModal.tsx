import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, Zap, AlertCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchEnabled(false);
    setHasTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setIsStarting(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this device/browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err: unknown) {
      console.error('Camera initialization error:', err);
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(e.message || 'Unable to access camera.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchEnabled;
      // applyConstraints torch
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchEnabled(nextState);
    } catch (err) {
      console.warn('Could not toggle torch:', err);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing camera for natural mirror photo
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopStream();
    onCapture(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 text-white border-b border-slate-800 z-10">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Capture Handwriting</span>
          </div>

          <div className="flex items-center gap-1">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-full transition-colors ${
                  torchEnabled ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Toggle Flash"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={toggleCameraFacing}
              className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Switch Front/Rear Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors ml-1"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="relative flex-1 bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-slate-200 max-w-xs">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Camera Access Issue</p>
              <p className="text-xs text-slate-400 mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder guideline frame */}
              <div className="absolute inset-8 pointer-events-none border-2 border-white/40 border-dashed rounded-xl">
                <div className="absolute top-2 left-2 text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded">
                  Align handwriting within frame
                </div>
              </div>

              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Starting camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Capture button bar */}
        <div className="p-4 bg-slate-900/95 flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={!!error || isStarting}
            className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-slate-100 transition-colors shadow-md" />
          </button>
        </div>
      </div>
    </div>
  );
};
