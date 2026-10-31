import { describe, expect, it, vi } from 'vitest';
import { SUPPORT_AI_AVAILABLE, askSupport, requestAiReply } from './supportChatService';

describe('support chat service', () => {
  it('is built without a Worker API URL in tests', () => {
    expect(SUPPORT_AI_AVAILABLE).toBe(false);
  });

  it('answers greetings and thanks without calling the network', async () => {
    const fetchImpl = vi.fn();
    expect((await askSupport('Hello!', [], fetchImpl as unknown as typeof fetch)).text).toMatch(/Ask me about/);
    expect((await askSupport('thanks', [], fetchImpl as unknown as typeof fetch)).text).toMatch(/welcome/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back to the help articles when AI is unavailable', async () => {
    const fetchImpl = vi.fn();
    const reply = await askSupport('How do I cancel my subscription?', [], fetchImpl as unknown as typeof fetch);
    expect(reply.mode).toBe('FAQ');
    expect(reply.text).toMatch(/Manage billing/);
    expect(reply.links.length).toBeGreaterThan(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns null from requestAiReply when no API is configured', async () => {
    expect(await requestAiReply('hi', [])).toBeNull();
  });

  describe('with a Worker API URL', () => {
    const load = async () => {
      vi.resetModules();
      vi.stubEnv('VITE_API_URL', 'https://api.example/');
      return import('./supportChatService');
    };

    it('uses the AI reply and adds links from the matching help topic', async () => {
      const svc = await load();
      const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ reply: ' AI says hi ', mode: 'AI' }), { status: 200 }));
      const reply = await svc.askSupport('How do I cancel?', [{ role: 'user', text: 'x'.repeat(5000) }], fetchImpl as unknown as typeof fetch);
      expect(reply).toMatchObject({ text: 'AI says hi', mode: 'AI' });
      expect(reply.links.length).toBeGreaterThan(0);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.example/chat');
      const body = JSON.parse(String(init.body));
      expect(body.message).toBe('How do I cancel?');
      expect(body.history[0].text).toHaveLength(svc.SUPPORT_MAX_MESSAGE_CHARS);
      vi.unstubAllEnvs();
    });

    it('falls back to help articles when the API fails', async () => {
      const svc = await load();
      for (const fetchImpl of [
        vi.fn(async () => new Response('{}', { status: 503 })),
        vi.fn(async () => new Response('{"reply":""}', { status: 200 })),
        vi.fn(async () => {
          throw new TypeError('network');
        }),
      ]) {
        const reply = await svc.askSupport('How do I cancel?', [], fetchImpl as unknown as typeof fetch);
        expect(reply.mode).toBe('FAQ');
        expect(reply.text).toMatch(/Manage billing/);
      }
      vi.unstubAllEnvs();
    });
  });
});
