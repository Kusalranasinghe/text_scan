import React, { useState } from 'react';
import { Crop, RefreshCw, RotateCw, Sparkles, Upload, X } from 'lucide-react';
import type { PreprocessingOptions } from '../types/ocr';
import { preprocessImage } from '../utils/imagePreprocessing';

interface ImagePreviewProps {
  originalImage: string;
  currentImage: string;
  fileName?: string;
  onUpdateImage: (newImageDataUrl: string) => void;
  onRemoveImage: () => void;
  onOpenCrop: () => void;
  onReplaceImage: () => void;
}

const initialOptions: PreprocessingOptions = {
  autoEnhance: false,
  grayscale: false,
  contrast: 0,
  brightness: 0,
  preserveDiacritics: true,
  rotation: 0,
};

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalImage,
  currentImage,
  fileName,
  onUpdateImage,
  onRemoveImage,
  onOpenCrop,
  onReplaceImage,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<PreprocessingOptions>(initialOptions);

  const updateImage = async (nextOptions: PreprocessingOptions) => {
    setIsProcessing(true);
    try {
      const processed = await preprocessImage(originalImage, nextOptions);
      setOptions(nextOptions);
      onUpdateImage(processed);
    } catch (error) {
      console.error('Image adjustment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = () => {
    void updateImage({ ...options, rotation: (options.rotation + 90) % 360 });
  };

  const handleEnhance = () => {
    const shouldEnhance = !options.autoEnhance;
    void updateImage({
      ...options,
      autoEnhance: shouldEnhance,
      grayscale: shouldEnhance,
    });
  };

  const handleReset = () => {
    setOptions(initialOptions);
    onUpdateImage(originalImage);
  };

  const hasAdjustments = options.rotation !== 0 || options.autoEnhance || options.grayscale ||
    options.contrast !== 0 || options.brightness !== 0;

  return (
    <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-slate-900/[0.06]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">Application photo</div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
            {fileName || 'Ready to scan'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onReplaceImage}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Upload className="h-3.5 w-3.5" />
            Replace
          </button>
          <button
            type="button"
            onClick={onRemoveImage}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-56 items-center justify-center bg-slate-100/80 p-3 sm:min-h-72 sm:p-6">
        <img
          src={currentImage}
          alt="Application form preview"
          className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-md"
        />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-slate-700 backdrop-blur-[2px]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-emerald-800" />
            Preparing photo…
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 sm:gap-3">
        <button
          type="button"
          onClick={onOpenCrop}
          disabled={isProcessing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
        >
          <Crop className="h-4 w-4 text-emerald-800" />
          Crop
        </button>
        <button
          type="button"
          onClick={handleRotate}
          disabled={isProcessing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
        >
          <RotateCw className="h-4 w-4 text-emerald-800" />
          Rotate
        </button>
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isProcessing}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition disabled:opacity-50 ${
            options.autoEnhance
              ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
          }`}
        >
          <Sparkles className="h-4 w-4 text-emerald-800" />
          {options.autoEnhance ? 'Enhanced' : 'Enhance'}
        </button>
        {hasAdjustments && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className="h-10 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </section>
  );
};
