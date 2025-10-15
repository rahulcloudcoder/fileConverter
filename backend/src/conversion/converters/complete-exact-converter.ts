// src/converters/complete-exact-converter.ts
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
}

interface DocxElement {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isHeading: boolean;
  isList: boolean;
  indent: number;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  color?: string;
}

@Injectable()
export class CompleteExactConverter {
  private readonly logger = new Logger(CompleteExactConverter.name);
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  async convertWithExactFormat(
    file: Express.Multer.File,
    targetFormat: DocumentFormat,
  ): Promise<ConversionResult> {
    this.validateInput(file, targetFormat);

    try {
      const conversionMap = {
        // PDF Conversions
        [`application/pdf:${DocumentFormat.DOCX}`]: () => this.pdfToExactDocx(file),
        [`application/pdf:${DocumentFormat.PDF}`]: () => this.identityConversion(file),
        [`application/pdf:${DocumentFormat.TXT}`]: () => this.pdfToFormattedText(file),
        
        // DOCX Conversions  
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.PDF}`]: () => this.docxToExactPdf(file),
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.DOCX}`]: () => this.identityConversion(file),
        [`application/vnd.openxmlformats-officedocument.wordprocessingml.document:${DocumentFormat.TXT}`]: () => this.docxToFormattedText(file),
        
        // Image to PDF (preserve quality)
        [`image/jpeg:${DocumentFormat.PDF}`]: () => this.imageToPdf(file),
        [`image/png:${DocumentFormat.PDF}`]: () => this.imageToPdf(file),
        [`image/gif:${DocumentFormat.PDF}`]: () => this.imageToPdf(file),
        [`image/bmp:${DocumentFormat.PDF}`]: () => this.imageToPdf(file),
        [`image/tiff:${DocumentFormat.PDF}`]: () => this.imageToPdf(file),
        
        // Text conversions
        [`text/plain:${DocumentFormat.PDF}`]: () => this.textToFormattedPdf(file),
        [`text/plain:${DocumentFormat.DOCX}`]: () => this.textToFormattedDocx(file),
        [`text/plain:${DocumentFormat.TXT}`]: () => this.identityConversion(file),
      };

      const conversionKey = `${file.mimetype}:${targetFormat}`;
      const conversionFunction = conversionMap[conversionKey];

      if (!conversionFunction) {
        throw new BadRequestException(
          `Exact conversion from ${file.mimetype} to ${targetFormat} is not supported`
        );
      }

      return await conversionFunction();
    } catch (error) {
      this.logger.error(`Exact format conversion failed: ${error.message}`);
      return await this.fallbackConversion(file, targetFormat);
    }
  }

 // Add this method to your existing CompleteDocumentConverter class
private async pdfToExactDocx(file: Express.Multer.File): Promise<ConversionResult> {
  try {
    this.logger.log('Using exact format PDF to DOCX conversion...');
    
    // Import and use the exact format converter
    const { ExactFormatConverter } = await import('./exact-format-converter');
    const converter = new ExactFormatConverter();
    return await converter.convertToExactDocx(file);
    
  } catch (error) {
    this.logger.error(`Exact PDF to DOCX conversion failed: ${error.message}`);
    // Fallback to enhanced converter
    return await this.pdfToDocx(file);
  }
}

private async pdfToDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
        // Fallback to using the enhanced PDF to DOCX converter
        const { EnhancedPdfToDocxConverter } = await import('./enhanced-pdf-to-docx.converter');
        const converter = new EnhancedPdfToDocxConverter();
        return await converter.convertPdfToDocx(file);
    } catch (error) {
        this.logger.error(`Enhanced PDF to DOCX fallback also failed: ${error.message}`);
        throw new Error(`All PDF to DOCX conversion methods failed: ${error.message}`);
    }
}

  private async pdfToFormattedText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromPdf(file.buffer);
      const formattedText = this.formatTextWithStructure(text);
      
      return {
        success: true,
        data: Buffer.from(formattedText, 'utf8'),
        mimeType: 'text/plain',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`PDF to formatted text failed: ${error.message}`);
      throw error;
    }
  }

  private async docxToExactPdf(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      // Method 1: Enhanced manual conversion with better formatting
      return await this.convertDocxToPdfEnhanced(file);
    } catch (error) {
      this.logger.error(`DOCX to PDF conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertDocxToPdfEnhanced(file: Express.Multer.File): Promise<ConversionResult> {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    
    // Extract structured content from DOCX with advanced formatting detection
    const docxContent = await this.extractAdvancedFormattedContentFromDocx(file.buffer);
    
    const fonts = {
      regular: pdfDoc.embedStandardFont(StandardFonts.Helvetica),
      bold: pdfDoc.embedStandardFont(StandardFonts.HelveticaBold),
      italic: pdfDoc.embedStandardFont(StandardFonts.HelveticaOblique),
      boldItalic: pdfDoc.embedStandardFont(StandardFonts.HelveticaBoldOblique),
    };

    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = {
      top: 72,
      right: 72,
      bottom: 72,
      left: 72
    };
    
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin.top;

    // Add document title if available
    if (docxContent.metadata?.title) {
      yPosition = await this.addTitleToPdf(currentPage, docxContent.metadata.title, yPosition, margin, pageWidth, fonts.bold);
    }

    for (const element of docxContent.elements) {
      // Check if we need a new page
      if (yPosition < margin.bottom + 50) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin.top;
      }

      const font = this.selectFont(fonts, element);
      const fontSize = element.fontSize;
      const spacing = this.calculateSpacing(element);

      // Calculate x position based on alignment
      const textWidth = this.estimateTextWidth(element.text, fontSize);
      const xPosition = this.calculateXPosition(element.alignment, margin.left, pageWidth, textWidth, element.indent);

      // Draw the text
      currentPage.drawText(element.text, {
        x: xPosition,
        y: yPosition,
        size: fontSize,
        font: font,
        color: element.color ? this.parseColor(element.color) : rgb(0, 0, 0),
        maxWidth: pageWidth - margin.left - margin.right - element.indent,
      });

      yPosition -= spacing;

      // Add extra space after headings and between paragraphs
      if (element.isHeading) {
        yPosition -= 10;
      } else if (!element.isList) {
        yPosition -= 5; // Paragraph spacing
      }
    }

    const pdfBytes = await pdfDoc.save();
    
    return {
      success: true,
      data: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
      fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
    };
  }

  private async addTitleToPdf(page: any, title: string, yPosition: number, margin: any, pageWidth: number, font: any): Promise<number> {
    const titleFontSize = 20;
    const textWidth = this.estimateTextWidth(title, titleFontSize);
    const xPosition = (pageWidth - textWidth) / 2;

    page.drawText(title, {
      x: xPosition,
      y: yPosition,
      size: titleFontSize,
      font: font,
      color: this.parseColor('000000'),
    });

    return yPosition - 30; // Return new y position after title
  }

  private selectFont(fonts: any, element: DocxElement): any {
    if (element.isBold && element.isItalic) return fonts.boldItalic;
    if (element.isBold) return fonts.bold;
    if (element.isItalic) return fonts.italic;
    return fonts.regular;
  }

  private calculateSpacing(element: DocxElement): number {
    if (element.isHeading) return 25;
    if (element.isBold) return 18;
    if (element.isList) return 16;
    return 14;
  }

  private calculateXPosition(alignment: string, marginLeft: number, pageWidth: number, textWidth: number, indent: number): number {
    const availableWidth = pageWidth - marginLeft * 2;
    
    switch (alignment) {
      case 'center':
        return marginLeft + (availableWidth - textWidth) / 2 + indent;
      case 'right':
        return pageWidth - marginLeft - textWidth - indent;
      case 'left':
      default:
        return marginLeft + indent;
    }
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    // Average character width estimation
    const avgCharWidth = fontSize * 0.6;
    return text.length * avgCharWidth;
  }

  private parseColor(color: string): any {
    const { rgb } = require('pdf-lib');
    if (color && color.length === 6) {
      const r = parseInt(color.substring(0, 2), 16) / 255;
      const g = parseInt(color.substring(2, 4), 16) / 255;
      const b = parseInt(color.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    }
    return rgb(0, 0, 0);
  }

  private async extractAdvancedFormattedContentFromDocx(buffer: Buffer): Promise<any> {
    try {
      // Use JSZip to parse DOCX XML directly for better formatting detection
      const JSZip = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      
      const elements: DocxElement[] = [];
      let metadata: any = {};

      // Extract from main document
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (documentXml) {
        const parsedContent = await this.parseDocxXml(documentXml);
        elements.push(...parsedContent.elements);
        metadata = { ...metadata, ...parsedContent.metadata };
      }

      // Extract from headers
      const headerFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('word/header') && name.endsWith('.xml')
      );
      
      for (const headerFile of headerFiles.slice(0, 3)) {
        const headerXml = await zip.file(headerFile)?.async('text');
        if (headerXml) {
          const headerContent = await this.parseDocxXml(headerXml);
          elements.push(...headerContent.elements);
        }
      }

      return { elements, metadata };
    } catch (error) {
      this.logger.warn(`Advanced DOCX parsing failed: ${error.message}, using fallback`);
      return await this.extractBasicFormattedContentFromDocx(buffer);
    }
  }

  private async parseDocxXml(xmlContent: string): Promise<{ elements: DocxElement[], metadata: any }> {
    const elements: DocxElement[] = [];
    
    try {
      // Simple XML parsing for text and basic formatting
      const paragraphMatches = xmlContent.match(/<w:p[^>]*>.*?<\/w:p>/gs) || [];
      
      for (const paragraphXml of paragraphMatches) {
        // Extract text runs
        const textRunMatches = paragraphXml.match(/<w:r[^>]*>.*?<\/w:r>/gs) || [];
        let paragraphText = '';
        let isBold = false;
        let isItalic = false;
        let fontSize = 12;
        let color = '000000';

        for (const textRunXml of textRunMatches) {
          // Extract text
          const textMatch = textRunXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
          if (textMatch) {
            paragraphText += textMatch[1];
          }

          // Check for bold
          if (textRunXml.includes('<w:b/>') || textRunXml.includes('<w:b w:val="true"/>')) {
            isBold = true;
          }

          // Check for italic
          if (textRunXml.includes('<w:i/>') || textRunXml.includes('<w:i w:val="true"/>')) {
            isItalic = true;
          }

          // Extract font size
          const fontSizeMatch = textRunXml.match(/<w:sz[^>]*w:val="(\d+)"/);
          if (fontSizeMatch) {
            fontSize = parseInt(fontSizeMatch[1]) / 2; // Convert from half-points to points
          }

          // Extract color
          const colorMatch = textRunXml.match(/<w:color[^>]*w:val="([^"]+)"/);
          if (colorMatch) {
            color = colorMatch[1];
          }
        }

        if (paragraphText.trim()) {
          // Determine alignment
          const alignmentMatch = paragraphXml.match(/<w:jc[^>]*w:val="([^"]+)"/);
          const alignment = alignmentMatch ? 
            (alignmentMatch[1] === 'center' ? 'center' : alignmentMatch[1] === 'right' ? 'right' : 'left') : 
            'left';

          // Determine if it's a list item
          const isList = paragraphXml.includes('<w:numPr>');

          elements.push({
            text: paragraphText.trim(),
            isBold,
            isItalic,
            isHeading: this.isXmlHeading(paragraphXml, fontSize),
            isList,
            indent: this.calculateXmlIndentation(paragraphXml),
            fontSize,
            alignment,
            color: color !== 'auto' && color !== '000000' ? color : undefined
          });
        }
      }

      // Extract metadata
      const metadata = this.extractMetadataFromXml(xmlContent);

      return { elements, metadata };
    } catch (error) {
      this.logger.warn(`XML parsing failed: ${error.message}`);
      return { elements: [], metadata: {} };
    }
  }

  private isXmlHeading(paragraphXml: string, fontSize: number): boolean {
    return fontSize > 14 || 
           paragraphXml.includes('<w:outlineLvl') ||
           paragraphXml.includes('Heading');
  }

  private calculateXmlIndentation(paragraphXml: string): number {
    const indentMatch = paragraphXml.match(/<w:ind[^>]*w:left="(\d+)"/);
    if (indentMatch) {
      return parseInt(indentMatch[1]) / 20; // Convert from twips to points
    }
    return 0;
  }

  private extractMetadataFromXml(xmlContent: string): any {
    const metadata: any = {};
    
    // Extract title from the first significant paragraph
    const firstParagraphMatch = xmlContent.match(/<w:p[^>]*>.*?<w:t[^>]*>([^<]+)<\/w:t>.*?<\/w:p>/);
    if (firstParagraphMatch && firstParagraphMatch[1].length < 100) {
      metadata.title = firstParagraphMatch[1].trim();
    }

    return metadata;
  }

  private async extractBasicFormattedContentFromDocx(buffer: Buffer): Promise<any> {
    // Fallback to mammoth for basic text extraction
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      
      const lines = result.value.split('\n').filter(line => line.trim().length > 0);
      const elements: DocxElement[] = [];

      for (const line of lines) {
        elements.push({
          text: line.trim(),
          isBold: this.isLikelyBold(line),
          isItalic: this.isLikelyItalic(line),
          isHeading: this.isLikelyHeading(line),
          isList: this.isListItem(line),
          indent: this.calculateIndentation(line),
          fontSize: this.estimateFontSize(line),
          alignment: 'left',
        });
      }

      return { elements, metadata: {} };
    } catch (error) {
      this.logger.warn(`Basic DOCX extraction failed: ${error.message}`);
      return { elements: [], metadata: {} };
    }
  }

  private async docxToFormattedText(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      const text = await this.extractTextFromDocx(file.buffer);
      const formattedText = this.formatTextWithStructure(text);
      
      return {
        success: true,
        data: Buffer.from(formattedText, 'utf8'),
        mimeType: 'text/plain',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.TXT),
      };
    } catch (error) {
      this.logger.error(`DOCX to formatted text failed: ${error.message}`);
      throw error;
    }
  }

  private async imageToPdf(file: Express.Multer.File): Promise<ConversionResult> {
    const { PDFDocument } = await import('pdf-lib');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    
    let image;
    const mimeType = file.mimetype;
    
    try {
      if (mimeType === 'image/jpeg') {
        image = await pdfDoc.embedJpg(file.buffer);
      } else if (mimeType === 'image/png') {
        image = await pdfDoc.embedPng(file.buffer);
      } else {
     // Convert other formats to PNG using sharp
const sharpModule = await import('sharp');
const sharp = sharpModule.default; // Access the default export
const pngBuffer = await sharp(file.buffer).png().toBuffer();
image = await pdfDoc.embedPng(pngBuffer);
      }
      
      // Scale image to fit page while maintaining aspect ratio
      const { width, height } = image.scale(1);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      
      const scale = Math.min(pageWidth / width, pageHeight / height) * 0.9;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      // Center image on page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;
      
      page.drawImage(image, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
      
      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.PDF),
      };
    } catch (error) {
      this.logger.error(`Image to PDF conversion failed: ${error.message}`);
      throw new Error(`Image to PDF conversion failed: ${error.message}`);
    }
  }

  private async textToFormattedPdf(file: Express.Multer.File): Promise<ConversionResult> {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    
    const pdfDoc = await PDFDocument.create();
    const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    const boldFont = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

    const text = file.buffer.toString('utf8');
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 72;
    const lineHeight = 18;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    for (const line of lines) {
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      const isHeading = this.isLikelyHeading(line);
      const fontToUse = isHeading ? boldFont : font;
      const fontSize = isHeading ? 16 : 12;

      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: fontToUse,
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
  }

  private async textToFormattedDocx(file: Express.Multer.File): Promise<ConversionResult> {
    const { Document, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const { Packer } = await import('docx');

    const text = file.buffer.toString('utf8');
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const children = [];

    for (const line of lines) {
      const isHeading = this.isLikelyHeading(line);
      const isListItem = this.isListItem(line);
      
      if (isListItem) {
        children.push(new Paragraph({
          text: line.replace(/^[•·\-*\d+\.\s]+/, '').trim(),
          bullet: { level: 0 },
        }));
      } else {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: isHeading,
              size: isHeading ? 24 : 20,
            })
          ],
          heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
          spacing: {
            line: 240,
            after: isHeading ? 200 : 100,
          }
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    return {
      success: true,
      data: buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: this.getOutputFileName(file.originalname, DocumentFormat.DOCX),
    };
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text || '';
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      throw new Error(`DOCX text extraction failed: ${error.message}`);
    }
  }

  private formatTextWithStructure(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let formattedText = '';

    for (const line of lines) {
      if (this.isLikelyHeading(line)) {
        formattedText += `\n${line.toUpperCase()}\n${'='.repeat(line.length)}\n\n`;
      } else if (this.isListItem(line)) {
        formattedText += `• ${line.replace(/^[•·\-*\d+\.\s]+/, '').trim()}\n`;
      } else {
        formattedText += `${line}\n`;
      }
    }

    return formattedText.trim();
  }

  private isLikelyHeading(line: string): boolean {
    return line.length < 100 && (
      line === line.toUpperCase() || 
      /^(#|##|###|####)\s/.test(line) ||
      /^(CHAPTER|SECTION|PART|TITLE|RESUME|EDUCATION|EXPERIENCE|SKILLS)/i.test(line)
    );
  }

  private isListItem(line: string): boolean {
    return /^[•·\-*\d+\.\s]/.test(line.trim());
  }

  private isLikelyBold(line: string): boolean {
    return line === line.toUpperCase() && line.length < 100;
  }

  private isLikelyItalic(line: string): boolean {
    return /^[^A-Z]*$/.test(line) && line.length > 10;
  }

  private calculateIndentation(line: string): number {
    const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
    return Math.min(200, leadingSpaces * 10);
  }

  private estimateFontSize(line: string): number {
    if (this.isLikelyHeading(line)) return 16;
    if (this.isLikelyBold(line)) return 14;
    return 12;
  }

  private async fallbackConversion(file: Express.Multer.File, targetFormat: DocumentFormat): Promise<ConversionResult> {
    this.logger.warn(`Using fallback conversion for ${file.mimetype} to ${targetFormat}`);
    
    try {
      const { CompleteDocumentConverter } = await import('./complete-document.converter');
      const converter = new CompleteDocumentConverter();
      return await converter.convert(file, targetFormat);
    } catch (fallbackError) {
      this.logger.error(`Fallback conversion also failed: ${fallbackError.message}`);
      throw new Error(`Conversion failed: ${fallbackError.message}`);
    }
  }

  private validateInput(file: Express.Multer.File, targetFormat: DocumentFormat): void {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    if (!this.isConversionSupported(file.mimetype, targetFormat)) {
      throw new BadRequestException(
        `Conversion from ${file.mimetype} to ${targetFormat} is not supported`
      );
    }
  }

  private isConversionSupported(mimeType: string, targetFormat: DocumentFormat): boolean {
    const supported = this.getSupportedExactConversions();
    return supported.some(conv => 
      conv.from.includes(mimeType) && conv.to.includes(targetFormat)
    );
  }

  private async identityConversion(file: Express.Multer.File): Promise<ConversionResult> {
    return {
      success: true,
      data: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
    };
  }

  private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const timestamp = new Date().getTime();
    return `${baseName}-exact-${timestamp}.${targetFormat}`;
  }

  getSupportedExactConversions(): Array<{from: string[], to: DocumentFormat[]}> {
    return [
      {
        from: ['application/pdf'],
        to: [DocumentFormat.DOCX, DocumentFormat.PDF, DocumentFormat.TXT]
      },
      {
        from: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        to: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.TXT]
      },
      {
        from: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'],
        to: [DocumentFormat.PDF]
      },
      {
        from: ['text/plain'],
        to: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.TXT]
      }
    ];
  }
}