import { Module } from '@nestjs/common';
import { ConversionController } from './conversion.controller';
import { ConversionService } from './conversion.service';
import { ImageConverter } from './converters/image.converter';
import { DocumentConverter } from './converters/document.converter';

@Module({
  controllers: [ConversionController],
  providers: [ConversionService, ImageConverter, DocumentConverter],
})
export class ConversionModule {}