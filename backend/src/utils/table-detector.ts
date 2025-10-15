import { TextElement } from './layout-engine';

export interface TableCell {
    text: string;
    columnSpan: number;
    alignment: string;
}

export interface TableRow {
    cells: TableCell[];
    isHeader: boolean;
}

export interface TableData {
    rows: TableRow[];
    columnCount: number;
}

export class AdvancedTableDetector {
    public detectTables(elements: TextElement[], pageWidth: number): TableData[] {
        const tables: TableData[] = [];
        const columnGroups = this.groupByColumns(elements);
        
        for (const columnGroup of columnGroups) {
            if (this.isLikelyTable(columnGroup)) {
                const table = this.reconstructTable(columnGroup, pageWidth);
                if (table.rows.length > 1) { // Must have at least header + one row
                    tables.push(table);
                }
            }
        }
        
        return tables;
    }

    private groupByColumns(elements: TextElement[]): TextElement[][] {
        const xPositions = elements.map(el => Math.round(el.x / 10) * 10); // Group by 10px
        const uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);
        
        const columns: TextElement[][] = [];
        
        for (const x of uniqueX) {
            const columnElements = elements.filter(el => 
                Math.round(el.x / 10) * 10 === x
            );
            if (columnElements.length > 0) {
                columns.push(columnElements);
            }
        }
        
        return columns;
    }

    private groupByRows(elements: TextElement[]): TextElement[][] {
        const yPositions = elements.map(el => Math.round(el.y / 5) * 5); // Group by 5px
        const uniqueY = [...new Set(yPositions)].sort((a, b) => b - a); // Top to bottom
        
        const rows: TextElement[][] = [];
        
        for (const y of uniqueY) {
            const rowElements = elements.filter(el => 
                Math.round(el.y / 5) * 5 === y
            );
            if (rowElements.length > 0) {
                rows.push(rowElements);
            }
        }
        
        return rows;
    }

    private isLikelyTable(columnGroup: TextElement[]): boolean {
        if (columnGroup.length < 3) return false;
        
        // Check for consistent column structure
        const uniqueY = [...new Set(columnGroup.map(el => Math.round(el.y / 5) * 5))];
        const rowCount = uniqueY.length;
        
        return rowCount >= 2 && columnGroup.length >= rowCount * 2;
    }

    private reconstructTable(columnGroup: TextElement[], pageWidth: number): TableData {
        const rows = this.groupByRows(columnGroup);
        const table: TableData = {
            rows: [],
            columnCount: 0
        };
        
        for (const row of rows) {
            const tableRow: TableRow = {
                cells: [],
                isHeader: this.isHeaderRow(row, rows[0])
            };
            
            const sortedCells = row.sort((a, b) => a.x - b.x);
            for (const cell of sortedCells) {
                tableRow.cells.push({
                    text: cell.text,
                    columnSpan: 1,
                    alignment: this.detectAlignment([cell], pageWidth)
                });
            }
            
            table.rows.push(tableRow);
        }
        
        table.columnCount = Math.max(...table.rows.map(row => row.cells.length));
        
        return table;
    }

    private isHeaderRow(row: TextElement[], firstRow: TextElement[]): boolean {
        if (row === firstRow) {
            // First row is often header
            return row.some(cell => 
                cell.bold || 
                cell.fontSize > 12 || 
                cell.text === cell.text.toUpperCase()
            );
        }
        return false;
    }

    private detectAlignment(elements: TextElement[], pageWidth: number): string {
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
}