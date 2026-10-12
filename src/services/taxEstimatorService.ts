import { Holding, Currency, FiscalDataResponse } from '../types';
import { FALLBACK_FISCAL_DATA } from './fiscalDataService';

export interface TaxJurisdictionSummary {
  country: 'Ireland' | 'India' | 'US';
  countryLabel: string;
  currency: Currency;
  totalHoldingsValueEUR: number;
  totalHoldingsValueLocal: number;
  /** Net unrealised gain (negative when losses exceed gains). */
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
  /** Signed gain in the holding's own currency (negative = loss). */
  totalGainLocal: number;
  /** Signed gain in EUR on the Irish basis (cost at acquisition FX, value at simulated spot FX). */
  totalGainEUR: number;
  gainPct: number;
  // Breakdown of gain: asset price vs FX movement (both signed)
  assetGainEUR: number;
  fxGainEUR: number;
  // Tax treatments
  taxTreatment: 'Standard CGT' | 'Exit Tax (38%)' | 'Indian LTCG (12.5%)' | 'Indian STCG (20%)' | 'US W-8BEN (0% US / 33% IE)' | 'Tax-Exempt Pension' | 'DIRT Deposit';
  applicableRate: number;
  /** Combined tax on this holding's gain before annual exemptions, loss netting and foreign tax credits. */
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
  /** Net unrealised gain across all holdings (negative when losses exceed gains). */
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
  /** Irish exit tax (38%) on fund/ETF gains, shown separately from CGT. */
  irishExitTaxEUR: number;
  /** Irish CGT (33%) after loss netting and the annual exemption. */
  irishCgtEUR: number;
  /** Losses on CGT assets netted against CGT gains before the annual exemption. */
  cgtLossesOffsetEUR: number;
  holdingDetails: HoldingTaxDetail[];
  psialSavingsPotentialEUR: number; // Exit tax on current ETF gains (indicative only)
  taxHarvestingInsights: string[];
  /** Explicit list of estimates/simplifications used in this result. */
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
export const IRISH_CGT_RATE = 0.33;
/** Irish exit tax for individuals on funds/ETFs: 38% for chargeable events from 1 Jan 2026 (Finance Act 2025). */
export const IRISH_EXIT_TAX_RATE = 0.38;
export const IRISH_CGT_EXEMPTION_EUR = 1270;
const INDIA_LTCG_EXEMPTION_INR = 125000;
const INDIA_CESS_MULTIPLIER = 1.04; // 4% health & education cess

const finiteOrUndefined = (value: number | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const formatEUR = (amount: number, fractionDigits = 0): string =>
  `€${amount.toLocaleString('en-IE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;

const sumBy = <T,>(items: T[], pick: (item: T) => number): number => items.reduce((s, item) => s + pick(item), 0);

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

  // Process each holding
  const holdingDetails: HoldingTaxDetail[] = holdings.map((h) => {
    // Empty/invalid numeric inputs (NaN) are treated as 0 value / missing cost basis.
    const currentValLocal = finiteOrUndefined(h.currentValue) ?? 0;
    const recordedPurchaseValue = finiteOrUndefined(h.purchaseValue);
    const isCash = h.assetType === 'Cash / Deposit';
    // Cash principal has no capital gain, so a missing basis there is not an estimate.
    const isEstimatedCostBasis = recordedPurchaseValue === undefined && !isCash;
    const purchaseValLocal = recordedPurchaseValue !== undefined
      ? recordedPurchaseValue
      : (isCash ? currentValLocal : currentValLocal * ESTIMATED_COST_BASIS_RATIO);
    const isEstimatedAcquisitionFx = h.currency !== 'EUR';
    const gainLocal = currentValLocal - purchaseValLocal;
    const gainPct = purchaseValLocal > 0 ? (gainLocal / purchaseValLocal) * 100 : 0;

    // Current value in EUR at simulated spot FX
    const currentValEUR = convertToSimulatedEUR(currentValLocal, h.currency);
    
    // Historical acquisition value in EUR according to Irish Revenue rules:
    // "Cost of acquisition must be converted to EUR using the market exchange rate on the date of acquisition."
    const acqRate = HISTORICAL_FX_ACQUISITION[h.currency] || 1.0;
    const purchaseValEUR = purchaseValLocal / acqRate;

    // Signed gain/loss in EUR for Irish tax computation
    const totalGainEUR = currentValEUR - purchaseValEUR;
    const chargeableGainEUR = Math.max(0, totalGainEUR);

    // Pure asset gain in EUR (if FX had stayed at acquisition rate) and the remaining FX effect
    const pureAssetGainEUR = gainLocal / acqRate;
    const fxGainEUR = totalGainEUR - pureAssetGainEUR;

    // Determine tax treatment & jurisdiction
    let taxTreatment: HoldingTaxDetail['taxTreatment'] = 'Standard CGT';
    let applicableRate = IRISH_CGT_RATE;
    let taxJurisdiction: HoldingTaxDetail['taxJurisdiction'] = 'Ireland';
    let dtaaCreditEligible = false;
    let notes = '';

    if (h.assetType === 'Pension') {
      taxTreatment = 'Tax-Exempt Pension';
      applicableRate = 0;
      notes = 'PRSA / occupational pension growth is not subject to CGT or exit tax while inside the wrapper. Income tax applies on drawdown (not estimated here).';
    } else if (isCash) {
      taxTreatment = 'DIRT Deposit';
      applicableRate = 0;
      notes = 'DIRT (33%) is normally deducted at source by the bank on deposit interest, so no further tax is estimated here. Deposit principal is not subject to CGT.';
    } else if (h.assetType === 'ETF') {
      // UCITS ETF under Irish Exit Tax rules
      taxTreatment = 'Exit Tax (38%)';
      applicableRate = IRISH_EXIT_TAX_RATE;
      notes = 'Irish/EU UCITS ETFs: 38% exit tax (TCA 1997 s.739D, rate from 1 Jan 2026) on disposal and on each 8-year deemed disposal. No €1,270 exemption and no offset of losses against other gains. Estimated here on the whole unrealised gain.';
    } else if (h.country === 'India') {
      taxJurisdiction = 'India';
      dtaaCreditEligible = true;
      if (inputs.holdingPeriod === 'long_term') {
        taxTreatment = 'Indian LTCG (12.5%)';
        applicableRate = 0.125; // Union Budget 2024 LTCG rate
        notes = 'India LTCG under Section 112A at 12.5% (+4% cess) above the ₹1.25 lakh exemption. Also chargeable to 33% Irish CGT, with Indian tax credited under the India-Ireland DTAA.';
      } else {
        taxTreatment = 'Indian STCG (20%)';
        applicableRate = 0.20; // Union Budget 2024 STCG rate
        notes = 'India STCG under Section 111A at 20% (+4% cess). Also chargeable to 33% Irish CGT, with Indian tax credited under the India-Ireland DTAA.';
      }
    } else if (h.country === 'US' || h.assetType === 'RSU') {
      taxJurisdiction = 'US';
      if (inputs.userTaxResidency === 'us_person_in_ireland') {
        taxTreatment = 'Standard CGT';
        applicableRate = 0.20; // US Federal LTCG
        notes = 'US person: estimated 20% US federal tax plus 33% Irish CGT, with US tax credited against Irish tax on the same gain.';
      } else if (inputs.hasW8Ben) {
        taxTreatment = 'US W-8BEN (0% US / 33% IE)';
        applicableRate = IRISH_CGT_RATE; // 0% US, 33% Irish CGT
        notes = 'With a valid W-8BEN, US tax on capital gains is generally 0% under the US-Ireland treaty. Taxable at 33% under Irish CGT.';
      } else {
        taxTreatment = 'Standard CGT';
        applicableRate = 0.30;
        notes = 'Assumes 30% US withholding without a valid W-8BEN, credited against 33% Irish CGT on the same gain.';
      }
    } else {
      // Domestic Irish / European equities
      notes = 'Standard Irish Capital Gains Tax (33%) under TCA 1997 s.28.';
    }

    // Combined per-holding estimate before exemptions, loss netting and credits. Irish residents pay
    // Irish CGT on worldwide gains with foreign tax credited, so the burden is the higher of the two rates.
    let estimatedTaxEUR = 0;
    if (taxTreatment === 'Exit Tax (38%)') {
      estimatedTaxEUR = chargeableGainEUR * IRISH_EXIT_TAX_RATE;
    } else if (taxTreatment !== 'Tax-Exempt Pension' && taxTreatment !== 'DIRT Deposit') {
      const foreignRate = taxJurisdiction === 'India'
        ? applicableRate * INDIA_CESS_MULTIPLIER
        : taxJurisdiction === 'US' ? applicableRate : 0;
      estimatedTaxEUR = chargeableGainEUR * Math.max(IRISH_CGT_RATE, foreignRate);
    }

    const estimatedTaxLocal = convertFromSimulatedEUR(estimatedTaxEUR, h.currency);

    return {
      id: h.id,
      assetName: h.assetName,
      assetType: h.assetType,
      country: h.country,
      currency: h.currency,
      units: finiteOrUndefined(h.units) ?? 0,
      unitPrice: finiteOrUndefined(h.unitPrice) ?? 0,
      currentValueLocal: currentValLocal,
      purchaseValueLocal: purchaseValLocal,
      currentValueEUR: currentValEUR,
      purchaseValueEUR: purchaseValEUR,
      totalGainLocal: gainLocal,
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

  const totalPortfolioValueEUR = sumBy(holdingDetails, h => h.currentValueEUR);
  const totalUnrealizedGainsEUR = sumBy(holdingDetails, h => h.totalGainEUR);
  const totalAssetGainEUR = sumBy(holdingDetails, h => h.assetGainEUR);
  const totalFxGainEUR = sumBy(holdingDetails, h => h.fxGainEUR);
  const totalChargeableGainsEUR = sumBy(holdingDetails, h => Math.max(0, h.totalGainEUR));

  // Calculate Ireland Jurisdiction Summary (display figures for Irish/European holdings)
  const irishHoldings = holdingDetails.filter(h => h.country === 'Ireland' || h.country === 'Europe');
  const irishTotalValEUR = sumBy(irishHoldings, h => h.currentValueEUR);
  const irishTotalGainEUR = sumBy(irishHoldings, h => h.totalGainEUR);
  const irishAssetGainEUR = sumBy(irishHoldings, h => h.assetGainEUR);
  const irishFxGainEUR = sumBy(irishHoldings, h => h.fxGainEUR);

  // Irish Exit Tax Holdings (ETFs): each fund is taxed on its own gain; fund losses give no relief.
  const exitTaxHoldings = holdingDetails.filter(h => h.taxTreatment === 'Exit Tax (38%)');
  const exitTaxGainsEUR = sumBy(exitTaxHoldings, h => Math.max(0, h.totalGainEUR));
  const exitTaxLiabilityEUR = exitTaxGainsEUR * IRISH_EXIT_TAX_RATE;

  // Irish CGT Qualifying Holdings (Shares, RSUs, US assets and Indian equities/funds).
  // Irish residents are taxed on worldwide gains, so Indian gains are also chargeable to 33% Irish CGT;
  // Indian tax paid is relieved separately via the capped DTAA credit below.
  const isIrishCgtHolding = (h: HoldingTaxDetail): boolean =>
    h.taxTreatment === 'Standard CGT' ||
    h.taxTreatment === 'US W-8BEN (0% US / 33% IE)' ||
    h.taxTreatment === 'Indian LTCG (12.5%)' ||
    h.taxTreatment === 'Indian STCG (20%)';
  const cgtHoldings = holdingDetails.filter(isIrishCgtHolding);
  const grossCgtGainsEUR = sumBy(cgtHoldings, h => Math.max(0, h.totalGainEUR));
  // Losses on CGT assets are deducted from gains before the annual exemption (as if all were disposed of this year).
  const cgtGainsEUR = Math.max(0, sumBy(cgtHoldings, h => h.totalGainEUR));
  const cgtLossesOffsetEUR = grossCgtGainsEUR - cgtGainsEUR;

  const appliedIrishExemptionEUR = inputs.applyIrishCgtExemption ? Math.min(cgtGainsEUR, IRISH_CGT_EXEMPTION_EUR) : 0;
  const taxableIrishCgtGainsEUR = Math.max(0, cgtGainsEUR - appliedIrishExemptionEUR);
  const cgtLiabilityEUR = taxableIrishCgtGainsEUR * IRISH_CGT_RATE;

  // Irish CGT attributable to each source jurisdiction (net of that jurisdiction's losses), with the
  // annual exemption and cross-jurisdiction loss netting shared pro rata.
  const netCgtGainFor = (jurisdiction: HoldingTaxDetail['taxJurisdiction']): number =>
    Math.max(0, sumBy(cgtHoldings.filter(h => h.taxJurisdiction === jurisdiction), h => h.totalGainEUR));
  const positiveCgtGainsByJurisdiction = netCgtGainFor('Ireland') + netCgtGainFor('India') + netCgtGainFor('US');
  const irishCgtShareFor = (jurisdiction: HoldingTaxDetail['taxJurisdiction']): number =>
    positiveCgtGainsByJurisdiction > 0 ? cgtLiabilityEUR * (netCgtGainFor(jurisdiction) / positiveCgtGainsByJurisdiction) : 0;

  const grossIrishTaxLiabilityEUR = exitTaxLiabilityEUR + cgtLiabilityEUR;

  // Indicative only: exit tax currently attributable to ETF gains held outside the announced account
  const psialSavingsPotentialEUR = exitTaxLiabilityEUR;

  // Calculate India Jurisdiction Summary
  const indiaHoldings = holdingDetails.filter(h => h.country === 'India');
  const indiaTaxHoldings = indiaHoldings.filter(h => h.taxTreatment !== 'Tax-Exempt Pension' && h.taxTreatment !== 'DIRT Deposit');
  const indiaTotalValEUR = sumBy(indiaHoldings, h => h.currentValueEUR);
  const indiaTotalValINR = convertFromSimulatedEUR(indiaTotalValEUR, 'INR');
  const indiaTotalGainEUR = sumBy(indiaTaxHoldings, h => h.totalGainEUR);
  // Indian tax is computed on the rupee gain, so EUR/INR moves do not change it.
  const indiaTotalGainINR = sumBy(indiaTaxHoldings, h =>
    h.currency === 'INR' ? h.totalGainLocal : convertFromSimulatedEUR(h.totalGainEUR, 'INR'));
  const indiaAssetGainEUR = sumBy(indiaHoldings, h => h.assetGainEUR);
  const indiaFxGainEUR = sumBy(indiaHoldings, h => h.fxGainEUR);

  // Indian Section 112A LTCG Exemption: ₹1,25,000
  const indiaExemptionINR = (inputs.holdingPeriod === 'long_term' && inputs.applyIndianLtcgExemption)
    ? Math.min(Math.max(0, indiaTotalGainINR), INDIA_LTCG_EXEMPTION_INR)
    : 0;
  const indiaExemptionEUR = convertToSimulatedEUR(indiaExemptionINR, 'INR');
  
  const taxableIndiaGainINR = Math.max(0, indiaTotalGainINR - indiaExemptionINR);
  const taxableIndiaGainEUR = convertToSimulatedEUR(taxableIndiaGainINR, 'INR');
  const indianTaxRate = inputs.holdingPeriod === 'long_term' ? 0.125 : 0.20;
  const grossIndiaTaxINR = taxableIndiaGainINR * indianTaxRate * INDIA_CESS_MULTIPLIER;
  const grossIndiaTaxEUR = convertToSimulatedEUR(grossIndiaTaxINR, 'INR');

  // Double Taxation Avoidance Agreement (DTAA) Foreign Tax Credit:
  // Ireland taxes worldwide gains of Irish residents (included in grossIrishTaxLiabilityEUR above). Indian tax paid
  // is credited against the Irish tax on the same gains, capped at the lesser of the two.
  const indiaExitTaxEUR = sumBy(exitTaxHoldings.filter(h => h.country === 'India'), h => Math.max(0, h.totalGainEUR)) * IRISH_EXIT_TAX_RATE;
  const irishTaxOnIndianGainEUR = irishCgtShareFor('India') + indiaExitTaxEUR;
  const indianDtaaCreditEUR = Math.max(0, Math.min(grossIndiaTaxEUR, irishTaxOnIndianGainEUR));

  // Calculate US Jurisdiction Summary
  const usHoldings = holdingDetails.filter(h => h.country === 'US');
  const usTaxHoldings = holdingDetails.filter(h => h.taxJurisdiction === 'US');
  const usTotalValEUR = sumBy(usHoldings, h => h.currentValueEUR);
  const usTotalValUSD = convertFromSimulatedEUR(usTotalValEUR, 'USD');
  const usTotalGainEUR = sumBy(usTaxHoldings, h => h.totalGainEUR);
  const usTotalGainUSD = sumBy(usTaxHoldings, h =>
    h.currency === 'USD' ? h.totalGainLocal : convertFromSimulatedEUR(h.totalGainEUR, 'USD'));
  const usTaxableGainUSD = Math.max(0, usTotalGainUSD);
  const usAssetGainEUR = sumBy(usHoldings, h => h.assetGainEUR);
  const usFxGainEUR = sumBy(usHoldings, h => h.fxGainEUR);

  let usDirectTaxUSD = 0;
  if (inputs.userTaxResidency === 'us_person_in_ireland') {
    usDirectTaxUSD = usTaxableGainUSD * 0.20;
  } else if (!inputs.hasW8Ben) {
    usDirectTaxUSD = usTaxableGainUSD * 0.30; // 30% statutory withholding without W-8BEN
  }
  // Otherwise 0% US tax under the W-8BEN / US-Ireland treaty
  const usDirectTaxEUR = convertToSimulatedEUR(usDirectTaxUSD, 'USD');

  // US-Ireland treaty foreign tax credit, capped at the Irish tax on the same US gains
  const irishTaxOnUsGainEUR = irishCgtShareFor('US');
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
      'UCITS ETF Exit Tax: 38% from 1 Jan 2026 (s.739D), no annual exemption or loss relief',
      `Annual Personal Exemption: €${IRISH_CGT_EXEMPTION_EUR.toLocaleString('en-IE')} on net chargeable gains after losses`,
      'Foreign Asset Rule: Disposal & purchase converted at respective transaction date FX rates',
      'Worldwide Basis: Indian & US gains are chargeable to Irish tax, less capped DTAA / treaty foreign tax credits'
    ],
    keyAdvice: `Using your €${IRISH_CGT_EXEMPTION_EUR.toLocaleString('en-IE')} annual CGT exemption saves ${formatEUR(appliedIrishExemptionEUR * IRISH_CGT_RATE, 2)} in tax. ETFs held outside the announced 2027 Investment Account remain subject to 38% exit tax and 8-year deemed disposal.`
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
      `Annual LTCG Exemption: ₹${INDIA_LTCG_EXEMPTION_INR.toLocaleString('en-IN')} per financial year`,
      'Section 111A STCG: 20% on short-term gains (held <= 12 months)',
      'DTAA Article 13 & 25: Indian tax paid can be credited against Irish CGT liability'
    ],
    keyAdvice: `Long-term gains up to ₹${INDIA_LTCG_EXEMPTION_INR.toLocaleString('en-IN')} per year are exempt from Indian tax, but remain chargeable to Irish CGT. Indian tax paid can be credited against Irish tax on the same gains under the DTAA.`
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
    taxableGainsEUR: Math.max(0, usTotalGainEUR),
    grossTaxLiabilityEUR: usDirectTaxEUR,
    // Claimed against Irish tax; shown here for reference
    foreignTaxCreditEUR: usForeignTaxCreditEUR,
    netTaxLiabilityEUR: usDirectTaxEUR,
    effectiveTaxRatePct: usTotalGainEUR > 0 ? (usDirectTaxEUR / usTotalGainEUR) * 100 : 0,
    applicableRules: [
      inputs.userTaxResidency === 'us_person_in_ireland'
        ? 'US person: US tax on gains (estimated at 20% federal LTCG), credited against Irish CGT'
        : inputs.hasW8Ben ? 'W-8BEN Treaty Article 14: 0% US withholding on capital gains' : '30% statutory US withholding (No W-8BEN)',
      'RSU Vesting Rule: Cost basis is FMV on vest date; only post-vest growth subject to CGT',
      'Currency Volatility: EUR/USD movements directly amplify or dampen Irish taxable EUR gain',
      'Irish Reporting: US stock gains must be reported on Irish Form 11 / MyAccount under 33% CGT'
    ],
    keyAdvice: inputs.userTaxResidency === 'us_person_in_ireland'
      ? 'As a US person you file US returns on worldwide gains; claim US tax paid as a credit against Irish CGT on the same gains.'
      : inputs.hasW8Ben
        ? 'Ensure your W-8BEN is renewed every 3 years with your US broker to maintain 0% US capital gains withholding.'
        : 'Filing Form W-8BEN with your US broker can remove US withholding on capital gains.'
  };

  // Cross-border consolidated totals
  const totalGlobalTaxLiabilityEUR = grossIrishTaxLiabilityEUR + grossIndiaTaxEUR + usDirectTaxEUR;
  const netPayableTaxEUR = Math.max(0, totalGlobalTaxLiabilityEUR - totalForeignTaxCreditsEUR);
  // Rate on gross chargeable gains, so net losses cannot push the rate above 100%.
  const overallEffectiveRatePct = totalChargeableGainsEUR > 0
    ? (netPayableTaxEUR / totalChargeableGainsEUR) * 100
    : 0;

  // Key actionable insights
  const indiaExemptionApproxEUR = convertToSimulatedEUR(INDIA_LTCG_EXEMPTION_INR, 'INR');
  const taxHarvestingInsights: string[] = [
    `Irish Annual Exemption (€1,270): ${inputs.applyIrishCgtExemption
      ? `Applied against your net chargeable gains on shares, RSUs and Indian funds, reducing Irish CGT by ${formatEUR(appliedIrishExemptionEUR * IRISH_CGT_RATE, 2)}.`
      : `Currently not applied. Realising up to €1,270 of gains by 31 December can save up to ${formatEUR(IRISH_CGT_EXEMPTION_EUR * IRISH_CGT_RATE, 2)} in CGT.`}`,
  ];
  if (cgtLossesOffsetEUR > 0) {
    taxHarvestingInsights.push(
      `Loss Relief: ${formatEUR(cgtLossesOffsetEUR)} of unrealised losses on shares/funds are netted against CGT gains before the €1,270 exemption. Losses on exit-tax ETFs cannot be offset.`
    );
  }
  if (indiaHoldings.length > 0) {
    taxHarvestingInsights.push(
      `Indian LTCG Threshold (₹1.25 lakh): Under Section 112A, the first ₹1,25,000 (~${formatEUR(indiaExemptionApproxEUR)}) of long-term equity gains is exempt from Indian tax each financial year (still chargeable to Irish CGT).`,
      `Double Taxation Relief: An estimated ${formatEUR(indianDtaaCreditEUR, 2)} of Indian tax is creditable in Ireland under the India-Ireland DTAA (capped at the ${formatEUR(irishTaxOnIndianGainEUR, 2)} Irish tax on the same Indian gains).`
    );
  }
  if (exitTaxGainsEUR > 0) {
    taxHarvestingInsights.push(
      `Budget 2027 Investment Account (announced): ${formatEUR(exitTaxGainsEUR)} of unrealised ETF gains face 38% exit tax (${formatEUR(exitTaxLiabilityEUR)}). The announced account is intended to remove exit tax and deemed disposal on new qualifying investments within its limits; selling existing ETFs to move them would itself trigger exit tax.`
    );
  }
  if (Math.abs(totalFxGainEUR) >= 0.005) {
    taxHarvestingInsights.push(
      `Currency Fluctuation Factor: FX movements account for ${formatEUR(Math.abs(totalFxGainEUR), 2)} (${totalFxGainEUR >= 0 ? 'additional taxable gain' : 'reduction in taxable gain'}) in EUR due to exchange rate shifts since the assumed acquisition dates.`
    );
  }

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
  if (exitTaxHoldings.length > 0) {
    assumptions.push(
      'Exit tax (38%) is estimated on the whole unrealised gain of each ETF, as if sold or deemed disposed of today. In practice deemed disposal applies to each purchase lot on its 8th anniversary, and exit tax already paid is credited on final disposal.'
    );
  }
  if (holdingDetails.some(h => h.taxTreatment === 'DIRT Deposit')) {
    assumptions.push(
      'Deposits: DIRT (33%) on interest is assumed to be deducted at source by your bank, so no deposit tax is included. Deposit principal is not subject to CGT.'
    );
  }
  if (cgtHoldings.some(h => h.totalGainEUR < 0) || exitTaxHoldings.some(h => h.totalGainEUR < 0)) {
    assumptions.push(
      'Losses: unrealised losses on shares, RSUs and Indian funds are netted against gains as if everything were sold in the same tax year. ETF (exit tax) losses are not offset against other gains.'
    );
  }
  if (inputs.userTaxResidency === 'us_person_in_ireland' && usTaxHoldings.length > 0) {
    assumptions.push(
      'US person: US tax is estimated at a flat 20% on US-sited gains only. Net investment income tax, state tax and US tax on non-US gains are not modelled.'
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
    irishExitTaxEUR: exitTaxLiabilityEUR,
    irishCgtEUR: cgtLiabilityEUR,
    cgtLossesOffsetEUR,
    holdingDetails,
    psialSavingsPotentialEUR,
    taxHarvestingInsights,
    assumptions,
  };
}
