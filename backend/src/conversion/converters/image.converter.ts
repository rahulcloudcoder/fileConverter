// src/converters/image.converter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConversionResult } from '../interfaces/conversion.interface';
import { ImageFormat } from '../dto/convert-file.dto';

@Injectable()
export class ImageConverter {
  private readonly logger = new Logger(ImageConverter.name);
  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB limit

  async convert(
    file: Express.Multer.File,
    targetFormat: ImageFormat,
  ): Promise<ConversionResult> {
    if (file.size > this.maxImageSize) {
      throw new Error(`Image size exceeds ${this.maxImageSize / 1024 / 1024}MB limit`);
    }

    try {
      // Lazy load sharp to reduce memory
      const sharp = await import('sharp');
      
      let convertedBuffer: Buffer;
      const fileName = `converted.${targetFormat}`;

      // Optimize based on format with size limits
      switch (targetFormat) {
        case ImageFormat.JPEG:
        case ImageFormat.JPG:
          convertedBuffer = await sharp.default(file.buffer)
            .jpeg({ 
              quality: 80, // Lower quality for smaller size
              mozjpeg: true 
            })
            .resize(2000, 2000, { // Limit dimensions
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();
          break;

        case ImageFormat.PNG:
          convertedBuffer = await sharp.default(file.buffer)
            .png({ 
              compressionLevel: 8,
              palette: true 
            })
            .resize(2000, 2000, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();
          break;

        case ImageFormat.WEBP:
          convertedBuffer = await sharp.default(file.buffer)
            .webp({ quality: 80 })
            .resize(2000, 2000, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();
          break;

        case ImageFormat.GIF:
          convertedBuffer = await sharp.default(file.buffer, { 
            animated: true,
            limitInputPixels: 10000000 // Limit for GIF processing
          })
            .gif()
            .resize(800, 800, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();
          break;

        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      return {
        success: true,
        data: convertedBuffer,
        mimeType: `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`,
        fileName,
      };
    } catch (error: unknown) {
      this.logger.error(`Image conversion failed: ${error}`);
      return {
        success: false,
        error: `Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: Buffer.alloc(0),
        mimeType: '',
        fileName: '',
      };
    }
  }
}

 