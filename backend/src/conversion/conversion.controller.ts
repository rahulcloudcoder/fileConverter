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
        fileSize: 50 * 1024 * 1024, // 50MB
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
}