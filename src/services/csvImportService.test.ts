import { describe, expect, it } from 'vitest';
import { CsvImportError, HOLDINGS_CSV_TEMPLATE, parseCsv, parseHoldingsCsv, parseLooseNumber, planImport } from './csvImportService';

const NOW = new Date('2026-10-20T10:00:00Z');

describe('CSV primitives', () => {
  it('handles quotes, escaped quotes, semicolons and BOM', () => {
    expect(parseCsv('\uFEFFa;b\n"x;y";"he said ""hi"""\n')).toEqual([['a', 'b'], ['x;y', 'he said "hi"']]);
  });

  it('parses dot and comma decimal numbers', () => {
    expect(parseLooseNumber('1,234.56')).toBe(1234.56);
    expect(parseLooseNumber('1.234,56', true)).toBe(1234.56);
    expect(parseLooseNumber('USD 430')).toBe(430);
    expect(parseLooseNumber('')).toBeNaN();
  });
});

describe('parseHoldingsCsv', () => {
  it('imports the template and multiplies units × price', () => {
    const r = parseHoldingsCsv(HOLDINGS_CSV_TEMPLATE, NOW);
    expect(r.format).toBe('template');
    expect(r.warnings).toEqual([]);
    expect(r.holdings).toHaveLength(4);
    expect(r.holdings[1]).toMatchObject({ assetName: 'Microsoft RSU', assetType: 'RSU', ticker: 'MSFT', units: 80, unitPrice: 430, currentValue: 34400, currency: 'USD', country: 'US' });
    expect(r.holdings[3]).toMatchObject({ assetType: 'Pension', units: 1, currentValue: 42000 });
    expect(r.holdings[0].updatedAt).toBe('2026-10-20');
  });

  it('imports a DEGIRO portfolio export with decimal commas and cash', () => {
    const csv = [
      'Product,Symbol/ISIN,Amount,Closing,Local value,,Value in EUR',
      'CASH & CASH FUND & FTX CASH (EUR),,,,EUR,"152,30","152,30"',
      'VANGUARD FTSE ALL-WORLD UCITS ETF USD DIS,IE00B3RBWM25,10,"110,50",EUR,"1105,00","1105,00"',
      'MICROSOFT CORPORATION - COMMON STOCK,US5949181045,3,"430,00",USD,"1290,00","1149,22"',
      'NESTLE SA,CH0038863350,5,"80,00",CHF,"400,00","427,00"',
    ].join('\n');
    const r = parseHoldingsCsv(csv, NOW);
    expect(r.format).toBe('degiro');
    expect(r.holdings).toHaveLength(4);
    expect(r.holdings[0]).toMatchObject({ assetType: 'Cash / Deposit', currentValue: 152.3, provider: 'DEGIRO' });
    expect(r.holdings[1]).toMatchObject({ assetType: 'ETF', isin: 'IE00B3RBWM25', units: 10, unitPrice: 110.5, currentValue: 1105, country: 'Ireland' });
    expect(r.holdings[2]).toMatchObject({ assetType: 'Share', units: 3, unitPrice: 430, currentValue: 1290, currency: 'USD', country: 'US' });
    expect(r.holdings[3]).toMatchObject({ currency: 'EUR', currentValue: 427 });
    expect(r.warnings.join(' ')).toMatch(/CHF is not supported/);
  });

  it('nets Trading 212 buys and sells into positions at the last trade price', () => {
    const csv = [
      'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total)',
      'Deposit,2026-01-02 09:00:00,,,,,,,,1000,EUR',
      'Market buy,2026-01-05 10:00:00,IE00B4L5Y983,SWDA,iShares Core MSCI World UCITS ETF,10,90.00,EUR,1,900,EUR',
      'Market buy,2026-03-05 10:00:00,IE00B4L5Y983,SWDA,iShares Core MSCI World UCITS ETF,5,95.00,EUR,1,475,EUR',
      'Market sell,2026-06-05 10:00:00,IE00B4L5Y983,SWDA,iShares Core MSCI World UCITS ETF,3,98.40,EUR,1,295.2,EUR',
      'Limit buy,2026-02-01 15:00:00,US5949181045,MSFT,Microsoft,2,410,USD,1.08,759,EUR',
      'Market sell,2026-04-01 15:00:00,US5949181045,MSFT,Microsoft,2,420,USD,1.08,777,EUR',
      'Market buy,2026-05-01 08:00:00,GB0007980591,BP.,BP,100,450,GBX,0.85,529,EUR',
    ].join('\n');
    const r = parseHoldingsCsv(csv, NOW);
    expect(r.format).toBe('trading212');
    expect(r.holdings).toHaveLength(2);
    expect(r.holdings[0]).toMatchObject({ ticker: 'SWDA', units: 12, unitPrice: 98.4, currentValue: 1180.8, provider: 'Trading 212' });
    expect(r.holdings[1]).toMatchObject({ ticker: 'BP.', currency: 'GBP', unitPrice: 4.5, currentValue: 450 });
    expect(r.warnings[0]).toMatch(/last trade price/);
  });

  it('rejects unknown formats and empty files', () => {
    expect(() => parseHoldingsCsv('foo,bar\n1,2', NOW)).toThrow(CsvImportError);
    expect(() => parseHoldingsCsv('Name,Units\n', NOW)).toThrow(/no data rows/);
  });

  it('skips invalid template rows with clear warnings', () => {
    const r = parseHoldingsCsv('Name,Units,Price,Currency\nGood,2,10,EUR\nBad,,,EUR\nYen fund,1,1,JPY', NOW);
    expect(r.holdings).toHaveLength(1);
    expect(r.warnings.join('\n')).toMatch(/Row 3.*needs Units and Price/);
    expect(r.warnings.join('\n')).toMatch(/JPY/);
  });
});

describe('planImport', () => {
  it('updates matching holdings instead of duplicating them', () => {
    const existing = parseHoldingsCsv(HOLDINGS_CSV_TEMPLATE, NOW).holdings.map((h) => ({ ...h, notes: 'mine', assetName: `My ${h.assetName}` }));
    const again = parseHoldingsCsv(HOLDINGS_CSV_TEMPLATE.replace(',80,430,', ',90,440,'), NOW).holdings;
    const plan = planImport(existing, again);
    const msft = plan.find((p) => p.holding.ticker === 'MSFT')!;
    expect(msft.action).toBe('update');
    expect(msft.holding).toMatchObject({ id: existing[1].id, assetName: 'My Microsoft RSU', notes: 'mine', units: 90, currentValue: 39600 });
    expect(plan.find((p) => p.holding.assetType === 'Pension')!.action).toBe('add');
  });
});
