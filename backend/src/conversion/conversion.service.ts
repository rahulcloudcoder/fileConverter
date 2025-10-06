import { Injectable, BadRequestException } from '@nestjs/common';
import { ConvertFileDto, TargetFormat } from './dto/convert-file.dto';
import { ConversionResult, FileValidationResult } from './interfaces/conversion.interface';
import { ImageConverter } from './converters/image.converter';
import { DocumentConverter } from './converters/document.converter';

@Injectable()
export class ConversionService {
  private readonly maxFileSize = 50 * 1024 * 1024; 

  constructor(
    private readonly imageConverter: ImageConverter,
    private readonly documentConverter: DocumentConverter,
  ) {}

  async convertFile(
    file: Express.Multer.File,
    convertFileDto: ConvertFileDto,
  ): Promise<ConversionResult> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    // Perform conversion based on file type
    if (file.mimetype.startsWith('image/')) {
      return this.imageConverter.convert(file, convertFileDto.targetFormat as any);
    } else if (
      file.mimetype.includes('pdf') ||
      file.mimetype.includes('document') ||
      file.mimetype.includes('text')
    ) {
      return this.documentConverter.convert(file, convertFileDto.targetFormat as any);
    } else {
      throw new BadRequestException('Unsupported file type');
    }
  }

  private validateFile(file: Express.Multer.File): FileValidationResult {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > this.maxFileSize) {
      return { isValid: false, error: 'File size exceeds 50MB limit' };
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'File type not supported' };
    }

    return { isValid: true, mimeType: file.mimetype };
  }

  getSupportedConversions() {
    return {
      'image/jpeg': ['png', 'webp', 'gif'],
      'image/jpg': ['png', 'webp', 'gif'],
      'image/png': ['jpeg', 'jpg', 'webp', 'gif'],
      'image/gif': ['jpeg', 'jpg', 'png', 'webp'],
      'image/webp': ['jpeg', 'jpg', 'png', 'gif'],
      'application/pdf': ['docx', 'txt'],
      'application/msword': ['pdf', 'txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'txt'],
      'text/plain': ['pdf', 'docx'],
    };
  }
}