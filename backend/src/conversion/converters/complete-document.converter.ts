// src/converters/complete-document.converter.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';

interface DocumentMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  wordCount?: number;
  subject?: string;
  keywords?: string;
}

@Injectable()
export class CompleteDocumentConverter {
  private readonly logger = new Logger(CompleteDocumentConverter.name);
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  async convert(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    this.validateInput(file, targetFormat);

    try {
      const conversionMap = {
        // PDF Conversions - use advanced converter for best results
        [`application/pdf:${DocumentFormat.DOCX}`]: () => this.pdfToAdvancedDocx(file),
        [`application/pdf:${DocumentFormat.TXT}`]: () => this.pdfToText(file),
        [`application/pdf:${DocumentFormat.PDF}`]: () => this.identityConversion(file),
        
        // Text Conversions
        [`text/plain:${DocumentFormat.PDF}`]: () => this.textToPdf(file),
        [`text/plain:${DocumentFormat.DOCX}`]: () => this.textToDocx(file),
        [`text/plain:${DocumentFormat.TXT}`]: () => this.identityConversion(file),
        
        // DOCX Conversions
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.PDF}`]: () => this.docxToPdf(file),
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.TXT}`]: () => this.docxToText(file),
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.DOCX}`]: () => this.identityConversion(file),
        
        // Legacy Word Document Conversions
        [`application/msword:${DocumentFormat.PDF}`]: () => this.docxToPdf(file),
        [`application/msword:${DocumentFormat.TXT}`]: () => this.docxToText(file),
        [`application/msword:${DocumentFormat.DOCX}`]: () => this.legacyDocToDocx(file),
        
        // Excel Conversions
        [`application/vnd.ms-excel:${DocumentFormat.PDF}`]: () => this.excelToPdf(file),
        [`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:${DocumentFormat.PDF}`]: () => this.excelToPdf(file),
        [`application/vnd.ms-excel:${DocumentFormat.TXT}`]: () => this.excelToText(file),
        [`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:${DocumentFormat.TXT}`]: () => this.excelToText(file),
        
        // PowerPoint Conversions
        [`application/vnd.ms-powerpoint:${DocumentFormat.PDF}`]: () => this.pptxToPdf(file),
        [`application/vnd.openxmlformats-officedocument.presentationml.presentation:${DocumentFormat.PDF}`]: () => this.pptxToPdf(file),
        [`application/vnd.ms-powerpoint:${DocumentFormat.TXT}`]: () => this.pptxToText(file),
        [`application/vnd.openxmlformats-officedocument.presentationml.presentation:${DocumentFormat.TXT}`]: () => this.pptxToText(file),
      };

      const conversionKey = `${file.mimetype}:${targetFormat}`;
      const conversionFunction = conversionMap[conversionKey];

      if (!conversionFunction) {
        throw new BadRequestException(
          `Conversion from ${file.mimetype} to ${targetFormat} is not supported`
        );
      }

      return await conversionFunction();
    } catch (error) {
      this.logger.error(`Conversion failed: ${error.message}`, error.stack);
      return {
        success: false,
        data: Buffer.alloc(0),
        mimeType: '',
        fileName: '',
        error: `Conversion failed: ${error.message}`,
      };
    }
  }

  private validateInput(file: Express.Multer.File, targetFormat: DocumentFormat): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    if (!file.mimetype) {
      throw new BadRequestException('File mimetype is required');
    }

    // Validate file signature for security
    this.validateFileSignature(file);
  }

  private validateFileSignature(file: Express.Multer.File): void {
    const signatures = {
      'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': Buffer.from([0x50, 0x4B, 0x03, 0x04]), // PK zip
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': Buffer.from([0x50, 0x4B, 0x03, 0x04]),
    };

    const signature = signatures[file.mimetype];
    if (signature) {
      const fileSignature = file.buffer.slice(0, signature.length);
      if (!fileSignature.equals(signature)) {
        throw new BadRequestException('File signature does not match expected format');
      }
    }
  }

  // ==================== PDF TO ADVANCED DOCX ====================
  private async pdfToAdvancedDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      this.logger.log('Using advanced PDF to DOCX conversion with enhanced formatting...');
      
      // Use the enhanced converter with advanced features
      const { EnhancedPdfToDocxConverter } = await import('./enhanced-pdf-to-docx.converter');
      const converter = new EnhancedPdfToDocxConverter();
      return await converter.convertPdfToDocx(file);
      
    } catch (error) {
      this.logger.error(`Advanced PDF to DOCX conversion failed: ${error.message}`);
      
      // Fallback to exact converter
      return await this.pdfToExactDocx(file);
    }
  }

  // ==================== PDF TO EXACT DOCX (Fallback) ====================
  private async pdfToExactDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      this.logger.log('Using exact PDF to DOCX conversion as fallback...');
      
      const { ExactFormatConverter } = await import('./exact-format-converter');
      const converter = new ExactFormatConverter();
      return await converter.convertToExactDocx(file);
      
    } catch (error) {
      this.logger.error(`Exact PDF to DOCX conversion failed: ${error.message}`);
      
      // Final fallback to basic conversion
      return await this.fallbackPdfToDocx(file);
    }
  }

  private async fallbackPdfToDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      this.logger.log('Using fallback PDF to DOCX conversion...');
      const text = await this.extractTextFromPdf(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content extracted from PDF');
      }
      
      return await this.textToDocx({
        ...file,
        buffer: Buffer.from(text, 'utf8'),
        originalname: file.originalname.replace('.pdf', '.txt')
      });
    } catch (fallbackError) {
      this.logger.error(`PDF to DOCX fallback also failed: ${fallbackError.message}`);
      throw new Error(`PDF to DOCX conversion failed: ${fallbackError.message}`);
    }
  }

  // ==================== PDF TO TEXT ====================
  private async pdfToText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromPdf(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content could be extracted from PDF');
      }
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`PDF to Text conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== TEXT TO PDF ====================
  private async textToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

      const text = file.buffer.toString('utf8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text content is empty');
      }
      
      const { lines, metadata } = this.processTextForPdf(text);
      
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const margin = 72;
      const lineHeight = 18;
      const fontSize = 12;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      // Add title if available
      if (metadata.likelyTitle) {
        currentPage.drawText(metadata.likelyTitle, {
          x: margin,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
      }

      for (const line of lines) {
        if (yPosition < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: pageWidth - (margin * 2),
        });

        yPosition -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
      };
    } catch (error) {
      this.logger.error(`Text to PDF conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== TEXT TO DOCX ====================
  private async textToDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
      const { Packer } = await import('docx');

      const text = file.buffer.toString('utf8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text content is empty');
      }
      
      const paragraphs = this.processTextForDocx(text);

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
                size: 24, // 12pt
              },
              paragraph: {
                spacing: {
                  line: 360, // 1.5 line spacing
                },
              },
            },
          ],
        },
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      return {
        success: true,
        data: buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.DOCX),
      };
    } catch (error) {
      this.logger.error(`Text to DOCX conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== DOCX TO PDF ====================
  private async docxToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      // First extract structured content from DOCX
      const docxContent = await this.extractStructuredContentFromDocx(file.buffer);
      
      // Then create PDF with proper formatting
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      
      const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
      const italicFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaOblique);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 72;
      
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      for (const element of docxContent.elements) {
        if (yPosition < margin + 50) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        const fontSize = this.getElementFontSize(element);
        const fontToUse = element.isBold ? boldFont : (element.isItalic ? italicFont : font);
        const spacing = this.getElementSpacing(element);

        currentPage.drawText(element.text, {
          x: margin + element.indent,
          y: yPosition,
          size: fontSize,
          font: fontToUse,
          color: rgb(0, 0, 0),
          maxWidth: pageWidth - (margin * 2) - element.indent,
        });

        yPosition -= spacing;
      }

      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
      };
    } catch (error) {
      this.logger.error(`DOCX to PDF conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== DOCX TO TEXT ====================
  private async docxToText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromDocx(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content could be extracted from DOCX');
      }
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`DOCX to Text conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== LEGACY DOC TO DOCX ====================
  private async legacyDocToDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      // Convert legacy .doc to .docx via text extraction
      const text = await this.extractTextFromLegacyDoc(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content could be extracted from legacy DOC file');
      }
      
      return await this.textToDocx({
        ...file,
        buffer: Buffer.from(text, 'utf8'),
        originalname: file.originalname.replace('.doc', '.txt')
      });
    } catch (error) {
      this.logger.error(`Legacy DOC to DOCX conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== EXCEL TO PDF ====================
  private async excelToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const workbookData = await this.extractDataFromExcel(file.buffer);
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      
      const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;

      for (const sheet of workbookData.sheets) {
        if (sheet.data.length === 0) continue;

        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let yPosition = pageHeight - margin;

        // Add sheet name as title
        currentPage.drawText(`Sheet: ${sheet.name}`, {
          x: margin,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 30;

        // Add table headers
        const headers = Object.keys(sheet.data[0]);
        let xPosition = margin;
        const colWidth = (pageWidth - (margin * 2)) / Math.min(headers.length, 6); // Limit columns

        for (const header of headers.slice(0, 6)) { // Limit to 6 columns
          currentPage.drawText(header, {
            x: xPosition,
            y: yPosition,
            size: 12,
            font: boldFont,
            color: rgb(0, 0, 0),
            maxWidth: colWidth - 10,
          });
          xPosition += colWidth;
        }
        yPosition -= 20;

        // Add table data (limit rows for performance)
        for (const row of sheet.data.slice(0, 100)) {
          if (yPosition < margin + 50) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - margin;
          }

          xPosition = margin;
          for (const [key, value] of Object.entries(row).slice(0, 6)) {
            const cellText = String(value || '').substring(0, 30); // Limit text length
            currentPage.drawText(cellText, {
              x: xPosition,
              y: yPosition,
              size: 10,
              font: font,
              color: rgb(0, 0, 0),
              maxWidth: colWidth - 10,
            });
            xPosition += colWidth;
          }
          yPosition -= 15;
        }
      }

      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
      };
    } catch (error) {
      this.logger.error(`Excel to PDF conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== EXCEL TO TEXT ====================
  private async excelToText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromExcel(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No data could be extracted from Excel file');
      }
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`Excel to Text conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== POWERPOINT TO PDF ====================
  private async pptxToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const presentationData = await this.extractDataFromPptx(file.buffer);
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      
      const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      for (const slide of presentationData.slides) {
        const currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Add slide title
        if (slide.title) {
          currentPage.drawText(slide.title, {
            x: 72,
            y: pageHeight - 100,
            size: 20,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        }

        // Add slide content
        let yPosition = pageHeight - 150;
        for (const content of slide.content.slice(0, 20)) { // Limit content per slide
          if (yPosition < 100) break;
          
          currentPage.drawText(content, {
            x: 72,
            y: yPosition,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
            maxWidth: pageWidth - 144,
          });
          
          yPosition -= 20;
        }
      }

      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
      };
    } catch (error) {
      this.logger.error(`PowerPoint to PDF conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== POWERPOINT TO TEXT ====================
  private async pptxToText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromPptx(file.buffer);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content could be extracted from PowerPoint file');
      }
      
      return {
        success: true,
        data: Buffer.from(text, 'utf8'),
        mimeType: 'text/plain; charset=utf-8',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`PowerPoint to Text conversion failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== IDENTITY CONVERSION ====================
  private async identityConversion(file: Express.Multer.File): Promise<ConversionResult> {
    return {
      success: true,
      data: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
    };
  }

  // ==================== TEXT EXTRACTION METHODS ====================

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      // Try multiple PDF parsing engines with better error handling
      const extractionMethods = [
        () => this.extractTextWithPdfParse(buffer),
        () => this.extractTextWithPdfJs(buffer),
      ];

      let bestResult = '';
      
      for (const method of extractionMethods) {
        try {
          const result = await method();
          if (result && result.trim().length > bestResult.length) {
            bestResult = result;
          }
        } catch (methodError) {
          this.logger.debug(`PDF extraction method failed: ${methodError.message}`);
          continue;
        }
      }

      if (bestResult.trim().length > 0) {
        return this.cleanExtractedText(bestResult);
      }

      throw new Error('All PDF text extraction methods failed or returned empty content');
    } catch (error) {
      this.logger.warn(`PDF text extraction failed: ${error.message}`);
      throw new Error(`Unable to extract text from PDF: ${error.message}`);
    }
  }

  private async extractTextWithPdfParse(buffer: Buffer): Promise<string> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text || '';
    } catch (error) {
      throw new Error(`pdf-parse failed: ${error.message}`);
    }
  }

  private async extractTextWithPdfJs(buffer: Buffer): Promise<string> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      if (pdf.destroy) {
        pdf.destroy();
      }
      
      return fullText;
    } catch (error) {
      throw new Error(`PDF.js failed: ${error.message}`);
    }
  }

  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.value && result.value.trim().length > 0) {
        return this.cleanExtractedText(result.value);
      }
      
      throw new Error('Mammoth returned empty text');
    } catch (error) {
      this.logger.warn(`Primary DOCX extraction failed: ${error.message}, trying fallback...`);
      
      try {
        const text = await this.extractTextFromDocxWithJSZip(buffer);
        if (text && text.trim().length > 0) {
          return this.cleanExtractedText(text);
        }
        throw new Error('JSZip extraction also returned empty text');
      } catch (fallbackError) {
        this.logger.warn(`DOCX text extraction fallback failed: ${fallbackError.message}`);
        throw new Error(`Unable to extract text from DOCX: ${fallbackError.message}`);
      }
    }
  }

  private async extractTextFromDocxWithJSZip(buffer: Buffer): Promise<string> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      
      let fullText = '';
      
      // Extract from main document
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (documentXml) {
        const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const extractedText = textMatches.map(match => 
          match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')
        ).join(' ');
        fullText += extractedText;
      }
      
      return fullText.trim();
    } catch (error) {
      throw new Error(`JSZip DOCX extraction failed: ${error.message}`);
    }
  }

  private async extractTextFromLegacyDoc(buffer: Buffer): Promise<string> {
    try {
      // For legacy .doc files, try to extract any readable text
      const text = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
      
      // Filter out binary data and keep only readable text
      const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
      const cleanedText = this.cleanExtractedText(readableText);
      
      if (cleanedText.trim().length > 0) {
        return cleanedText;
      }
      
      throw new Error('No readable text found in legacy DOC file');
    } catch (error) {
      throw new Error(`Legacy DOC extraction failed: ${error.message}`);
    }
  }

  private async extractStructuredContentFromDocx(buffer: Buffer): Promise<any> {
    try {
      const text = await this.extractTextFromDocx(buffer);
      return this.parseDocxStructure(text);
    } catch (error) {
      this.logger.warn(`Structured DOCX extraction failed: ${error.message}`);
      // Fallback to basic text structure
      const text = buffer.toString('utf8', 0, 10000);
      return this.parseDocxStructure(text);
    }
  }

  private parseDocxStructure(text: string): any {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const elements = [];

    for (const line of lines) {
      const element = {
        text: line.trim(),
        isBold: this.isLikelyBold(line),
        isItalic: this.isLikelyItalic(line),
        isHeading: this.isLikelyHeading(line),
        indent: this.calculateIndentation(line),
        fontSize: this.estimateFontSize(line),
      };
      elements.push(element);
    }

    return { elements };
  }

  private async extractTextFromExcel(buffer: Buffer): Promise<string> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true });
      
      let fullText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        fullText += `Sheet: ${sheetName}\n`;
        
        for (const row of sheetData) {
          if (Array.isArray(row)) {
            fullText += row.map(cell => String(cell || '')).join('\t') + '\n';
          }
        }
        fullText += '\n';
      });

      return this.cleanExtractedText(fullText);
    } catch (error) {
      this.logger.warn(`Excel text extraction failed: ${error.message}`);
      throw new Error(`Unable to extract text from Excel: ${error.message}`);
    }
  }

  private async extractDataFromExcel(buffer: Buffer): Promise<any> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true });
      
      const sheets = [];
      
      for (const sheetName of workbook.SheetNames.slice(0, 10)) { // Limit sheets
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = data.slice(1, 101).map((row: any[]) => { // Limit rows
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj;
          }).filter((row: any) => Object.values(row).some(val => val !== undefined && val !== null));
          
          sheets.push({
            name: sheetName,
            data: rows
          });
        }
      }

      return { sheets };
    } catch (error) {
      this.logger.warn(`Excel data extraction failed: ${error.message}`);
      return { sheets: [] };
    }
  }

  private async extractTextFromPptx(buffer: Buffer): Promise<string> {
    try {
      return await this.extractTextFromPptxWithJSZip(buffer);
    } catch (error) {
      this.logger.warn(`PowerPoint text extraction failed: ${error.message}`);
      throw new Error(`Unable to extract text from PowerPoint: ${error.message}`);
    }
  }

  private async extractTextFromPptxWithJSZip(buffer: Buffer): Promise<string> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      
      let fullText = '';
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      ).sort();
      
      for (const slideFile of slideFiles.slice(0, 50)) {
        const slideContent = await zip.file(slideFile)?.async('text');
        if (slideContent) {
          const textMatches = slideContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
          const slideText = textMatches.map(match => 
            match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1')
          ).join(' ');
          
          if (slideText.trim()) {
            const slideNum = slideFile.match(/slide(\d+)\.xml/)?.[1] || 'N/A';
            fullText += `Slide ${slideNum}: ${slideText}\n\n`;
          }
        }
      }
      
      return this.cleanExtractedText(fullText) || 'No extractable text found in PowerPoint file.';
    } catch (error) {
      throw new Error(`JSZip PPTX extraction failed: ${error.message}`);
    }
  }

  private async extractDataFromPptx(buffer: Buffer): Promise<any> {
    try {
      const JSZip = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      
      const slides = [];
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      ).sort();

      for (const slideFile of slideFiles.slice(0, 50)) {
        const slideContent = await zip.file(slideFile)?.async('text');
        if (slideContent) {
          const titleMatch = slideContent.match(/<p:title>([^<]*)<\/p:title>/);
          const title = titleMatch ? titleMatch[1] : `Slide ${slides.length + 1}`;
          
          const textMatches = slideContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
          const content = textMatches.map(match => 
            match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1')
          ).filter(text => text.trim().length > 0);

          slides.push({
            title,
            content: content.slice(0, 20), // Limit content per slide
          });
        }
      }

      return { slides };
    } catch (error) {
      this.logger.warn(`PowerPoint data extraction failed: ${error.message}`);
      return { slides: [] };
    }
  }

  // ==================== UTILITY METHODS ====================

  private cleanExtractedText(text: string): string {
    if (!text) return 'No text content found.';

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      .replace(/([a-z])- ?\n ?([a-z])/gi, '$1$2')
      .trim() || 'No extractable text content found.';
  }

  private processTextForPdf(text: string): { lines: string[], metadata: any } {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const likelyTitle = lines.find(line => 
      line.length > 10 && line.length < 100 && 
      /^[A-Z][^.!?]*$/.test(line)
    );

    const processedLines: string[] = [];
    for (const line of lines) {
      if (line.length > 120) {
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + word).length <= 120) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) processedLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) processedLines.push(currentLine);
      } else {
        processedLines.push(line);
      }
    }

    return {
      lines: processedLines,
      metadata: { likelyTitle }
    };
  }

  private processTextForDocx(text: string): any[] {
    const { Paragraph, TextRun, HeadingLevel } = require('docx');
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const paragraphs = [];

    for (const line of lines) {
      if (this.isLikelyHeading(line)) {
        paragraphs.push(new Paragraph({
          text: line,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }));
      } else if (this.isLikelyListItem(line)) {
        paragraphs.push(new Paragraph({
          text: line.replace(/^[•·\-*\d+\.\s]+/, '').trim(),
          bullet: { level: 0 },
        }));
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 100 },
        }));
      }
    }

    return paragraphs;
  }

  private isLikelyBold(text: string): boolean {
    return text === text.toUpperCase() && text.length < 100 && text.length > 3;
  }

  private isLikelyItalic(text: string): boolean {
    return /^[^A-Z]*$/.test(text) && text.length > 10 && text.length < 200;
  }

  private isLikelyHeading(text: string): boolean {
    return (
      text.length < 100 &&
      (text === text.toUpperCase() || 
       /^(Chapter|Section|Part|Article)\s+\d+/i.test(text) ||
       /^\d+\.\s+[A-Z]/.test(text))
    );
  }

  private isLikelyListItem(text: string): boolean {
    return /^[•·\-*\d+\.\s]/.test(text);
  }

  private calculateIndentation(text: string): number {
    const leadingSpaces = text.match(/^\s*/)?.[0].length || 0;
    return Math.min(200, leadingSpaces * 10);
  }

  private estimateFontSize(text: string): number {
    if (this.isLikelyHeading(text)) return 16;
    if (this.isLikelyBold(text)) return 14;
    return 12;
  }

  private getElementFontSize(element: any): number {
    return element.fontSize || 12;
  }

  private getElementSpacing(element: any): number {
    if (element.isHeading) return 30;
    if (element.isBold) return 20;
    return 16;
  }

  private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const timestamp = new Date().getTime();
    return `${baseName}-converted-${timestamp}.${targetFormat}`;
  }

  // ==================== SUPPORTED CONVERSIONS ====================

  getSupportedConversions(): Array<{from: string[], to: DocumentFormat[]}> {
    return [
      {
        from: ['application/pdf'],
        to: [DocumentFormat.DOCX, DocumentFormat.TXT, DocumentFormat.PDF]
      },
      {
        from: ['text/plain'],
        to: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.TXT]
      },
      {
        from: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'
        ],
        to: [DocumentFormat.PDF, DocumentFormat.TXT, DocumentFormat.DOCX]
      },
      {
        from: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        to: [DocumentFormat.PDF, DocumentFormat.TXT]
      },
      {
        from: [
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint'
        ],
        to: [DocumentFormat.PDF, DocumentFormat.TXT]
      }
    ];
  }

  async getDocumentMetadata(buffer: Buffer, mimeType: string): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    try {
      if (mimeType === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        
        const pdfMetadata = await pdf.getMetadata();
        const info = pdfMetadata.info as {
          Title?: string;
          Author?: string;
          Creator?: string;
          Producer?: string;
          Subject?: string;
          Keywords?: string;
          CreationDate?: string;
          ModDate?: string;
        } || {};
        
        metadata.title = info.Title;
        metadata.author = info.Author;
        metadata.creator = info.Creator;
        metadata.producer = info.Producer;
        metadata.subject = info.Subject;
        metadata.keywords = info.Keywords;
        metadata.pageCount = pdf.numPages;
        
        if (info.CreationDate) {
          metadata.creationDate = this.parsePdfDate(info.CreationDate);
        }
        
        if (info.ModDate) {
          metadata.modificationDate = this.parsePdfDate(info.ModDate);
        }
        
        if (pdf.destroy) {
          pdf.destroy();
        }
      }
      
      // Calculate word count for text-based files
      if (mimeType === 'text/plain') {
        const text = buffer.toString('utf8', 0, 100000);
        metadata.wordCount = this.countWords(text);
      }
      
    } catch (error) {
      this.logger.warn(`Metadata extraction failed: ${error.message}`);
    }

    return metadata;
  }

  private parsePdfDate(pdfDate: string): Date | undefined {
    try {
      const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-]\d{2})'(\d{2})/);
      
      if (match) {
        const [_, year, month, day, hour, minute, second, tzOffset, tzMinute] = match;
        
        const utcDate = new Date(Date.UTC(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        ));
        
        const tzHours = parseInt(tzOffset);
        const tzMinutes = parseInt(tzMinute) * (tzHours >= 0 ? 1 : -1);
        const tzOffsetMs = (tzHours * 60 + tzMinutes) * 60 * 1000;
        
        return new Date(utcDate.getTime() - tzOffsetMs);
      }
      
      return new Date(pdfDate);
    } catch (error) {
      this.logger.warn(`Failed to parse PDF date: ${pdfDate}`);
      return undefined;
    }
  }

  private countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    return text
      .replace(/[^\w\s]|_/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .length;
  }
}