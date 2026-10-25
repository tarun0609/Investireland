import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  CALCULATOR_ALIASES,
  CALCULATOR_PAGES,
  calculatorPageForView,
  calculatorViewForPath,
  isCalculatorView,
} from './calculators';

const swaConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../staticwebapp.config.json'), 'utf8')) as {
  routes: { route: string; redirect?: string; statusCode?: number; headers?: Record<string, string> }[];
};

describe('calculator config', () => {
  it('has unique views, paths, titles and descriptions', () => {
    for (const key of ['view', 'path', 'title', 'description'] as const) {
      const values = CALCULATOR_PAGES.map((p) => p[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('round-trips view <-> path', () => {
    for (const page of CALCULATOR_PAGES) {
      expect(isCalculatorView(page.view)).toBe(true);
      expect(calculatorViewForPath(page.path)).toBe(page.view);
      expect(calculatorPageForView(page.view)).toBe(page);
    }
    expect(isCalculatorView('landing')).toBe(false);
    expect(calculatorViewForPath('/nope')).toBeNull();
  });

  it('aliases point at canonical calculator pages and never at themselves', () => {
    const paths = new Set(CALCULATOR_PAGES.map((p) => p.path));
    for (const [from, to] of Object.entries(CALCULATOR_ALIASES)) {
      expect(paths.has(to)).toBe(true);
      expect(paths.has(from)).toBe(false);
      expect(from).toBe(from.toLowerCase());
    }
  });

  it('staticwebapp.config.json 301-redirects every alias and revalidates every page', () => {
    for (const [from, to] of Object.entries(CALCULATOR_ALIASES)) {
      expect(swaConfig.routes).toContainEqual({ route: from, redirect: to, statusCode: 301 });
    }
    for (const page of CALCULATOR_PAGES) {
      const route = swaConfig.routes.find((r) => r.route === page.path);
      expect(route?.headers?.['Cache-Control']).toBe('no-cache');
    }
  });
});
