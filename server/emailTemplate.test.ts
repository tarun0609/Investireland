import { describe, expect, it } from 'vitest';
import { buildAutoResponseEmail } from './emailTemplate';
import { escapeHtml, sanitizeHeaderValue } from '../src/utils/escapeHtml';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&\`</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&#96;&lt;/a&gt;'
    );
  });

  it('handles null, undefined and numbers', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('sanitizeHeaderValue', () => {
  it('removes CR/LF to prevent header injection', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: evil@example.com')).toBe('Hello Bcc: evil@example.com');
  });

  it('truncates long values', () => {
    expect(sanitizeHeaderValue('a'.repeat(500), 10)).toHaveLength(10);
  });
});

describe('buildAutoResponseEmail', () => {
  const payload = '<img src=x onerror=alert(1)>';

  it('escapes every user-controlled field in the HTML body', () => {
    const { html } = buildAutoResponseEmail({
      userName: payload,
      userEmail: `${payload}@example.com`,
      country: payload,
      primaryGoal: payload,
      targetAmount: 1000,
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('produces a single-line subject', () => {
    const { subject } = buildAutoResponseEmail({
      userName: 'Eve\r\nBcc: x@example.com',
      userEmail: 'eve@example.com',
      country: 'Ireland',
      triggerType: 'MILESTONE_UPDATE',
      primaryGoal: 'Goal\nInjected',
    });
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('includes a plain-text alternative', () => {
    const { text } = buildAutoResponseEmail({ userName: 'Sam', userEmail: 'sam@example.com', country: 'Ireland' });
    expect(text).toContain('Sam');
    expect(text).not.toMatch(/<[a-z]/i);
  });
});
