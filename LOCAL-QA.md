# Local quality review — 2026-10-16

## Commands and results

- Read README.md before installation and startup.
- `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund`: successful; no third-party dependencies installed.
- `npm.cmd test`: all 8 tests passed.
- `npm.cmd run check`: JavaScript syntax and sanitization checks passed (17 files before this report).
- `npm.cmd audit`: 0 vulnerabilities. No fix or version upgrade performed.
- `npm.cmd start`: running on http://127.0.0.1:3000 with DEMO_MODE=true and LLM_PROVIDER=mock.

## Local integration review

Loopback HTTP requests verified static frontend delivery, authenticated state access, synthetic generation, review data, rejection, revision, approval, approval revocation, invalid transition rejection, future schedule enforcement, manual mock publishing, automatic scheduler processing, repeated tick processing, and duplicate publishing prevention. Both generated QA drafts have exactly one mock publishing record. Published drafts reject further review mutations.

The real 15-second scheduler processed an approved scheduled draft without calling the manual tick endpoint during the waiting period. Existing automated tests also cover persisted duplicate prevention after restart and failed optional permalink enrichment.

Frontend assets and sampled API responses contained no organization marker, absolute filesystem path, configured password, or signing secret. Login intentionally returns a session token; this was excluded from secret-leak assertions. Unauthenticated state access returned 401. Requests for environment, runtime, source, and README files returned 404. Authenticated synthetic content and workflow identifiers are intentionally available to the review interface.

No browser was available through the browser automation connection (empty browser inventory). Therefore visual rendering and actual browser clicks remain unverified. HTTP delivery and source review do not substitute for a visual browser check.

## Changes

- Created local `.env` from `.env.example`, selected a local demo password, and generated a new signing secret. Demo mode, mock provider, and port 3000 remain configured. Credentials are deliberately omitted from this report.
- Startup and integration checks created `runtime/state.json`, including two synthetic QA drafts, mock records, and workflow events.
- Added this report, `LOCAL-QA.md`.
- No application source changes were necessary. No dependency fixes or upgrades, repository initialization, push, deployment, or external LLM/social/publishing calls were performed. The audit command was the explicitly requested read-only dependency audit.

## Manual browser walkthrough

1. Open http://127.0.0.1:3000 and sign in using the local password from `.env`.
2. Enter a new generic topic and click **Generate synthetic draft**. Inspect the pending card and synthetic caption.
3. Click **reject**, then **revise**, to exercise rejection and revision.
4. Choose a future local time and click **approve**. **Mock publish (due only)** must report that the posting time has not arrived. Click **revoke** to return to pending.
5. Choose a time one minute in the past and click **approve**, followed immediately by **Mock publish (due only)** or **Process due items**. Inspect the mock result in local publishing history.
6. Click **Process due items** again: the history must gain no duplicate record. Published cards offer no review/publishing action buttons.
7. For automatic scheduling, approve another draft for the next minute. Wait until it is due plus up to 15 seconds, then click **Process due items** to refresh the interface. The existing QA run independently verified automatic processing before any manual tick.

The interface does not automatically refresh on scheduler ticks. The scheduler continues only while the local server is running.

## Interface and documentation polish — 2026-10-16

Changed `public/index.html`, `public/style.css`, and `public/app.js`: compact hero, wrapping four-step workflow indicator, labeled status badges, consistent sentence-case buttons, destructive action styling, action-specific success/error messages, readable local history dates, shortened visible mock IDs, and native expandable technical details and event history. Published schedule fields are now read-only in the interface, matching the existing server rules. No backend workflow, provider, authentication, or synthetic content changes were made.

Accessibility source review: native buttons and disclosure controls, associated input labels, polite atomic status announcements, explicit focus rings, restored focus after draft rerendering, wrapping controls, and a narrow-screen layout at 600px. Measured text contrast ratios for primary buttons, status badges, destructive actions, and muted history text range from 6.86:1 to 8.15:1. Blue focus rings exceed 5:1 against the white and page backgrounds. These checks do not establish full accessibility conformance.

README now includes the requested mock-provider statement and explains local-only configuration and public export exclusions. `package.json` declares an export file allowlist; `.gitignore` also excludes audit and private-audit directory names. `SANITIZATION.md` includes this report and the export policy.

Recursive review covered all 19 application and local runtime files before the temporary npm cache was created. No email addresses, personal filesystem paths, organization markers, or common live credential signatures were found. Local credentials occur only in `.env`. Example/test values are fictional. Fixtures and current runtime captions were reviewed as synthetic, with every stored caption marked accordingly; records carry synthetic flags. Pattern matching cannot prove absence of arbitrary sensitive text.

`node_modules`, `.netlify`, and private audit directories are absent. `.env` remains local-only for the running demo. A successful `npm pack --dry-run --ignore-scripts --json` check confirmed the export contains only allowlisted application files, the fictional environment example, metadata, and documentation; local credentials, runtime files, dependencies, hosting state, and audit files are absent. No deliverable package archive was created or published. The initial dry run could not use the system cache; retry used a temporary cache inside `runtime/qa-npm-cache`. Automatic approval review rejected recursive cache cleanup. A subsequent full recursive scan identified local path markers in two npm metadata/log files; those two exact files were removed with a file patch. Remaining cache content is excluded runtime data.

All 8 tests and JavaScript syntax/sanitization checks passed after the interface changes. Browser discovery still returned no browser or app. Desktop and narrow viewport rendering, actual keyboard navigation, live announcements, and native date inputs therefore remain manual checks. Open the running demo, reload, test at desktop width and approximately 375px, tab through actions and disclosure summaries, and verify focus and status feedback after edits and state changes.
