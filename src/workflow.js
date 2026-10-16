import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrompt, parseOutput } from './provider.js';

export const initialState = () => ({ synthetic: true, drafts: [], records: [], events: [] });
export class Store {
  constructor(file) { this.file = file instanceof URL ? fileURLToPath(file) : file; this.state = this.file && existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : initialState(); }
  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
  }
}
export class MockPublisher {
  publish(draft) { return { mediaId: `mock-${draft.id}`, caption: draft.caption }; }
  async permalink(id) { return `#${id}`; }
}
export class Workflow {
  constructor(store, provider, { publisher = new MockPublisher(), now = () => new Date() } = {}) {
    if (!(publisher instanceof MockPublisher)) throw new Error('Only MockPublisher is allowed');
    this.store = store; this.provider = provider; this.publisher = publisher; this.now = now;
  }
  log(code, id) { this.store.state.events.push({ code, id, at: this.now().toISOString() }); this.store.save(); }
  async generate(topic) {
    const prompt = buildPrompt(topic);
    const id = createHash('sha256').update(prompt.topic.toLowerCase()).digest('hex').slice(0, 16);
    if (this.store.state.drafts.some(d => d.id === id)) throw new Error('Duplicate topic');
    let content;
    try { content = parseOutput(await this.provider.generate(prompt)); }
    catch { this.log('generation_failed', id); throw new Error('Provider returned invalid output'); }
    if (this.store.state.drafts.some(d => d.id === id)) throw new Error('Duplicate topic');
    const draft = { ...content, id, status: 'pending', scheduledAt: null, history: [{ status: 'pending', at: this.now().toISOString() }] };
    this.store.state.drafts.push(draft); this.log('generated', id); return draft;
  }
  review(id, action, caption, scheduledAt) {
    const draft = this.store.state.drafts.find(d => d.id === id);
    if (!draft) throw new Error('Draft not found');
    const transitions = { pending: { approve: 'approved', reject: 'rejected', edit: 'pending' }, approved: { revoke: 'pending', edit: 'approved' }, rejected: { revise: 'pending' } };
    const next = transitions[draft.status]?.[action];
    if (!next) throw new Error('Invalid status transition');
    if (caption !== undefined && (typeof caption !== 'string' || !caption.trim() || caption.length > 2200)) throw new Error('Invalid caption');
    if (scheduledAt !== undefined && !Number.isFinite(Date.parse(scheduledAt))) throw new Error('Invalid schedule');
    if (caption !== undefined) draft.caption = caption;
    if (scheduledAt !== undefined) draft.scheduledAt = new Date(scheduledAt).toISOString();
    draft.status = next; draft.history.push({ status: next, at: this.now().toISOString() }); this.log(action, id); return draft;
  }
  async publish(id) {
    // No await between the fresh read, central time gate, mock effect and durable record.
    // All runners and HTTP requests use this same method in one Node process.
    const draft = this.store.state.drafts.find(d => d.id === id);
    if (this.store.state.records.some(r => r.id === id)) return { skipped: 'duplicate' };
    if (!draft || draft.status !== 'approved') throw new Error('Current approval required');
    if (!draft.scheduledAt || Date.parse(draft.scheduledAt) > this.now().getTime()) throw new Error('Posting time has not arrived');
    const result = this.publisher.publish({ ...draft });
    this.store.state.records.push({ id, ...result, synthetic: true, at: this.now().toISOString() });
    draft.status = 'published'; draft.history.push({ status: 'published', at: this.now().toISOString() });
    this.store.save(); // Persist media ID before optional enrichment.
    try { draft.permalink = await this.publisher.permalink(result.mediaId); }
    catch { this.log('permalink_unavailable', id); }
    this.log('mock_published', id); return result;
  }
  async tick() {
    const results = [];
    for (const draft of this.store.state.drafts.filter(d => d.status === 'approved' && d.scheduledAt && Date.parse(d.scheduledAt) <= this.now().getTime())) results.push(await this.publish(draft.id));
    return results;
  }
}
