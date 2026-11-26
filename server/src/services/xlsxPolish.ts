/**
 * Finishing touches SheetJS Community can't write (2026-11-26): a frozen header row/columns, a navy
 * header, and colour rules — all added to the finished .xlsx with SheetJS's own zip reader/writer.
 *
 * Colours are Excel conditional formatting (not fixed cell colours), so they follow the value: they
 * stay right after sorting or filtering, and an edited score re-colours itself. Rules use
 * ISNUMBER(...) so empty cells are never painted.
 */
import * as XLSX from 'xlsx';

export interface SheetPolish {
  /** 1-based sheet number, in the order the sheets were added. */
  sheet: number;
  /** Columns / rows to freeze (header rows, name columns). */
  freezeCols?: number;
  freezeRows?: number;
  /** The header row range, e.g. "A1:AF1". */
  header?: string;
  /** Score ranges: ≥70 green, 50–69 amber, <50 red. e.g. ["D2:D500"] */
  scores?: string[];
  /** Status-word ranges: Done green, Partly done amber, Missed red. */
  statuses?: string[];
  /** Count ranges where any value above 0 is bad (missed counts). */
  badCounts?: string[];
}

// dxf ids, in the order written below.
const DXF = { header: 0, green: 1, amber: 2, red: 3, redText: 4 };
const DXFS = `<dxfs count="5">`
  + `<dxf><font><b/><color rgb="FFFFFFFF"/></font><fill><patternFill patternType="solid"><bgColor rgb="FF051D64"/></patternFill></fill></dxf>`
  + `<dxf><font><b/><color rgb="FF047857"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFECFDF5"/></patternFill></fill></dxf>`
  + `<dxf><font><b/><color rgb="FFB86B00"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFFF7E8"/></patternFill></fill></dxf>`
  + `<dxf><font><b/><color rgb="FFB91C1C"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFEF2F2"/></patternFill></fill></dxf>`
  + `<dxf><font><b/><color rgb="FFB91C1C"/></font></dxf>`
  + `</dxfs>`;

const colName = (n: number) => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const topLeft = (ref: string) => ref.split(':')[0];

function rules(p: SheetPolish): string {
  let prio = 1;
  const cf = (sqref: string, inner: string) => `<conditionalFormatting sqref="${sqref}">${inner}</conditionalFormatting>`;
  const expr = (dxf: number, f: string) => `<cfRule type="expression" dxfId="${dxf}" priority="${prio++}"><formula>${f}</formula></cfRule>`;
  const out: string[] = [];
  if (p.header) out.push(cf(p.header, expr(DXF.header, 'TRUE')));
  for (const r of p.scores || []) {
    const c = topLeft(r);
    out.push(cf(r, expr(DXF.green, `AND(ISNUMBER(${c}),${c}&gt;=70)`) + expr(DXF.amber, `AND(ISNUMBER(${c}),${c}&gt;=50)`) + expr(DXF.red, `ISNUMBER(${c})`)));
  }
  for (const r of p.statuses || []) {
    const c = topLeft(r);
    out.push(cf(r, expr(DXF.green, `${c}="Done"`) + expr(DXF.amber, `${c}="Partly done"`) + expr(DXF.red, `${c}="Missed"`)));
  }
  for (const r of p.badCounts || []) {
    const c = topLeft(r);
    out.push(cf(r, expr(DXF.redText, `AND(ISNUMBER(${c}),${c}&gt;0)`)));
  }
  return out.join('');
}

function patchSheet(xml: string, p: SheetPolish): string {
  let s = xml;
  const fc = p.freezeCols || 0, fr = p.freezeRows || 0;
  if (fc || fr) {
    const pane = `<pane${fc ? ` xSplit="${fc}"` : ''}${fr ? ` ySplit="${fr}"` : ''} topLeftCell="${colName(fc)}${fr + 1}" activePane="${fc && fr ? 'bottomRight' : fr ? 'bottomLeft' : 'topRight'}" state="frozen"/>`;
    s = s.replace(/<sheetView([^>]*?)\/>/, `<sheetView$1>${pane}</sheetView>`);
  }
  const cf = rules(p);
  if (cf) {
    // Schema order: conditionalFormatting comes after autoFilter/mergeCells and before these.
    const m = /<(dataValidations|hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|ignoredErrors|drawing|legacyDrawing|tableParts|extLst)[\s>/]/.exec(s);
    const at = m ? m.index : s.lastIndexOf('</worksheet>');
    s = s.slice(0, at) + cf + s.slice(at);
  }
  return s;
}

export function polishXlsx(buf: Buffer, sheets: SheetPolish[]): Buffer {
  const CFB: any = (XLSX as any).CFB;
  const zip = CFB.read(buf, { type: 'buffer' });
  const styles = CFB.find(zip, '/xl/styles.xml');
  if (styles) {
    const xml = Buffer.from(styles.content).toString('utf8');
    const next = /<dxfs count="0"\/>/.test(xml) ? xml.replace(/<dxfs count="0"\/>/, DXFS)
      : !/<dxfs[\s>]/.test(xml) ? xml.replace(/<tableStyles/, `${DXFS}<tableStyles`)
        : xml; // already has its own; leave it rather than write a broken file
    styles.content = Buffer.from(next, 'utf8');
  }
  for (const p of sheets) {
    const e = CFB.find(zip, `/xl/worksheets/sheet${p.sheet}.xml`);
    if (e) e.content = Buffer.from(patchSheet(Buffer.from(e.content).toString('utf8'), p), 'utf8');
  }
  return Buffer.from(CFB.write(zip, { fileType: 'zip', type: 'buffer', compression: true }));
}

export const xlsxCol = colName;
