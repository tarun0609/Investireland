import { Holding, FinancialXRayData, Currency } from '../types';
import { convertToEUR, FALLBACK_FISCAL_DATA } from './fiscalDataService';

export function computeFinancialXRay(holdings: Holding[]): FinancialXRayData {
  const fxRates = FALLBACK_FISCAL_DATA.macroIndicators.fxRates;

  // Convert every holding to EUR value
  const holdingsWithEUR = holdings.map(h => {
    const valEUR = convertToEUR(h.currentValue, h.currency, fxRates);
    return {
      ...h,
      valEUR
    };
  });

  const totalAssetsEUR = holdingsWithEUR.reduce((acc, h) => acc + h.valEUR, 0);

  if (totalAssetsEUR === 0) {
    return {
      totalAssetsEUR: 0,
      assetAllocation: [],
      geographicExposure: [],
      currencyExposure: [],
      concentration: {
        topHoldingName: 'None',
        topHoldingPct: 0,
        top5Pct: 0,
        top10Pct: 0,
        isConcentrated: false
      },
      liquidity: {
        cashEUR: 0,
        cashPct: 0,
        liquidInvestmentsEUR: 0,
        pensionAndLockedEUR: 0
      },
      aiDiagnosis: 'No assets recorded yet. Add holdings across Ireland, India, US or EU to generate your comprehensive Financial X-Ray.'
    };
  }

  // 1. Asset Category Allocation
  const categoryTotals: Record<string, number> = {
    'Equities & RSUs': 0,
    'Cash & Deposits': 0,
    'Pension (Locked)': 0,
    'Mutual Funds & ETFs': 0,
    'Bonds & Fixed Income': 0,
    'Other': 0
  };

  holdingsWithEUR.forEach(h => {
    if (h.assetType === 'Share' || h.assetType === 'RSU') categoryTotals['Equities & RSUs'] += h.valEUR;
    else if (h.assetType === 'Cash / Deposit') categoryTotals['Cash & Deposits'] += h.valEUR;
    else if (h.assetType === 'Pension') categoryTotals['Pension (Locked)'] += h.valEUR;
    else if (h.assetType === 'ETF' || h.assetType === 'Mutual Fund') categoryTotals['Mutual Funds & ETFs'] += h.valEUR;
    else if (h.assetType === 'Bond') categoryTotals['Bonds & Fixed Income'] += h.valEUR;
    else categoryTotals['Other'] += h.valEUR;
  });

  const categoryColors: Record<string, string> = {
    'Equities & RSUs': '#059669', // Emerald
    'Cash & Deposits': '#0284C7', // Sky Blue
    'Pension (Locked)': '#6366F1', // Indigo
    'Mutual Funds & ETFs': '#D97706', // Amber
    'Bonds & Fixed Income': '#8B5CF6', // Purple
    'Other': '#64748B' // Slate
  };

  const assetAllocation = Object.entries(categoryTotals)
    .filter(([_, val]) => val > 0)
    .map(([cat, val]) => ({
      category: cat,
      valueEUR: Math.round(val),
      percentage: Math.round((val / totalAssetsEUR) * 100),
      color: categoryColors[cat] || '#059669'
    }))
    .sort((a, b) => b.valueEUR - a.valueEUR);

  // 2. Geographic Exposure
  const geoTotals: Record<string, number> = {
    'Ireland': 0,
    'India': 0,
    'US': 0,
    'Europe': 0,
    'Other': 0
  };

  holdingsWithEUR.forEach(h => {
    geoTotals[h.country] = (geoTotals[h.country] || 0) + h.valEUR;
  });

  const geoColors: Record<string, string> = {
    'Ireland': '#10B981', // Irish Green
    'India': '#F97316', // Saffron
    'US': '#3B82F6', // Blue
    'Europe': '#8B5CF6', // Violet
    'Other': '#94A3B8'
  };

  const geographicExposure = Object.entries(geoTotals)
    .filter(([_, val]) => val > 0)
    .map(([country, val]) => ({
      country,
      valueEUR: Math.round(val),
      percentage: Math.round((val / totalAssetsEUR) * 100),
      color: geoColors[country] || '#10B981'
    }))
    .sort((a, b) => b.valueEUR - a.valueEUR);

  // 3. Currency Exposure
  const currTotals: Record<Currency, number> = {
    EUR: 0,
    INR: 0,
    USD: 0,
    GBP: 0
  };

  holdingsWithEUR.forEach(h => {
    currTotals[h.currency] = (currTotals[h.currency] || 0) + h.valEUR;
  });

  const currencyExposure = (Object.entries(currTotals) as [Currency, number][])
    .filter(([_, val]) => val > 0)
    .map(([currency, val]) => ({
      currency,
      valueEUR: Math.round(val),
      percentage: Math.round((val / totalAssetsEUR) * 100)
    }))
    .sort((a, b) => b.valueEUR - a.valueEUR);

  // 4. Concentration
  const sortedHoldings = [...holdingsWithEUR].sort((a, b) => b.valEUR - a.valEUR);
  const topHolding = sortedHoldings[0];
  const topHoldingPct = topHolding ? Math.round((topHolding.valEUR / totalAssetsEUR) * 100) : 0;
  
  const top5Val = sortedHoldings.slice(0, 5).reduce((acc, h) => acc + h.valEUR, 0);
  const top5Pct = Math.round((top5Val / totalAssetsEUR) * 100);

  const top10Val = sortedHoldings.slice(0, 10).reduce((acc, h) => acc + h.valEUR, 0);
  const top10Pct = Math.round((top10Val / totalAssetsEUR) * 100);

  // 5. Liquidity
  const cashEUR = categoryTotals['Cash & Deposits'] || 0;
  const cashPct = Math.round((cashEUR / totalAssetsEUR) * 100);
  const pensionEUR = categoryTotals['Pension (Locked)'] || 0;
  const liquidInvestmentsEUR = totalAssetsEUR - cashEUR - pensionEUR;

  // 6. AI Diagnosis
  const equityPct = (assetAllocation.find(a => a.category.includes('Equities'))?.percentage || 0) + 
                    (assetAllocation.find(a => a.category.includes('Funds'))?.percentage || 0);
  const largestGeo = geographicExposure[0]?.country || 'Ireland';
  const largestGeoPct = geographicExposure[0]?.percentage || 0;

  const aiDiagnosis = `Your portfolio holds €${Math.round(totalAssetsEUR).toLocaleString('en-IE')} in total assets across ${holdings.length} tracked positions. You have approximately ${equityPct}% in equities and growth funds, ${cashPct}% in cash reserves, and ${Math.round((pensionEUR / totalAssetsEUR) * 100)}% in retirement accounts. Your primary geographic anchor is ${largestGeo} (${largestGeoPct}%). Your top 5 holdings represent ${top5Pct}% of your wealth${top5Pct > 50 ? ', indicating high concentration risk' : ', showing balanced asset spread'}. With Ireland’s new Investment Account launching July 2027, you have a clear pathway to shelter up to €12,000/year from 41% exit tax.`;

  return {
    totalAssetsEUR: Math.round(totalAssetsEUR),
    assetAllocation,
    geographicExposure,
    currencyExposure,
    concentration: {
      topHoldingName: topHolding?.assetName || 'None',
      topHoldingPct,
      top5Pct,
      top10Pct,
      isConcentrated: top5Pct > 45
    },
    liquidity: {
      cashEUR: Math.round(cashEUR),
      cashPct,
      liquidInvestmentsEUR: Math.round(liquidInvestmentsEUR),
      pensionAndLockedEUR: Math.round(pensionEUR)
    },
    aiDiagnosis
  };
}
