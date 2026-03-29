/** Validate file type by checking magic bytes (not just extension) */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "image/png";
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "image/gif";
  // WebP
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return "image/webp";
  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "application/pdf";
  // ZIP (also docx, xlsx, etc.)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05)) return "application/zip";

  return null;
}

export interface MimeValidationOptions {
  allowedTypes: string[];
  maxSizeBytes: number;
}

export function validateFile(buffer: Buffer, declaredMime: string, options: MimeValidationOptions): { valid: boolean; error?: string } {
  if (buffer.length > options.maxSizeBytes) {
    return { valid: false, error: `File exceeds maximum size of ${options.maxSizeBytes} bytes` };
  }

  const detectedMime = detectMimeType(buffer);
  const mimeToCheck = detectedMime ?? declaredMime;

  if (!options.allowedTypes.includes(mimeToCheck)) {
    return { valid: false, error: `File type ${mimeToCheck} is not allowed. Allowed: ${options.allowedTypes.join(", ")}` };
  }

  return { valid: true };
}
