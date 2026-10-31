import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(__dirname, '../public/consent.js'), 'utf8');

function boot(saved: string | null = null) {
  const store = new Map<string, string>(saved ? [['investireland_cookie_consent_v1', saved]] : []);
  const appended: { src: string; async: boolean }[] = [];
  const events: string[] = [];
  const window: Record<string, unknown> = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    dispatchEvent: (e: { type: string }) => events.push(e.type),
  };
  const document = {
    createElement: () => ({ src: '', async: false }),
    head: { appendChild: (el: { src: string; async: boolean }) => appended.push(el) },
  };
  class CustomEvent {
    constructor(public type: string, public init?: unknown) {}
  }
  vm.runInNewContext(source, { window, document, CustomEvent, Date });
  const dataLayer = window.dataLayer as IArguments[];
  const calls = () => dataLayer.map((a) => Array.from(a));
  const api = window.investIrelandConsent as { get: () => string | null; set: (c: string) => void };
  return { api, appended, calls, store, events };
}

describe('Google tag consent loader', () => {
  it('defaults every consent type to denied and loads nothing from Google', () => {
    const { appended, calls, api } = boot();
    expect(calls()[0]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
    expect(calls()).toContainEqual(['config', 'AW-970610553']);
    expect(appended).toHaveLength(0);
    expect(api.get()).toBeNull();
  });

  it('loads gtag.js once and grants consent after Accept', () => {
    const { api, appended, calls, store, events } = boot();
    api.set('granted');
    api.set('granted');
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ async: true, src: 'https://www.googletagmanager.com/gtag/js?id=AW-970610553' });
    expect(calls()).toContainEqual(['consent', 'update', expect.objectContaining({ ad_storage: 'granted' })]);
    expect(store.get('investireland_cookie_consent_v1')).toBe('granted');
    expect(events).toContain('investireland:consent');
  });

  it('keeps Google blocked after Reject and ignores invalid values', () => {
    const { api, appended, store } = boot();
    api.set('denied');
    api.set('yes please');
    expect(appended).toHaveLength(0);
    expect(store.get('investireland_cookie_consent_v1')).toBe('denied');
  });

  it('applies a saved choice on the next visit', () => {
    expect(boot('granted').appended).toHaveLength(1);
    expect(boot('denied').appended).toHaveLength(0);
    expect(boot('garbage').api.get()).toBeNull();
  });
});
