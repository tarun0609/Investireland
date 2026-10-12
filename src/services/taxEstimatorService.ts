import { Holding, Currency, FiscalDataResponse } from '../types';
import { FALLBACK_FISCAL_DATA, convertToEUR, convertFromEUR } from './fiscalDataService';

export interface TaxJurisdictionSummary {
  country: 'Ireland' | 'India' | 'US';
  countryLabel: string;
  currency: Currency;
  totalHoldingsValueEUR: number;
  totalHoldingsValueLocal: number;
  totalUnrealizedGainsEUR: number;
  totalUnrealizedGainsLocal: number;
  assetGrowthGainEUR: number;
  currencyFluctuationGainEUR: number;
  statutoryExemptionLocal: number;
  statutoryExemptionEUR: number;
  taxableGainsEUR: number;
  grossTaxLiabilityEUR: number;
  foreignTaxCreditEUR: number;
  netTaxLiabilityEUR: number;
  effectiveTaxRatePct: number;
  applicableRules: string[];
  keyAdvice: string;
}

export interface HoldingTaxDetail {
  id: string;
  assetName: string;
  assetType: Holding['assetType'];
  country: Holding['country'];
  currency: Currency;
  units: number;
  unitPrice: number;
  currentValueLocal: number;
  purchaseValueLocal: number;
  currentValueEUR: number;
  purchaseValueEUR: number;
  totalGainLocal: number;
  totalGainEUR: number;
  gainPct: number;
  // Breakdown of gain: asset price vs FX movement
  assetGainEUR: number;
  fxGainEUR: number;
  // Tax treatments
  taxTreatment: 'Standard CGT' | 'Exit Tax (41%)' | 'Indian LTCG (12.5%)' | 'Indian STCG (20%)' | 'US W-8BEN (0% US / 33% IE)' | 'Tax-Exempt Pension' | 'DIRT Deposit';
  applicableRate: number;
  estimatedTaxEUR: number;
  estimatedTaxLocal: number;
  taxJurisdiction: 'Ireland' | 'India' | 'US';
  dtaaCreditEligible: boolean;
  /** True when purchaseValue was missing and the cost basis was estimated (80% of current value). */
  isEstimatedCostBasis: boolean;
  /** True when the EUR cost basis uses an assumed historical acquisition FX rate rather than the actual trade-date rate. */
  isEstimatedAcquisitionFx: boolean;
  notes: string;
}

export interface TaxSimulationInputs {
  holdingPeriod: 'long_term' | 'short_term'; // >12 months or <=12 months
  userTaxResidency: 'irish_resident' | 'us_person_in_ireland';
  hasW8Ben: boolean;
  applyIrishCgtExemption: boolean; // €1,270
  applyIndianLtcgExemption: boolean; // ₹1,25,000
  eurUsdAdjustmentPct: number; // e.g., 0, -5, +5, -10, +10
  eurInrAdjustmentPct: number; // e.g., 0, -5, +5, -10, +10
}

export interface TaxEstimatorResult {
  simulatedFxRates: {
    EUR_TO_USD: number;
    EUR_TO_INR: number;
    EUR_TO_GBP: number;
  };
  totalPortfolioValueEUR: number;
  totalUnrealizedGainsEUR: number;
  totalAssetGainEUR: number;
  totalFxGainEUR: number;
  // Country summaries
  irelandSummary: TaxJurisdictionSummary;
  indiaSummary: TaxJurisdictionSummary;
  usSummary: TaxJurisdictionSummary;
  // Overall consolidated cross-border
  totalGlobalTaxLiabilityEUR: number;
  totalForeignTaxCreditsEUR: number;
  netPayableTaxEUR: number;
  overallEffectiveRatePct: number;
  holdingDetails: HoldingTaxDetail[];
  psialSavingsPotentialEUR: number; // Potential savings if funds moved to Budget 2027 PSIA
  taxHarvestingInsights: string[];
  /** Explicit list of estimates/fallbacks used because input data was missing. */
  assumptions: string[];
}

export const DEFAULT_TAX_INPUTS: TaxSimulationInputs = {
  holdingPeriod: 'long_term',
  userTaxResidency: 'irish_resident',
  hasW8Ben: true,
  applyIrishCgtExemption: true,
  applyIndianLtcgExemption: true,
  eurUsdAdjustmentPct: 0,
  eurInrAdjustmentPct: 0,
};

// ASSUMED historical acquisition FX rates (holdings do not record trade-date FX).
// Parag Parikh & TCS acquired around 88.50 INR/EUR; US RSUs around 1.05 USD/EUR.
// Holdings converted with these rates are flagged via isEstimatedAcquisitionFx and result.assumptions.
export const HISTORICAL_FX_ACQUISITION: Record<Currency, number> = {
  EUR: 1,
  USD: 1.05,
  INR: 88.50,
  GBP: 0.86,
};

// Fallback cost basis ratio when purchaseValue is missing (flagged via isEstimatedCostBasis)
export const ESTIMATED_COST_BASIS_RATIO = 0.8;
const IRISH_CGT_RATE = 0.33;
const IRISH_EXIT_TAX_RATE = 0.41;

export function calculateTaxImpact(
  holdings: Holding[],
  inputs: TaxSimulationInputs = DEFAULT_TAX_INPUTS,
  baseFiscalData: FiscalDataResponse = FALLBACK_FISCAL_DATA
): TaxEstimatorResult {
  const baseRates = baseFiscalData.macroIndicators.fxRates;
  
  // Calculate simulated spot FX rates based on user slider adjustments
  const simulatedEurUsd = baseRates.EUR_TO_USD * (1 + inputs.eurUsdAdjustmentPct / 100);
  const simulatedEurInr = baseRates.EUR_TO_INR * (1 + inputs.eurInrAdjustmentPct / 100);
  const simulatedEurGbp = baseRates.EUR_TO_GBP;

  const getSimulatedRate = (currency: Currency): number => {
    switch (currency) {
      case 'USD': return simulatedEurUsd;
      case 'INR': return simulatedEurInr;
      case 'GBP': return simulatedEurGbp;
      case 'EUR': default: return 1.0;
    }
  };

  const convertToSimulatedEUR = (amount: number, currency: Currency): number => {
    const rate = getSimulatedRate(currency);
    return rate > 0 ? amount / rate : amount;
  };

  const convertFromSimulatedEUR = (amountEUR: number, currency: Currency): number => {
    const rate = getSimulatedRate(currency);
    return amountEUR * rate;
  };

  let totalPortfolioValueEUR = 0;
  let totalUnrealizedGainsEUR = 0;
  let totalAssetGainEUR = 0;
  let totalFxGainEUR = 0;

  // Process each holding
  const holdingDetails: HoldingTaxDetail[] = holdings.map((h) => {
    // Cash principal has no capital gain, so a missing basis there is not an estimate.
    const isEstimatedCostBasis = h.purchaseValue === undefined && h.assetType !== 'Cash / Deposit';
    const purchaseValLocal = h.purchaseValue !== undefined
      ? h.purchaseValue
      : (h.assetType === 'Cash / Deposit' ? h.currentValue : h.currentValue * ESTIMATED_COST_BASIS_RATIO);
    const isEstimatedAcquisitionFx = h.currency !== 'EUR';
    const currentValLocal = h.currentValue;
    const gainLocal = currentValLocal - purchaseValLocal;
    const gainPct = purchaseValLocal > 0 ? (gainLocal / purchaseValLocal) * 100 : 0;

    // Current value in EUR at simulated spot FX
    const currentValEUR = convertToSimulatedEUR(currentValLocal, h.currency);
    
    // Historical acquisition value in EUR according to Irish Revenue rules:
    // "Cost of acquisition must be converted to EUR using the market exchange rate on the date of acquisition."
    const acqRate = HISTORICAL_FX_ACQUISITION[h.currency] || 1.0;
    const purchaseValEUR = h.currency === 'EUR' ? purchaseValLocal : purchaseValLocal / acqRate;

    // Total gain in EUR for Irish tax computation
    const totalGainEUR = Math.max(0, currentValEUR - purchaseValEUR);

    // Pure asset gain in EUR (if FX had stayed at acquisition rate)
    const pureAssetGainEUR = Math.max(0, gainLocal / acqRate);
    // Currency fluctuation gain/loss in EUR
    const fxGainEUR = totalGainEUR - pureAssetGainEUR;

    totalPortfolioValueEUR += currentValEUR;
    totalUnrealizedGainsEUR += totalGainEUR;
    totalAssetGainEUR += pureAssetGainEUR;
    totalFxGainEUR += fxGainEUR;

    // Determine tax treatment & jurisdiction
    let taxTreatment: HoldingTaxDetail['taxTreatment'] = 'Standard CGT';
    let applicableRate = 0.33;
    let taxJurisdiction: HoldingTaxDetail['taxJurisdiction'] = 'Ireland';
    let dtaaCreditEligible = false;
    let notes = '';

    if (h.assetType === 'Pension') {
      taxTreatment = 'Tax-Exempt Pension';
      applicableRate = 0;
      taxJurisdiction = 'Ireland';
      notes = 'PRSA / Occupational pension wrappers compound 100% tax-free. Exempt from CGT and Exit Tax.';
    } else if (h.assetType === 'Cash / Deposit') {
      taxTreatment = 'DIRT Deposit';
      applicableRate = 0.33; // DIRT on interest, not capital gains
      taxJurisdiction = 'Ireland';
      notes = 'Cash balances incur 33% DIRT on earned interest only. Principal is exempt from CGT.';
    } else if (h.assetType === 'ETF') {
      // UCITS ETF under Irish Exit Tax rules
      taxTreatment = 'Exit Tax (41%)';
      applicableRate = 0.41;
      taxJurisdiction = 'Ireland';
      notes = 'Irish & EU UCITS ETFs are subject to 41% Exit Tax under TCA 1997 s.739D. No €1,270 exemption permitted.';
    } else if (h.country === 'India') {
      taxJurisdiction = 'India';
      dtaaCreditEligible = true;
      if (inputs.holdingPeriod === 'long_term') {
        taxTreatment = 'Indian LTCG (12.5%)';
        applicableRate = 0.125; // Union Budget 2024 LTCG rate
        notes = 'India LTCG under Section 112A at 12.5% above ₹1.25 Lakh exemption. Eligible for Ireland DTAA Article 13 FTC credit.';
      } else {
        taxTreatment = 'Indian STCG (20%)';
        applicableRate = 0.20; // Union Budget 2024 STCG rate
        notes = 'India STCG under Section 111A at 20%. Subject to NRI TDS withholding at source.';
      }
    } else if (h.country === 'US' || h.assetType === 'RSU') {
      taxJurisdiction = 'US';
      if (inputs.userTaxResidency === 'us_person_in_ireland') {
        taxTreatment = 'Standard CGT';
        applicableRate = 0.20; // US Federal LTCG
        notes = 'Subject to dual US/Irish reporting. Foreign tax credit applies.';
      } else if (inputs.hasW8Ben) {
        taxTreatment = 'US W-8BEN (0% US / 33% IE)';
        applicableRate = 0.33; // 0% US, 33% Irish CGT
        notes = 'With valid W-8BEN, US withholding on capital gains is 0% under US-IE Treaty. Taxable at 33% under Irish CGT.';
      } else {
        taxTreatment = 'Standard CGT';
        applicableRate = 0.30;
        notes = 'Backup US withholding without valid W-8BEN.';
      }
    } else {
      // Domestic Irish / European equities
      taxTreatment = 'Standard CGT';
      applicableRate = 0.33;
      taxJurisdiction = 'Ireland';
      notes = 'Standard Irish Capital Gains Tax (33%) under TCA 1997 s.28.';
    }

    // Baseline estimated tax on this individual holding before personal allowances
    let estimatedTaxEUR = 0;
    if (taxTreatment === 'Tax-Exempt Pension') {
      estimatedTaxEUR = 0;
    } else if (taxTreatment === 'DIRT Deposit') {
      estimatedTaxEUR = 0; // CGT is 0
    } else if (taxTreatment === 'Exit Tax (41%)') {
      estimatedTaxEUR = totalGainEUR * 0.41;
    } else if (taxTreatment === 'Indian LTCG (12.5%)' || taxTreatment === 'Indian STCG (20%)') {
      estimatedTaxEUR = totalGainEUR * applicableRate;
    } else {
      estimatedTaxEUR = totalGainEUR * applicableRate;
    }

    const estimatedTaxLocal = convertFromSimulatedEUR(estimatedTaxEUR, h.currency);

    return {
      id: h.id,
      assetName: h.assetName,
      assetType: h.assetType,
      country: h.country,
      currency: h.currency,
      units: h.units,
      unitPrice: h.unitPrice,
      currentValueLocal: currentValLocal,
      purchaseValueLocal: purchaseValLocal,
      currentValueEUR: currentValEUR,
      purchaseValueEUR: purchaseValEUR,
      totalGainLocal: Math.max(0, gainLocal),
      totalGainEUR,
      gainPct,
      assetGainEUR: pureAssetGainEUR,
      fxGainEUR,
      taxTreatment,
      applicableRate,
      estimatedTaxEUR,
      estimatedTaxLocal,
      taxJurisdiction,
      dtaaCreditEligible,
      isEstimatedCostBasis,
      isEstimatedAcquisitionFx,
      notes,
    };
  });

  // Calculate Ireland Jurisdiction Summary
  const irishHoldings = holdingDetails.filter(h => h.country === 'Ireland' || h.country === 'Europe');
  const irishTotalValEUR = irishHoldings.reduce((s, h) => s + h.currentValueEUR, 0);
  const irishTotalGainEUR = irishHoldings.reduce((s, h) => s + h.totalGainEUR, 0);
  const irishAssetGainEUR = irishHoldings.reduce((s, h) => s + h.assetGainEUR, 0);
  const irishFxGainEUR = irishHoldings.reduce((s, h) => s + h.fxGainEUR, 0);

  // Irish Exit Tax Holdings (ETFs)
  const exitTaxGainsEUR = holdingDetails
    .filter(h => h.taxTreatment === 'Exit Tax (41%)')
    .reduce((s, h) => s + h.totalGainEUR, 0);
  const exitTaxLiabilityEUR = exitTaxGainsEUR * 0.41;

  // Irish CGT Qualifying Holdings (Shares, RSUs, US assets and Indian equities/funds).
  // Irish residents are taxed on worldwide gains, so Indian gains are also chargeable to 33% Irish CGT;
  // Indian tax paid is relieved separately via the capped DTAA credit below.
  const isIrishCgtHolding = (h: HoldingTaxDetail): boolean =>
    h.taxTreatment === 'Standard CGT' ||
    h.taxTreatment === 'US W-8BEN (0% US / 33% IE)' ||
    h.taxTreatment === 'Indian LTCG (12.5%)' ||
    h.taxTreatment === 'Indian STCG (20%)';
  const cgtGainsEUR = holdingDetails
    .filter(isIrishCgtHolding)
    .reduce((s, h) => s + h.totalGainEUR, 0);

  const IRISH_CGT_EXEMPTION_EUR = 1270;
  const appliedIrishExemptionEUR = inputs.applyIrishCgtExemption ? Math.min(cgtGainsEUR, IRISH_CGT_EXEMPTION_EUR) : 0;
  const taxableIrishCgtGainsEUR = Math.max(0, cgtGainsEUR - appliedIrishExemptionEUR);
  const cgtLiabilityEUR = taxableIrishCgtGainsEUR * IRISH_CGT_RATE;

  // Irish tax attributable to one country's gains: CGT share (annual exemption shared pro rata
  // across the CGT pool) plus exit tax on that country's funds.
  const irishTaxOnCountryGainsEUR = (country: Holding['country']): number => {
    const countryHoldings = holdingDetails.filter(h => h.country === country);
    const countryCgtGains = countryHoldings.filter(isIrishCgtHolding).reduce((s, h) => s + h.totalGainEUR, 0);
    const countryExitTaxGains = countryHoldings
      .filter(h => h.taxTreatment === 'Exit Tax (41%)')
      .reduce((s, h) => s + h.totalGainEUR, 0);
    const cgtShare = cgtGainsEUR > 0 ? cgtLiabilityEUR * (countryCgtGains / cgtGainsEUR) : 0;
    return cgtShare + countryExitTaxGains * IRISH_EXIT_TAX_RATE;
  };

  const grossIrishTaxLiabilityEUR = exitTaxLiabilityEUR + cgtLiabilityEUR;

  // Potential PSIA savings: If ETF exit tax of 41% was instead sheltered in Budget 2027 PSIA (€50,000 allowance)
  const psialSavingsPotentialEUR = exitTaxLiabilityEUR;

  // Calculate India Jurisdiction Summary
  const indiaHoldings = holdingDetails.filter(h => h.country === 'India');
  const indiaTotalValEUR = indiaHoldings.reduce((s, h) => s + h.currentValueEUR, 0);
  const indiaTotalValINR = convertFromSimulatedEUR(indiaTotalValEUR, 'INR');
  const indiaTotalGainEUR = indiaHoldings.reduce((s, h) => s + h.totalGainEUR, 0);
  const indiaTotalGainINR = convertFromSimulatedEUR(indiaTotalGainEUR, 'INR');
  const indiaAssetGainEUR = indiaHoldings.reduce((s, h) => s + h.assetGainEUR, 0);
  const indiaFxGainEUR = indiaHoldings.reduce((s, h) => s + h.fxGainEUR, 0);

  // Indian Section 112A LTCG Exemption: ₹1,25,000 (~€1,352)
  const INDIA_LTCG_EXEMPTION_INR = 125000;
  const indiaExemptionINR = (inputs.holdingPeriod === 'long_term' && inputs.applyIndianLtcgExemption)
    ? Math.min(indiaTotalGainINR, INDIA_LTCG_EXEMPTION_INR)
    : 0;
  const indiaExemptionEUR = convertToSimulatedEUR(indiaExemptionINR, 'INR');
  
  const taxableIndiaGainINR = Math.max(0, indiaTotalGainINR - indiaExemptionINR);
  const taxableIndiaGainEUR = convertToSimulatedEUR(taxableIndiaGainINR, 'INR');
  const indianTaxRate = inputs.holdingPeriod === 'long_term' ? 0.125 : 0.20;
  const grossIndiaTaxINR = taxableIndiaGainINR * indianTaxRate * 1.04; // including 4% health & education cess
  const grossIndiaTaxEUR = convertToSimulatedEUR(grossIndiaTaxINR, 'INR');

  // Double Taxation Avoidance Agreement (DTAA) Foreign Tax Credit:
  // Ireland taxes worldwide gains of Irish residents (included in grossIrishTaxLiabilityEUR above). Indian tax paid
  // is credited against the Irish tax on the same gains, capped at the lesser of the two.
  const irishTaxOnIndianGainEUR = irishTaxOnCountryGainsEUR('India');
  const indianDtaaCreditEUR = Math.max(0, Math.min(grossIndiaTaxEUR, irishTaxOnIndianGainEUR));

  // Calculate US Jurisdiction Summary
  const usHoldings = holdingDetails.filter(h => h.country === 'US');
  const usTotalValEUR = usHoldings.reduce((s, h) => s + h.currentValueEUR, 0);
  const usTotalValUSD = convertFromSimulatedEUR(usTotalValEUR, 'USD');
  const usTotalGainEUR = usHoldings.reduce((s, h) => s + h.totalGainEUR, 0);
  const usTotalGainUSD = convertFromSimulatedEUR(usTotalGainEUR, 'USD');
  const usAssetGainEUR = usHoldings.reduce((s, h) => s + h.assetGainEUR, 0);
  const usFxGainEUR = usHoldings.reduce((s, h) => s + h.fxGainEUR, 0);

  let usDirectTaxUSD = 0;
  let usDirectTaxEUR = 0;
  if (inputs.userTaxResidency === 'us_person_in_ireland') {
    usDirectTaxUSD = usTotalGainUSD * 0.20;
    usDirectTaxEUR = convertToSimulatedEUR(usDirectTaxUSD, 'USD');
  } else if (!inputs.hasW8Ben) {
    usDirectTaxUSD = usTotalGainUSD * 0.30; // 30% statutory withholding without W-8BEN
    usDirectTaxEUR = convertToSimulatedEUR(usDirectTaxUSD, 'USD');
  } else {
    // 0% US withholding under W-8BEN Treaty Article 14
    usDirectTaxUSD = 0;
    usDirectTaxEUR = 0;
  }

  // US-Ireland treaty foreign tax credit, capped at the Irish tax on the same US gains
  const irishTaxOnUsGainEUR = irishTaxOnCountryGainsEUR('US');
  const usForeignTaxCreditEUR = Math.max(0, Math.min(usDirectTaxEUR, irishTaxOnUsGainEUR));
  const totalForeignTaxCreditsEUR = indianDtaaCreditEUR + usForeignTaxCreditEUR;
  const netIrishTaxLiabilityEUR = Math.max(0, grossIrishTaxLiabilityEUR - totalForeignTaxCreditsEUR);
  const irishTaxableBaseGainsEUR = cgtGainsEUR + exitTaxGainsEUR;

  // Consolidated summaries
  const irelandSummary: TaxJurisdictionSummary = {
    country: 'Ireland',
    countryLabel: 'Ireland (Revenue Commissioners)',
    currency: 'EUR',
    totalHoldingsValueEUR: irishTotalValEUR,
    totalHoldingsValueLocal: irishTotalValEUR,
    totalUnrealizedGainsEUR: irishTotalGainEUR,
    totalUnrealizedGainsLocal: irishTotalGainEUR,
    assetGrowthGainEUR: irishAssetGainEUR,
    currencyFluctuationGainEUR: irishFxGainEUR,
    statutoryExemptionLocal: appliedIrishExemptionEUR,
    statutoryExemptionEUR: appliedIrishExemptionEUR,
    taxableGainsEUR: taxableIrishCgtGainsEUR + exitTaxGainsEUR,
    grossTaxLiabilityEUR: grossIrishTaxLiabilityEUR,
    foreignTaxCreditEUR: totalForeignTaxCreditsEUR,
    netTaxLiabilityEUR: netIrishTaxLiabilityEUR,
    effectiveTaxRatePct: irishTaxableBaseGainsEUR > 0 ? (netIrishTaxLiabilityEUR / irishTaxableBaseGainsEUR) * 100 : 0,
    applicableRules: [
      'Standard CGT: 33% (TCA 1997 s.28)',
      'UCITS ETF Exit Tax: 41% (s.739D) without allowance',
      `Annual Personal Exemption: €${IRISH_CGT_EXEMPTION_EUR.toLocaleString()} applies to shares/RSUs`,
      'Foreign Asset Rule: Disposal & purchase converted at respective transaction date FX rates',
      'Worldwide Basis: Indian & US gains are chargeable to Irish tax, less capped DTAA / treaty foreign tax credits'
    ],
    keyAdvice: `Utilizing your €${IRISH_CGT_EXEMPTION_EUR.toLocaleString()} annual CGT allowance saves €${(appliedIrishExemptionEUR * 0.33).toFixed(2)} in tax. Transferring ETF assets to the 2027 PSIA shelters against 41% exit tax.`
  };

  const indiaSummary: TaxJurisdictionSummary = {
    country: 'India',
    countryLabel: 'India (Income Tax Department / CBDT)',
    currency: 'INR',
    totalHoldingsValueEUR: indiaTotalValEUR,
    totalHoldingsValueLocal: indiaTotalValINR,
    totalUnrealizedGainsEUR: indiaTotalGainEUR,
    totalUnrealizedGainsLocal: indiaTotalGainINR,
    assetGrowthGainEUR: indiaAssetGainEUR,
    currencyFluctuationGainEUR: indiaFxGainEUR,
    statutoryExemptionLocal: indiaExemptionINR,
    statutoryExemptionEUR: indiaExemptionEUR,
    taxableGainsEUR: taxableIndiaGainEUR,
    grossTaxLiabilityEUR: grossIndiaTaxEUR,
    // Claimed against Irish tax (not refunded in India); shown here for reference
    foreignTaxCreditEUR: indianDtaaCreditEUR,
    netTaxLiabilityEUR: grossIndiaTaxEUR,
    effectiveTaxRatePct: indiaTotalGainEUR > 0 ? (grossIndiaTaxEUR / indiaTotalGainEUR) * 100 : 0,
    applicableRules: [
      `Section 112A LTCG: 12.5% on listed equities & equity mutual funds (Budget 2024)`,
      `Annual LTCG Exemption: ₹${INDIA_LTCG_EXEMPTION_INR.toLocaleString()} per financial year`,
      'Section 111A STCG: 20% on short-term gains (held <= 12 months)',
      'DTAA Article 13 & 25: Indian tax paid can be credited against Irish CGT liability'
    ],
    keyAdvice: `Harvesting gains up to ₹${INDIA_LTCG_EXEMPTION_INR.toLocaleString()} annually in India yields 0% Indian tax. Irish Revenue grants foreign tax credits for tax withheld in India under DTAA.`
  };

  const usSummary: TaxJurisdictionSummary = {
    country: 'US',
    countryLabel: 'United States (IRS)',
    currency: 'USD',
    totalHoldingsValueEUR: usTotalValEUR,
    totalHoldingsValueLocal: usTotalValUSD,
    totalUnrealizedGainsEUR: usTotalGainEUR,
    totalUnrealizedGainsLocal: usTotalGainUSD,
    assetGrowthGainEUR: usAssetGainEUR,
    currencyFluctuationGainEUR: usFxGainEUR,
    statutoryExemptionLocal: 0,
    statutoryExemptionEUR: 0,
    taxableGainsEUR: usTotalGainEUR,
    grossTaxLiabilityEUR: usDirectTaxEUR,
    // Claimed against Irish tax; shown here for reference
    foreignTaxCreditEUR: usForeignTaxCreditEUR,
    netTaxLiabilityEUR: usDirectTaxEUR,
    effectiveTaxRatePct: usTotalGainEUR > 0 ? (usDirectTaxEUR / usTotalGainEUR) * 100 : 0,
    applicableRules: [
      inputs.hasW8Ben ? 'W-8BEN Treaty Article 14: 0% US withholding on capital gains' : '30% statutory US withholding (No W-8BEN)',
      'RSU Vesting Rule: Cost basis is FMV on vest date; only post-vest growth subject to CGT',
      'Currency Volatility: EUR/USD movements directly amplify or dampen Irish taxable EUR gain',
      'Irish Reporting: US stock gains must be reported on Irish Form 11 / MyAccount under 33% CGT'
    ],
    keyAdvice: inputs.hasW8Ben 
      ? 'Ensure your W-8BEN is renewed every 3 years with your US broker (Morgan Stanley / Charles Schwab) to maintain 0% US capital gains withholding.'
      : 'File Form W-8BEN immediately to eliminate 30% US statutory withholding on capital gains.'
  };

  // Cross-border consolidated totals
  const totalGlobalTaxLiabilityEUR = grossIrishTaxLiabilityEUR + grossIndiaTaxEUR + usDirectTaxEUR;
  const netPayableTaxEUR = Math.max(0, totalGlobalTaxLiabilityEUR - totalForeignTaxCreditsEUR);
  const overallEffectiveRatePct = totalUnrealizedGainsEUR > 0 
    ? (netPayableTaxEUR / totalUnrealizedGainsEUR) * 100 
    : 0;

  // Key actionable insights
  const taxHarvestingInsights: string[] = [
    `Irish Annual Exemption (€1,270): ${inputs.applyIrishCgtExemption ? `Applied across eligible US & domestic shares, reducing your Irish tax bill by €${(appliedIrishExemptionEUR * 0.33).toFixed(2)}.` : 'Currently unutilized. Selling assets with €1,270 in gains before Dec 31 eliminates €419 in tax.'}`,
    `Indian LTCG Threshold (₹1.25 Lakh): Under Section 112A, the first ₹1,25,000 (~€${indiaExemptionEUR.toFixed(0)}) of equity mutual fund gains is completely tax-free in India each fiscal year.`,
    `Budget 2027 PSIA Opportunity: You hold €${exitTaxGainsEUR.toLocaleString()} in unrealized ETF gains subject to 41% exit tax (€${exitTaxLiabilityEUR.toLocaleString()}). Transitioning these to the upcoming €50,000 Investment Account avoids exit tax & deemed disposal.`,
    `Currency Fluctuation Factor: FX movements account for €${Math.abs(totalFxGainEUR).toFixed(2)} (${totalFxGainEUR >= 0 ? 'additional taxable gain' : 'capital loss offset'}) in EUR due to exchange rate shifts since acquisition date.`,
    `Double Taxation Relief: You have €${indianDtaaCreditEUR.toFixed(2)}     in foreign tax credits claimable in Ireland under the India-Ireland DTAA (capped at the €${irishTaxOnIndianGainEUR.toFixed(2)} Irish tax on the same Indian gains), preventing double taxation.`
  ];

      const assumptions: string[] = [];
      const estimatedBasisHoldings = holdingDetails.filter(h => h.isEstimatedCostBasis);
      if (estimatedBasisHoldings.length > 0) {
        assumptions.push(
          `Purchase value missing for ${estimatedBasisHoldings.map(h => h.assetName).join(', ')}: cost basis estimated at ${Math.round(ESTIMATED_COST_BASIS_RATIO * 100)}% of current value. Enter actual purchase values for accurate figures.`
        );
      }
      const estimatedFxCurrencies = Array.from(new Set(holdingDetails.filter(h => h.isEstimatedAcquisitionFx).map(h => h.currency)));
      if (estimatedFxCurrencies.length > 0) {
        assumptions.push(
          `Acquisition FX rates assumed (not trade-date actuals): ${estimatedFxCurrencies.map(c => `EUR/${c} ${HISTORICAL_FX_ACQUISITION[c]}`).join(', ')}.`
        );
      }

  return {
    simulatedFxRates: {
      EUR_TO_USD: simulatedEurUsd,
      EUR_TO_INR: simulatedEurInr,
      EUR_TO_GBP: simulatedEurGbp,
    },
    totalPortfolioValueEUR,
    totalUnrealizedGainsEUR,
    totalAssetGainEUR,
    totalFxGainEUR,
    irelandSummary,
    indiaSummary,
    usSummary,
    totalGlobalTaxLiabilityEUR,
    totalForeignTaxCreditsEUR,
    netPayableTaxEUR,
    overallEffectiveRatePct,
    holdingDetails,
    psialSavingsPotentialEUR,
    taxHarvestingInsights,
    assumptions,
  };
}
