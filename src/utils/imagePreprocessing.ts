import type { PreprocessingOptions } from '../types/ocr';

/**
 * Loads an image from a Data URL or URL into an HTMLImageElement
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
    img.src = src;
  });
};

/**
 * Preprocesses an image via Canvas:
 * - Rotation (0, 90, 180, 270)
 * - Grayscale
 * - Brightness & Contrast adjustment
 * - Diacritic preservation (avoids harsh thresholding that clips delicate Sinhala vowel signs)
 */
export const preprocessImage = async (
  imageSrc: string,
  options: PreprocessingOptions
): Promise<string> => {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas 2d context');

  // Handle 90/270 degree rotation swapping width & height
  const isRotated90or270 = options.rotation % 180 !== 0;
  canvas.width = isRotated90or270 ? img.height : img.width;
  canvas.height = isRotated90or270 ? img.width : img.height;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((options.rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();

  // If no adjustments are needed, return canvas as data URL
  if (!options.grayscale && options.contrast === 0 && options.brightness === 0 && !options.autoEnhance) {
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  // Auto-enhance calculation
  let contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  let brightnessOffset = options.brightness * 1.5;

  if (options.autoEnhance) {
    // Subtle contrast boost & gentle brightness normalization designed for handwriting
    contrastFactor = (259 * (25 + 255)) / (255 * (259 - 25)); // mild +25 contrast
    brightnessOffset = 10;
  }

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Grayscale or Auto-enhance
    if (options.grayscale || options.autoEnhance) {
      // Standard perceived luminance
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    // Apply brightness
    if (brightnessOffset !== 0) {
      r = Math.min(255, Math.max(0, r + brightnessOffset));
      g = Math.min(255, Math.max(0, g + brightnessOffset));
      b = Math.min(255, Math.max(0, b + brightnessOffset));
    }

    // Apply contrast
    if (contrastFactor !== 1) {
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
    }

    // Diacritic preservation mode:
    // If text is dark on light background, slightly darken near-black strokes to preserve fine Sinhala diacritics
    // like kombuva ෙ, ispilla ි, paapilla ු without turning into binary artifacts.
    if (options.preserveDiacritics && (options.autoEnhance || options.grayscale)) {
      const avg = (r + g + b) / 3;
      if (avg < 140) {
        // Deepen ink strokes slightly to reinforce thin pen strokes
        r = Math.max(0, r * 0.9);
        g = Math.max(0, g * 0.9);
        b = Math.max(0, b * 0.9);
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
};

/**
 * Crops a region of interest from an image source
 */
export const cropImage = async (
  imageSrc: string,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cropArea.width));
  canvas.height = Math.max(1, Math.round(cropArea.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/jpeg', 0.95);
};

/**
 * Compresses/resizes very large images if they exceed max dimensions,
 * maintaining aspect ratio to prevent memory pressure or API limits.
 */
export const normalizeImageSize = async (
  imageSrc: string,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<string> => {
  const img = await loadImage(imageSrc);

  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
};
