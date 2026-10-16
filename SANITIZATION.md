# Sanitization record

## Explicit file allowlist

All application files were newly authored for the portfolio. No original file contents were copied.

| Files | Purpose |
| --- | --- |
| `src/provider.js` | Generic prompt, schema validation, deterministic provider boundary |
| `src/workflow.js` | Local state, review transitions, scheduling, deduplication, mock publishing |
| `src/auth.js`, `src/server.js` | Fail-closed authentication and explicit HTTP route allowlist |
| `src/fixtures.js` | Fully invented review and history examples |
| `public/index.html`, `public/app.js`, `public/style.css` | Neutral static browser interface with no embedded drafts |
| `test/workflow.test.js`, `scripts/check.js` | Offline regression tests and syntax/sanitization checks |
| `package.json`, `package-lock.json` | Revised dependency-free application metadata |
| `.env.example`, `.gitignore` | Fictional configuration and recursive exclusions |
| `README.md`, `SANITIZATION.md` | Public documentation |
| `LOCAL-QA.md` | Local verification results and manual walkthrough |

## Deliberate exclusions

Original survey quotes, feature plans, generated ideas and captions, private prompts, strategy, learned rules, history and reviews, branded templates, images, logos, fonts, absolute paths, personal identifiers, cloud functions, deployment IDs, credentials, live API adapters, old runners, local cloud state, dependencies, archives, caches, logs, and generated output were not transferred.

Concepts demonstrated here are generic workflow patterns. New fictional educational topics replace source examples. UI styling uses CSS and system fonts. No confidential product logic was required for implementation.

## Verification scope

`npm test` checks structured generation, provider failure, duplicate topics and concurrent calls, missing auth configuration, token expiry, current approval, current caption, centralized schedule enforcement, terminal states, persisted media IDs before optional enrichment failure, restart deduplication, disabled live adapters, protected endpoints, hostile origins, and absence of server secrets or draft data in browser assets.

`npm run check` recursively checks the public project files for JavaScript syntax, common credential patterns, original organization markers, absolute user paths, and browser environment references. Runtime state is excluded from this source checker and must remain excluded from publication. No bundled browser output is generated: the three checked public files are the delivered browser assets.

Original regression scripts were not copied or executed because they depend on excluded cloud, rendering, and production components. No external tests were run. Visual browser review and screenshots remain manual tasks. Automated pattern matching cannot prove the absence of every possible personal identifier or secret; review the explicit allowlist before publishing.

Private source hash manifests and source credential findings are stored outside this public directory. They contain paths, hashes, variable names, and categories only, never credential values. No Git repository, deployment, publishing workflow, or open-source license was created.

The package metadata also declares an explicit `files` allowlist for package exports. Local `.env`, runtime state, dependency directories, hosting state, and private audits are excluded. The `.env.example` file contains fictional values only. Local configuration may exist for testing but must never be included in a public handoff.
