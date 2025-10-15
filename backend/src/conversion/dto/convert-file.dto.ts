// src/dto/convert-file.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ImageFormat {
  JPEG = 'jpeg',
  JPG = 'jpg',
  PNG = 'png',
  WEBP = 'webp',
  GIF = 'gif',
  BMP = 'bmp',
  TIFF = 'tiff',
}

export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
}

export type TargetFormat = ImageFormat | DocumentFormat;

export class ConvertFileDto {
  @IsNotEmpty()
  @IsEnum({ ...ImageFormat, ...DocumentFormat })
  targetFormat!: TargetFormat;
}