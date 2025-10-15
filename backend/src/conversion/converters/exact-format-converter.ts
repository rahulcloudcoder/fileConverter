// src/converters/exact-format-converter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';

interface TextElement {
  text: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

interface PageContent {
  pageNumber: number;
  width: number;
  height: number;
  elements: TextElement[];
  images: any[];
}

interface PdfContent {
  pages: PageContent[];
  metadata: any;
}

@Injectable()
export class ExactFormatConverter {
  private readonly logger = new Logger(ExactFormatConverter.name);

  async convertToExactDocx(file: Express.Multer.File): Promise<ConversionResult> {
    try {
      this.logger.log('Starting exact format PDF to DOCX conversion...');
      
      if (file.mimetype !== 'application/pdf') {
        throw new Error('Only PDF files are supported for exact conversion');
      }

      // Use multiple conversion engines for best results
      const conversionResults = await Promise.allSettled([
        this.convertWithAdvancedPdfParser(file.buffer),
        this.convertWithPdfLib(file.buffer),
        this.convertWithBasicExtraction(file.buffer),
      ]);

      // Choose the best result
      let bestResult: Buffer | null = null;
      for (const result of conversionResults) {
        if (result.status === 'fulfilled' && result.value) {
          bestResult = result.value;
          break;
        }
      }

      if (!bestResult) {
        throw new Error('All conversion methods failed');
      }

      return {
        success: true,
        data: bestResult,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: this.getOutputFileName(file.originalname, DocumentFormat.DOCX),
      };
    } catch (error) {
      this.logger.error(`Exact PDF to DOCX conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertWithAdvancedPdfParser(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      this.logger.log('Using advanced PDF parser for conversion...');
      
      const pdfContent = await this.parsePdfWithFormatting(pdfBuffer);
      return await this.createFormattedDocx(pdfContent);
    } catch (error) {
      this.logger.warn(`Advanced PDF parser failed: ${error.message}`);
      throw error;
    }
  }

  private async convertWithPdfLib(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      const content = await this.extractStructuredContent(pdfDoc);
      return await this.createFormattedDocx(content);
    } catch (error) {
      this.logger.warn(`PDF-lib conversion failed: ${error.message}`);
      throw error;
    }
  }

  private async convertWithBasicExtraction(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // Fallback to basic text extraction with formatting
      const text = await this.extractTextWithBasicFormatting(pdfBuffer);
      return await this.createBasicFormattedDocx(text);
    } catch (error) {
      this.logger.warn(`Basic extraction failed: ${error.message}`);
      throw error;
    }
  }

  private async parsePdfWithFormatting(pdfBuffer: Buffer): Promise<PdfContent> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure PDF.js worker
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
      const pdf = await loadingTask.promise;

      const content: PdfContent = {
        pages: [],
        metadata: {}
      };

      // Extract metadata
      try {
        const metadata = await pdf.getMetadata();
        content.metadata = metadata;
      } catch (error) {
        this.logger.warn('Could not extract PDF metadata');
      }

      // Extract pages with formatting
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const pageContent = await this.extractPageWithFormatting(page, pageNum);
          content.pages.push(pageContent);
        } catch (pageError) {
          this.logger.warn(`Error processing page ${pageNum}: ${pageError.message}`);
        }
      }

      await pdf.destroy();
      return content;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  private async extractPageWithFormatting(page: any, pageNumber: number): Promise<PageContent> {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    const elements: TextElement[] = [];
    
    for (const item of textContent.items) {
      const transform = item.transform;
      const x = transform[4];
      const y = viewport.height - transform[5]; // Convert to top-down coordinates
      
      const element: TextElement = {
        text: item.str,
        fontSize: this.calculateFontSize(item, transform),
        fontFamily: this.mapFontFamily(item.fontName),
        bold: this.isBoldFont(item.fontName),
        italic: this.isItalicFont(item.fontName),
        color: this.extractColor(item),
        x: x,
        y: y,
        width: item.width || this.estimateTextWidth(item.str, 12),
        height: item.height || 12,
        alignment: this.determineElementAlignment(x, viewport.width)
      };
      
      elements.push(element);
    }

    // Sort elements by position (top to bottom, left to right)
    elements.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 10) return yDiff;
      return a.x - b.x;
    });

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      elements,
      images: []
    };
  }

  private calculateFontSize(item: any, transform: number[]): number {
    const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
    const scaleY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
    const avgScale = (scaleX + scaleY) / 2;
    return Math.max(8, Math.round(avgScale * 72 / 96 * 10) / 10);
  }

  private mapFontFamily(fontName: string): string {
    if (!fontName) return 'Arial';
    
    const fontMap: { [key: string]: string } = {
      'times': 'Times New Roman',
      'helvetica': 'Arial',
      'courier': 'Courier New',
      'symbol': 'Symbol',
      'zapfdingbats': 'Wingdings',
      'arial': 'Arial',
      'calibri': 'Calibri',
      'cambria': 'Cambria',
      'verdana': 'Verdana',
      'tahoma': 'Tahoma',
      'georgia': 'Georgia'
    };

    const lowerFont = fontName.toLowerCase();
    for (const [pdfFont, wordFont] of Object.entries(fontMap)) {
      if (lowerFont.includes(pdfFont)) {
        return wordFont;
      }
    }

    return 'Arial';
  }

  private isBoldFont(fontName: string): boolean {
    if (!fontName) return false;
    
    const boldIndicators = ['bold', 'black', 'heavy', 'boldmt', 'bd', 'b', 'semibold', 'demibold'];
    return boldIndicators.some(indicator => fontName.toLowerCase().includes(indicator));
  }

  private isItalicFont(fontName: string): boolean {
    if (!fontName) return false;
    
    const italicIndicators = ['italic', 'oblique', 'it', 'i', 'obl'];
    return italicIndicators.some(indicator => fontName.toLowerCase().includes(indicator));
  }

  private extractColor(item: any): string {
    if (item.color && item.color.length >= 3) {
      const [r, g, b] = item.color.slice(0, 3);
      const hexR = Math.round(r * 255).toString(16).padStart(2, '0');
      const hexG = Math.round(g * 255).toString(16).padStart(2, '0');
      const hexB = Math.round(b * 255).toString(16).padStart(2, '0');
      return `${hexR}${hexG}${hexB}`;
    }
    return '000000';
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.6;
  }

  private determineElementAlignment(x: number, pageWidth: number): 'left' | 'center' | 'right' | 'justify' {
    if (x < pageWidth * 0.2) return 'left';
    if (x > pageWidth * 0.8) return 'right';
    if (x > pageWidth * 0.4 && x < pageWidth * 0.6) return 'center';
    return 'left';
  }

  private async extractStructuredContent(pdfDoc: any): Promise<PdfContent> {
    const pages = pdfDoc.getPages();
    const content: PdfContent = {
      pages: [],
      metadata: {}
    };

    try {
      const metadata = await pdfDoc.getMetadata();
      content.metadata = metadata;
    } catch (error) {
      this.logger.warn('Could not extract PDF metadata');
    }

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      content.pages.push({
        pageNumber: i + 1,
        width,
        height,
        elements: [{
          text: `Page ${i + 1} - Content extracted via PDF-lib`,
          fontSize: 12,
          fontFamily: 'Arial',
          bold: false,
          italic: false,
          color: '000000',
          x: 50,
          y: height - 50,
          width: width - 100,
          height: 20,
          alignment: 'left'
        }],
        images: []
      });
    }

    return content;
  }

  private async extractTextWithBasicFormatting(pdfBuffer: Buffer): Promise<string> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer);
      return data.text || '';
    } catch (error) {
      throw new Error(`Basic text extraction failed: ${error.message}`);
    }
  }

  private async createFormattedDocx(content: PdfContent): Promise<Buffer> {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = await import('docx');
    const { Packer } = await import('docx');

    const children = [];

    // Add title from metadata
    if (content.metadata?.info?.Title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content.metadata.info.Title,
              bold: true,
              size: 32,
              font: 'Arial',
            })
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
    }

    // Process each page
    for (const page of content.pages) {
      if (page.pageNumber > 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      // Group elements by vertical position to form paragraphs
      const paragraphs = this.groupElementsIntoParagraphs(page.elements);
      
      for (const paragraphElements of paragraphs) {
        if (paragraphElements.length === 0) continue;

        const textRuns = [];
        let currentStyle = {
          bold: paragraphElements[0].bold,
          italic: paragraphElements[0].italic,
          fontSize: paragraphElements[0].fontSize,
          fontFamily: paragraphElements[0].fontFamily,
          color: paragraphElements[0].color
        };

        let currentText = '';

        for (let i = 0; i < paragraphElements.length; i++) {
          const element = paragraphElements[i];
          const style = {
            bold: element.bold,
            italic: element.italic,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            color: element.color
          };

          // Check if style changed
          const styleChanged = 
            style.bold !== currentStyle.bold ||
            style.italic !== currentStyle.italic ||
            Math.abs(style.fontSize - currentStyle.fontSize) > 1 ||
            style.fontFamily !== currentStyle.fontFamily ||
            style.color !== currentStyle.color;

          if (styleChanged && currentText.length > 0) {
            textRuns.push(new TextRun({
              text: currentText,
              bold: currentStyle.bold,
              italics: currentStyle.italic,
              size: Math.max(16, Math.floor(currentStyle.fontSize * 2)),
              font: currentStyle.fontFamily,
              color: currentStyle.color !== '000000' ? currentStyle.color : undefined,
            }));
            currentText = '';
            currentStyle = style;
          }

          currentText += element.text;
          if (i < paragraphElements.length - 1) {
            const nextElement = paragraphElements[i + 1];
            const gap = nextElement.x - (element.x + element.width);
            if (gap > element.fontSize * 0.5) {
              currentText += ' ';
            }
          }
        }

        // Add the last text run
        if (currentText.length > 0) {
          textRuns.push(new TextRun({
            text: currentText,
            bold: currentStyle.bold,
            italics: currentStyle.italic,
            size: Math.max(16, Math.floor(currentStyle.fontSize * 2)),
            font: currentStyle.fontFamily,
            color: currentStyle.color !== '000000' ? currentStyle.color : undefined,
          }));
        }

        if (textRuns.length > 0) {
          const firstElement = paragraphElements[0];
          const isHeading = this.isLikelyHeading(paragraphElements);
          
          children.push(new Paragraph({
           children: [
                        new TextRun({
                            text: content.metadata.info.Title,
                            bold: true,
                            size: 32,
                            font: 'Arial',
                        })
                    ],
            heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
            spacing: {
              line: 240,
              after: isHeading ? 200 : 100,
              before: isHeading ? 200 : 100,
            },
            indent: {
              left: Math.max(0, firstElement.x - 50),
            }
          }));
        }
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private groupElementsIntoParagraphs(elements: TextElement[]): TextElement[][] {
    if (elements.length === 0) return [];

    const paragraphs: TextElement[][] = [];
    let currentParagraph: TextElement[] = [elements[0]];

    for (let i = 1; i < elements.length; i++) {
      const current = elements[i];
      const previous = elements[i - 1];

      // Check if this element belongs to the same paragraph
      const isSameLine = Math.abs(current.y - previous.y) < 10;
      const reasonableGap = current.x - (previous.x + previous.width) < 100;

      if (isSameLine && reasonableGap) {
        currentParagraph.push(current);
      } else {
        paragraphs.push(currentParagraph);
        currentParagraph = [current];
      }
    }

    paragraphs.push(currentParagraph);
    return paragraphs;
  }

  private isLikelyHeading(elements: TextElement[]): boolean {
    if (elements.length === 0) return false;

    const text = elements.map(e => e.text).join(' ');
    return (
      elements[0].fontSize > 13 ||
      elements[0].bold ||
      text.length < 100 && /^[A-Z][A-Z\s]+$/.test(text)
    );
  }

private async convertAlignment(alignment: string): Promise<any> {
    const { AlignmentType } = await import('docx');
    switch (alignment) {
        case 'center': return AlignmentType.CENTER;
        case 'right': return AlignmentType.RIGHT;
        case 'justify': return AlignmentType.JUSTIFIED;
        default: return AlignmentType.LEFT;
    }
}

  private async createBasicFormattedDocx(text: string): Promise<Buffer> {
    const { Document, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const { Packer } = await import('docx');

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const children = [];

    for (const line of lines) {
      const isHeading = this.isBasicHeading(line);
      
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

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    return await Packer.toBuffer(doc);
  }

  private isBasicHeading(line: string): boolean {
    return line.length < 100 && (line === line.toUpperCase() || /^(CHAPTER|SECTION|RESUME|EDUCATION|EXPERIENCE)/i.test(line));
  }

  private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const timestamp = new Date().getTime();
    return `${baseName}-exact-${timestamp}.${targetFormat}`;
  }
}