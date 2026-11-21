export type OcrEngineType = 'gemini';

export interface PreprocessingOptions {
  autoEnhance: boolean;
  grayscale: boolean;
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  preserveDiacritics: boolean;
  rotation: number; // 0, 90, 180, 270
}

export interface OcrEngineConfig {
  engine: OcrEngineType;
  geminiApiKey: string;
  googleAppsScriptUrl: string;
  googleAppsScriptToken: string;
}
