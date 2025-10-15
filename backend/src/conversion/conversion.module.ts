// src/conversion.module.ts
import { Module } from '@nestjs/common';
import { ConversionController } from './conversion.controller';
import { ConversionService } from './conversion.service';
import { ImageConverter } from './converters/image.converter';
import { CompleteDocumentConverter } from './converters/complete-document.converter';
import { EnhancedPdfToDocxConverter } from './converters/enhanced-pdf-to-docx.converter';
import { CompleteExactConverter } from './converters/complete-exact-converter';
import { ExactFormatConverter } from './converters/exact-format-converter';
import { RenderConverterService } from './converters/Pandoc-document.converter';
import { DocumentConverter } from './converters/document.converter';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes
      maxRedirects: 5,
    }),
  ],
  controllers: [ConversionController],
  providers: [
    ConversionService, 
    ImageConverter, 
    CompleteDocumentConverter,
    EnhancedPdfToDocxConverter,
    CompleteExactConverter,
    ExactFormatConverter,
    RenderConverterService,
    DocumentConverter
  ],
  exports: [ConversionService],
})
export class ConversionModule {}