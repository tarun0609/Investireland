import { describe, expect, it } from 'vitest';
import { CONTACT_EMAILS } from '../config/contact';
import {
  SUPPORT_FALLBACK_ANSWER,
  SUPPORT_SUGGESTIONS,
  SUPPORT_TOPICS,
  answerFromKnowledgeBase,
  matchSupportTopics,
  supportKnowledgeAsText,
} from './supportKnowledge';

const topicFor = (q: string) => matchSupportTopics(q, 1)[0]?.topic.id ?? null;

describe('support knowledge base', () => {
  it('has unique topic ids and non-empty answers', () => {
    const ids = SUPPORT_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of SUPPORT_TOPICS) {
      expect(t.answer.length).toBeGreaterThan(40);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.answer).not.toMatch(/undefined|NaN/);
    }
  });

  it.each([
    ['How much does Pro cost?', 'plans'],
    ['how do I cancel my subscription', 'cancel'],
    ['What is InvestIreland?', 'what-is'],
    ['Is there a family subscription?', 'plans'],
    ['Can I import my DEGIRO export?', 'import'],
    ['upload NSDL CAS pdf', 'import'],
    ['What is exit tax on ETFs?', 'exit-tax'],
    ['explain deemed disposal', 'deemed-disposal'],
    ['I have a promo code', 'promo'],
    ['How do I contact a human?', 'contact'],
    ['How do I contact us', 'contact'],
    ['what is the new investment account 50,000 limit', 'investment-account'],
    ['Where does the ECB exchange rate come from', 'prices'],
    ['Should I buy an S&P 500 ETF? Which etf is best?', 'advice'],
  ])('matches %s to %s', (q, id) => {
    expect(topicFor(q)).toBe(id);
  });

  it('answers every suggestion chip from a topic', () => {
    for (const s of SUPPORT_SUGGESTIONS) expect(answerFromKnowledgeBase(s).topicId).not.toBeNull();
  });

  it('falls back with a support email for unknown questions', () => {
    for (const q of ['', '   ', 'asdfgh qwerty', 'what is the weather in Cork']) {
      const a = answerFromKnowledgeBase(q);
      expect(a.topicId).toBeNull();
      expect(a.text).toBe(SUPPORT_FALLBACK_ANSWER);
      expect(a.links[0].href).toBe(`mailto:${CONTACT_EMAILS.support}`);
    }
  });

  it('does not treat regex characters in questions as patterns', () => {
    expect(() => answerFromKnowledgeBase('(((?*+[')).not.toThrow();
  });

  it('caps links at three', () => {
    for (const t of SUPPORT_TOPICS) expect(answerFromKnowledgeBase(t.question).links.length).toBeLessThanOrEqual(3);
  });

  it('exports every topic as plain text for the AI prompt', () => {
    const text = supportKnowledgeAsText();
    for (const t of SUPPORT_TOPICS) expect(text).toContain(`Q: ${t.question}`);
    expect(text).toContain(CONTACT_EMAILS.support);
  });
});
