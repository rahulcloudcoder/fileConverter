// src/converters/document.converter.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';

@Injectable()
export class DocumentConverter {
  private readonly logger = new Logger(DocumentConverter.name);
  private readonly maxFileSize = 10 * 1024 * 1024;
  private libreOfficePath: string | null = null;

  async convert(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    try {
      // Try LibreOffice first if available
      if (await this.isLibreOfficeAvailable()) {
        const result = await this.convertWithLibreOffice(file, targetFormat);
        if (result.success) return result;
      }

      // Fallback to lightweight converters
      return await this.convertWithFallback(file, targetFormat);
    } catch (error) {
      this.logger.error(`Conversion failed: ${error.message}`);
      return {
        success: false,
        data: Buffer.alloc(0),
        mimeType: '',
        fileName: '',
        error: `Conversion failed: ${error.message}`,
      };
    }
  }

  private async isLibreOfficeAvailable(): Promise<boolean> {
    if (this.libreOfficePath) {
      return true;
    }

    try {
      const { execSync } = await import('child_process');
      
      // Simple check - just try to run 'soffice --version'
      // This works on both Windows (if in PATH) and Linux
      execSync('soffice --version', { stdio: 'ignore' });
      this.libreOfficePath = 'soffice'; // Use the command directly
      this.logger.log('✅ LibreOffice found in PATH');
      return true;
    } catch (error) {
      this.logger.warn('❌ LibreOffice not found in PATH');
      return false;
    }
  }

  private async convertWithLibreOffice(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    const tmp = await import('tmp');
    const fse = await import('fs-extra');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const tempDir = tmp.dirSync({ unsafeCleanup: true });
    
    try {
      const inputPath = path.join(tempDir.name, file.originalname);
      await fs.writeFile(inputPath, file.buffer);

      const outputFileName = this.getOutputFileName(file.originalname, targetFormat);

      // Use the detected LibreOffice command (works on both Windows and Linux)
      const libreOfficeCmd = this.libreOfficePath || 'soffice';

      // Try different conversion methods
      const commands = [
        // Method 1: Basic conversion
        `${libreOfficeCmd} --headless --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
        
        // Method 2: With writer filter
        `${libreOfficeCmd} --headless --writer --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
        
        // Method 3: Force recalculation
        `${libreOfficeCmd} --headless --norestore --nofirststartwizard --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
        
        // Method 4: With infilter for PDF
        `${libreOfficeCmd} --headless --infilter="writer_pdf_import" --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
      ];

      let lastError = '';

      for (const command of commands) {
        try {
          this.logger.log(`Trying command: ${command}`);
          
          const { stdout, stderr } = await execAsync(command, { 
            timeout: 45000,
            maxBuffer: 1024 * 1024 * 10
          });

          if (stdout) this.logger.log(`LibreOffice stdout: ${stdout}`);
          if (stderr) this.logger.warn(`LibreOffice stderr: ${stderr}`);

          // Check for output file
          const possibleOutputNames = [
            outputFileName,
            file.originalname.replace('.pdf', '.docx'),
            'output.docx',
            'converted.docx'
          ];

          for (const outputName of possibleOutputNames) {
            const outputPath = path.join(tempDir.name, outputName);
            if (await fse.pathExists(outputPath)) {
              const data = await fs.readFile(outputPath);
              this.logger.log(`✅ Success with command! Output: ${outputName}`);
              
              return {
                success: true,
                data,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                fileName: outputFileName,
              };
            }
          }

          // List all files for debugging
          const files = await fs.readdir(tempDir.name);
          this.logger.log(`Files in directory: ${files.join(', ')}`);

        } catch (error) {
          lastError = error.message;
          this.logger.warn(`Command failed: ${error.message}`);
          continue;
        }
      }

      throw new Error(`All LibreOffice methods failed. Last error: ${lastError}`);
    } finally {
      tempDir.removeCallback();
    }
  }

  private async convertWithFallback(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    // Lightweight fallback conversions
    if (file.mimetype === 'text/plain' && targetFormat === DocumentFormat.PDF) {
      return await this.textToPdf(file);
    }
    
    if (targetFormat === DocumentFormat.TXT) {
      return await this.anyToText(file);
    }

    throw new BadRequestException(
      'Conversion not available. LibreOffice is required for this conversion type.'
    );
  }

  private async textToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    const PDFDocument = await import('pdf-lib').then(lib => lib.PDFDocument);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const text = file.buffer.toString('utf8').substring(0, 10000);
    
    page.drawText(text, {
      x: 50,
      y: 750,
      size: 12,
      maxWidth: 500,
    });

    const pdfBytes = await pdfDoc.save();
    
    return {
      success: true,
      data: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
      fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
    };
  }

  private async anyToText(file: Express.Multer.File): Promise<ConversionResult> {
    let text = '';
    
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfParseModule = await import('pdf-parse');
        const data = await pdfParseModule.default(file.buffer);
        text = data.text || 'No text content found in PDF';
      } catch (error) {
        text = `PDF text extraction failed: ${error.message}`;
      }
    } else if (file.mimetype.includes('word')) {
      text = 'Document conversion requires LibreOffice. Text extraction limited.';
    } else {
      text = file.buffer.toString('utf8');
    }

    return {
      success: true,
      data: Buffer.from(text.substring(0, 5000)),
      mimeType: 'text/plain',
      fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
    };
  }

  private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
    const baseName = path.basename(originalName, path.extname(originalName));
    return `${baseName}.${targetFormat}`;
  }

  private getLibreOfficeFormat(format: DocumentFormat): string {
    const formats = {
      [DocumentFormat.PDF]: 'pdf',
      [DocumentFormat.DOCX]: 'docx',
      [DocumentFormat.TXT]: 'txt:Text',
    };
    return formats[format];
  }

  private getMimeType(format: DocumentFormat): string {
    const mimeTypes = {
      [DocumentFormat.PDF]: 'application/pdf',
      [DocumentFormat.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [DocumentFormat.TXT]: 'text/plain',
    };
    return mimeTypes[format];
  }
}