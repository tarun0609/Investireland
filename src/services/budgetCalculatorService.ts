import { BudgetCalculatorInputs, BudgetCalculatorResult, YearProjection } from '../types';

export function calculateBudgetProjections(inputs: BudgetCalculatorInputs): BudgetCalculatorResult {
  const {
    startingAmount,
    monthlyContribution,
    timeHorizonYears,
    annualReturnRate,
    adjustForInflation,
    assetClass
  } = inputs;

  const annualContribution = monthlyContribution * 12;
  const inflationRate = 0.022; // 2.2% official Irish CSO HICP rate

  const projections: YearProjection[] = [];

  // FY26 Trackers (Old Regime: 41% exit tax & 8-year deemed disposal for ETFs, 33% CGT for shares)
  let fy26GrossBalance = startingAmount;
  let fy26TotalCostBasis = startingAmount;
  let fy26TotalTaxesPaid = 0;
  let fy26LastDisposalBasis = startingAmount;

  // FY27 Trackers (New Investment Account: €12k cap, €50k tax-free threshold, 1% annual fee on excess)
  let fy27Balance = startingAmount;
  let fy27TotalContributions = startingAmount;
  let fy27TotalAnnualCharges = 0;

  for (let year = 1; year <= timeHorizonYears; year++) {
    // Add annual contributions (capped at €12,000 for FY27 scheme, though user can test larger)
    fy26TotalCostBasis += annualContribution;
    fy27TotalContributions += annualContribution;

    // Growth for the year
    // Growth before mid-year or end-year compounding
    const fy26PreGrowth = fy26GrossBalance + annualContribution;
    const fy26Growth = fy26PreGrowth * annualReturnRate;
    fy26GrossBalance = fy26PreGrowth + fy26Growth;

    const fy27PreGrowth = fy27Balance + annualContribution;
    const fy27Growth = fy27PreGrowth * annualReturnRate;
    fy27Balance = fy27PreGrowth + fy27Growth;

    // FY27 1% charge calculation:
    // Only applied on value exceeding €50,000 threshold
    let yearFY27Charge = 0;
    if (fy27Balance > 50000) {
      const taxableExcess = fy27Balance - 50000;
      yearFY27Charge = taxableExcess * 0.01;
      fy27Balance -= yearFY27Charge;
      fy27TotalAnnualCharges += yearFY27Charge;
    }

    // FY26 Tax Events:
    // In year 8, 16, 24, Deemed Disposal applies to ETFs/Funds (41% exit tax on unrealized gain since last disposal)
    let yearFY26Taxes = 0;
    if (assetClass === 'etf_fund') {
      if (year % 8 === 0) {
        const unrealizedGain = Math.max(0, fy26GrossBalance - fy26LastDisposalBasis);
        const deemedDisposalTax = unrealizedGain * 0.41;
        yearFY26Taxes = deemedDisposalTax;
        fy26GrossBalance -= deemedDisposalTax;
        fy26TotalTaxesPaid += deemedDisposalTax;
        fy26LastDisposalBasis = fy26GrossBalance; // basis resets after deemed disposal
      }
    }

    // Calculate hypothetical net liquidation value at current year
    let fy26NetCurrent = fy26GrossBalance;
    if (assetClass === 'etf_fund') {
      const remainingUnrealized = Math.max(0, fy26GrossBalance - fy26LastDisposalBasis);
      fy26NetCurrent = fy26GrossBalance - (remainingUnrealized * 0.41);
    } else {
      // Individual shares 33% CGT
      const totalGain = Math.max(0, fy26GrossBalance - fy26TotalCostBasis);
      const taxableGain = Math.max(0, totalGain - 1270);
      fy26NetCurrent = fy26GrossBalance - (taxableGain * 0.33);
    }

    const fy27NetCurrent = fy27Balance; // Inside the PSIA, no exit tax on withdrawal!
    const wealthSaved = Math.max(0, fy27NetCurrent - fy26NetCurrent);
    const thresholdProgress = Math.min(100, Math.round((fy27Balance / 50000) * 100));

    projections.push({
      year,
      contributionsCumulative: Math.round(fy27TotalContributions),
      fy26GrossValue: Math.round(fy26GrossBalance),
      fy26TaxesPaid: Math.round(fy26TotalTaxesPaid),
      fy26NetValue: Math.round(fy26NetCurrent),
      fy27GrossValue: Math.round(fy27Balance + yearFY27Charge),
      fy27AnnualCharge: Math.round(yearFY27Charge),
      fy27TaxesCumulative: Math.round(fy27TotalAnnualCharges),
      fy27NetValue: Math.round(fy27NetCurrent),
      wealthSavedUnderFY27: Math.round(wealthSaved),
      thresholdProgressPct: thresholdProgress
    });
  }

  const lastProj = projections[projections.length - 1];
  const totalContributions = lastProj.contributionsCumulative;
  const fy26FinalNetValue = lastProj.fy26NetValue;
  const fy27FinalNetValue = lastProj.fy27NetValue;

  // Compute final effective tax drag
  const fy26TotalEffectiveTax = (startingAmount + (annualContribution * timeHorizonYears)) * Math.pow(1 + annualReturnRate, timeHorizonYears) - fy26FinalNetValue;
  const fy27TotalEffectiveTax = lastProj.fy27TaxesCumulative;

  const totalWealthSaved = fy27FinalNetValue - fy26FinalNetValue;
  const percentageTaxReduction = fy26TotalEffectiveTax > 0 
    ? Math.min(100, Math.round(((fy26TotalEffectiveTax - fy27TotalEffectiveTax) / fy26TotalEffectiveTax) * 100))
    : 0;

  // Optional inflation discounting
  let inflationAdjustedFY27Net = fy27FinalNetValue;
  if (adjustForInflation) {
    inflationAdjustedFY27Net = Math.round(fy27FinalNetValue / Math.pow(1 + inflationRate, timeHorizonYears));
  }

  return {
    inputs,
    projections,
    totalContributions,
    fy26FinalNetValue,
    fy27FinalNetValue,
    totalTaxesFY26: Math.round(Math.max(0, fy26TotalEffectiveTax)),
    totalTaxesFY27: Math.round(fy27TotalAnnualCharges),
    totalWealthSaved: Math.round(totalWealthSaved),
    percentageTaxReduction,
    inflationAdjustedFY27Net
  };
}
