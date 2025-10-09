// src/converters/document.converter.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';

@Injectable()
export class DocumentConverter {
  private readonly logger = new Logger(DocumentConverter.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB limit for free hosting
  private libreOfficePath: string | null = null;

  async convert(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    // Validate file size for free hosting limits
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
      return true; // Already found
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      
      // Define possible LibreOffice paths for different platforms
      const possiblePaths = [
        // Windows paths
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files\\LibreOffice\\program\\soffice.com',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
        
        // Linux paths
        '/usr/bin/soffice',
        '/usr/bin/libreoffice',
        '/usr/local/bin/soffice',
        
        // Mac paths
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        
        // Just the command (if in PATH)
        'soffice',
        'libreoffice'
      ];

      for (const cmdPath of possiblePaths) {
        try {
          if (cmdPath.includes('\\') || cmdPath.includes('/')) {
            // This is a full path, check if file exists
            if (fs.existsSync(cmdPath)) {
              this.logger.log(`✅ Found LibreOffice at: ${cmdPath}`);
              this.libreOfficePath = cmdPath;
              return true;
            }
          } else {
            // This is just a command, check if it's in PATH
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

      this.logger.warn('❌ LibreOffice not found in any common locations');
      return false;
    } catch (error) {
      this.logger.error(`Error checking for LibreOffice: ${error.message}`);
      return false;
    }
  }

 // src/converters/document.converter.ts
// src/converters/document.converter.ts
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

    // Use absolute path for Windows
    const libreOfficeCmd = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"';

    // Try DIFFERENT conversion methods for PDF to DOCX
    const commands = [
      // Method 1: Basic conversion
      `${libreOfficeCmd} --headless --convert-to docx --outdir "${tempDir.name}" "${inputPath}"`,
      
      // Method 2: With writer filter (for PDF import)
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
          timeout: 45000, // 45 seconds
          maxBuffer: 1024 * 1024 * 10
        });

        this.logger.log(`LibreOffice stdout: ${stdout}`);
        if (stderr) this.logger.warn(`LibreOffice stderr: ${stderr}`);

        // Check for output file (could have different names)
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

        // List all files to see what was created
        const files = await fs.readdir(tempDir.name);
        this.logger.log(`Files in directory: ${files.join(', ')}`);

      } catch (error) {
        lastError = error.message;
        this.logger.warn(`Command failed: ${error.message}`);
        continue; // Try next command
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
    // Simple PDF generation from text
    const PDFDocument = await import('pdf-lib').then(lib => lib.PDFDocument);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const text = file.buffer.toString('utf8').substring(0, 10000); // Limit text length
    
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
    // Extract text from various formats
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
      data: Buffer.from(text.substring(0, 5000)), // Limit output size
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

  // Method to manually set LibreOffice path (useful for testing)
  setLibreOfficePath(path: string): void {
    this.libreOfficePath = path;
    this.logger.log(`Manually set LibreOffice path to: ${path}`);
  }
}