import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { extractPdfLines, groupIntoLines, PdfPasswordError } from './pdfTextService';
import { parseCasText } from './casParserService';

const loadNodePdfJs = () => import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<typeof import('pdfjs-dist')>;

function makeEncryptedCas(password: string): Uint8Array {
  const doc = new jsPDF({ encryption: { userPassword: password, ownerPassword: `${password}-owner`, userPermissions: ['print'] } });
  doc.setFontSize(9);
  doc.text('NSDL Consolidated Account Statement', 10, 15);
  doc.text('Holdings as on 30-Sep-2026', 10, 22);
  // Table columns are separate text runs on the same baseline, as in real statements.
  const row = (y: number, cells: [string, string, string, string, string]) => {
    [10, 40, 120, 150, 175].forEach((x, i) => doc.text(cells[i], x, y));
  };
  row(32, ['INE002A01018', 'RELIANCE INDUSTRIES LTD', '50', '2,950.50', '1,47,525.00']);
  row(39, ['INF879O01027', 'Parag Parikh Flexi Cap Fund', '1,000.000', '90.3546', '90,354.60']);
  return new Uint8Array(doc.output('arraybuffer'));
}

describe('groupIntoLines', () => {
  it('orders lines top to bottom and cells left to right, tolerating small baseline offsets', () => {
    expect(
      groupIntoLines([
        { str: 'Value', x: 200, y: 700.5 },
        { str: 'Second', x: 10, y: 680 },
        { str: 'ISIN', x: 10, y: 700 },
        { str: '  ', x: 50, y: 700 },
      ]),
    ).toEqual(['ISIN Value', 'Second']);
  });
});

describe('extractPdfLines (pdf.js)', () => {
  const password = 'ABCDE1234F';
  const pdf = makeEncryptedCas(password);

  it('asks for a password, rejects a wrong one, and reads the statement with the right one', async () => {
    const pdfjs = await loadNodePdfJs();
    await expect(extractPdfLines(pdf.slice(), undefined, pdfjs)).rejects.toMatchObject({ reason: 'needed' });
    await expect(extractPdfLines(pdf.slice(), 'WRONG1234X', pdfjs)).rejects.toBeInstanceOf(PdfPasswordError);
    await expect(extractPdfLines(pdf.slice(), 'WRONG1234X', pdfjs)).rejects.toMatchObject({ reason: 'incorrect' });

    const lines = await extractPdfLines(pdf.slice(), password, pdfjs);
    expect(lines).toContain('INE002A01018 RELIANCE INDUSTRIES LTD 50 2,950.50 1,47,525.00');

    const result = parseCasText(lines);
    expect(result.holdings.map((h) => [h.isin, h.units, h.unitPrice, h.currentValue, h.updatedAt])).toEqual([
      ['INE002A01018', 50, 2950.5, 147525, '2026-09-30'],
      ['INF879O01027', 1000, 90.3546, 90354.6, '2026-09-30'],
    ]);
  });
});
