import { createHash } from 'node:crypto';

// Public, generic prompt authored for this demo. No private prompts are reused.
export function buildPrompt(topic) {
  if (typeof topic !== 'string' || !topic.trim() || topic.length > 120) throw new Error('Topic must contain 1–120 characters');
  return { task: 'Write an educational micro-post', topic: topic.trim(), schema: ['title', 'caption', 'tags'] };
}
export function parseOutput(raw) {
  const value = JSON.parse(raw);
  if (typeof value.title !== 'string' || !value.title || typeof value.caption !== 'string' || !value.caption || value.caption.length > 2200 || !Array.isArray(value.tags) || !value.tags.every(t => typeof t === 'string')) throw new Error('Invalid structured provider output');
  return value;
}
export function createProvider(env = process.env) {
  if ((env.LLM_PROVIDER || 'mock') !== 'mock') {
    if (!env.OPENAI_API_KEY) throw new Error('Optional provider requires server-side OPENAI_API_KEY');
    throw new Error('External LLM transport is disabled in this portfolio demo');
  }
  return { async generate(prompt) {
    const variant = parseInt(createHash('sha256').update(prompt.topic).digest('hex').slice(0, 2), 16) % 3;
    return JSON.stringify({ title: prompt.topic, caption: `[SYNTHETIC DEMO] ${prompt.topic}: ${['Start small and reflect on one useful lesson.', 'Try one practical step and observe the result.', 'Make space for a simple daily experiment.'][variant]}`, tags: ['Learning', 'Demo'] });
  } };
}
