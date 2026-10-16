import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { seedDemo } from '../src/fixtures.js';
import { Store, Workflow, MockPublisher } from '../src/workflow.js';
import { createProvider, buildPrompt, parseOutput } from '../src/provider.js';
import { login, verify } from '../src/auth.js';
import { createApp } from '../src/server.js';
const env = { REVIEW_PASSWORD: 'fictional-test-password', SESSION_SECRET: 'fictional-test-secret', DEMO_MODE: 'true' };
const setup = (options = {}) => new Workflow(new Store(), createProvider({}), { now: () => new Date('2030-01-01T12:00:00Z'), ...options });
test('deterministic structured provider and invalid output handling', async () => {
  const provider = createProvider({}); const prompt = buildPrompt('Study breaks');
  assert.equal(await provider.generate(prompt), await provider.generate(prompt));
  assert.throws(() => parseOutput('{"caption":7}'));
  assert.throws(() => buildPrompt(''));
  const workflow = setup(); workflow.provider = { generate: async () => 'invalid' };
  await assert.rejects(workflow.generate('Study'), /invalid output/);
  assert.equal(workflow.store.state.events[0].code, 'generation_failed');
});
test('missing auth configuration always fails closed and tokens expire', () => {
  for (const configuration of [{}, { REVIEW_PASSWORD: 'x' }, { SESSION_SECRET: 'x' }]) {
    assert.throws(() => login('', configuration), /Configuration error/); assert.equal(verify('anything', configuration), false);
  }
  assert.throws(() => login('wrong', env), /Invalid credentials/);
  const token = login(env.REVIEW_PASSWORD, env); assert.equal(verify(token, env), true);
  assert.equal(verify(token, env, Date.now() + 7200000), false); assert.equal(verify(`${token}bad`, env), false);
});
test('duplicates including concurrent generation are prevented', async () => {
  const workflow = setup(); const results = await Promise.allSettled([workflow.generate('Study'), workflow.generate('study')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  await assert.rejects(workflow.generate('STUDY'), /Duplicate/);
});
test('central schedule, fresh approval, latest caption and terminal states', async () => {
  const workflow = setup(); const draft = await workflow.generate('Learning');
  await assert.rejects(workflow.publish(draft.id), /approval/);
  workflow.review(draft.id, 'approve', undefined, '2030-01-02T12:00:00Z');
  await assert.rejects(workflow.publish(draft.id), /time/);
  workflow.review(draft.id, 'revoke'); await assert.rejects(workflow.publish(draft.id), /approval/);
  workflow.review(draft.id, 'approve', 'Latest synthetic caption', '2030-01-01T11:00:00Z');
  const results = await Promise.all([workflow.publish(draft.id), workflow.publish(draft.id)]);
  assert.equal(results[0].caption, 'Latest synthetic caption'); assert.equal(results[1].skipped, 'duplicate');
  for (const action of ['approve', 'edit', 'revoke', 'reject']) assert.throws(() => workflow.review(draft.id, action), /transition/);
});
test('media ID persists before failed optional permalink; restart avoids duplicates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-test-')); const file = join(dir, 'state.json');
  try {
    class FailingPermalink extends MockPublisher { async permalink() { assert.equal(JSON.parse(readFileSync(file)).records.length, 1); throw new Error('simulated'); } }
    const store = new Store(file); const workflow = new Workflow(store, createProvider({}), { publisher: new FailingPermalink() });
    const draft = await workflow.generate('Practice'); workflow.review(draft.id, 'approve', undefined, '2020-01-01T00:00:00Z');
    await workflow.tick(); const restarted = new Workflow(new Store(file), createProvider({}));
    assert.equal((await restarted.publish(draft.id)).skipped, 'duplicate'); assert.equal(store.state.events.some(e => e.code === 'permalink_unavailable'), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('external providers and real publishers cannot execute', () => {
  assert.throws(() => createProvider({ LLM_PROVIDER: 'openai' }), /OPENAI_API_KEY/);
  assert.throws(() => createProvider({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'fictional' }), /disabled/);
  assert.throws(() => setup({ publisher: { publish() {} } }), /Only MockPublisher/);
  assert.throws(() => createApp({ env: { DEMO_MODE: 'false' } }), /disabled/);
});
test('file URL persistence and synthetic fixture initialization survive restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-fixture-'));
  try {
    const file = pathToFileURL(join(dir, 'state.json')); const store = new Store(file);
    seedDemo(store); seedDemo(store);
    const loaded = new Store(file); assert.equal(loaded.state.drafts.length, 2); assert.equal(loaded.state.records.length, 1);
    assert.equal(loaded.state.drafts.every(d => d.caption.includes('[SYNTHETIC DEMO]')), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('HTTP authentication, endpoint isolation, hostile origin and frontend leakage', async () => {
  const { server, workflow } = createApp({ env }); await workflow.generate('Private synthetic sentinel');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await (await fetch(base)).text(); assert.equal(page.includes('Private synthetic sentinel'), false);
    for (const file of ['/', '/app.js', '/style.css']) { const value = await (await fetch(base + file)).text(); assert.equal(value.includes(env.SESSION_SECRET), false); assert.equal(value.includes(env.REVIEW_PASSWORD), false); }
    assert.equal((await fetch(base + '/api/state')).status, 401);
    assert.equal((await fetch(base + '/.env')).status, 404);
    const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: env.REVIEW_PASSWORD }) });
    const { token } = await response.json(); assert.equal(response.status, 200);
    assert.equal((await fetch(base + '/api/state', { headers: { Authorization: `Bearer ${token}` } })).status, 200);
    assert.equal((await fetch(base + '/api/state', { headers: { Origin: 'https://invalid.example' } })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const closed = createApp({ env: {} }).server; await new Promise(resolve => closed.listen(0, '127.0.0.1', resolve));
  try { assert.equal((await fetch(`http://127.0.0.1:${closed.address().port}/api/login`, { method: 'POST' })).status, 503); }
  finally { await new Promise(resolve => closed.close(resolve)); }
});
