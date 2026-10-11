import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const Input = z.object({
  concern: z.string().min(3).max(1000),
  summary: z.string().max(12000),
});

/** Personalised spending advice from the Lovable AI Gateway. */
export const getAdvice = createServerFn({ method: 'POST' })
  .validator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: 'AI is not configured yet.' };
    const { createOpenAI } = await import('@ai-sdk/openai');
    const { streamText } = await import('ai');
    const provider = createOpenAI({
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      apiKey,
      headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    });
    try {
      const result = streamText({
        model: provider.responses('openai/gpt-6-astra'),
        instructions:
          'You are a friendly personal finance coach. Using ONLY the user data given, reply with 3-5 short, specific, actionable recommendations as a markdown bullet list (use "- "). Mention real categories and amounts from the data. No preamble, no disclaimers.',
        messages: [{ role: 'user', content: `My goal or concern: ${data.concern}\n\nMy data:\n${data.summary}` }],
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] },
        },
      });
      const text = await result.text;
      if (!text.trim()) return { ok: false as const, error: 'No advice was returned. Please try again later.' };
      return { ok: true as const, text };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      const error = status === 429 ? 'Too many requests right now — try again in a minute.'
        : status === 402 ? 'AI credits have run out for this workspace.'
        : 'Could not get advice right now.';
      return { ok: false as const, error };
    }
  });
