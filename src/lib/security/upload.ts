export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ValidatedImageResult {
  valid: true;
  mimeType: AllowedImageMime;
  extension: 'jpg' | 'png' | 'webp';
  bytes: Uint8Array;
}

export interface InvalidImageResult {
  valid: false;
  error: string;
}

/**
 * Inspects file magic bytes instead of trusting client MIME headers or filename extensions.
 */
export function detectImageSignature(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  const riff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (riff && webp) {
    return 'image/webp';
  }

  return null;
}

export function validateUploadedImage(
  fileName: string,
  claimedMime: string,
  bytes: Uint8Array
): ValidatedImageResult | InvalidImageResult {
  if (bytes.byteLength === 0) {
    return { valid: false, error: 'Uploaded image file is empty.' };
  }
  if (bytes.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'Image file exceeds the 5 MB maximum upload limit.' };
  }

  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: 'Unsupported file extension. Only .jpg, .jpeg, .png, and .webp are allowed.',
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(claimedMime as AllowedImageMime)) {
    return {
      valid: false,
      error: 'Unsupported image MIME type. Only JPEG, PNG, and WebP images are permitted.',
    };
  }

  const detectedMime = detectImageSignature(bytes);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'File content failed image signature verification (corrupt or non-image file).',
    };
  }

  if (detectedMime !== claimedMime) {
    return {
      valid: false,
      error: 'File content does not match the declared image MIME type.',
    };
  }

  const extension: 'jpg' | 'png' | 'webp' =
    detectedMime === 'image/png' ? 'png' : detectedMime === 'image/webp' ? 'webp' : 'jpg';

  return {
    valid: true,
    mimeType: detectedMime,
    extension,
    bytes,
  };
}
