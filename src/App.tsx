import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ImageInputSection } from './components/ImageInputSection';
import { ImagePreview } from './components/ImagePreview';
import { ApplicationFormReview } from './components/ApplicationFormReview';
import { CameraModal } from './components/CameraModal';
import { CropModal } from './components/CropModal';
import { SettingsModal } from './components/SettingsModal';
import { AlertTriangle, CheckCircle2, FlaskConical, RotateCcw } from 'lucide-react';
import type { ApplicationFieldKey, ApplicationFormData } from './types/applicationForm';
import type { OcrEngineConfig } from './types/ocr';
import { getDefaultConfig, runApplicationRecognition } from './services/ocr/ocrManager';
import { normalizeImageSize } from './utils/imagePreprocessing';
import { submitApplicationToGoogleSheets } from './services/googleSheets';

export const App: React.FC = () => {
  const [config, setConfig] = useState<OcrEngineConfig>(getDefaultConfig);
  const [showSplash, setShowSplash] = useState(true);

  // Image state: original uploaded image and current (preprocessed) image
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>();

  // Recognition state
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [applicationData, setApplicationData] = useState<ApplicationFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaveSuccessOpen, setIsSaveSuccessOpen] = useState(false);
  const recognitionRequestId = useRef(0);

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowSplash(false);
      return;
    }

    const timer = window.setTimeout(() => setShowSplash(false), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  const recognizeSelectedImage = async (imageDataUrl: string) => {
    const requestId = ++recognitionRequestId.current;
    if (!config.geminiApiKey?.trim()) {
      setIsSettingsOpen(true);
      setError('Please provide a Google Gemini API Key to recognize the image.');
      setIsLoading(false);
      setProgressStatus('');
      return;
    }

    setIsLoading(true);
    setProgressStatus('Extracting application form fields with Gemini AI...');
    setError(null);

    try {
      const formData = await runApplicationRecognition(
        imageDataUrl,
        config,
        (_progress, status) => setProgressStatus(status)
      );
      if (requestId === recognitionRequestId.current) setApplicationData(formData);
    } catch (err: unknown) {
      console.error('Recognition error:', err);
      const e = err as Error;
      if (requestId === recognitionRequestId.current) {
        setError(e.message || 'An unexpected error occurred during recognition.');
      }
    } finally {
      if (requestId === recognitionRequestId.current) {
        setIsLoading(false);
        setProgressStatus('');
      }
    }
  };

  const handleImageSelected = (imageDataUrl: string, name?: string) => {
    setOriginalImage(imageDataUrl);
    setCurrentImage(imageDataUrl);
    setFileName(name);
    setApplicationData(null);
    setError(null);
    setSubmitError(null);
    void recognizeSelectedImage(imageDataUrl);
  };

  const handleRemoveImage = () => {
    recognitionRequestId.current += 1;
    setIsLoading(false);
    setProgressStatus('');
    setOriginalImage(null);
    setCurrentImage(null);
    setFileName(undefined);
    setApplicationData(null);
    setError(null);
    setSubmitError(null);
  };

  const handleRecognize = async () => {
    if (!currentImage) return;
    setApplicationData(null);
    void recognizeSelectedImage(currentImage);
  };

  const handleFieldChange = (field: ApplicationFieldKey, value: string) => {
    setApplicationData((current) => current ? { ...current, [field]: value } : current);
    setSubmitError(null);
  };

  const handleSubmitToSheets = async () => {
    if (!applicationData) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitApplicationToGoogleSheets(
        config.googleAppsScriptUrl,
        config.googleAppsScriptToken,
        applicationData
      );
      setIsSaveSuccessOpen(true);
    } catch (err: unknown) {
      console.error('Google Sheets submission failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save the application to Google Sheets.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f7f5] text-slate-900 selection:bg-emerald-100 selection:text-emerald-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-100/80 via-emerald-50/50 to-transparent" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 sm:px-6">
        <div className="w-full flex-1 space-y-5 pb-6">
        {/* Header */}
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Image Selection or Preview */}
        {!currentImage ? (
          <ImageInputSection
            onImageSelected={handleImageSelected}
            onOpenCropCamera={() => setIsCameraOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            <ImagePreview
              originalImage={originalImage!}
              currentImage={currentImage}
              fileName={fileName}
              onUpdateImage={(newImg) => setCurrentImage(newImg)}
              onRemoveImage={handleRemoveImage}
              onOpenCrop={() => setIsCropOpen(true)}
              onReplaceImage={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/png,image/webp,image/jpg';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      if (ev.target?.result) {
                        const normalized = await normalizeImageSize(ev.target.result as string);
                        handleImageSelected(normalized, file.name);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            />

            {isLoading && (
              <div className="mx-auto w-full max-w-4xl rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-center shadow-sm">
                <p className="text-sm font-semibold text-emerald-900">Reading your application…</p>
                {progressStatus && (
                  <p className="mt-1 text-xs text-slate-500">{progressStatus}</p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="mx-auto flex w-full max-w-4xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-xs text-rose-900 mb-0.5">Form Recognition Error</p>
              <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              {currentImage && (
                <button
                  type="button"
                  onClick={handleRecognize}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Scan Again
                </button>
              )}
            </div>
          </div>
        )}

        {applicationData && (
          <ApplicationFormReview
            data={applicationData}
            hasGoogleSheetsConnection={Boolean(config.googleAppsScriptUrl && config.googleAppsScriptToken)}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onChange={handleFieldChange}
            onSubmit={handleSubmitToSheets}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onRecognizeAgain={handleRecognize}
            isRecognizing={isLoading}
          />
        )}
        </div>

        <footer className="mx-auto w-full max-w-4xl border-t border-emerald-950/5 py-5 text-center text-[11px] text-slate-500">
          Charitha Disanayake Sir · Chemistry Class Registration
        </footer>
      </main>

      {/* Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => handleImageSelected(dataUrl, 'camera_capture.jpg')}
      />

      {currentImage && (
        <CropModal
          isOpen={isCropOpen}
          imageSrc={currentImage}
          onClose={() => setIsCropOpen(false)}
          onCropComplete={(croppedUrl) => setCurrentImage(croppedUrl)}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
          setSubmitError(null);
        }}
      />

      {isSaveSuccessOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-success-title"
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 id="save-success-title" className="mt-4 text-xl font-bold text-slate-950">
              Saved successfully!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              The application has been added to Google Sheets.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSaveSuccessOpen(false);
                handleRemoveImage();
              }}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              Next application
            </button>
          </section>
        </div>
      )}

      {showSplash && (
        <div className="chemscan-splash fixed inset-0 z-[100] flex items-center justify-center px-6 text-center">
          <div className="chemscan-splash-content flex flex-col items-center">
            <div className="chemscan-splash-mark relative flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/10 text-amber-300 ring-1 ring-white/20 shadow-2xl shadow-black/20">
              <FlaskConical className="h-10 w-10" strokeWidth={1.6} />
              <span className="chemscan-scan-line" />
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Chem<span className="text-amber-300">Scan</span>
            </h2>
            <p className="mt-2 text-xs font-medium tracking-wide text-emerald-100/80 sm:text-sm">
              Charitha Disanayake Sir · Chemistry Class
            </p>
            <span className="mt-7 h-1 w-28 overflow-hidden rounded-full bg-white/15">
              <span className="chemscan-progress block h-full rounded-full bg-amber-300" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
