// Add to your existing conversion.controller.ts
import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import express from 'express';
import { ConversionService } from './conversion.service';
import { ConvertFileDto } from './dto/convert-file.dto';
import { memoryStorage } from 'multer';

@Controller('conversion')
export class ConversionController {
  constructor(private readonly conversionService: ConversionService) {}

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // Increased to 100MB
      },
    }),
  )
  async convertFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() convertFileDto: ConvertFileDto,
    @Res() res: express.Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.conversionService.convertFile(file, convertFileDto);

    if (!result.success || !result.data) {
      throw new BadRequestException(result.error);
    }

    // Set appropriate headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.data.length);
    res.setHeader('X-Conversion-Status', 'success');
    res.setHeader('X-Conversion-Engine', 'enhanced-document-converter');

    // Send the converted file buffer
    res.send(result.data);
  }

  @Get('supported-formats')
  getSupportedFormats() {
    return {
      success: true,
      data: this.conversionService.getSupportedConversions(),
    };
  }

  @Get('capabilities')
  getCapabilities() {
    return {
      success: true,
      data: this.conversionService.getConversionCapabilities(),
    };
  }

  @Post('batch-check')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for quick checks
      },
    }),
  )
  async checkFileConversion(
    @UploadedFile() file: Express.Multer.File,
    @Body() convertFileDto: ConvertFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Quick validation without full conversion
    const supported = this.conversionService.getSupportedConversions();
    const sourceType = file.mimetype;
    const targetFormat = convertFileDto.targetFormat;

    if (!supported[sourceType] || !supported[sourceType].includes(targetFormat)) {
      return {
        success: false,
        supported: false,
        message: `Conversion from ${sourceType} to ${targetFormat} is not supported`,
        alternatives: supported[sourceType] || [],
      };
    }

    return {
      success: true,
      supported: true,
      message: `Conversion from ${sourceType} to ${targetFormat} is supported`,
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }
}