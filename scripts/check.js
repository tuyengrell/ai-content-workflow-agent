import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['runtime', 'node_modules', '.git'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { walk(path); continue; }
    const text = readFileSync(path, 'utf8');
    if (entry.name.endsWith('.js')) { const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' }); if (result.status !== 0) throw new Error(`Syntax check failed: ${relative(root, path)}`); }
    // Report file and category only, never a matching value.
    const patterns = { organization: new RegExp('resonate' + 'me', 'i'), absolutePath: /(?<![A-Za-z])[A-Za-z]:[\\/](?!\/)|\/Users\/|\/home\//, credential: /(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/ };
    if (entry.name !== 'check.js') for (const [category, pattern] of Object.entries(patterns)) if (pattern.test(text)) throw new Error(`Sanitization check failed: ${relative(root, path)} (${category})`);
    if (relative(root, path).startsWith('public') && /process\.env|OPENAI_API_KEY|SESSION_SECRET|REVIEW_PASSWORD/.test(text)) throw new Error(`Frontend environment reference: ${relative(root, path)}`);
    count++;
  }
}
walk(root); console.log(`Syntax and sanitization checks passed: ${count} files`);
