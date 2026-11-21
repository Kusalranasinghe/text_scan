import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, FileImage, ScanLine } from 'lucide-react';
import { normalizeImageSize } from '../utils/imagePreprocessing';

interface ImageInputSectionProps {
  onImageSelected: (imageDataUrl: string, fileName?: string) => void;
  onOpenCropCamera: () => void;
}

export const ImageInputSection: React.FC<ImageInputSectionProps> = ({
  onImageSelected,
  onOpenCropCamera,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setFileError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please choose a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFileError('The image must be smaller than 20 MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        if (rawDataUrl) {
          try {
            const normalized = await normalizeImageSize(rawDataUrl);
            onImageSelected(normalized, file.name);
          } catch (error) {
            console.error('Image processing error:', error);
            setFileError('Could not prepare this image. Please try another photo.');
          }
        }
      };
      reader.onerror = () => setFileError('Could not read this image. Please try again.');
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File reading error:', error);
      setFileError('Could not read this image. Please try again.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  return (
    <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-slate-900/[0.06]">
      <div className="border-b border-slate-100 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-800 text-[9px] text-white">1</span>
          Scan application
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          Start with your completed form
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          Use a clear photo of the full application page. You can check and correct the details before saving.
        </p>
      </div>

      <div className="p-5 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:px-8 sm:py-10 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 bg-slate-50/70 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900">
            <ScanLine className="h-7 w-7" strokeWidth={1.7} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">
            Add your application photo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Take a photo now or choose an image from this device.
          </p>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenCropCamera}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              <Camera className="h-4 w-4" />
              Take a photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              <FileImage className="h-4 w-4 text-emerald-800" />
              Upload a photo
            </button>
          </div>

          <p className="mt-5 text-[11px] text-slate-400">
            JPG, PNG or WEBP · Up to 20 MB · You can also drag and drop here
          </p>
        </div>

        {fileError && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
          Keep the page flat, bright, and fully inside the photo.
        </p>
      </div>
    </section>
  );
};
