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
      if (await this.isLibreOfficeAvailable()) {
        const result = await this.convertWithLibreOffice(file, targetFormat);
        if (result.success) return result;
      }

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
      const fs = await import('fs');
      
      // Try different paths based on platform
      const possiblePaths = this.getPlatformSpecificPaths();

      for (const cmdPath of possiblePaths) {
        try {
          if (cmdPath.includes('\\') || cmdPath.includes('/')) {
            // Full path - check if file exists
            if (fs.existsSync(cmdPath)) {
              this.logger.log(`✅ Found LibreOffice at: ${cmdPath}`);
              this.libreOfficePath = cmdPath;
              return true;
            }
          } else {
            // Command in PATH
            if (process.platform === 'win32') {
              execSync(`where ${cmdPath}`, { stdio: 'ignore' });
            } else {
              execSync(`which ${cmdPath}`, { stdio: 'ignore' });
            }
            this.logger.log(`✅ Found LibreOffice in PATH: ${cmdPath}`);
            this.libreOfficePath = cmdPath;
            return true;
          }
        } catch (error) {
          // Continue to next path
        }
      }

      this.logger.warn('❌ LibreOffice not found');
      return false;
    } catch (error) {
      this.logger.error(`Error checking LibreOffice: ${error.message}`);
      return false;
    }
  }

  private getPlatformSpecificPaths(): string[] {
    if (process.platform === 'win32') {
      return [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files\\LibreOffice\\program\\soffice.com',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        'soffice', // Fallback to PATH
        'libreoffice'
      ];
    } else {
      // Linux/Mac paths
      return [
        '/usr/bin/soffice',
        '/usr/bin/libreoffice',
        '/usr/local/bin/soffice',
        'soffice', // Fallback to PATH
        'libreoffice'
      ];
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

      // Use the detected LibreOffice path with proper quoting
      let libreOfficeCmd = this.libreOfficePath!;
      if (libreOfficeCmd.includes(' ')) {
        libreOfficeCmd = `"${libreOfficeCmd}"`;
      }

      const commands = [
        `${libreOfficeCmd} --headless --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
        `${libreOfficeCmd} --headless --writer --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
        `${libreOfficeCmd} --headless --norestore --nofirststartwizard --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
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
              this.logger.log(`✅ Success! Output: ${outputName}`);
              
              return {
                success: true,
                data,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                fileName: outputFileName,
              };
            }
          }

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

  // Keep all your other methods exactly the same...
  private async convertWithFallback(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
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

  setLibreOfficePath(path: string): void {
    this.libreOfficePath = path;
    this.logger.log(`Manually set LibreOffice path to: ${path}`);
  }
}