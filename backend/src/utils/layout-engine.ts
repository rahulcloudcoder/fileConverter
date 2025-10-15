export interface TextElement {
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

export interface LayoutBlock {
    elements: TextElement[];
    bounds: { x: number; y: number; width: number; height: number };
    avgFontSize: number;
    lastY: number;
    type: 'paragraph' | 'heading' | 'list' | 'table';
}

export class AdvancedLayoutEngine {
    private lineHeightMultipliers = {
        'normal': 1.2,
        'heading': 1.4,
        'tight': 1.0,
        'loose': 1.6
    };

    public calculateOptimalLayout(elements: TextElement[], pageWidth: number): LayoutBlock[] {
        const blocks: LayoutBlock[] = [];
        let currentBlock: LayoutBlock | null = null;

        // Sort by reading order
        const sortedElements = this.sortByReadingOrder(elements);

        for (const element of sortedElements) {
            if (!currentBlock) {
                currentBlock = this.createNewBlock(element, pageWidth);
                continue;
            }

            if (this.shouldStartNewBlock(currentBlock, element, pageWidth)) {
                blocks.push(this.finalizeBlock(currentBlock));
                currentBlock = this.createNewBlock(element, pageWidth);
            } else {
                this.addToBlock(currentBlock, element);
            }
        }

        if (currentBlock) {
            blocks.push(this.finalizeBlock(currentBlock));
        }

        return blocks;
    }

    private sortByReadingOrder(elements: TextElement[]): TextElement[] {
        return [...elements].sort((a, b) => {
            const yDiff = b.y - a.y; // Higher Y first (top of page)
            if (Math.abs(yDiff) > 10) return yDiff;
            return a.x - b.x; // Then left to right
        });
    }

    private createNewBlock(element: TextElement, pageWidth: number): LayoutBlock {
        return {
            elements: [element],
            bounds: {
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height
            },
            avgFontSize: element.fontSize,
            lastY: element.y,
            type: 'paragraph'
        };
    }

    private addToBlock(block: LayoutBlock, element: TextElement): void {
        block.elements.push(element);
        block.bounds.x = Math.min(block.bounds.x, element.x);
        block.bounds.y = Math.min(block.bounds.y, element.y);
        block.bounds.width = Math.max(block.bounds.width, element.x + element.width - block.bounds.x);
        block.bounds.height = Math.max(block.bounds.height, element.y + element.height - block.bounds.y);
        block.avgFontSize = (block.avgFontSize * (block.elements.length - 1) + element.fontSize) / block.elements.length;
        block.lastY = element.y;
    }

    private shouldStartNewBlock(currentBlock: LayoutBlock, newElement: TextElement, pageWidth: number): boolean {
        // Check vertical spacing (new paragraph)
        const verticalGap = currentBlock.lastY - newElement.y;
        const expectedLineHeight = currentBlock.avgFontSize * this.lineHeightMultipliers.normal;
        
        if (verticalGap > expectedLineHeight * 1.8) {
            return true;
        }

        // Check horizontal alignment change
        const currentAlignment = this.detectAlignment(currentBlock.elements, pageWidth);
        const newAlignment = this.detectAlignment([newElement], pageWidth);
        
        if (currentAlignment !== newAlignment) {
            return true;
        }

        // Check font size change (heading detection)
        const sizeRatio = newElement.fontSize / currentBlock.avgFontSize;
        if (sizeRatio > 1.3 || sizeRatio < 0.7) {
            return true;
        }

        return false;
    }

    public detectAlignment(elements: TextElement[], pageWidth: number): string {
        if (elements.length === 0) return 'left';
        
        const firstX = Math.min(...elements.map(e => e.x));
        const lastX = Math.max(...elements.map(e => e.x + e.width));
        const blockCenter = (firstX + lastX) / 2;
        const pageCenter = pageWidth / 2;
        
        const centerThreshold = pageWidth * 0.1;
        
        if (Math.abs(blockCenter - pageCenter) < centerThreshold) return 'center';
        if (firstX > pageWidth * 0.7) return 'right';
        
        return 'left';
    }

    private finalizeBlock(block: LayoutBlock): LayoutBlock {
        // Determine block type based on content
        if (this.isHeading(block.elements)) {
            block.type = 'heading';
        } else if (this.isList(block.elements)) {
            block.type = 'list';
        } else if (this.isTable(block.elements)) {
            block.type = 'table';
        }
        
        return block;
    }

    private isHeading(elements: TextElement[]): boolean {
        const firstElement = elements[0];
        return elements.some(el => 
            el.fontSize > 13 || 
            el.bold || 
            (el.text === el.text.toUpperCase() && el.text.length < 100)
        );
    }

    private isList(elements: TextElement[]): boolean {
        const text = elements.map(e => e.text).join(' ');
        return /^[•·\-*\d+\.\s]/.test(text.trim());
    }

    private isTable(elements: TextElement[]): boolean {
        // Simple table detection - multiple elements with similar x positions
        const xPositions = elements.map(el => Math.round(el.x / 10) * 10);
        const uniqueX = [...new Set(xPositions)];
        return uniqueX.length >= 2 && elements.length >= 3;
    }

    public calculateLineHeight(elements: TextElement[]): number {
        const avgFontSize = elements.reduce((sum, el) => sum + el.fontSize, 0) / elements.length;
        
        if (this.isHeading(elements)) {
            return avgFontSize * this.lineHeightMultipliers.heading;
        }
        
        return avgFontSize * this.lineHeightMultipliers.normal;
    }
}