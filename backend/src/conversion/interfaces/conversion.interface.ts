export interface ConversionResult {
  success: boolean;
  data?: Buffer;
  error?: string;
  mimeType: string;
  fileName: string;
}

export interface SupportedConversion {
  from: string[];
  to: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}