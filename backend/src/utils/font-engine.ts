export interface FontResolution {
    family: string;
    weight: string;
    style: string;
}

export class AdvancedFontEngine {
    private fontCache = new Map<string, any>();
    private fontSubstitutionRules = new Map<string, string[]>();

    constructor() {
        this.initializeFontSubstitution();
    }

    private initializeFontSubstitution() {
        // Comprehensive font substitution database
        this.fontSubstitutionRules.set('times', ['Times New Roman', 'Georgia', 'Palatino Linotype', 'Book Antiqua', 'Serif']);
        this.fontSubstitutionRules.set('helvetica', ['Arial', 'Helvetica', 'Verdana', 'Tahoma', 'sans-serif']);
        this.fontSubstitutionRules.set('arial', ['Arial', 'Helvetica', 'Verdana', 'Tahoma', 'sans-serif']);
        this.fontSubstitutionRules.set('courier', ['Courier New', 'Lucida Console', 'Monaco', 'monospace']);
        this.fontSubstitutionRules.set('calibri', ['Calibri', 'Candara', 'Segoe UI', 'Arial', 'sans-serif']);
        this.fontSubstitutionRules.set('cambria', ['Cambria', 'Georgia', 'Times New Roman', 'serif']);
        this.fontSubstitutionRules.set('garamond', ['Garamond', 'Times New Roman', 'Georgia', 'serif']);
        
        // Weight mapping
        this.fontSubstitutionRules.set('bold', ['Bold', 'Black', 'Heavy']);
        this.fontSubstitutionRules.set('light', ['Light', 'Thin']);
        this.fontSubstitutionRules.set('medium', ['Medium', 'Regular']);
    }

    public resolveFontFamily(pdfFontName: string): FontResolution {
        const lowerName = pdfFontName.toLowerCase();
        
        // Extract font properties
        const weight = this.extractFontWeight(lowerName);
        const style = this.extractFontStyle(lowerName);
        const family = this.extractFontFamily(lowerName);
        
        // Find best match
        const bestFamily = this.findBestFontMatch(family, weight, style);
        
        return {
            family: bestFamily,
            weight: weight,
            style: style
        };
    }

    private extractFontWeight(fontName: string): string {
        if (fontName.includes('black') || fontName.includes('heavy')) return '900';
        if (fontName.includes('bold')) return '700';
        if (fontName.includes('semibold') || fontName.includes('demi')) return '600';
        if (fontName.includes('medium')) return '500';
        if (fontName.includes('light') || fontName.includes('thin')) return '300';
        return '400'; // normal
    }

    private extractFontStyle(fontName: string): string {
        if (fontName.includes('italic') || fontName.includes('oblique')) return 'italic';
        return 'normal';
    }

    private extractFontFamily(fontName: string): string {
        // Remove common modifiers
        return fontName
            .replace(/(bold|italic|light|medium|black|heavy|regular|normal|semibold|demi|thin|oblique)/g, '')
            .replace(/[+-]/g, '')
            .replace(/\d+/g, '')
            .replace(/(mt|std|pro)/g, '')
            .trim();
    }

    private findBestFontMatch(family: string, weight: string, style: string): string {
        const substitution = this.fontSubstitutionRules.get(family);
        if (substitution) {
            return substitution[0]; // Return primary substitution
        }
        
        // Fallback logic
        if (family.includes('serif')) return 'Times New Roman';
        if (family.includes('sans')) return 'Arial';
        if (family.includes('mono')) return 'Courier New';
        
        return 'Arial';
    }
}