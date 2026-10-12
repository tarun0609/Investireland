import { describe, it, expect } from 'vitest';
import { calculateTaxImpact, DEFAULT_TAX_INPUTS, TaxSimulationInputs } from './taxEstimatorService';
import { FALLBACK_FISCAL_DATA } from './fiscalDataService';
import { FiscalDataResponse, Holding } from '../types';

// Spot FX equal to the assumed acquisition FX so there are no currency gains in these tests
const FISCAL: FiscalDataResponse = {
  ...FALLBACK_FISCAL_DATA,
  macroIndicators: {
    ...FALLBACK_FISCAL_DATA.macroIndicators,
    fxRates: { ...FALLBACK_FISCAL_DATA.macroIndicators.fxRates, EUR_TO_INR: 88.5, EUR_TO_USD: 1.05, EUR_TO_GBP: 0.86 },
  },
};

let nextId = 0;
const holding = (overrides: Partial<Holding>): Holding => ({
  id: `h${++nextId}`,
  assetName: `Holding ${nextId}`,
  assetType: 'Share',
  units: 1,
  unitPrice: 0,
  currentValue: 0,
  currency: 'EUR',
  country: 'Ireland',
  provider: 'Test',
  updatedAt: '2026-01-01',
  ...overrides,
});

const inr = (eur: number): number => eur * 88.5;
const run = (holdings: Holding[], inputs: Partial<TaxSimulationInputs> = {}) =>
  calculateTaxImpact(holdings, { ...DEFAULT_TAX_INPUTS, ...inputs }, FISCAL);

describe('calculateTaxImpact - Indian gains & DTAA credit', () => {
  it('includes Irish CGT on Indian gains in the Irish liability and credits Indian tax paid', () => {
    const indianFund = holding({
      assetType: 'Mutual Fund', country: 'India', currency: 'INR',
      purchaseValue: inr(10000), currentValue: inr(20000),
    });
    const result = run([indianFund]);

    const irishTax = (10000 - 1270) * 0.33; // 2,880.90
    const indianTax = (inr(10000) - 125000) * 0.125 * 1.04 / 88.5; // ~1,116.38

    expect(result.irelandSummary.grossTaxLiabilityEUR).toBeCloseTo(irishTax, 2);
    expect(result.indiaSummary.grossTaxLiabilityEUR).toBeCloseTo(indianTax, 2);
    expect(result.totalForeignTaxCreditsEUR).toBeCloseTo(indianTax, 2);
    expect(result.indiaSummary.foreignTaxCreditEUR).toBeCloseTo(indianTax, 2);
    expect(result.irelandSummary.netTaxLiabilityEUR).toBeCloseTo(irishTax - indianTax, 2);
    // Overall burden = the higher of the two rates on the same gain, not less
    expect(result.netPayableTaxEUR).toBeCloseTo(irishTax, 2);
  });

  it('caps the DTAA credit at the Irish tax on the same gain and never goes negative', () => {
    // Short-term: 20.8% Indian tax on whole gain, Irish tax mostly absorbed by €1,270 exemption
    const indianShare = holding({
      assetType: 'Share', country: 'India', currency: 'INR',
      purchaseValue: inr(10000), currentValue: inr(11500),
    });
    const result = run([indianShare], { holdingPeriod: 'short_term' });

    const irishTax = (1500 - 1270) * 0.33; // 75.90
    const indianTax = 1500 * 0.20 * 1.04; // 312

    expect(result.indiaSummary.grossTaxLiabilityEUR).toBeCloseTo(indianTax, 2);
    expect(result.totalForeignTaxCreditsEUR).toBeCloseTo(irishTax, 2);
    expect(result.irelandSummary.netTaxLiabilityEUR).toBeCloseTo(0, 6);
    expect(result.netPayableTaxEUR).toBeCloseTo(indianTax, 2);
  });

  it('gives zero credit when the Irish exemption covers the whole gain', () => {
    const indianShare = holding({
      assetType: 'Share', country: 'India', currency: 'INR',
      purchaseValue: inr(10000), currentValue: inr(11000),
    });
    const result = run([indianShare], { holdingPeriod: 'short_term' });
    expect(result.irelandSummary.grossTaxLiabilityEUR).toBe(0);
    expect(result.totalForeignTaxCreditsEUR).toBe(0);
    expect(result.netPayableTaxEUR).toBeCloseTo(1000 * 0.208, 2);
  });

  it('shares the €1,270 exemption pro rata between Irish and Indian gains', () => {
    const irishShare = holding({ assetType: 'Share', purchaseValue: 5000, currentValue: 10000 });
    const indianFund = holding({
      assetType: 'Mutual Fund', country: 'India', currency: 'INR',
      purchaseValue: inr(5000), currentValue: inr(10000),
    });
    const result = run([irishShare, indianFund]);

    const irishTotal = (10000 - 1270) * 0.33;
    const irishOnIndian = irishTotal / 2;
    const indianTax = (inr(5000) - 125000) * 0.13 / 88.5;

    expect(result.irelandSummary.grossTaxLiabilityEUR).toBeCloseTo(irishTotal, 2);
    expect(indianTax).toBeLessThan(irishOnIndian);
    expect(result.totalForeignTaxCreditsEUR).toBeCloseTo(indianTax, 2);
    expect(result.netPayableTaxEUR).toBeCloseTo(irishTotal, 2);
  });

  it('never produces negative totals across a mixed portfolio', () => {
    const holdings = [
      holding({ assetType: 'Mutual Fund', country: 'India', currency: 'INR', purchaseValue: inr(2000), currentValue: inr(9000) }),
      holding({ assetType: 'Share', country: 'India', currency: 'INR', purchaseValue: inr(8000), currentValue: inr(6000) }),
      holding({ assetType: 'ETF', country: 'Europe', purchaseValue: 1000, currentValue: 1500 }),
      holding({ assetType: 'RSU', country: 'US', currency: 'USD', purchaseValue: 1050, currentValue: 2100 }),
      holding({ assetType: 'Cash / Deposit', currentValue: 5000 }),
    ];
    for (const holdingPeriod of ['long_term', 'short_term'] as const) {
      for (const applyIrishCgtExemption of [true, false]) {
        const r = run(holdings, { holdingPeriod, applyIrishCgtExemption });
        expect(r.netPayableTaxEUR).toBeGreaterThanOrEqual(0);
        expect(r.irelandSummary.netTaxLiabilityEUR).toBeGreaterThanOrEqual(0);
        expect(r.totalForeignTaxCreditsEUR).toBeLessThanOrEqual(r.irelandSummary.grossTaxLiabilityEUR + 1e-9);
        expect(r.indiaSummary.foreignTaxCreditEUR).toBeLessThanOrEqual(r.indiaSummary.grossTaxLiabilityEUR + 1e-9);
        expect(r.netPayableTaxEUR).toBeCloseTo(r.totalGlobalTaxLiabilityEUR - r.totalForeignTaxCreditsEUR, 6);
      }
    }
  });
});

describe('calculateTaxImpact - US holdings', () => {
  it('charges 0% US tax with W-8BEN and 33% Irish CGT', () => {
    const rsu = holding({ assetType: 'RSU', country: 'US', currency: 'USD', purchaseValue: 10500, currentValue: 21000 });
    const r = run([rsu], { applyIrishCgtExemption: false });
    expect(r.usSummary.grossTaxLiabilityEUR).toBe(0);
    expect(r.totalForeignTaxCreditsEUR).toBe(0);
    expect(r.netPayableTaxEUR).toBeCloseTo(10000 * 0.33, 2);
  });

  it('credits US withholding against Irish CGT without W-8BEN, capped at the Irish tax', () => {
    const rsu = holding({ assetType: 'RSU', country: 'US', currency: 'USD', purchaseValue: 10500, currentValue: 21000 });
    const r = run([rsu], { hasW8Ben: false, applyIrishCgtExemption: false });
    expect(r.usSummary.grossTaxLiabilityEUR).toBeCloseTo(3000, 2);
    expect(r.totalForeignTaxCreditsEUR).toBeCloseTo(3000, 2);
    expect(r.netPayableTaxEUR).toBeCloseTo(3300, 2);
  });
});

describe('calculateTaxImpact - losses, exit tax & edge cases', () => {
  it('returns all-zero results for an empty portfolio', () => {
    const r = run([]);
    expect(r.totalPortfolioValueEUR).toBe(0);
    expect(r.totalUnrealizedGainsEUR).toBe(0);
    expect(r.netPayableTaxEUR).toBe(0);
    expect(r.overallEffectiveRatePct).toBe(0);
    expect(r.holdingDetails).toEqual([]);
    expect(r.assumptions).toEqual([]);
  });

  it('charges no CGT on a loss and reports the loss as a negative gain', () => {
    const loser = holding({ assetType: 'Share', purchaseValue: 10000, currentValue: 7000 });
    const r = run([loser]);
    expect(r.holdingDetails[0].totalGainEUR).toBeCloseTo(-3000, 6);
    expect(r.holdingDetails[0].estimatedTaxEUR).toBe(0);
    expect(r.totalUnrealizedGainsEUR).toBeCloseTo(-3000, 6);
    expect(r.netPayableTaxEUR).toBe(0);
    expect(r.overallEffectiveRatePct).toBe(0);
  });

  it('nets CGT losses against gains before applying the €1,270 exemption', () => {
    const winner = holding({ assetType: 'Share', purchaseValue: 10000, currentValue: 20000 });
    const loser = holding({ assetType: 'Share', purchaseValue: 10000, currentValue: 6000 });
    const r = run([winner, loser]);
    expect(r.cgtLossesOffsetEUR).toBeCloseTo(4000, 6);
    expect(r.irelandSummary.statutoryExemptionEUR).toBe(1270);
    expect(r.irishCgtEUR).toBeCloseTo((6000 - 1270) * 0.33, 6);
    expect(r.netPayableTaxEUR).toBeCloseTo((6000 - 1270) * 0.33, 6);
    expect(r.assumptions.some(a => a.startsWith('Losses'))).toBe(true);
  });

  it('applies 38% exit tax to ETF gains with no exemption and no offset of share losses', () => {
    const etf = holding({ assetType: 'ETF', country: 'Europe', purchaseValue: 10000, currentValue: 15000 });
    const loser = holding({ assetType: 'Share', purchaseValue: 10000, currentValue: 8000 });
    const r = run([etf, loser]);
    expect(r.holdingDetails[0].taxTreatment).toBe('Exit Tax (38%)');
    expect(r.irishExitTaxEUR).toBeCloseTo(5000 * 0.38, 6);
    expect(r.irishCgtEUR).toBe(0);
    expect(r.netPayableTaxEUR).toBeCloseTo(1900, 6);
    expect(r.overallEffectiveRatePct).toBeCloseTo(38, 6);
    expect(r.assumptions.some(a => a.includes('deemed disposal'))).toBe(true);
  });

  it('does not let ETF losses reduce other ETF gains', () => {
    const etfGain = holding({ assetType: 'ETF', country: 'Europe', purchaseValue: 1000, currentValue: 2000 });
    const etfLoss = holding({ assetType: 'ETF', country: 'Europe', purchaseValue: 1000, currentValue: 500 });
    const r = run([etfGain, etfLoss]);
    expect(r.irishExitTaxEUR).toBeCloseTo(380, 6);
  });

  it('treats deposits as DIRT (deducted at source), not CGT, and discloses it', () => {
    const cash = holding({ assetType: 'Cash / Deposit', purchaseValue: 10000, currentValue: 10300 });
    const r = run([cash]);
    expect(r.holdingDetails[0].taxTreatment).toBe('DIRT Deposit');
    expect(r.holdingDetails[0].estimatedTaxEUR).toBe(0);
    expect(r.netPayableTaxEUR).toBe(0);
    expect(r.assumptions.some(a => a.includes('DIRT'))).toBe(true);
  });

  it('treats NaN values from empty inputs as zero / missing basis instead of propagating NaN', () => {
    const broken = holding({ assetType: 'Share', currentValue: Number.NaN, purchaseValue: Number.NaN, units: Number.NaN });
    const r = run([broken]);
    expect(Number.isNaN(r.totalPortfolioValueEUR)).toBe(false);
    expect(Number.isNaN(r.netPayableTaxEUR)).toBe(false);
    expect(r.holdingDetails[0].units).toBe(0);
    expect(r.netPayableTaxEUR).toBe(0);
  });

  it('shows the combined Irish + Indian burden per holding, not just the Indian rate', () => {
    const indianFund = holding({
      assetType: 'Mutual Fund', country: 'India', currency: 'INR',
      purchaseValue: inr(10000), currentValue: inr(20000),
    });
    const r = run([indianFund]);
    expect(r.holdingDetails[0].estimatedTaxEUR).toBeCloseTo(10000 * 0.33, 2);
  });

  it('computes Indian tax on the rupee gain, unaffected by EUR/INR moves', () => {
    const indianFund = holding({
      assetType: 'Mutual Fund', country: 'India', currency: 'INR',
      purchaseValue: inr(10000), currentValue: inr(20000),
    });
    const base = run([indianFund]);
    const weakerInr = run([indianFund], { eurInrAdjustmentPct: 10 });
    const taxInr = (r: ReturnType<typeof run>) => r.indiaSummary.grossTaxLiabilityEUR * r.simulatedFxRates.EUR_TO_INR;
    expect(taxInr(weakerInr)).toBeCloseTo(taxInr(base), 4);
    expect(weakerInr.indiaSummary.totalUnrealizedGainsLocal).toBeCloseTo(inr(10000), 4);
    // ...but the Irish EUR gain falls as the rupee weakens
    expect(weakerInr.holdingDetails[0].totalGainEUR).toBeLessThan(base.holdingDetails[0].totalGainEUR);
  });

  it('nets Indian losses against Indian gains for Indian tax', () => {
    const r = run([
      holding({ assetType: 'Mutual Fund', country: 'India', currency: 'INR', purchaseValue: inr(5000), currentValue: inr(10000) }),
      holding({ assetType: 'Share', country: 'India', currency: 'INR', purchaseValue: inr(5000), currentValue: inr(3000) }),
    ], { applyIndianLtcgExemption: false });
    expect(r.indiaSummary.totalUnrealizedGainsLocal).toBeCloseTo(inr(3000), 4);
    expect(r.indiaSummary.grossTaxLiabilityEUR).toBeCloseTo(3000 * 0.125 * 1.04, 4);
  });
});

describe('calculateTaxImpact - explicit assumptions', () => {
  it('flags an estimated cost basis when purchase value is missing', () => {
    const missing = holding({ assetName: 'Mystery Co', assetType: 'Share', currentValue: 10000 });
    const known = holding({ assetName: 'Known Co', assetType: 'Share', purchaseValue: 8000, currentValue: 10000 });
    const cash = holding({ assetName: 'Savings', assetType: 'Cash / Deposit', currentValue: 5000 });
    const r = run([missing, known, cash]);

    const [missingDetail, knownDetail, cashDetail] = r.holdingDetails;
    expect(missingDetail.isEstimatedCostBasis).toBe(true);
    expect(missingDetail.purchaseValueLocal).toBe(8000);
    expect(knownDetail.isEstimatedCostBasis).toBe(false);
    expect(cashDetail.isEstimatedCostBasis).toBe(false);

    expect(r.assumptions.some(a => a.includes('Mystery Co') && a.includes('80%'))).toBe(true);
    expect(r.assumptions.some(a => a.includes('Known Co'))).toBe(false);
  });

  it('flags assumed acquisition FX rates for non-EUR holdings only', () => {
    const eur = holding({ assetType: 'Share', purchaseValue: 100, currentValue: 120 });
    const r1 = run([eur]);
    expect(r1.holdingDetails[0].isEstimatedAcquisitionFx).toBe(false);
    expect(r1.assumptions).toEqual([]);

    const inrHolding = holding({ assetType: 'Mutual Fund', country: 'India', currency: 'INR', purchaseValue: 1000, currentValue: 1200 });
    const r2 = run([eur, inrHolding]);
    expect(r2.holdingDetails[1].isEstimatedAcquisitionFx).toBe(true);
    expect(r2.assumptions.some(a => a.includes('EUR/INR 88.5'))).toBe(true);
  });
});
