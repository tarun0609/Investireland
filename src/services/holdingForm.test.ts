import { describe, expect, it } from 'vitest';
import {
  buildHoldingFromForm,
  countryFromIsin,
  emptyHoldingForm,
  formFromHolding,
  isValidIsin,
  previewTotal,
  type HoldingFormValues,
} from './holdingForm';

const form = (over: Partial<HoldingFormValues>): HoldingFormValues => ({ ...emptyHoldingForm(), assetName: 'Microsoft RSU', ...over });

describe('holding form', () => {
  it('multiplies units by price per unit (80 × $430 = $34,400)', () => {
    const f = form({ assetType: 'RSU', currency: 'USD', units: '80', unitPrice: '430', ticker: 'msft' });
    expect(previewTotal(f)).toBe(34400);
    const { holding } = buildHoldingFromForm(f);
    expect(holding).toMatchObject({ units: 80, unitPrice: 430, currentValue: 34400, currency: 'USD', ticker: 'MSFT' });
  });

  it('supports entering a total balance for pensions and cash', () => {
    const { holding } = buildHoldingFromForm(form({ assetType: 'Pension', valueMode: 'total', totalValue: '42000' }));
    expect(holding).toMatchObject({ units: 1, unitPrice: 42000, currentValue: 42000 });
  });

  it('rejects missing price, bad ISIN and bad ticker', () => {
    expect(buildHoldingFromForm(form({ units: '80', unitPrice: '' })).error).toMatch(/price per unit/);
    expect(buildHoldingFromForm(form({ units: '', unitPrice: '430' })).error).toMatch(/number of units/);
    expect(buildHoldingFromForm(form({ units: '1', unitPrice: '1', isin: 'IE00B4L5Y984' })).error).toMatch(/ISIN/);
    expect(buildHoldingFromForm(form({ units: '1', unitPrice: '1', ticker: '<script>' })).error).toMatch(/Ticker/);
    expect(buildHoldingFromForm(form({ assetName: '  ', units: '1', unitPrice: '1' })).error).toMatch(/asset name/);
  });

  it('editing keeps the id and notes, and round-trips through the form', () => {
    const original = buildHoldingFromForm(form({ units: '80', unitPrice: '430', currency: 'USD' })).holding!;
    const withNotes = { ...original, notes: 'Vests quarterly', purchaseValue: 20000 };
    const edited = buildHoldingFromForm({ ...formFromHolding(withNotes), unitPrice: '450' }, withNotes).holding!;
    expect(edited).toMatchObject({ id: original.id, notes: 'Vests quarterly', purchaseValue: 20000, currentValue: 36000 });
  });

  it('validates ISIN check digits and infers country', () => {
    expect(isValidIsin('IE00B4L5Y983')).toBe(true);
    expect(isValidIsin('US5949181045')).toBe(true);
    expect(isValidIsin('INF879O01027')).toBe(true);
    expect(isValidIsin('US5949181046')).toBe(false);
    expect(countryFromIsin('IE00B4L5Y983')).toBe('Ireland');
    expect(countryFromIsin('INF879O01027')).toBe('India');
    expect(countryFromIsin('DE0007164600')).toBe('Europe');
    expect(countryFromIsin('')).toBeNull();
  });
});
