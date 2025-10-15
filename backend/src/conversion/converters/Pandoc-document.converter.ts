// src/converters/render-converter.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const execAsync = promisify(exec);

@Injectable()
export class RenderConverterService {
  private readonly logger = new Logger(RenderConverterService.name);
  private readonly tempDir = join(process.cwd(), 'temp');
  private pythonServiceUrl = process.env.PYTHON_CONVERTER_URL || 'http://localhost:8000';
  // private usePythonService = process.env.USE_PYTHON_SERVICE === 'true';
    private usePythonService = true

  
  constructor(private readonly httpService: HttpService) {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
    this.logger.log(`Python service: ${this.usePythonService ? 'ENABLED' : 'DISABLED'}`);
  }

  async convert(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    this.validateInput(file, targetFormat);

    // Try Python service first for better conversions (if enabled)
    if (this.usePythonService && this.shouldUsePythonService(file.mimetype, targetFormat)) {
      try {
        this.logger.log(`Using Python AI service for ${file.mimetype} to ${targetFormat}`);
        return await this.convertWithPythonService(file, targetFormat);
      } catch (error) {
        this.logger.warn(`Python service failed: ${error.message}, falling back to Node.js`);
        // Fall back to Node.js implementation
      }
    }

    // Use Node.js implementation
    this.logger.log(`Using Node.js converter for ${file.mimetype} to ${targetFormat}`);
    return await this.convertWithNodeJs(file, targetFormat);
  }

  private shouldUsePythonService(mimeType: string, targetFormat: DocumentFormat): boolean {
    // Use Python for conversions where it provides significant advantages
    const pythonEnhancedConversions = [
      'application/pdf:docx',  // PDF to DOCX - much better in Python
      'application/pdf:txt',   // PDF to Text - better extraction with pdfplumber
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document:pdf' // DOCX to PDF
    ];
    
    const conversionKey = `${mimeType}:${targetFormat}`;
    return pythonEnhancedConversions.includes(conversionKey);
  }

 private async convertWithPythonService(
  file: Express.Multer.File, 
  targetFormat: DocumentFormat
): Promise<ConversionResult> {
  const inputPath = join(this.tempDir, `${Date.now()}-${file.originalname}`);
  
  try {
    // Save file temporarily as backup
    writeFileSync(inputPath, file.buffer);

    // Use axios with proper FormData handling
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Append the file buffer directly
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    
    formData.append('targetFormat', targetFormat);

    const response = await firstValueFrom(
      this.httpService.post(`${this.pythonServiceUrl}/convert`, formData, {
        headers: {
          ...formData.getHeaders(), // This is crucial - it sets the correct Content-Type with boundary
        },
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: 50 * 1024 * 1024,
      })
    );

    // Clean up temp file
    this.cleanupTempFiles([inputPath]);

    return {
      success: true,
      data: Buffer.from(response.data),
      mimeType: this.getMimeType(targetFormat),
      fileName: this.getOutputFileName(file.originalname, targetFormat),
    };
  } catch (error) {
    // Clean up temp file on error
    this.cleanupTempFiles([inputPath]);
    
    let errorMessage = 'Unknown error';
    if (error.response?.data) {
      try {
        // Try to parse the error response
        const errorData = Buffer.from(error.response.data).toString('utf-8');
        const parsedError = JSON.parse(errorData);
        errorMessage = parsedError.error || errorData;
      } catch {
        errorMessage = Buffer.from(error.response.data).toString('utf-8').substring(0, 200);
      }
    } else {
      errorMessage = error.message;
    }
    
    throw new Error(`Python service failed: ${errorMessage}`);
  }
}

  private async formDataToBuffer(formData: FormData): Promise<Buffer> {
    // Convert FormData to Buffer by creating a Blob and reading it
    const formDataBlob = new Blob([formData as any]);
    const arrayBuffer = await formDataBlob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Alternative simpler approach without FormData conversion issues
  private async convertWithPythonServiceSimple(
    file: Express.Multer.File, 
    targetFormat: DocumentFormat
  ): Promise<ConversionResult> {
    const inputPath = join(this.tempDir, `${Date.now()}-${file.originalname}`);
    const outputPath = join(this.tempDir, `${Date.now()}-output.${targetFormat}`);
    
    try {
      // Save file temporarily
      writeFileSync(inputPath, file.buffer);

      // Use curl command to call Python service (simpler approach)
      const curlCommand = `curl -X POST ${this.pythonServiceUrl}/convert \
        -F "file=@${inputPath}" \
        -F "targetFormat=${targetFormat}" \
        --output "${outputPath}" \
        --connect-timeout 30 \
        --max-time 120`;

      await execAsync(curlCommand);

      if (existsSync(outputPath)) {
        const outputBuffer = readFileSync(outputPath);
        
        return {
          success: true,
          data: outputBuffer,
          mimeType: this.getMimeType(targetFormat),
          fileName: this.getOutputFileName(file.originalname, targetFormat),
        };
      } else {
        throw new Error('Python service did not return a file');
      }
    } catch (error) {
      this.cleanupTempFiles([inputPath, outputPath]);
      throw new Error(`Python conversion service failed: ${error.message}`);
    } finally {
      this.cleanupTempFiles([inputPath, outputPath]);
    }
  }

  private async convertWithNodeJs(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    const inputPath = join(this.tempDir, `${Date.now()}-${file.originalname}`);
    const outputPath = join(this.tempDir, `${Date.now()}-output`);

    try {
      writeFileSync(inputPath, file.buffer);

      const conversionKey = `${file.mimetype}:${targetFormat}`;
      let result: ConversionResult;

      switch (conversionKey) {
        case 'application/pdf:docx':
          result = await this.pdfToDocx(inputPath, file.originalname);
          break;
        case 'text/plain:docx':
          result = await this.textToDocx(inputPath, outputPath, file.originalname);
          break;
        case 'text/plain:pdf':
          result = await this.textToPdf(inputPath, file.originalname);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document:pdf':
          result = await this.docxToPdf(inputPath, file.originalname);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document:txt':
          result = await this.docxToText(inputPath, outputPath, file.originalname);
          break;
        case 'application/pdf:txt':
          result = await this.pdfToText(inputPath, outputPath, file.originalname);
          break;
        default:
          throw new BadRequestException(`Unsupported conversion: ${file.mimetype} to ${targetFormat}`);
      }

      this.cleanupTempFiles([inputPath, outputPath]);
      return result;

    } catch (error) {
      this.cleanupTempFiles([inputPath, outputPath]);
      throw error;
    }
  }

  // ==================== NODE.JS CONVERSION METHODS ====================

  private async pdfToDocx(inputPath: string, originalName: string): Promise<ConversionResult> {
    this.logger.log('Converting PDF to DOCX using enhanced text extraction...');
    
    try {
      const { text, metadata } = await this.extractStructuredPdfContent(inputPath);
      return await this.createFormattedDocx(text, metadata, originalName);
    } catch (error) {
      this.logger.error(`PDF to DOCX conversion failed: ${error.message}`);
      throw new Error(`Failed to convert PDF to DOCX: ${error.message}`);
    }
  }

  private async extractStructuredPdfContent(pdfPath: string): Promise<{ text: string; metadata: any }> {
    try {
      const pdfParse = await import('pdf-parse');
      const dataBuffer = readFileSync(pdfPath);
      const data = await pdfParse.default(dataBuffer);
      
      return {
        text: this.cleanExtractedText(data.text),
        metadata: {
          numpages: data.numpages,
          info: data.info || {},
          hasText: !!data.text && data.text.length > 0
        }
      };
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  private cleanExtractedText(text: string): string {
    if (!text) return 'No text content could be extracted from the PDF.';
    
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/([a-z])- ?\n ?([a-z])/gi, '$1$2')
      .replace(/\s+\.\s+/g, '. ')
      .replace(/\s+,\s+/g, ', ')
      .trim();
  }

  private async createFormattedDocx(text: string, metadata: any, originalName: string): Promise<ConversionResult> {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');
    
    const paragraphs = [];
    
    if (metadata.info?.Title) {
      paragraphs.push(new Paragraph({
        text: metadata.info.Title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }));
    }

    const sections = text.split(/\n\s*\n/);
    
    for (const section of sections) {
      const trimmedSection = section.trim();
      if (trimmedSection.length === 0) continue;

      if (this.isLikelyHeading(trimmedSection)) {
        paragraphs.push(new Paragraph({
          text: trimmedSection,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }));
      } else if (this.isLikelyListItem(trimmedSection)) {
        paragraphs.push(new Paragraph({
          text: this.cleanListItem(trimmedSection),
          bullet: { level: this.getBulletLevel(trimmedSection) },
          spacing: { after: 100 },
        }));
      } else {
        const lines = trimmedSection.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            paragraphs.push(new Paragraph({
              children: [new TextRun(trimmedLine)],
              spacing: { after: 100 },
            }));
          }
        }
      }
    }

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Arial",
              size: 24,
            },
            paragraph: {
              spacing: { line: 360 },
            },
          },
        ],
      },
      sections: [{ properties: {}, children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    return {
      success: true,
      data: buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: this.getOutputFileName(originalName, DocumentFormat.DOCX),
    };
  }

  private async docxToPdf(inputPath: string, originalName: string): Promise<ConversionResult> {
    this.logger.log('Converting DOCX to PDF...');
    
    try {
      const text = await this.extractTextFromDocx(inputPath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in DOCX file');
      }
      
      return await this.createPdfFromText(text, originalName);
    } catch (error) {
      this.logger.error(`DOCX to PDF conversion failed: ${error.message}`);
      throw new Error(`Failed to convert DOCX to PDF: ${error.message}`);
    }
  }

  private async extractTextFromDocx(docxPath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: docxPath });
      
      if (!result.value) {
        throw new Error('No text content extracted');
      }
      
      return this.cleanExtractedText(result.value);
    } catch (error) {
      throw new Error(`DOCX text extraction failed: ${error.message}`);
    }
  }

  private async createPdfFromText(text: string, originalName: string): Promise<ConversionResult> {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    
    const pdfDoc = await PDFDocument.create();
    const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 72;
    const lineHeight = 18;
    const fontSize = 12;
    
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) continue;
      
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
      
      const isHeading = this.isLikelyHeading(trimmedLine);
      const fontToUse = isHeading ? boldFont : font;
      const sizeToUse = isHeading ? 14 : fontSize;
      
      currentPage.drawText(trimmedLine, {
        x: margin,
        y: yPosition,
        size: sizeToUse,
        font: fontToUse,
        color: rgb(0, 0, 0),
        maxWidth: pageWidth - (margin * 2),
      });
      
      yPosition -= (isHeading ? lineHeight + 4 : lineHeight);
    }
    
    const pdfBytes = await pdfDoc.save();
    
    return {
      success: true,
      data: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
      fileName: this.getOutputFileName(originalName, DocumentFormat.PDF),
    };
  }

  private async textToDocx(inputPath: string, outputPath: string, originalName: string): Promise<ConversionResult> {
    try {
      const command = `pandoc "${inputPath}" -f plain -t docx -o "${outputPath}.docx"`;
      await execAsync(command);

      if (existsSync(`${outputPath}.docx`)) {
        const outputBuffer = readFileSync(`${outputPath}.docx`);
        
        return {
          success: true,
          data: outputBuffer,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: this.getOutputFileName(originalName, DocumentFormat.DOCX),
        };
      } else {
        throw new Error('Pandoc conversion failed');
      }
    } catch (error) {
      const text = readFileSync(inputPath, 'utf8');
      return await this.createFormattedDocx(text, {}, originalName);
    }
  }

  private async textToPdf(inputPath: string, originalName: string): Promise<ConversionResult> {
    const text = readFileSync(inputPath, 'utf8');
    return await this.createPdfFromText(text, originalName);
  }

  private async docxToText(inputPath: string, outputPath: string, originalName: string): Promise<ConversionResult> {
    try {
      const command = `pandoc "${inputPath}" -f docx -t plain -o "${outputPath}.txt"`;
      await execAsync(command);

      if (existsSync(`${outputPath}.txt`)) {
        const outputBuffer = readFileSync(`${outputPath}.txt`);
        
        return {
          success: true,
          data: outputBuffer,
          mimeType: 'text/plain; charset=utf-8',
          fileName: this.getOutputFileName(originalName, DocumentFormat.TXT),
        };
      } else {
        throw new Error('Pandoc conversion failed');
      }
    } catch (error) {
      const text = await this.extractTextFromDocx(inputPath);
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(originalName, DocumentFormat.TXT),
      };
    }
  }

  private async pdfToText(inputPath: string, outputPath: string, originalName: string): Promise<ConversionResult> {
    try {
      const { text } = await this.extractStructuredPdfContent(inputPath);
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(originalName, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`PDF to Text conversion failed: ${error.message}`);
      throw new Error(`Failed to convert PDF to Text: ${error.message}`);
    }
  }

  // ==================== UTILITY METHODS ====================
  private isLikelyHeading(text: string): boolean {
    const trimmed = text.trim();
    return (
      trimmed.length < 150 &&
      (trimmed === trimmed.toUpperCase() || 
       /^(CHAPTER|SECTION|PART|ABSTRACT|INTRODUCTION|CONCLUSION|RESUME|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SUMMARY)/i.test(trimmed) ||
       /^\d+\.\s+[A-Z]/.test(trimmed) ||
       /^[IVX]+\.\s+[A-Z]/.test(trimmed))
    );
  }

  private isLikelyListItem(text: string): boolean {
    return /^[•·\-*\d+\.\s]/.test(text.trim());
  }

  private getBulletLevel(text: string): number {
    const match = text.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    return Math.min(2, Math.floor(indent / 4));
  }

  private cleanListItem(text: string): string {
    return text.replace(/^[•·\-*\d+\.\s]+/, '').trim();
  }

  private getMimeType(format: DocumentFormat): string {
    const mimeTypes = {
      [DocumentFormat.PDF]: 'application/pdf',
      [DocumentFormat.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [DocumentFormat.TXT]: 'text/plain; charset=utf-8',
    };
    return mimeTypes[format];
  }

  private validateInput(file: Express.Multer.File, targetFormat: DocumentFormat): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
  }

  private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const timestamp = new Date().getTime();
    return `${baseName}-converted-${timestamp}.${targetFormat}`;
  }

  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (filePath && existsSync(filePath)) {
          unlinkSync(filePath);
        }
        if (filePath) {
          ['.docx', '.pdf', '.txt', '.html'].forEach(ext => {
            const pathWithExt = `${filePath}${ext}`;
            if (existsSync(pathWithExt)) {
              unlinkSync(pathWithExt);
            }
          });
        }
      } catch (error) {
        this.logger.warn(`Could not delete temp file: ${filePath}`);
      }
    });
  }

  async checkPythonServiceHealth(): Promise<boolean> {
    if (!this.usePythonService) return false;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pythonServiceUrl}/health`, {
          timeout: 5000,
        })
      );
      return response.data?.status === 'healthy';
    } catch (error) {
      this.logger.warn('Python service health check failed');
      return false;
    }
  }

  getCapabilities() {
    return {
      nodeJs: {
        'text-to-docx': true,
        'text-to-pdf': true,
        'docx-to-text': true,
        'pdf-to-text': true,
        'pdf-to-docx': true,
        'docx-to-pdf': true,
      },
      pythonAi: this.usePythonService ? {
        'pdf-to-docx': true,
        'pdf-to-text': true,
        'docx-to-pdf': true,
      } : { enabled: false },
      pythonServiceUrl: this.pythonServiceUrl,
      pythonServiceEnabled: this.usePythonService,
    };
  }
}