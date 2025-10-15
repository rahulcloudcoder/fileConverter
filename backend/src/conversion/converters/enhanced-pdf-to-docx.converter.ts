// src/converters/enhanced-pdf-to-docx.converter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConversionResult, DocumentFormat } from '../interfaces/conversion.interface';
import { AdvancedFontEngine, FontResolution } from '../../utils/font-engine';
import { AdvancedTypographyEngine } from '../../utils/typography-engine';
import { AdvancedLayoutEngine } from '../../utils/layout-engine';
import { AdvancedTableDetector, TableData } from '../../utils/table-detector';

interface EnhancedTextItem {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontName: string;
    bold: boolean;
    italic: boolean;
    color: string;
    page: number;
    spaceWidth: number;
    wordSpacing: number;
    letterSpacing: number;
    lineHeight: number;
    transform: number[];
    charSpacing: number;
    wordSpacingActual: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
}

interface TextBlock {
    items: EnhancedTextItem[];
    bounds: { x: number; y: number; width: number; height: number };
    type: 'paragraph' | 'heading' | 'list' | 'table' | 'caption' | 'address' | 'contact' | 'header' | 'footer';
    style: {
        alignment: 'left' | 'center' | 'right' | 'justify';
        indent: number;
        spacing: number;
        lineHeight: number;
        fontSize: number;
        fontFamily: string;
        hasBold: boolean;
        hasItalic: boolean;
        color: string;
    };
    text: string;
    maxItemSpacing: number;
    lineSpacing: number;
}

interface PageStructure {
    pageNumber: number;
    width: number;
    height: number;
    blocks: TextBlock[];
    headers: TextBlock[];
    footers: TextBlock[];
    tables: TableData[];
}

interface DocumentStructure {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    pages: PageStructure[];
}

@Injectable()
export class EnhancedPdfToDocxConverter {
    private readonly logger = new Logger(EnhancedPdfToDocxConverter.name);
    private pdfjsLib: any;
    private fontEngine = new AdvancedFontEngine();
    private typographyEngine = new AdvancedTypographyEngine();
    private layoutEngine = new AdvancedLayoutEngine();
    private tableDetector = new AdvancedTableDetector();

    async convertPdfToDocx(file: Express.Multer.File): Promise<ConversionResult> {
        try {
            this.logger.log('Starting enhanced PDF to DOCX conversion with advanced formatting...');
            
            const pdfBuffer = file.buffer;
            const documentStructure = await this.parsePdfWithAdvancedFormatting(pdfBuffer);
            const docxBuffer = await this.createAdvancedFormattedDocx(documentStructure);
            
            this.logger.log('Enhanced PDF to DOCX conversion completed successfully');

            return {
                success: true,
                data: docxBuffer,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                fileName: this.getOutputFileName(file.originalname, DocumentFormat.DOCX),
            };
        } catch (error) {
            this.logger.error(`Enhanced PDF to DOCX conversion failed: ${error.message}`);
            throw error;
        }
    }

    private async initializePdfJs(): Promise<void> {
        if (!this.pdfjsLib) {
            this.pdfjsLib = await import('pdfjs-dist');
            const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min');
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        }
    }

    private async parsePdfWithAdvancedFormatting(pdfBuffer: Buffer): Promise<DocumentStructure> {
        await this.initializePdfJs();
        
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = this.pdfjsLib.getDocument({ 
            data: uint8Array,
            disableFontFace: false,
            useSystemFonts: true,
            isEvalSupported: true,
            verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        const pages: PageStructure[] = [];
        let metadata: any = {};
        
        try {
            metadata = await pdf.getMetadata();
        } catch (error) {
            this.logger.warn('Could not extract PDF metadata');
        }

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 3.0 });
                
                const textContent = await page.getTextContent({
                    includeStyles: true,
                    disableCombineTextItems: false,
                });
                
                const enhancedItems = this.extractEnhancedTextItems(textContent, viewport, pageNum);
                const { mainBlocks, headers, footers } = this.separateHeadersAndFooters(enhancedItems, viewport);
                
                // Use advanced layout engine for better block detection
                const layoutElements = this.convertToLayoutElements(mainBlocks);
                const optimalBlocks = this.layoutEngine.calculateOptimalLayout(layoutElements, viewport.width);
                
                // Detect tables using advanced detector
                const tables = this.tableDetector.detectTables(layoutElements, viewport.width);
                
                const formattedBlocks = this.createFormattedBlocksFromLayout(optimalBlocks, viewport);
                
                pages.push({
                    pageNumber: pageNum,
                    width: viewport.width,
                    height: viewport.height,
                    blocks: formattedBlocks,
                    headers: this.createFormattedBlocks(headers, viewport),
                    footers: this.createFormattedBlocks(footers, viewport),
                    tables: tables
                });

                if (page.cleanup) {
                    page.cleanup();
                }
                
            } catch (pageError) {
                this.logger.warn(`Error processing page ${pageNum}: ${pageError.message}`);
            }
        }

        if (pdf.destroy) {
            pdf.destroy();
        }
        
        const info = metadata.info || {};
        return {
            title: info.Title || '',
            author: info.Author || '',
            subject: info.Subject || '',
            keywords: info.Keywords || '',
            pages,
        };
    }

    private convertToLayoutElements(enhancedItems: EnhancedTextItem[]): any[] {
        return enhancedItems.map(item => ({
            text: item.text,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            bold: item.bold,
            italic: item.italic,
            color: item.color,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            alignment: 'left' as const
        }));
    }

    private extractEnhancedTextItems(textContent: any, viewport: any, pageNum: number): EnhancedTextItem[] {
        const items: EnhancedTextItem[] = [];
        
        for (const item of textContent.items) {
            if (!item.str || item.str.trim().length === 0) continue;
            
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5];
            
            const fontSize = this.calculatePreciseFontSize(item, transform);
            const fontName = item.fontName || 'Helvetica';
            
            const styles = this.analyzeTextStyles(item, fontName, item.str, fontSize);
            const fontResolution = this.fontEngine.resolveFontFamily(fontName);
            
            items.push({
                text: item.str,
                x,
                y,
                width: this.calculateTextWidth(item, viewport, fontResolution.family, fontSize),
                height: this.typographyEngine.calculateOptimalLineHeight(fontSize),
                fontSize,
                fontName,
                bold: styles.bold,
                italic: styles.italic,
                color: styles.color,
                page: pageNum,
                spaceWidth: styles.spaceWidth,
                wordSpacing: styles.wordSpacing,
                letterSpacing: styles.letterSpacing,
                lineHeight: styles.lineHeight,
                transform: transform,
                charSpacing: styles.charSpacing,
                wordSpacingActual: styles.wordSpacingActual,
                fontFamily: fontResolution.family,
                fontWeight: fontResolution.weight,
                fontStyle: fontResolution.style
            });
        }
        
        return items;
    }

    private calculatePreciseFontSize(item: any, transform: number[]): number {
        const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
        const scaleY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
        const avgScale = (scaleX + scaleY) / 2;
        
        return Math.max(6, Math.round(avgScale * 72 / 96 * 100) / 100);
    }

    private calculateTextWidth(item: any, viewport: any, fontFamily: string, fontSize: number): number {
        if (item.width !== undefined && item.width !== null) {
            return item.width * viewport.scale;
        }
        
        return this.typographyEngine.calculateTextWidth(item.str, fontSize, fontFamily);
    }

    private analyzeTextStyles(item: any, fontName: string, text: string, fontSize: number): any {
        const fontResolution = this.fontEngine.resolveFontFamily(fontName);
        const bold = this.isBoldFontEnhanced(fontName, text, item, fontSize) || fontResolution.weight >= '600';
        const italic = this.isItalicFontEnhanced(fontName, item) || fontResolution.style === 'italic';
        const color = this.extractPreciseColor(item);
        
        const transform = item.transform;
        const charSpacing = transform[0];
        const wordSpacingActual = this.calculateWordSpacing(item, text);
        
        return {
            bold,
            italic,
            color,
            spaceWidth: fontSize * charSpacing * 0.3,
            wordSpacing: wordSpacingActual,
            letterSpacing: (charSpacing - 1) * fontSize,
            lineHeight: this.typographyEngine.calculateOptimalLineHeight(fontSize, this.isLikelyHeadingText(text, fontSize)),
            charSpacing,
            wordSpacingActual,
            fontFamily: fontResolution.family
        };
    }

    private isBoldFontEnhanced(fontName: string, text: string, item: any, fontSize: number): boolean {
        const boldIndicators = ['bold', 'black', 'heavy', 'boldmt', 'bd', 'b', 'semibold', 'demibold', 'demi'];
        const isNameBold = boldIndicators.some(indicator => 
            fontName.toLowerCase().includes(indicator)
        );
        
        const weightMatch = fontName.match(/(\d+)/);
        const fontWeight = weightMatch ? parseInt(weightMatch[1]) : 400;
        const isWeightBold = fontWeight >= 600;
        
        const isAllCaps = text === text.toUpperCase() && text.length > 2 && /[A-Z]/.test(text);
        const isLargeFont = fontSize > 14;

        const transform = item.transform;
        const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
        const isThickStroke = scaleX > 1.2;
        
        return isNameBold || isWeightBold || isAllCaps || isLargeFont || isThickStroke;
    }

    private isItalicFontEnhanced(fontName: string, item: any): boolean {
        const italicIndicators = ['italic', 'oblique', 'it', 'i', 'obl', 'italicmt'];
        const isNameItalic = italicIndicators.some(indicator => 
            fontName.toLowerCase().includes(indicator)
        );
        
        const transform = item.transform;
        const skewX = transform[1];
        const isSkewed = Math.abs(skewX) > 0.1;
        
        return isNameItalic || isSkewed;
    }

    private extractPreciseColor(item: any): string {
        if (item.color && item.color.length >= 3) {
            const [r, g, b] = item.color.slice(0, 3);
            if (r !== 0 || g !== 0 || b !== 0) {
                const hexR = Math.round(r * 255).toString(16).padStart(2, '0');
                const hexG = Math.round(g * 255).toString(16).padStart(2, '0');
                const hexB = Math.round(b * 255).toString(16).padStart(2, '0');
                return `#${hexR}${hexG}${hexB}`;
            }
        }
        return '#000000';
    }

    private calculateWordSpacing(item: any, text: string): number {
        if (text.includes(' ')) {
            const spaceMatches = text.match(/ /g);
            return spaceMatches ? spaceMatches.length * item.width / text.length : item.fontSize * 0.3;
        }
        return item.fontSize * 0.3;
    }

    private isLikelyHeadingText(text: string, fontSize: number): boolean {
        return fontSize > 13 || 
               text === text.toUpperCase() && text.length < 100 ||
               /^(CHAPTER|SECTION|PART|TITLE|RESUME|EDUCATION|EXPERIENCE|SKILLS)/i.test(text);
    }

    private separateHeadersAndFooters(items: EnhancedTextItem[], viewport: any): 
        { mainBlocks: EnhancedTextItem[], headers: EnhancedTextItem[], footers: EnhancedTextItem[] } {
        
        const headerThreshold = viewport.height * 0.1;
        const footerThreshold = viewport.height * 0.9;
        
        const headers: EnhancedTextItem[] = [];
        const footers: EnhancedTextItem[] = [];
        const mainBlocks: EnhancedTextItem[] = [];
        
        for (const item of items) {
            if (item.y < headerThreshold) {
                headers.push(item);
            } else if (item.y > footerThreshold) {
                footers.push(item);
            } else {
                mainBlocks.push(item);
            }
        }
        
        return { mainBlocks, headers, footers };
    }

    private createFormattedBlocksFromLayout(optimalBlocks: any[], viewport: any): TextBlock[] {
        return optimalBlocks.map(block => {
            const textBlock: TextBlock = {
                items: block.elements.map((el: any) => this.convertLayoutToEnhancedItem(el)),
                bounds: block.bounds,
                type: block.type as TextBlock['type'],
                style: {
                    alignment: this.detectBlockAlignmentFromLayout(block, viewport),
                    indent: this.calculateBlockIndentationFromLayout(block),
                    spacing: 0,
                    lineHeight: this.layoutEngine.calculateLineHeight(block.elements),
                    fontSize: block.avgFontSize,
                    fontFamily: this.getMostCommonFontFamily(block.elements),
                    hasBold: block.elements.some((el: any) => el.bold),
                    hasItalic: block.elements.some((el: any) => el.italic),
                    color: '#000000'
                },
                text: block.elements.map((el: any) => el.text).join(' '),
                maxItemSpacing: 0,
                lineSpacing: this.layoutEngine.calculateLineHeight(block.elements)
            };
            return textBlock;
        });
    }

    private convertLayoutToEnhancedItem(layoutElement: any): EnhancedTextItem {
        return {
            text: layoutElement.text,
            x: layoutElement.x,
            y: layoutElement.y,
            width: layoutElement.width,
            height: layoutElement.height,
            fontSize: layoutElement.fontSize,
            fontName: layoutElement.fontFamily,
            bold: layoutElement.bold,
            italic: layoutElement.italic,
            color: layoutElement.color,
            page: 1,
            spaceWidth: layoutElement.fontSize * 0.3,
            wordSpacing: layoutElement.fontSize * 0.3,
            letterSpacing: 0,
            lineHeight: layoutElement.height,
            transform: [1, 0, 0, 1, layoutElement.x, layoutElement.y],
            charSpacing: 1,
            wordSpacingActual: layoutElement.fontSize * 0.3,
            fontFamily: layoutElement.fontFamily,
            fontWeight: layoutElement.bold ? '700' : '400',
            fontStyle: layoutElement.italic ? 'italic' : 'normal'
        };
    }

    private detectBlockAlignmentFromLayout(block: any, viewport: any): 'left' | 'center' | 'right' | 'justify' {
        return this.layoutEngine.detectAlignment(block.elements, viewport.width) as any;
    }

    private calculateBlockIndentationFromLayout(block: any): number {
        if (block.elements.length === 0) return 0;
        const minX = Math.min(...block.elements.map((el: any) => el.x));
        return Math.max(0, minX);
    }

    private getMostCommonFontFamily(elements: any[]): string {
        const fontFamilies = elements.map(el => el.fontFamily);
        const frequency: { [key: string]: number } = {};
        let maxCount = 0;
        let mostCommon = 'Arial';

        for (const fontFamily of fontFamilies) {
            frequency[fontFamily] = (frequency[fontFamily] || 0) + 1;
            if (frequency[fontFamily] > maxCount) {
                maxCount = frequency[fontFamily];
                mostCommon = fontFamily;
            }
        }

        return mostCommon;
    }

    private createFormattedBlocks(items: EnhancedTextItem[], viewport: any): TextBlock[] {
        // Fallback method if layout engine doesn't provide optimal blocks
        if (items.length === 0) return [];

        const blocks: TextBlock[] = [];
        const sortedItems = [...items].sort((a, b) => {
            const yDiff = b.y - a.y;
            const lineTolerance = this.calculateLineHeightTolerance(items);
            if (Math.abs(yDiff) > lineTolerance) return yDiff;
            return a.x - b.x;
        });

        let currentBlock: TextBlock | null = null;
        const LINE_TOLERANCE = this.calculateLineHeightTolerance(items);

        for (const item of sortedItems) {
            if (!currentBlock) {
                currentBlock = this.createNewFormattedBlock(item);
                continue;
            }

            const lastItem = currentBlock.items[currentBlock.items.length - 1];
            const isSameLine = Math.abs(item.y - lastItem.y) < LINE_TOLERANCE;
            const horizontalGap = item.x - (lastItem.x + lastItem.width);
            const isReasonableGap = horizontalGap < lastItem.spaceWidth * 5;
            
            if (isSameLine && isReasonableGap) {
                currentBlock.items.push(item);
                this.updateBlockBounds(currentBlock, item);
                
                if (horizontalGap > currentBlock.maxItemSpacing) {
                    currentBlock.maxItemSpacing = horizontalGap;
                }
            } else {
                this.finalizeBlockFormatting(currentBlock, viewport);
                blocks.push(currentBlock);
                currentBlock = this.createNewFormattedBlock(item);
            }
        }

        if (currentBlock) {
            this.finalizeBlockFormatting(currentBlock, viewport);
            blocks.push(currentBlock);
        }

        return this.postProcessBlocks(blocks);
    }

    private calculateLineHeightTolerance(items: EnhancedTextItem[]): number {
        if (items.length === 0) return 8;
        const avgFontSize = items.reduce((sum, item) => sum + item.fontSize, 0) / items.length;
        return Math.max(5, avgFontSize * 0.8);
    }

    private createNewFormattedBlock(item: EnhancedTextItem): TextBlock {
        return {
            items: [item],
            bounds: {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
            },
            maxItemSpacing: 0,
            lineSpacing: item.lineHeight,
            style: {
                alignment: 'left',
                indent: item.x,
                lineHeight: item.lineHeight,
                fontSize: item.fontSize,
                fontFamily: item.fontFamily,
                spacing: 0,
                hasBold: item.bold,
                hasItalic: item.italic,
                color: item.color,
            },
            type: 'paragraph',
            text: item.text
        };
    }

    private updateBlockBounds(block: TextBlock, item: EnhancedTextItem): void {
        block.bounds.x = Math.min(block.bounds.x, item.x);
        block.bounds.y = Math.min(block.bounds.y, item.y);
        block.bounds.width = Math.max(block.bounds.width, item.x + item.width - block.bounds.x);
        block.bounds.height = Math.max(block.bounds.height, item.y + item.height - block.bounds.y);
    }

    private finalizeBlockFormatting(block: TextBlock, viewport: any): void {
        if (block.items.length === 0) return;

        const fontSizes = block.items.map(item => item.fontSize);
        const avgFontSize = fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
        const maxFontSize = Math.max(...fontSizes);
        const hasBold = block.items.some(item => item.bold);
        const hasItalic = block.items.some(item => item.italic);
        
        const fontFamilies = block.items.map(item => item.fontFamily);
        const mostCommonFont = this.getMostCommonValue(fontFamilies);
        
        block.style.fontSize = avgFontSize;
        block.style.hasBold = hasBold;
        block.style.hasItalic = hasItalic;
        block.style.fontFamily = mostCommonFont;
        block.style.lineHeight = this.typographyEngine.calculateOptimalLineHeight(avgFontSize, this.isLikelyHeading(block.items));

        block.text = this.buildBlockTextWithSpacing(block);
        block.type = this.detectBlockType(block, maxFontSize);
        block.style.alignment = this.detectBlockAlignment(block, viewport);
        block.style.indent = this.calculateBlockIndentation(block);
    }

    private getMostCommonValue(array: string[]): string {
        const frequency: { [key: string]: number } = {};
        let maxCount = 0;
        let mostCommon = array[0] || 'Arial';

        for (const value of array) {
            frequency[value] = (frequency[value] || 0) + 1;
            if (frequency[value] > maxCount) {
                maxCount = frequency[value];
                mostCommon = value;
            }
        }

        return mostCommon;
    }

    private buildBlockTextWithSpacing(block: TextBlock): string {
        if (block.items.length === 0) return '';
        
        let result = '';
        const sortedItems = [...block.items].sort((a, b) => a.x - b.x);
        
        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            result += item.text;
            
            if (i < sortedItems.length - 1) {
                const nextItem = sortedItems[i + 1];
                const gap = nextItem.x - (item.x + item.width);
                
                if (gap > item.spaceWidth * 3) {
                    result += '   ';
                } else if (gap > item.spaceWidth * 1.5) {
                    result += '  ';
                } else if (gap > item.spaceWidth * 0.5) {
                    result += ' ';
                }
            }
        }
        
        return result.trim();
    }

    private isLikelyHeading(elements: EnhancedTextItem[]): boolean {
        if (elements.length === 0) return false;
        const firstElement = elements[0];
        return elements.some(el => 
            el.fontSize > 13 || 
            el.bold || 
            (el.text === el.text.toUpperCase() && el.text.length < 100)
        );
    }

    private detectBlockType(block: TextBlock, maxFontSize: number): TextBlock['type'] {
        const text = block.text.toLowerCase();
        
        if (this.looksLikeHeading(block, maxFontSize)) return 'heading';
        if (this.looksLikeList(block)) return 'list';
        if (this.looksLikeAddress(block)) return 'address';
        if (this.looksLikeContactInfo(block)) return 'contact';
        if (this.looksLikeTable(block)) return 'table';
        
        return 'paragraph';
    }

    private looksLikeHeading(block: TextBlock, maxFontSize: number): boolean {
        const text = block.text;
        const isBold = block.style.hasBold;
        const isCentered = block.style.alignment === 'center';
        const isLargeFont = maxFontSize > 13;
        const isShortText = text.length < 200;
        const isAllCaps = text === text.toUpperCase() && text.length > 3;
        
        const headingPatterns = [
            /^(chapter|section|part|article|appendix)\s+\d+/i,
            /^\d+(\.\d+)*\s+[A-Z]/,
            /^(abstract|introduction|background|methodology|results|discussion|conclusion|references|bibliography)/i,
            /^(executive summary|table of contents|list of figures|list of tables)/i
        ];
        
        const isPatternMatch = headingPatterns.some(pattern => pattern.test(text));
        
        return (isLargeFont || isBold || isAllCaps) && isShortText && (isCentered || isPatternMatch);
    }

    private looksLikeList(block: TextBlock): boolean {
        const text = block.text.trim();
        const listPatterns = [
            /^[•·\-*\u2022\u2023\u2043]\s/,
            /^\d+\.\s/,
            /^[a-z]\)\s/,
            /^\(?\d+\)\s/,
        ];
        
        return listPatterns.some(pattern => pattern.test(text)) && text.length < 500;
    }

    private looksLikeAddress(block: TextBlock): boolean {
        const text = block.text;
        return /\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/i.test(text) ||
               /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}(-\d{4})?/.test(text) ||
               /(P\.?O\.?\s+Box|PO Box|Post Office Box)/i.test(text);
    }

    private looksLikeContactInfo(block: TextBlock): boolean {
        const text = block.text;
        return /\(\d{3}\)\s*\d{3}-\d{4}/.test(text) ||
               /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text) ||
               /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text) ||
               /(http|https|www\.)/i.test(text);
    }

    private looksLikeTable(block: TextBlock): boolean {
        if (block.items.length < 3) return false;
        const xPositions = block.items.map(item => item.x);
        const uniqueX = [...new Set(xPositions.map(x => Math.round(x / 10) * 10))];
        return uniqueX.length >= 2;
    }

    private detectBlockAlignment(block: TextBlock, viewport: any): 'left' | 'center' | 'right' | 'justify' {
        if (block.items.length === 0) return 'left';
        
        const firstX = block.items[0].x;
        const lastItem = block.items[block.items.length - 1];
        const lastX = lastItem.x + lastItem.width;
        const blockWidth = lastX - firstX;
        const pageCenter = viewport.width / 2;
        const blockCenter = firstX + blockWidth / 2;
        
        const centerThreshold = viewport.width * 0.15;
        
        if (Math.abs(blockCenter - pageCenter) < centerThreshold) {
            return 'center';
        }
        
        if (firstX > viewport.width * 0.7) {
            return 'right';
        }
        
        if (block.items.length > 1) {
            const totalGap = lastX - firstX - block.items.reduce((sum, item) => sum + item.width, 0);
            const avgGap = totalGap / (block.items.length - 1);
            if (avgGap > block.items[0].spaceWidth * 1.5) {
                return 'justify';
            }
        }
        
        return 'left';
    }

    private calculateBlockIndentation(block: TextBlock): number {
        if (block.items.length === 0) return 0;
        const minX = Math.min(...block.items.map(item => item.x));
        return Math.max(0, minX);
    }

    private postProcessBlocks(blocks: TextBlock[]): TextBlock[] {
        return blocks
            .filter(block => block.text.trim().length > 0)
            .map(block => this.enhanceBlockContent(block))
            .sort((a, b) => b.bounds.y - a.bounds.y);
    }

    private enhanceBlockContent(block: TextBlock): TextBlock {
        let cleanedText = block.text
            .replace(/\s+/g, ' ')
            .replace(/\s*\.\s*/g, '. ')
            .replace(/\s*,\s*/g, ', ')
            .replace(/\s*;\s*/g, '; ')
            .replace(/\s*:\s*/g, ': ')
            .trim();
        
        cleanedText = cleanedText
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([.!?])([A-Z])/g, '$1 $2')
            .replace(/(\w)\s+\.\s*(\w)/g, '$1. $2')
            .replace(/\s+$/gm, '');
        
        return {
            ...block,
            text: cleanedText
        };
    }

    private async createAdvancedFormattedDocx(content: DocumentStructure): Promise<Buffer> {
        const { 
            Document, 
            Paragraph, 
            TextRun, 
            HeadingLevel, 
            AlignmentType,
            convertInchesToTwip,
            Table,
            TableRow,
            TableCell,
            Packer,
            PageBreak
        } = await import('docx');

        const children = [];

        // Add document properties
        if (content.title) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: content.title,
                            bold: true,
                            size: 32,
                            font: 'Arial',
                        })
                    ],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 400,
                        before: 400,
                    },
                })
            );
        }

        // Process each page with advanced formatting
        for (const page of content.pages) {
            if (page.pageNumber > 1) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '', break: 1 })]
                }));
            }

            // Process tables first
            for (const tableData of page.tables) {
                const tableRows = tableData.rows.map(row => 
                    new TableRow({
                        children: row.cells.map(cell =>
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun(cell.text)],
                                    alignment: this.convertAlignment(cell.alignment)
                                })],
                                width: { size: 100 / tableData.columnCount, type: 'pct' }
                            })
                        ),
                        tableHeader: row.isHeader
                    })
                );
                
                children.push(new Table({ 
                    rows: tableRows,
                    width: { size: 100, type: 'pct' }
                }));
            }

            // Process all blocks in reading order
            const allBlocks = [
                ...page.headers,
                ...page.blocks,
                ...page.footers
            ].sort((a, b) => b.bounds.y - a.bounds.y);
            
            for (const block of allBlocks) {
                const paragraph = this.createFormattedParagraph(block);
                if (paragraph) {
                    children.push(paragraph);
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
                            spacing: {
                                line: 360,
                            },
                        },
                    },
                    {
                        id: "Heading1",
                        name: "Heading 1",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            bold: true,
                            size: 32,
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: {
                                before: 240,
                                after: 120,
                            },
                        },
                    },
                    {
                        id: "Heading2",
                        name: "Heading 2",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            bold: true,
                            size: 28,
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: {
                                before: 200,
                                after: 100,
                            },
                        },
                    },
                ],
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1),
                        },
                    },
                },
                children: children,
            }],
        });

        return await Packer.toBuffer(doc);
    }

    private createFormattedParagraph(block: TextBlock): any {
        const { 
            Paragraph, 
            TextRun, 
            HeadingLevel, 
            AlignmentType,
            convertInchesToTwip,
        } = require('docx');

        if (!block.text || block.text.trim().length === 0) {
            return null;
        }

        const textRuns = this.createFormattedTextRuns(block);
        if (textRuns.length === 0) return null;

        const paragraphConfig: any = {
            children: textRuns,
            alignment: this.convertAlignment(block.style.alignment),
            spacing: {
                line: convertInchesToTwip(block.style.lineHeight / 72),
                after: convertInchesToTwip(0.1),
                before: convertInchesToTwip(0.05),
            },
        };

        if (block.style.indent > 20) {
            paragraphConfig.indent = {
                left: convertInchesToTwip(block.style.indent / 72),
            };
        }

        switch (block.type) {
            case 'heading':
                paragraphConfig.heading = this.determineHeadingLevel(block);
                paragraphConfig.spacing.after = convertInchesToTwip(0.2);
                paragraphConfig.spacing.before = convertInchesToTwip(0.3);
                break;
                
            case 'list':
                paragraphConfig.bullet = {
                    level: Math.min(4, Math.floor(block.style.indent / 50)),
                };
                break;
                
            case 'table':
                paragraphConfig.style = 'Table';
                break;
                
            case 'address':
            case 'contact':
                paragraphConfig.spacing.after = convertInchesToTwip(0.02);
                paragraphConfig.spacing.before = convertInchesToTwip(0.02);
                break;
                
            case 'header':
            case 'footer':
                paragraphConfig.style = 'HeaderFooter';
                break;
        }

        return new Paragraph(paragraphConfig);
    }

    private createFormattedTextRuns(block: TextBlock): any[] {
        const { TextRun } = require('docx');
        
        if (this.hasConsistentStyle(block)) {
            return [
                new TextRun({
                    text: block.text,
                    bold: block.style.hasBold,
                    italic: block.style.hasItalic,
                    size: Math.max(20, Math.floor(block.style.fontSize * 2)),
                    font: block.style.fontFamily,
                    color: block.style.color !== '#000000' ? block.style.color.replace('#', '') : undefined,
                })
            ];
        }

        const textRuns = [];
        const sortedItems = [...block.items].sort((a, b) => a.x - b.x);
        
        let currentRun = {
            text: sortedItems[0].text,
            style: {
                bold: sortedItems[0].bold,
                italic: sortedItems[0].italic,
                fontSize: sortedItems[0].fontSize,
                fontFamily: sortedItems[0].fontFamily,
                color: sortedItems[0].color,
            }
        };

        for (let i = 1; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            const currentStyle = {
                bold: item.bold,
                italic: item.italic,
                fontSize: item.fontSize,
                fontFamily: item.fontFamily,
                color: item.color,
            };

            const styleChanged = 
                currentStyle.bold !== currentRun.style.bold ||
                currentStyle.italic !== currentRun.style.italic ||
                Math.abs(currentStyle.fontSize - currentRun.style.fontSize) > 1 ||
                currentStyle.color !== currentRun.style.color ||
                currentStyle.fontFamily !== currentRun.style.fontFamily;

            if (styleChanged) {
                textRuns.push(new TextRun({
                    text: currentRun.text,
                    bold: currentRun.style.bold,
                    italic: currentRun.style.italic,
                    size: Math.max(20, Math.floor(currentRun.style.fontSize * 2)),
                    font: currentRun.style.fontFamily,
                    color: currentRun.style.color !== '#000000' ? currentRun.style.color.replace('#', '') : undefined,
                }));
                currentRun = { text: item.text, style: currentStyle };
            } else {
                const prevItem = sortedItems[i - 1];
                const gap = item.x - (prevItem.x + prevItem.width);
                const expectedGap = this.typographyEngine.calculateTextWidth(' ', prevItem.fontSize, currentRun.style.fontFamily);
                
                if (gap > expectedGap * 2) {
                    currentRun.text += '  ';
                } else if (gap > expectedGap * 0.5) {
                    currentRun.text += ' ';
                }
                
                currentRun.text += item.text;
            }
        }

        if (currentRun.text.length > 0) {
            textRuns.push(new TextRun({
                text: currentRun.text,
                bold: currentRun.style.bold,
                italic: currentRun.style.italic,
                size: Math.max(20, Math.floor(currentRun.style.fontSize * 2)),
                font: currentRun.style.fontFamily,
                color: currentRun.style.color !== '#000000' ? currentRun.style.color.replace('#', '') : undefined,
            }));
        }

        return textRuns;
    }

    private hasConsistentStyle(block: TextBlock): boolean {
        if (block.items.length <= 1) return true;
        
        const firstItem = block.items[0];
        return block.items.every(item => 
            item.bold === firstItem.bold &&
            item.italic === firstItem.italic &&
            Math.abs(item.fontSize - firstItem.fontSize) < 1 &&
            item.color === firstItem.color
        );
    }

    private determineHeadingLevel(block: TextBlock): any {
        const { HeadingLevel } = require('docx');
        const fontSize = block.style.fontSize;
        
        if (fontSize > 18) return HeadingLevel.HEADING_1;
        if (fontSize > 16) return HeadingLevel.HEADING_2;
        if (fontSize > 14) return HeadingLevel.HEADING_3;
        return HeadingLevel.HEADING_4;
    }

    private convertAlignment(alignment: string): any {
        const { AlignmentType } = require('docx');
        switch (alignment) {
            case 'center': return AlignmentType.CENTER;
            case 'right': return AlignmentType.RIGHT;
            case 'justify': return AlignmentType.JUSTIFIED;
            default: return AlignmentType.LEFT;
        }
    }

    private getOutputFileName(originalName: string, targetFormat: DocumentFormat): string {
        const baseName = originalName.replace(/\.[^/.]+$/, "");
        const timestamp = new Date().getTime();
        return `${baseName}-converted-${timestamp}.${targetFormat}`;
    }
}