import { describe, expect, it } from 'vitest';
import { CsvImportError } from './csvImportService';
import { CAS_PROVIDER, parseCasDate, parseCasText, pickUnitsPriceValue } from './casParserService';

const NOW = new Date('2026-10-20T10:00:00Z');

describe('pickUnitsPriceValue', () => {
  it('finds units × price = value among the row numbers', () => {
    expect(pickUnitsPriceValue([10, 50, 2950.5, 147525])).toEqual({ units: 50, price: 2950.5, value: 147525 });
  });

  it('prefers current value over total cost on fund rows', () => {
    // units, average cost, total cost, current NAV, current value, unrealised profit
    expect(pickUnitsPriceValue([1000, 70, 70000, 90.3546, 90354.6, 20354.6])).toEqual({ units: 1000, price: 90.3546, value: 90354.6 });
  });

  it('returns null when nothing multiplies out', () => {
    expect(pickUnitsPriceValue([5, 0, 5, 0])).toBeNull();
  });
});

describe('parseCasDate', () => {
  it('handles the common CAS date formats', () => {
    expect(parseCasDate('30-Sep-2026')).toBe('2026-09-30');
    expect(parseCasDate('30/09/2026')).toBe('2026-09-30');
    expect(parseCasDate('1 October 2026')).toBe('2026-10-01');
    expect(parseCasDate('31-13-2026')).toBeNull();
  });
});

describe('parseCasText: NSDL depository CAS', () => {
  const lines = [
    'NSDL Consolidated Account Statement',
    'Statement for the period from 01-Sep-2026 to 30-Sep-2026',
    'Equities (E)',
    'ISIN Stock Symbol Company Name Face Value No. of Shares Market Price ₹ Value ₹',
    'INE002A01018 RELIANCE RELIANCE INDUSTRIES LIMITED 10.00 50 2,950.50 1,47,525.00',
    'INE009A01021 INFY INFOSYS LIMITED',
    'EQUITY SHARES 5.00 20 1,850.25 37,005.00',
    'INF204KB14I2 NIPPON INDIA ETF NIFTY 50 BEES 1.00 100 270.10 27,010.00',
    'Mutual Fund Folios (F)',
    'ISIN ISIN Description Folio No. No. of Units Average Cost Per Unit Total Cost Current NAV per unit Current Value Unrealised Profit',
    'INF879O01027 Parag Parikh Flexi Cap Fund - Direct Plan - Growth 1234567/89 1,000.000 70.0000 70,000.00 90.3546 90,354.60 20,354.60',
    'Transactions',
    'INE009A01021 INFOSYS LIMITED Opening 10 Credit 10 Debit 0 Closing 20',
    'INE467B01029 TATA CONSULTANCY SERVICES Opening 5 Credit 0 Debit 5 Closing 0',
  ];

  it('reads demat shares, ETFs and fund folios with units × price = value', () => {
    const r = parseCasText(lines, NOW);
    expect(r.format).toBe('cas');
    expect(r.formatLabel).toBe('NSDL CAS');
    const byIsin = Object.fromEntries(r.holdings.map((h) => [h.isin, h]));
    expect(Object.keys(byIsin).sort()).toEqual(['INE002A01018', 'INE009A01021', 'INF204KB14I2', 'INF879O01027']);

    expect(byIsin.INE002A01018).toMatchObject({ assetName: 'RELIANCE RELIANCE INDUSTRIES LIMITED', assetType: 'Share', units: 50, unitPrice: 2950.5, currentValue: 147525 });
    expect(byIsin.INE009A01021).toMatchObject({ assetName: 'INFY INFOSYS LIMITED', units: 20, unitPrice: 1850.25, currentValue: 37005 });
    expect(byIsin.INF204KB14I2).toMatchObject({ assetName: 'NIPPON INDIA ETF NIFTY 50 BEES', assetType: 'ETF', units: 100, currentValue: 27010 });
    expect(byIsin.INF879O01027).toMatchObject({ assetType: 'Mutual Fund', units: 1000, unitPrice: 90.3546, currentValue: 90354.6 });

    for (const h of r.holdings) {
      expect(h).toMatchObject({ currency: 'INR', country: 'India', provider: CAS_PROVIDER, updatedAt: '2026-09-30' });
    }
  });

  it('warns about ISINs with no current value instead of guessing', () => {
    const r = parseCasText(lines, NOW);
    expect(r.warnings.join(' ')).toContain('INE467B01029');
    expect(r.warnings.join(' ')).not.toContain('INE009A01021');
  });
});

describe('parseCasText: CDSL depository CAS', () => {
  it('counts a repeated summary row once and adds up separate demat accounts', () => {
    const r = parseCasText(
      [
        'Central Depository Services (India) Limited CDSL',
        'HOLDING STATEMENT AS ON 30-09-2026',
        'ISIN Security Current Bal Free Bal Pledge Bal Earmark Bal Market Price Value',
        'INE002A01018 RELIANCE INDUSTRIES LTD-EQ 25.000 25.000 0.000 0.000 2950.50 73762.50',
        'Summary',
        'INE002A01018 RELIANCE INDUSTRIES LTD-EQ 25.000 25.000 0.000 0.000 2950.50 73762.50',
        'Second demat account',
        'INE002A01018 RELIANCE INDUSTRIES LTD-EQ 10.000 10.000 0.000 0.000 2950.50 29505.00',
      ],
      NOW,
    );
    expect(r.formatLabel).toBe('CDSL CAS');
    expect(r.holdings).toHaveLength(1);
    expect(r.holdings[0]).toMatchObject({ units: 35, unitPrice: 2950.5, currentValue: 103267.5, updatedAt: '2026-09-30' });
  });
});

describe('parseCasText: CAMS / KFintech mutual fund CAS', () => {
  it('reads closing units, NAV and market value per scheme and skips closed folios', () => {
    const r = parseCasText(
      [
        'Consolidated Account Statement',
        '01-Apr-2026 To 30-Sep-2026',
        'Folio No: 12345678 / 12 PAN: XXXXX1234X KYC: OK PAN: OK',
        'B205RGG-Axis ELSS Tax Saver Fund - Direct Growth - ISIN: INF846K01EW2(Advisor: DIRECT) Registrar : KFINTECH',
        'Opening Unit Balance: 100.000',
        '05-Apr-2026 Purchase 5,000.00 52.123 95.9270 152.123',
        'Closing Unit Balance: 152.123 NAV on 30-Sep-2026: INR 101.2345 Total Cost Value: 15,000.00',
        'Market Value on 30-Sep-2026: INR 15,400.37',
        'Folio No: 99999 / 1',
        'PPFAS-Parag Parikh Flexi Cap Fund - Direct Plan - Growth - ISIN: INF879O01027 Registrar : CAMS',
        'Closing Unit Balance: 0.000 NAV on 30-Sep-2026: INR 90.3546 Market Value on 30-Sep-2026: INR 0.00',
      ],
      NOW,
    );
    expect(r.formatLabel).toBe('CAMS / KFintech mutual fund CAS');
    expect(r.holdings).toHaveLength(1);
    expect(r.holdings[0]).toMatchObject({
      assetName: 'Axis ELSS Tax Saver Fund - Direct Growth',
      isin: 'INF846K01EW2',
      assetType: 'Mutual Fund',
      units: 152.123,
      unitPrice: 101.2345,
      currentValue: 15400.37,
      updatedAt: '2026-09-30',
    });
  });
});

describe('parseCasText: other PDFs', () => {
  it('rejects a PDF without holdings', () => {
    expect(() => parseCasText(['Electricity bill', 'Amount due 120.00'], NOW)).toThrow(CsvImportError);
  });
});
