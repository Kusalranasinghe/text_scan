import type { ApplicationFormData } from '../../types/applicationForm';
import type { OcrEngineConfig } from '../../types/ocr';
import { extractApplicationFormWithGemini } from './geminiEngine';

const STORAGE_KEY = 'sin_eng_ocr_config';

export type ProgressCallback = (progress: number, status: string) => void;

export const getDefaultConfig = (): OcrEngineConfig => {
  // Check for environment variable
  const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY || '';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        engine: 'gemini',
        geminiApiKey: parsed.geminiApiKey || envKey || '',
        googleAppsScriptUrl: parsed.googleAppsScriptUrl || '',
        googleAppsScriptToken: parsed.googleAppsScriptToken || '',
      };
    }
  } catch (e) {
    console.error('Failed to load OCR config from localStorage', e);
  }

  return {
    engine: 'gemini',
    geminiApiKey: envKey,
    googleAppsScriptUrl: '',
    googleAppsScriptToken: '',
  };
};

export const saveConfig = (config: OcrEngineConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save OCR config to localStorage', e);
  }
};

/**
 * Extracts the fixed application form fields using the configured AI key.
 */
export const runApplicationRecognition = async (
  imageDataUrl: string,
  config: OcrEngineConfig,
  onProgress?: ProgressCallback
): Promise<ApplicationFormData> => {
  if (config.engine === 'gemini') {
    if (!config.geminiApiKey?.trim()) {
      throw new Error(
        'Gemini API key is required to read the application form. Open Settings and add your API key.'
      );
    }
    onProgress?.(30, 'Extracting fixed application fields with Gemini AI...');
    return await extractApplicationFormWithGemini(imageDataUrl, config.geminiApiKey);
  } else {
    throw new Error(`Unsupported OCR engine: ${config.engine}`);
  }
};
