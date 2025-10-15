// src/conversion.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConvertFileDto } from './dto/convert-file.dto';
import { ConversionResult, DocumentFormat, ImageFormat } from './interfaces/conversion.interface';
import { ImageConverter } from './converters/image.converter';
import { CompleteDocumentConverter } from './converters/complete-document.converter';
import { CompleteExactConverter } from './converters/complete-exact-converter';
import { RenderConverterService } from './converters/Pandoc-document.converter';
import { DocumentConverter } from './converters/document.converter';

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private readonly maxFileSize = 100 * 1024 * 1024; // Increased to 100MB

  constructor(
    private readonly imageConverter: ImageConverter,
    private readonly completeDocumentConverter: CompleteDocumentConverter,
    private readonly completeExact:CompleteExactConverter,
    private readonly renderService:RenderConverterService,
    private readonly document:DocumentConverter
  ) {}

  async convertFile(
    file: Express.Multer.File,
    convertFileDto: ConvertFileDto,
  ): Promise<ConversionResult> {
    // Quick validation
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    this.logger.log(`Converting file: ${file.originalname} to ${convertFileDto.targetFormat}`);

    try {
      // Determine converter based on file type
      if (this.isImageFile(file.mimetype)) {
        return await this.imageConverter.convert(file, convertFileDto.targetFormat as ImageFormat);
      } else if (this.isDocumentFile(file.mimetype)) {
        return await this.renderService.convert(file, convertFileDto.targetFormat as DocumentFormat);
      } else {
        throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
      }
    } catch (error) {
      this.logger.error(`Conversion service error: ${error.message}`);
      throw new BadRequestException(`Conversion failed: ${error.message}`);
    }
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isDocumentFile(mimeType: string): boolean {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    return documentMimeTypes.includes(mimeType);
  }

  getSupportedConversions() {
    const supported = this.completeDocumentConverter.getSupportedConversions();
    
    return {
      // Image conversions
      'image/jpeg': ['png', 'webp', 'jpg'],
      'image/jpg': ['png', 'webp', 'jpeg'],
      'image/png': ['jpeg', 'jpg', 'webp'],
      'image/gif': ['jpeg', 'jpg', 'png'],
      'image/webp': ['jpeg', 'jpg', 'png'],
      'image/bmp': ['jpeg', 'jpg', 'png', 'webp'],
      'image/tiff': ['jpeg', 'jpg', 'png', 'webp'],
      
      // Document conversions (now fully supported without LibreOffice)
      'application/pdf': ['docx', 'txt', 'pdf'],
      'application/msword': ['pdf', 'txt', 'docx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'txt', 'docx'],
      'application/vnd.ms-excel': ['pdf', 'txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['pdf', 'txt'],
      'application/vnd.ms-powerpoint': ['pdf', 'txt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pdf', 'txt'],
      'text/plain': ['pdf', 'docx', 'txt'],
    };
  }

  // Optional: Get detailed conversion capabilities
  getConversionCapabilities() {
    return {
      service: 'Enhanced Document Converter',
      version: '2.0.0',
      features: [
        'PDF to DOCX with structure preservation',
        'PDF to Text extraction',
        'Text to PDF generation',
        'Text to DOCX conversion',
        'DOCX to PDF conversion',
        'DOCX to Text extraction',
        'Excel to PDF/TXT conversion',
        'PowerPoint to PDF/TXT conversion',
        'Image format conversion',
        'No external dependencies required',
        'Advanced document structure detection',
        'Table and list recognition',
        'Heading detection and preservation'
      ],
      limitations: [
        'Scanned PDFs may have limited text extraction',
        'Complex formatting may not be perfectly preserved',
        'Large files (>100MB) are not supported'
      ]
    };
  }
}