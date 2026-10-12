import { jsPDF } from 'jspdf';
import { Currency, Holding, InvestmentAccountState, FinancialXRayData } from '../types';
import { formatCurrency, convertToEUR, convertFromEUR } from './fiscalDataService';

interface ExportPdfOptions {
  userName?: string;
  holdings: Holding[];
  investmentAccount: InvestmentAccountState;
  xray: FinancialXRayData;
  currentCurrency: Currency;
  includeAiNotes?: boolean;
  includeCrossBorder?: boolean;
}

type RGB = [number, number, number];

const EMERALD_DARK: RGB = [5, 150, 105];
const EMERALD_LIGHT: RGB = [240, 253, 244];
const EMERALD_BORDER: RGB = [167, 243, 208];
const SLATE_DARK: RGB = [15, 23, 42];
const SLATE_MUTED: RGB = [100, 116, 139];
const SLATE_BG: RGB = [248, 250, 252];
const BORDER: RGB = [226, 232, 240];

const PAGE_TOP = 16;
const FOOTER_RESERVED = 22;

// Characters outside Latin-1 that jsPDF's built-in (WinAnsi) Helvetica can still render.
const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/**
 * jsPDF's standard fonts only cover WinAnsi; anything else (₹, Devanagari, CJK, emoji)
 * renders as garbage. Map common symbols to ASCII and replace the rest with '?'.
 */
export function toPdfSafeText(value: unknown): string {
  const text = String(value ?? '')
    .replace(/₹\s?/g, 'Rs ')
    .replace(/[\u2212]/g, '-')
    .replace(/[\u00A0\u202F\u2009]/g, ' ');
  let out = '';
  for (const ch of text.normalize('NFC')) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\n' || ch === '\t') out += ' ';
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRAS.has(ch)) out += ch;
    else if (code >= 0x1f000 || (code >= 0x2600 && code <= 0x27bf) || (code >= 0xfe00 && code <= 0xfe0f) || code === 0x200d) continue; // emoji & modifiers
    else if (code < 0x20) continue;
    else out += '?';
  }
  return out.replace(/ {2,}/g, ' ');
}

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const eur = (amount: number, fractionDigits = 0): string => {
  const safe = finite(amount);
  const abs = Math.abs(safe).toLocaleString('en-IE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  return `${safe < 0 && Math.round(Math.abs(safe) * 10 ** fractionDigits) !== 0 ? '-' : ''}€${abs}`;
};

const money = (amount: number, currency: Currency): string => {
  const safe = finite(amount);
  const formatted = toPdfSafeText(formatCurrency(Math.abs(safe), currency));
  return `${safe < 0 && Math.round(Math.abs(safe)) !== 0 ? '-' : ''}${formatted}`;
};

const pct = (value: number) => `${Math.round(finite(value) * 10) / 10}%`;

const reportDate = () => new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });

const resolveUserName = (name: string | undefined) => {
  const stored = typeof window !== 'undefined' ? window.localStorage?.getItem('investireland_user_name') : null;
  return toPdfSafeText((name ?? stored ?? '').trim()) || 'Investor';
};

/** Truncate text with an ellipsis so it fits within maxWidth (mm) using the current font. */
function fitText(doc: jsPDF, value: unknown, maxWidth: number): string {
  const text = toPdfSafeText(value);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = '...';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(text.slice(0, mid).trimEnd() + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + ellipsis;
}

function createDoc() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  return { doc, pageWidth, pageHeight, margin: 14 };
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...EMERALD_DARK);
  doc.text(toPdfSafeText(text), x, y);
}

function drawHeader(doc: jsPDF, opts: { pageWidth: number; margin: number; y: number; subtitle: string; metaLines: string[] }) {
  const { pageWidth, margin, y, subtitle, metaLines } = opts;
  doc.setFillColor(...EMERALD_DARK);
  doc.rect(margin, y, 12, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IE', margin + 3.5, y + 8);

  doc.setTextColor(...SLATE_DARK);
  doc.setFontSize(15);
  doc.text('InvestIreland AI', margin + 16, y + 5.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_MUTED);
  doc.text(toPdfSafeText(subtitle), margin + 16, y + 10.5);

  doc.setFontSize(7.5);
  const metaWidth = (pageWidth - margin * 2) * 0.4;
  metaLines.forEach((line, idx) => {
    doc.text(fitText(doc, line, metaWidth), pageWidth - margin, y + 3.5 + idx * 4, { align: 'right' });
  });
}

/** Draw the disclaimer footer and page numbers on every page. */
function drawFooters(doc: jsPDF, lines: string[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const footerY = pageHeight - 14;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...SLATE_MUTED);
    lines.forEach((line, idx) => {
      doc.text(toPdfSafeText(line), pageWidth / 2, footerY + 1.5 + idx * 3.5, { align: 'center' });
    });
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY + 1.5 + lines.length * 3.5, { align: 'right' });
  }
}

/** Draw a wrapped text box, breaking across pages when needed. Returns the new y. */
function drawTextBox(
  doc: jsPDF,
  text: string,
  opts: { x: number; y: number; width: number; pageHeight: number; fontStyle?: 'normal' | 'italic'; color?: RGB }
): number {
  const { x, width, pageHeight } = opts;
  let { y } = opts;
  const lineHeight = 3;
  doc.setFont('helvetica', opts.fontStyle ?? 'normal');
  doc.setFontSize(6.8);
  const lines: string[] = doc.splitTextToSize(toPdfSafeText(text), width - 6);
  let idx = 0;
  while (idx < lines.length) {
    const available = Math.floor((pageHeight - FOOTER_RESERVED - y - 4) / lineHeight);
    if (available < 1) {
      doc.addPage();
      y = PAGE_TOP;
      continue;
    }
    const chunk = lines.slice(idx, idx + available);
    const boxHeight = chunk.length * lineHeight + 3.5;
    doc.setFillColor(...SLATE_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, width, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', opts.fontStyle ?? 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...(opts.color ?? [51, 65, 85] as RGB));
    doc.text(chunk, x + 3, y + 4);
    y += boxHeight + 2;
    idx += chunk.length;
  }
  return y;
}

export function generatePortfolioPdf({
  userName,
  holdings,
  investmentAccount,
  xray,
  currentCurrency,
  includeAiNotes = true,
  includeCrossBorder = true
}: ExportPdfOptions): jsPDF {
  const { doc, pageWidth, pageHeight, margin } = createDoc();
  const contentWidth = pageWidth - margin * 2;
  const holderName = resolveUserName(userName);
  const safeHoldings = Array.isArray(holdings) ? holdings : [];
  let y = PAGE_TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - FOOTER_RESERVED) {
      doc.addPage();
      y = PAGE_TOP;
      return true;
    }
    return false;
  };

  drawHeader(doc, {
    pageWidth,
    margin,
    y,
    subtitle: 'Portfolio Summary & Tax Analytics (estimates)',
    metaLines: [
      `Generated: ${reportDate()}`,
      `Account Holder: ${holderName}`,
      currentCurrency === 'EUR' ? 'Values shown in EUR' : `Values shown in EUR (display currency: ${currentCurrency})`
    ]
  });
  y += 18;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- 1. EXECUTIVE SUMMARY CARDS ---
  sectionTitle(doc, '1. PORTFOLIO SNAPSHOT', margin, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 16;
  const summaryMetrics = [
    { label: 'TOTAL ASSETS', val: eur(xray.totalAssetsEUR) },
    { label: 'CASH', val: eur(xray.liquidity.cashEUR) },
    { label: 'INVESTMENTS', val: eur(xray.liquidity.liquidInvestmentsEUR) },
    { label: 'PENSION (LOCKED)', val: eur(xray.liquidity.pensionAndLockedEUR) }
  ];

  summaryMetrics.forEach((m, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(...SLATE_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(m.label, cardX + 3, y + 5);

    doc.setFontSize(10.5);
    doc.setTextColor(...SLATE_DARK);
    doc.text(fitText(doc, m.val, cardWidth - 6), cardX + 3, y + 12);
  });
  y += cardHeight + 8;

  // --- 2. INVESTMENT ACCOUNT SECTION ---
  const annualLimit = finite(investmentAccount.annualLimit);
  const annualContrib = finite(investmentAccount.annualContributions);
  const accountValue = finite(investmentAccount.accountValue);
  const threshold = finite(investmentAccount.taxFreeThreshold);
  const remainingCap = Math.max(0, annualLimit - annualContrib);
  const thresholdDist = Math.max(0, threshold - accountValue);

  sectionTitle(doc, '2. ANNOUNCED INVESTMENT ACCOUNT (PSIA) - TRACKER', margin, y);
  y += 4;

  doc.setFillColor(...EMERALD_LIGHT);
  doc.setDrawColor(...EMERALD_BORDER);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  const colW = contentWidth / 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text('Annual Allowance Tracking:', margin + 4, y + 6);
  doc.text(fitText(doc, `${eur(threshold)} Threshold Status:`, colW - 6), margin + 4 + colW, y + 6);
  doc.text('Proposed Tax Treatment:', margin + 4 + colW * 2, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_DARK);
  doc.text(fitText(doc, `Allocated: ${eur(annualContrib)} / ${eur(annualLimit)}`, colW - 6), margin + 4, y + 11);
  doc.text(fitText(doc, `Remaining Allowance: ${eur(remainingCap)}`, colW - 6), margin + 4, y + 16);
  doc.text(fitText(doc, `Account Value: ${eur(accountValue)}`, colW - 6), margin + 4 + colW, y + 11);
  doc.text(fitText(doc, `Headroom to threshold: ${eur(thresholdDist)}`, colW - 6), margin + 4 + colW, y + 16);
  doc.text(fitText(doc, 'No exit tax on gains within scheme', colW - 6), margin + 4 + colW * 2, y + 11);
  doc.text(fitText(doc, 'Subject to final legislation', colW - 6), margin + 4 + colW * 2, y + 16);
  y += 28;

  // --- 3. CROSS-BORDER GEOGRAPHIC ALLOCATION ---
  if (includeCrossBorder) {
    ensureSpace(27);
    sectionTitle(doc, '3. CROSS-BORDER WEALTH DISTRIBUTION (IE / INDIA / US)', margin, y);
    y += 4;

    const geo = (country: string) => xray.geographicExposure?.find(g => g.country === country);
    const ieEUR = finite(geo('Ireland')?.valueEUR);
    const inEUR = finite(geo('India')?.valueEUR);
    const usEUR = finite(geo('US')?.valueEUR);

    const geoCardW = (contentWidth - 6) / 3;
    const geoMetrics = [
      { flag: 'IRELAND (EUR)', amount: eur(ieEUR), pct: pct(finite(geo('Ireland')?.percentage)), note: 'Pensions, savings, Irish assets' },
      { flag: 'INDIA (INR)', amount: `${money(convertFromEUR(inEUR, 'INR'), 'INR')} (~${eur(inEUR)})`, pct: pct(finite(geo('India')?.percentage)), note: 'Mutual funds, equities, NRE (DTAA)' },
      { flag: 'UNITED STATES (USD)', amount: `${money(convertFromEUR(usEUR, 'USD'), 'USD')} (~${eur(usEUR)})`, pct: pct(finite(geo('US')?.percentage)), note: 'RSUs, direct US shares (W-8BEN)' }
    ];

    geoMetrics.forEach((g, idx) => {
      const gX = margin + idx * (geoCardW + 3);
      doc.setFillColor(...SLATE_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(gX, y, geoCardW, 17, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...SLATE_DARK);
      doc.text(g.flag, gX + 3, y + 4.5);
      doc.text(g.pct, gX + geoCardW - 3, y + 4.5, { align: 'right' });

      doc.setFontSize(8.5);
      doc.setTextColor(...EMERALD_DARK);
      doc.text(fitText(doc, g.amount, geoCardW - 6), gX + 3, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...SLATE_MUTED);
      doc.text(fitText(doc, g.note, geoCardW - 6), gX + 3, y + 14.5);
    });
    y += 23;
  }

  // --- 4. DETAILED HOLDINGS TABLE ---
  ensureSpace(20);
  sectionTitle(doc, `4. HOLDINGS (${safeHoldings.length} ${safeHoldings.length === 1 ? 'POSITION' : 'POSITIONS'})`, margin, y);
  y += 4;

  const colWidths = [58, 22, 18, 34, 26, 24];
  const tableHeaders = ['Asset Name', 'Type', 'Region', 'Provider', 'Local Value', 'EUR Value'];
  const rowHeight = 6.5;

  const drawTableHeader = () => {
    doc.setFillColor(...SLATE_DARK);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    let x = margin + 2;
    tableHeaders.forEach((th, idx) => {
      if (idx === tableHeaders.length - 1) doc.text(th, margin + contentWidth - 2, y + 4.5, { align: 'right' });
      else doc.text(th, x, y + 4.5);
      x += colWidths[idx];
    });
    y += rowHeight;
  };
  drawTableHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);

  if (safeHoldings.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setTextColor(...SLATE_MUTED);
    doc.text('No holdings added yet.', margin + 4, y + 6);
    y += 9;
  }

  safeHoldings.forEach((h, rIdx) => {
    if (ensureSpace(rowHeight)) drawTableHeader();

    const rowBg: RGB = rIdx % 2 === 0 ? [255, 255, 255] : SLATE_BG;
    doc.setFillColor(...rowBg);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    const valEUR = finite(convertToEUR(finite(h.currentValue), h.currency));
    const cells = [h.assetName, h.assetType, h.country, h.provider, money(h.currentValue, h.currency)];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...SLATE_DARK);
    let x = margin + 2;
    cells.forEach((cell, idx) => {
      doc.text(fitText(doc, cell, colWidths[idx] - 3), x, y + 4.5);
      x += colWidths[idx];
    });

    doc.setFont('helvetica', 'bold');
    doc.text(eur(valEUR), margin + contentWidth - 2, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowHeight;
  });

  y += 5;

  // --- 5. AI DIAGNOSTIC ASSESSMENT ---
  if (includeAiNotes && xray.aiDiagnosis?.trim()) {
    ensureSpace(14);
    sectionTitle(doc, '5. AI-GENERATED PORTFOLIO NOTES (NOT ADVICE)', margin, y);
    y += 4;
    y = drawTextBox(doc, `"${xray.aiDiagnosis.trim()}"`, { x: margin, y, width: contentWidth, pageHeight, fontStyle: 'italic' });
  }

  drawFooters(doc, [
    'ESTIMATES FOR EDUCATIONAL PURPOSES ONLY - NOT REGULATED INVESTMENT OR TAX ADVICE',
    'Values use static reference FX rates and simplified Irish tax rules. Confirm with Revenue.ie or a qualified adviser. investireland.ai'
  ]);

  return doc;
}

export interface InvestmentAccountPdfOptions {
  userName?: string;
  userEmail?: string;
  taxResidencyStatus?: string;
  investmentAccount: InvestmentAccountState;
  currentCurrency?: Currency;
  customNotes?: string;
  includeStatutoryBreakdown?: boolean;
}

/**
 * Generates a printable PDF summary of the user's tracked (announced) Investment Account
 * (PSIA) state and logged transaction history. Figures are user-entered estimates.
 */
export function generateInvestmentAccountPdf({
  userName,
  userEmail,
  taxResidencyStatus = 'Self-declared tax residency',
  investmentAccount,
  currentCurrency = 'EUR',
  customNotes,
  includeStatutoryBreakdown = true
}: InvestmentAccountPdfOptions): jsPDF {
  const { doc, pageWidth, pageHeight, margin } = createDoc();
  const contentWidth = pageWidth - margin * 2;
  const holderName = resolveUserName(userName);
  let y = PAGE_TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - FOOTER_RESERVED) {
      doc.addPage();
      y = PAGE_TOP;
      return true;
    }
    return false;
  };

  drawHeader(doc, {
    pageWidth,
    margin,
    y,
    subtitle: 'Investment Account (PSIA) Tracker & Transaction Log',
    metaLines: [
      `Generated: ${reportDate()}`,
      `Account Holder: ${holderName}`,
      currentCurrency === 'EUR' ? 'Values shown in EUR' : `Values in EUR (display: ${currentCurrency})`
    ]
  });
  y += 16;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- ACCOUNT HOLDER PROFILE STRIP ---
  doc.setFillColor(...SLATE_BG);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentWidth, 15, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_DARK);
  doc.text('INVESTOR PROFILE', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_MUTED);
  const half = contentWidth / 2;
  doc.text(fitText(doc, `Investor Name: ${holderName}`, half - 8), margin + 4, y + 9.5);
  const safeEmail = toPdfSafeText((userEmail ?? '').trim());
  if (safeEmail) doc.text(fitText(doc, `Email: ${safeEmail}`, half - 8), margin + 4 + half, y + 9.5);
  doc.text(fitText(doc, `Tax residency: ${toPdfSafeText(taxResidencyStatus) || 'Self-declared tax residency'}`, half - 8), margin + 4, y + 13.5);
  doc.text(fitText(doc, `Scheme status: ${toPdfSafeText(investmentAccount.status || 'Announced')}`, half - 8), margin + 4 + half, y + 13.5);
  y += 19;

  // --- SECTION 1: ACCOUNT STATE SNAPSHOT ---
  sectionTitle(doc, '1. TRACKED ACCOUNT STATE & ALLOWANCES', margin, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 18;

  const annualLimit = finite(investmentAccount.annualLimit) || 12000;
  const annualContrib = finite(investmentAccount.annualContributions);
  const remainingAllowance = Math.max(0, annualLimit - annualContrib);
  const accountValue = finite(investmentAccount.accountValue);
  const threshold = finite(investmentAccount.taxFreeThreshold) || 50000;
  const chargeRate = finite(investmentAccount.excessAnnualChargeRate) || 0.01;
  const remainingShelter = Math.max(0, threshold - accountValue);
  const excess = Math.max(0, accountValue - threshold);
  const excessAnnualCharge = excess * chargeRate;
  const chargePctLabel = `${Math.round(chargeRate * 10000) / 100}%`;

  const stateCards = [
    { label: 'ACCOUNT VALUE', val: eur(accountValue), sub: 'Deposits & returns (self-logged)' },
    { label: 'ANNUAL ALLOWANCE', val: `${eur(annualContrib)} / ${eur(annualLimit)}`, sub: `${eur(remainingAllowance)} remaining` },
    { label: 'THRESHOLD', val: eur(threshold), sub: `${eur(remainingShelter)} headroom` },
    {
      label: 'EST. ANNUAL CHARGE',
      val: excess > 0 ? `${eur(excessAnnualCharge)}/yr` : `${eur(0)}/yr`,
      sub: excess > 0 ? `${chargePctLabel} on ${eur(excess)} excess` : `Balance under ${eur(threshold)}`
    }
  ];

  stateCards.forEach((c, idx) => {
    const cX = margin + idx * (cardWidth + 3);
    doc.setFillColor(...SLATE_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(cX, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(c.label, cX + 3, y + 4.5);

    doc.setFontSize(10);
    doc.setTextColor(...EMERALD_DARK);
    doc.text(fitText(doc, c.val, cardWidth - 6), cX + 3, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...SLATE_DARK);
    doc.text(fitText(doc, c.sub, cardWidth - 6), cX + 3, y + 15);
  });
  y += cardHeight + 7;

  // --- SECTION 2: PROPOSED SCHEME MECHANICS ---
  if (includeStatutoryBreakdown) {
    ensureSpace(26);
    doc.setFillColor(...EMERALD_LIGHT);
    doc.setDrawColor(...EMERALD_BORDER);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 78, 59);
    doc.text('Announced Investment Account vs standard fund taxation (subject to final legislation):', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_DARK);
    const bullets = [
      `• Contributions: up to ${eur(annualLimit)} per tax year (as modelled in this app).`,
      `• Proposed: no exit tax on qualifying gains within the account up to the ${eur(threshold)} threshold; ${chargePctLabel} annual charge modelled above it.`,
      '• Proposed: outside the 8-year deemed disposal rule that applies to ordinary funds/ETFs (TCA 1997 s.739D).'
    ];
    bullets.forEach((b, idx) => doc.text(fitText(doc, b, contentWidth - 8), margin + 4, y + 10 + idx * 4));
    y += 26;
  }

  // --- SECTION 3: TRANSACTION LEDGER TABLE ---
  const historyList = Array.isArray(investmentAccount.history) ? investmentAccount.history : [];
  ensureSpace(20);
  sectionTitle(doc, `2. TRANSACTION HISTORY (${historyList.length} LOGGED ${historyList.length === 1 ? 'EVENT' : 'EVENTS'})`, margin, y);
  y += 4;

  const colWidths = [28, 30, 56, 36, 32];
  const tableHeaders = ['Date', 'Type', 'Provider / Platform', 'Source', 'Amount (EUR)'];
  const rowHeight = 6.5;

  const drawTableHeader = () => {
    doc.setFillColor(...SLATE_DARK);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    let x = margin + 2;
    tableHeaders.forEach((th, idx) => {
      if (idx === tableHeaders.length - 1) doc.text(th, margin + contentWidth - 2, y + 4.5, { align: 'right' });
      else doc.text(th, x, y + 4.5);
      x += colWidths[idx];
    });
    y += rowHeight;
  };
  drawTableHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (historyList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setTextColor(...SLATE_MUTED);
    doc.text('No transactions logged yet.', margin + 4, y + 6);
    y += 9;
  } else {
    historyList.forEach((tx, rIdx) => {
      if (ensureSpace(rowHeight)) drawTableHeader();

      const rowBg: RGB = rIdx % 2 === 0 ? [255, 255, 255] : SLATE_BG;
      doc.setFillColor(...rowBg);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      doc.setFontSize(7);
      doc.setTextColor(...SLATE_DARK);
      let x = margin + 2;

      doc.setFont('helvetica', 'normal');
      doc.text(fitText(doc, tx.date || '-', colWidths[0] - 3), x, y + 4.5);
      x += colWidths[0];

      doc.setFont('helvetica', 'bold');
      doc.text(fitText(doc, tx.type || 'Contribution', colWidths[1] - 3), x, y + 4.5);
      doc.setFont('helvetica', 'normal');
      x += colWidths[1];

      doc.text(fitText(doc, tx.provider || '-', colWidths[2] - 3), x, y + 4.5);
      x += colWidths[2];

      doc.setTextColor(...SLATE_MUTED);
      doc.text('Self-logged', x, y + 4.5);
      doc.setTextColor(...SLATE_DARK);

      doc.setFont('helvetica', 'bold');
      doc.text(eur(finite(tx.amount)), margin + contentWidth - 2, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += rowHeight;
    });
  }

  // Subtotal Summary Strip
  ensureSpace(12);
  const totalLogged = historyList.reduce((sum, item) => sum + finite(item.amount), 0);
  doc.setFillColor(...SLATE_BG);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_DARK);
  doc.text(`TOTAL LOGGED: ${eur(totalLogged)}`, margin + 4, y + 4.8);
  doc.text(`Remaining Annual Allowance: ${eur(remainingAllowance)}`, pageWidth - margin - 4, y + 4.8, { align: 'right' });
  y += 12;

  // Custom User Notes
  const notes = toPdfSafeText(customNotes ?? '').trim();
  if (notes) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_DARK);
    doc.text('ACCOUNT HOLDER NOTES:', margin, y);
    y += 4;
    y = drawTextBox(doc, notes, { x: margin, y, width: contentWidth, pageHeight, fontStyle: 'italic', color: SLATE_MUTED });
  }

  drawFooters(doc, [
    'PERSONAL TRACKING SUMMARY OF AN ANNOUNCED SCHEME - ESTIMATES ONLY - NOT REGULATED INVESTMENT OR TAX ADVICE',
    'Scheme rules are subject to final legislation. Figures are user-entered. Confirm with Revenue.ie or a qualified adviser. investireland.ai'
  ]);

  return doc;
}
