import { jsPDF } from 'jspdf';
import { Currency, Holding, InvestmentAccountState, FinancialXRayData } from '../types';
import { formatCurrency, convertToEUR } from './fiscalDataService';

interface ExportPdfOptions {
  userName?: string;
  holdings: Holding[];
  investmentAccount: InvestmentAccountState;
  xray: FinancialXRayData;
  currentCurrency: Currency;
  includeAiNotes?: boolean;
  includeCrossBorder?: boolean;
}

export function generatePortfolioPdf({
  userName = typeof window !== 'undefined' ? (localStorage.getItem('investireland_user_name') || 'Valued Investor') : 'Valued Investor',
  holdings,
  investmentAccount,
  xray,
  currentCurrency,
  includeAiNotes = true,
  includeCrossBorder = true
}: ExportPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Primary Theme Colors
  const emeraldDark = [5, 150, 105]; // #059669
  const slateDark = [15, 23, 42]; // #0f172a
  const slateMuted = [100, 116, 139]; // #64748b
  const slateBg = [248, 250, 252]; // #f8fafc

  // --- HEADER SECTION ---
  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.rect(margin, y, 12, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IE', margin + 3.5, y + 8);

  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFontSize(16);
  doc.text('InvestIreland AI', margin + 16, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Financial Intelligence & Budget 2027 Analytics Summary', margin + 16, y + 11);

  // Report Metadata on Right
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}`, pageWidth - margin, y + 4, { align: 'right' });
  doc.text(`Account Holder: ${userName}`, pageWidth - margin, y + 8, { align: 'right' });
  doc.text(`Baseline Currency: ${currentCurrency}`, pageWidth - margin, y + 12, { align: 'right' });

  y += 18;

  // Horizontal Rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- EXECUTIVE SUMMARY CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('1. EXECUTIVE WEALTH SNAPSHOT', margin, y);
  y += 4;

  const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
  const cardHeight = 16;

  const summaryMetrics = [
    { label: 'TOTAL ASSETS', val: `€${xray.totalAssetsEUR.toLocaleString('en-IE')}` },
    { label: 'LIQUID CASH', val: `€${xray.liquidity.cashEUR.toLocaleString('en-IE')}` },
    { label: 'INVESTMENTS', val: `€${xray.liquidity.liquidInvestmentsEUR.toLocaleString('en-IE')}` },
    { label: 'IRISH PENSION', val: `€${xray.liquidity.pensionAndLockedEUR.toLocaleString('en-IE')}` }
  ];

  summaryMetrics.forEach((m, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(slateBg[0], slateBg[1], slateBg[2]);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(m.label, cardX + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(m.val, cardX + 3, y + 12);
  });

  y += cardHeight + 8;

  // --- BUDGET 2027 INVESTMENT ACCOUNT SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('2. IRELAND BUDGET 2027 INVESTMENT ACCOUNT (PSIA) STATUS', margin, y);
  y += 4;

  // Highlight Box
  doc.setFillColor(240, 253, 244); // light emerald
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');

  const remainingCap = Math.max(0, investmentAccount.annualLimit - investmentAccount.annualContributions);
  const thresholdDist = Math.max(0, investmentAccount.taxFreeThreshold - investmentAccount.accountValue);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text('Annual Allowance Tracking:', margin + 4, y + 6);
  doc.text('€50,000 Tax-Free Threshold Status:', margin + 65, y + 6);
  doc.text('Statutory Exemption Impact:', margin + 125, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Allocated: €${investmentAccount.annualContributions.toLocaleString()} / €${investmentAccount.annualLimit.toLocaleString()}`, margin + 4, y + 11);
  doc.text(`Remaining Allowance: €${remainingCap.toLocaleString()}`, margin + 4, y + 16);

  doc.text(`Account Value: €${investmentAccount.accountValue.toLocaleString()}`, margin + 65, y + 11);
  doc.text(`Tax-Free Headroom: €${thresholdDist.toLocaleString()}`, margin + 65, y + 16);

  doc.text('Replaces 41% Exit Tax within scheme', margin + 125, y + 11);
  doc.text('Exempt from 8-year Deemed Disposal', margin + 125, y + 16);

  y += 28;

  // --- CROSS-BORDER GEOGRAPHIC ALLOCATION ---
  if (includeCrossBorder) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('3. CROSS-BORDER WEALTH DISTRIBUTION (IE &middot; INDIA &middot; US)', margin, y);
    y += 4;

    const geoCardW = (pageWidth - (margin * 2) - 6) / 3;
    const geoMetrics = [
      {
        flag: 'IRELAND (EUR)',
        amount: `€${(xray.geographicExposure.find(g => g.country === 'Ireland')?.valueEUR || 0).toLocaleString()}`,
        pct: `${xray.geographicExposure.find(g => g.country === 'Ireland')?.percentage || 0}%`,
        note: 'Pensions, Savings, Investment Account'
      },
      {
        flag: 'INDIA (INR)',
        amount: `₹${(Math.round((xray.geographicExposure.find(g => g.country === 'India')?.valueEUR || 0) * 92.45)).toLocaleString()} (~€${(xray.geographicExposure.find(g => g.country === 'India')?.valueEUR || 0).toLocaleString()})`,
        pct: `${xray.geographicExposure.find(g => g.country === 'India')?.percentage || 0}%`,
        note: 'Mutual Funds (SIP), Equities & NRE (DTAA Art. 13)'
      },
      {
        flag: 'UNITED STATES (USD)',
        amount: `$${(Math.round((xray.geographicExposure.find(g => g.country === 'US')?.valueEUR || 0) * 1.085)).toLocaleString()} (~€${(xray.geographicExposure.find(g => g.country === 'US')?.valueEUR || 0).toLocaleString()})`,
        pct: `${xray.geographicExposure.find(g => g.country === 'US')?.percentage || 0}%`,
        note: 'Tech Employer RSUs, Direct Shares (W-8BEN)'
      }
    ];

    geoMetrics.forEach((g, idx) => {
      const gX = margin + idx * (geoCardW + 3);
      doc.setFillColor(slateBg[0], slateBg[1], slateBg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(gX, y, geoCardW, 17, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(g.flag, gX + 3, y + 4.5);
      doc.text(g.pct, gX + geoCardW - 3, y + 4.5, { align: 'right' });

      doc.setFontSize(8.5);
      doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
      doc.text(g.amount, gX + 3, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text(g.note, gX + 3, y + 14.5);
    });

    y += 23;
  }

  // --- DETAILED HOLDINGS TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text(`4. DETAILED HOLDINGS LEDGER (${holdings.length} POSITIONS)`, margin, y);
  y += 4;

  // Table Header
  const colWidths = [62, 25, 24, 33, 24, 14];
  const tableHeaders = ['Asset Name', 'Type', 'Region', 'Provider', 'Local Value', 'EUR Val'];
  
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  let curX = margin + 2;
  tableHeaders.forEach((th, idx) => {
    doc.text(th, curX, y + 4.5);
    curX += colWidths[idx];
  });

  y += 6.5;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);

  holdings.forEach((h, rIdx) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 16;
    }

    const rowBg = rIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    const valEUR = convertToEUR(h.currentValue, h.currency);

    curX = margin + 2;
    doc.setTextColor(15, 23, 42);

    // Truncate name if long
    const cleanName = h.assetName.length > 34 ? `${h.assetName.substring(0, 32)}...` : h.assetName;
    doc.text(cleanName, curX, y + 4.5);
    curX += colWidths[0];

    doc.text(h.assetType, curX, y + 4.5);
    curX += colWidths[1];

    doc.text(h.country, curX, y + 4.5);
    curX += colWidths[2];

    const cleanProvider = h.provider.length > 18 ? `${h.provider.substring(0, 16)}...` : h.provider;
    doc.text(cleanProvider, curX, y + 4.5);
    curX += colWidths[3];

    doc.text(formatCurrency(h.currentValue, h.currency), curX, y + 4.5);
    curX += colWidths[4];

    doc.setFont('helvetica', 'bold');
    doc.text(`€${Math.round(valEUR).toLocaleString()}`, curX, y + 4.5);
    doc.setFont('helvetica', 'normal');

    y += 6.5;
  });

  y += 5;

  // --- AI DIAGNOSTIC ASSESSMENT ---
  if (includeAiNotes && y < pageHeight - 40) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('5. INVESTIRELAND AI DIAGNOSTIC ASSESSMENT', margin, y);
    y += 4;

    doc.setFillColor(slateBg[0], slateBg[1], slateBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    
    // Split text to fit
    const splitText = doc.splitTextToSize(`"${xray.aiDiagnosis}"`, pageWidth - (margin * 2) - 6);
    doc.text(splitText, margin + 3, y + 4.5);

    y += 20;
  }

  // --- FOOTER STATUTORY DISCLAIMER ---
  const footerY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    'CONFIDENTIAL FINANCIAL INTELLIGENCE SUMMARY &middot; EDUCATIONAL AND ANALYTICAL ONLY &middot; NOT REGULATED INVESTMENT ADVICE',
    pageWidth / 2,
    footerY + 1.5,
    { align: 'center' }
  );
  doc.text(
    'Figures based on Department of Finance Budget 2027 Framework and Taxes Consolidation Act 1997 s.739D &middot; investireland.ai',
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  return doc;
}
