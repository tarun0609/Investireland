import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUNDLED_FX_RATES, describeFxRates, getFxRates, loadEcbRates, parseEcbCsv, setFxRates } from './fxRateService';
import { FALLBACK_FISCAL_DATA, convertToEUR } from './fiscalDataService';

const ECB_CSV = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-10-01,0.85373
EXR.D.INR.EUR.SP00.A,D,INR,EUR,SP00,A,2026-10-01,108.832
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-01,1.1298
`;

afterEach(() => setFxRates(BUNDLED_FX_RATES));

describe('ECB FX rates', () => {
  it('parses the ECB csvdata response', () => {
    expect(parseEcbCsv(ECB_CSV)).toEqual({ EUR_TO_INR: 108.832, EUR_TO_USD: 1.1298, EUR_TO_GBP: 0.85373, lastUpdated: '2026-10-01', source: 'ECB' });
  });

  it('rejects incomplete or implausible responses', () => {
    expect(parseEcbCsv(ECB_CSV.replace(/.*INR.*\n/, ''))).toBeNull();
    expect(parseEcbCsv(ECB_CSV.replace('1.1298', '1129.8'))).toBeNull();
    expect(parseEcbCsv('<html>error</html>')).toBeNull();
  });

  it('publishes live rates to every converter through FALLBACK_FISCAL_DATA', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(ECB_CSV, { status: 200 }));
    await loadEcbRates(fetchImpl as unknown as typeof fetch, Date.now() + 10 * 60 * 60 * 1000);
    expect(getFxRates().source).toBe('ECB');
    expect(FALLBACK_FISCAL_DATA.macroIndicators.fxRates.EUR_TO_USD).toBe(1.1298);
    expect(convertToEUR(34400, 'USD')).toBeCloseTo(30447.87, 1);
    expect(describeFxRates()).toBe('ECB reference rates, 1 Oct 2026');
  });

  it('keeps the bundled ECB copy when the feed fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await loadEcbRates(fetchImpl as unknown as typeof fetch, Date.now() + 20 * 60 * 60 * 1000);
    expect(getFxRates()).toBe(BUNDLED_FX_RATES);
    expect(describeFxRates()).toMatch(/offline copy/);
    warn.mockRestore();
  });
});
