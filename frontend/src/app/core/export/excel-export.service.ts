import { Injectable } from '@angular/core';

type SpreadsheetValue = boolean | number | string | null | undefined;

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Creates a small, dependency-free XLSX workbook for client-side table exports. */
@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  export(filename: string, sheetName: string, headers: string[], rows: SpreadsheetValue[][]): void {
    const worksheet = this.worksheetXml(headers, rows);
    const archive = this.zip([
      { name: '[Content_Types].xml', data: this.encode(this.contentTypesXml()) },
      { name: '_rels/.rels', data: this.encode(this.rootRelationshipsXml()) },
      { name: 'xl/workbook.xml', data: this.encode(this.workbookXml(sheetName)) },
      { name: 'xl/_rels/workbook.xml.rels', data: this.encode(this.workbookRelationshipsXml()) },
      { name: 'xl/styles.xml', data: this.encode(this.stylesXml()) },
      { name: 'xl/worksheets/sheet1.xml', data: this.encode(worksheet) },
    ]);
    const url = URL.createObjectURL(new Blob([archive.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.safeFilename(filename)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private worksheetXml(headers: string[], rows: SpreadsheetValue[][]): string {
    const allRows = [headers, ...rows.map((row) => row.map((value) => this.displayValue(value)))];
    const widths = headers.map((_, column) => Math.min(48, Math.max(12, ...allRows.map((row) => (row[column] ?? '').length + 2))));
    const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
    const xmlRows = allRows.map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => {
        const ref = `${this.columnName(columnIndex)}${rowIndex + 1}`;
        const style = rowIndex === 0 ? ' s="1"' : '';
        return `<c r="${ref}" t="inlineStr"${style}><is><t>${this.escapeXml(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columns}</cols><sheetData>${xmlRows}</sheetData><autoFilter ref="A1:${this.columnName(Math.max(0, headers.length - 1))}${Math.max(1, allRows.length)}"/></worksheet>`;
  }

  private contentTypesXml(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  }

  private rootRelationshipsXml(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  }

  private workbookXml(sheetName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${this.escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  }

  private workbookRelationshipsXml(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  }

  private stylesXml(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563A6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
  }

  private zip(entries: ZipEntry[]): Uint8Array {
    let offset = 0;
    const locals: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    for (const entry of entries) {
      const name = this.encode(entry.name);
      const crc = this.crc32(entry.data);
      const local = new Uint8Array(30 + name.length + entry.data.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0x0800, true); localView.setUint16(8, 0, true);
      localView.setUint32(14, crc, true); localView.setUint32(18, entry.data.length, true); localView.setUint32(22, entry.data.length, true); localView.setUint16(26, name.length, true);
      local.set(name, 30); local.set(entry.data, 30 + name.length); locals.push(local);
      const header = new Uint8Array(46 + name.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x0800, true); view.setUint16(10, 0, true);
      view.setUint32(16, crc, true); view.setUint32(20, entry.data.length, true); view.setUint32(24, entry.data.length, true); view.setUint16(28, name.length, true); view.setUint32(42, offset, true);
      header.set(name, 46); central.push(header); offset += local.length;
    }
    const centralSize = central.reduce((total, entry) => total + entry.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
    return this.concat([...locals, ...central, end]);
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private concat(chunks: Uint8Array[]): Uint8Array {
    const combined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    return combined;
  }

  private encode(value: string): Uint8Array { return new TextEncoder().encode(value); }
  private displayValue(value: SpreadsheetValue): string { return value === null || value === undefined ? '' : String(value); }
  private escapeXml(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  private columnName(index: number): string { let name = ''; let value = index + 1; while (value > 0) { const remainder = (value - 1) % 26; name = String.fromCharCode(65 + remainder) + name; value = Math.floor((value - 1) / 26); } return name; }
  private safeFilename(filename: string): string { return filename.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'export'; }
}
