import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ImageFormat {
  JPEG = 'jpeg',
  JPG = 'jpg',
  PNG = 'png',
  WEBP = 'webp',
  GIF = 'gif',
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
  targetFormat!: TargetFormat; // Add definite assignment assertion
}