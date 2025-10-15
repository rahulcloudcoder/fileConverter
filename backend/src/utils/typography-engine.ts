export class AdvancedTypographyEngine {
    private kerningTables = new Map<string, Map<string, number>>();
    private spacingMultipliers = new Map<string, number>();

    constructor() {
        this.initializeKerningTables();
        this.initializeSpacingMultipliers();
    }

    private initializeKerningTables() {
        // Basic kerning pairs for common combinations
        const timesKern = new Map<string, number>();
        timesKern.set('AV', -0.08);
        timesKern.set('AW', -0.07);
        timesKern.set('Ta', -0.06);
        timesKern.set('Te', -0.05);
        timesKern.set('To', -0.05);
        timesKern.set('Wa', -0.06);
        timesKern.set('We', -0.05);
        timesKern.set('Wo', -0.05);
        
        this.kerningTables.set('Times New Roman', timesKern);
        
        const arialKern = new Map<string, number>();
        arialKern.set('AV', -0.10);
        arialKern.set('AW', -0.09);
        arialKern.set('Ta', -0.08);
        arialKern.set('Te', -0.07);
        arialKern.set('To', -0.07);
        
        this.kerningTables.set('Arial', arialKern);
    }

    private initializeSpacingMultipliers() {
        this.spacingMultipliers.set('Times New Roman', 0.55);
        this.spacingMultipliers.set('Arial', 0.58);
        this.spacingMultipliers.set('Courier New', 0.60);
        this.spacingMultipliers.set('Calibri', 0.56);
        this.spacingMultipliers.set('Verdana', 0.62);
        this.spacingMultipliers.set('Georgia', 0.54);
        this.spacingMultipliers.set('Tahoma', 0.59);
    }

    public calculateTextWidth(text: string, fontSize: number, fontFamily: string): number {
        const multiplier = this.spacingMultipliers.get(fontFamily) || 0.58;
        let totalWidth = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            let charWidth = fontSize * multiplier;
            
            // Apply kerning if available
            if (i > 0) {
                const prevChar = text[i - 1];
                const kerningPair = prevChar + char;
                const kerningTable = this.kerningTables.get(fontFamily);
                if (kerningTable && kerningTable.has(kerningPair)) {
                    charWidth += fontSize * kerningTable.get(kerningPair)!;
                }
            }
            
            totalWidth += charWidth;
        }
        
        return totalWidth;
    }

    public applyOptimalWordSpacing(words: string[], availableWidth: number, fontSize: number, fontFamily: string): string {
        const totalTextWidth = words.reduce((sum, word) => sum + this.calculateTextWidth(word, fontSize, fontFamily), 0);
        const totalSpacesWidth = availableWidth - totalTextWidth;
        
        if (totalSpacesWidth <= 0) {
            return words.join(' '); // Fallback to normal spacing
        }
        
        const spaceCount = words.length - 1;
        const optimalSpaceWidth = totalSpacesWidth / spaceCount;
        const normalSpaceWidth = fontSize * 0.3;
        
        // Only justify if it looks reasonable
        if (optimalSpaceWidth > normalSpaceWidth * 2 || optimalSpaceWidth < normalSpaceWidth * 0.5) {
            return words.join(' '); // Don't over-stretch
        }
        
        return words.join(' '.repeat(Math.ceil(optimalSpaceWidth / normalSpaceWidth)));
    }

    public calculateOptimalLineHeight(fontSize: number, isHeading: boolean = false): number {
        const baseHeight = fontSize * 1.2;
        return isHeading ? baseHeight * 1.4 : baseHeight;
    }
}