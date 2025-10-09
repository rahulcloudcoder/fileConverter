// src/interfaces/conversion.interface.ts
export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
}

export enum ImageFormat {
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  GIF = 'gif',
}

export interface ConversionResult {
  success: boolean;
  data: Buffer;
  mimeType: string;
  fileName: string;
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}