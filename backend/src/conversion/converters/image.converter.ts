import { Injectable } from '@nestjs/common';
import { ConversionResult } from '../interfaces/conversion.interface';
import { ImageFormat } from '../dto/convert-file.dto';

@Injectable()
export class ImageConverter {
  async convert(
    file: Express.Multer.File,
    targetFormat: ImageFormat,
  ): Promise<ConversionResult> {
    try {
      const sharp = require('sharp');
      
      let convertedBuffer: Buffer;
      const fileName = `converted.${targetFormat}`;

      switch (targetFormat) {
        case ImageFormat.JPEG:
        case ImageFormat.JPG:
          convertedBuffer = await sharp(file.buffer)
            .jpeg({ quality: 90 })
            .toBuffer();
          break;

        case ImageFormat.PNG:
          convertedBuffer = await sharp(file.buffer)
            .png({ compressionLevel: 9 })
            .toBuffer();
          break;

        case ImageFormat.WEBP:
          convertedBuffer = await sharp(file.buffer)
            .webp({ quality: 90 })
            .toBuffer();
          break;

        case ImageFormat.GIF:
          convertedBuffer = await sharp(file.buffer, { animated: true })
            .gif()
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Image conversion failed: ${errorMessage}`,
        mimeType: '',
        fileName: '',
      };
    }
  }
}