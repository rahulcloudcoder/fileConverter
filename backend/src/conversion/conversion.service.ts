// src/conversion.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConvertFileDto } from './dto/convert-file.dto';
import { ConversionResult } from './interfaces/conversion.interface';
import { ImageConverter } from './converters/image.converter';
import { DocumentConverter } from './converters/document.converter';

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB total limit

  constructor(
    private readonly imageConverter: ImageConverter,
    private readonly documentConverter: DocumentConverter,
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
      if (file.mimetype.startsWith('image/')) {
        return await this.imageConverter.convert(file, convertFileDto.targetFormat as any);
      } else {
        return await this.documentConverter.convert(file, convertFileDto.targetFormat as any);
      }
    } catch (error) {
      this.logger.error(`Conversion service error: ${error.message}`);
      throw new BadRequestException(`Conversion failed: ${error.message}`);
    }
  }

  getSupportedConversions() {
    return {
      // Image conversions (always available)
      'image/jpeg': ['png', 'webp'],
      'image/jpg': ['png', 'webp'],
      'image/png': ['jpeg', 'jpg', 'webp'],
      'image/gif': ['jpeg', 'jpg', 'png'],
      'image/webp': ['jpeg', 'jpg', 'png'],
      
      // Document conversions (require LibreOffice)
      'application/pdf': ['docx', 'txt'],
      'application/msword': ['pdf', 'txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'txt'],
      'text/plain': ['pdf'],
    };
  }
}