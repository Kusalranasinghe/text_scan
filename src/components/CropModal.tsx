import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Crop as CropIcon } from 'lucide-react';
import { cropImage } from '../utils/imagePreprocessing';

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Normalized crop rectangle in percentage (0 to 100)
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStartPos.current.mouseX) / bounds.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.current.mouseY) / bounds.height) * 100;

    const start = dragStartPos.current;

    if (dragHandle === 'move') {
      const newX = Math.max(0, Math.min(100 - start.cropW, start.cropX + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - start.cropH, start.cropY + deltaYPercent));
      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (dragHandle === 'se') {
      // Bottom-right handle
      const newW = Math.max(15, Math.min(100 - start.cropX, start.cropW + deltaXPercent));
      const newH = Math.max(15, Math.min(100 - start.cropY, start.cropH + deltaYPercent));
      setCrop((prev) => ({ ...prev, width: newW, height: newH }));
    } else if (dragHandle === 'nw') {
      // Top-left handle
      const newX = Math.max(0, Math.min(start.cropX + start.cropW - 15, start.cropX + deltaXPercent));
      const newY = Math.max(0, Math.min(start.cropY + start.cropH - 15, start.cropY + deltaYPercent));
      const newW = start.cropW - (newX - start.cropX);
      const newH = start.cropH - (newY - start.cropY);
      setCrop({ x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  const applyCrop = async () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const actualArea = {
      x: (crop.x / 100) * naturalW,
      y: (crop.y / 100) * naturalH,
      width: (crop.width / 100) * naturalW,
      height: (crop.height / 100) * naturalH,
    };

    try {
      const croppedResult = await cropImage(imageSrc, actualArea);
      onCropComplete(croppedResult);
      onClose();
    } catch (e) {
      console.error('Failed to crop image', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Crop Handwriting Area</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image & Interactive Crop Overlay */}
        <div className="relative p-4 flex items-center justify-center bg-slate-950 overflow-hidden min-h-[300px]">
          <div ref={containerRef} className="relative inline-block max-h-[60vh] max-w-full">
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              className="max-h-[60vh] max-w-full object-contain block pointer-events-none"
            />

            {/* Dark overlay backdrop outside crop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
            />

            {/* Crop Selector Box */}
            <div
              className="absolute border-2 border-blue-400 shadow-md cursor-move touch-none"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
              onPointerDown={(e) => handlePointerDown('move', e)}
            >
              {/* Corner handle Top-Left */}
              <div
                className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow touch-none"
                onPointerDown={(e) => handlePointerDown('nw', e)}
              />

              {/* Corner handle Bottom-Right */}
              <div
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow touch-none"
                onPointerDown={(e) => handlePointerDown('se', e)}
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
                  Drag to crop
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-800">
          <button
            onClick={() => setCrop({ x: 0, y: 0, width: 100, height: 100 })}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Select Full Image
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyCrop}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
