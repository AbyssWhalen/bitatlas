# Stage 1 stylesheet migration

`migrate-styles.mjs` reproduces the 2026-11-23 stylesheet split from the captured working tree. It uses the already installed PostCSS and esbuild packages and does not install or update dependencies.

Run from the repository root:

```powershell
node tools/ui/migrate-styles.mjs --check
node tools/ui/migrate-styles.mjs --write
```

The input is `output/playwright/opus-ui-2026-11-22/stage-1/original.css`, SHA256 `c071357042bd46920cb748875090dc3e847396949ae613c82a27134cc58d86fe`. Keep this input and `migration.json` with the stage evidence. The script does not read Git HEAD, reset files, or restore other working-tree changes.

`--check` recomputes and compares all generated files without writing them. `--write` accepts only the original entry point, missing output files, or output whose hash matches the previous migration receipt. It refuses to overwrite later UI work. After stage 2 changes a generated file, a failed `--check` is expected; do not bypass the overwrite guard.

The entry point contains only imports. Each imported segment follows its original cascade position. Responsive appendices stay in their original positions, rather than being moved ahead of rules that they originally overrode.

Duplicate rules are identified by the complete selector list **and** enclosing media conditions. Their declarations retain source order, with the last effective declaration winning. Different responsive conditions and shared comma-separated selector lists remain separate. They are not all redundant rules.

Colors move into `tokens.css`. Ordinary declaration colors first receive the same esbuild normalization as the baseline production build, including property-dependent alpha rounding. Existing custom-property values retain their original precision. This matters because esbuild treats gradient stops, ordinary color values, and custom properties differently.

`control-original-fonts.css` is the migrated, flattened stylesheet before the minimum-font change. Comparing it against the original build isolates tokenization, cascade, and split regressions from the authorized font changes. `final-flattened.css` includes the 13px minimum for explicit CSS font declarations. Neither evidence stylesheet is shipped by the application.

Four existing zero-size declarations are retained and listed separately in the migration receipt: three mobile icon buttons hide their text visually while keeping accessible names, and `.stack-capacity-base` hides a decorative label. They are not readable text sizes. Canvas/TSX-defined typography is outside this stylesheet migration.

The browser collector uses disposable copies of `output/request-sync-2026-11-22/browser-fixture/baseline.sqlite` and its shared, read-only fixture assets. It binds only to `127.0.0.1:4349`, runs one Chrome worker, and never uses production accounts. Each new capture requires a new label so previous evidence cannot be overwritten.

```powershell
npm run build -w @408os/web -- --mode=server --outDir "../../output/playwright/opus-ui-2026-11-22/stage-1/build-example"
node --import tsx tools/verification/ui-style-regression.mjs capture example output/playwright/opus-ui-2026-11-22/stage-1/build-example
node --import tsx tools/verification/ui-style-regression.mjs compare before-4 example
```

Use a label starting with `after` to additionally capture the explicit night selector, 24px reading preference, and keyboard practice/card-review/source-image workflows. Each screenshot must be byte-identical on two consecutive samples, with at most four attempts; unstable initial samples are retained. PNG comparisons are exact RGBA comparisons; the report also records pixels whose channel delta exceeds one and their bounding box. No pixels, elements, or canvas areas are masked.

The large JSON snapshots and per-element diffs use lossless gzip/base64 envelopes after capture. `readEvidence()` from `tools/verification/ui-style-evidence.mjs` transparently reads both plain JSON and encoded snapshots and verifies the original SHA256. Run `node tools/verification/ui-style-evidence.mjs compact` to encode new snapshots, then `node tools/verification/ui-style-report.mjs` to revalidate the full report. This does not delete evidence: the original JSON bytes can be recovered from `gzipBase64` with `gunzipSync`.

# Stage 2 semantic themes

`migrate-theme.mjs` uses `theme-mapping.json` as the reviewable specification. The
17 day/night values come from the parallel-work agreement in
`docs/ui/opus-handoff.md`. The mapping distinguishes text, surfaces, borders, and
state colors. Full per-declaration before/after values and per-reference decisions
are recorded in `stage-2-theme/migration.json`; blue and yellow decisions are
listed separately. Existing lab CSS files remain byte-identical. Measured lab
legibility corrections live at the scoped night-island boundary in `tokens.css`.

```powershell
# Already performed once. This refuses to replace an existing source snapshot.
node tools/ui/migrate-theme.mjs --capture
# Replay after editing the mapping specification; refuses concurrent file edits.
node tools/ui/migrate-theme.mjs --write
node tools/ui/migrate-theme.mjs --check
```

The immutable input is `output/playwright/opus-ui-2026-11-22/stage-2-theme/source.json`.
Do not rerun the stage-1 writer over stage-2 files. The stage-2 writer does not
touch the stylesheet import entry, new shell/home/reading CSS, TSX, or dependencies.

```powershell
npm run build -w @408os/web -- --mode=server --outDir "../../output/playwright/opus-ui-2026-11-22/stage-2-theme/build-example"
node --import tsx tools/verification/ui-style-regression.mjs themes example output/playwright/opus-ui-2026-11-22/stage-2-theme/build-example
```

The theme collector checks 12 routes × 1440/390 × day/night × 18/24px, plus the
home page at 1024px in both themes and sizes. It validates early theme selection,
storage denial, system preference changes, meta updates and the no-script CSS
fallback. It records document and main-scroll-container overflow separately.

Visible DOM text, native control values/placeholders and SVG text are measured
at 18px preference. The collector scrolls through the document or main container,
clips text to visible ancestors and rejects occluded samples. It temporarily
suppresses only text paint and samples the actually rendered background at three
interior points per text rectangle, including transparency, gradients and
overlapping surfaces. It uses computed foreground colors and effective opacity,
with a 4.5 threshold (3 for large text); disabled controls are reported too.
The original background frames and per-text selectors, samples and ratios are
retained. Canvas-rendered text and text inside source images remain outside this
measurement. It is a deterministic sampled audit, not a full accessibility claim.

Stage-2 screenshots still seek consecutive byte-identical images. If Chrome
gradient dithering prevents this after four samples, only a maximum single-channel
delta of 1 is accepted; both originals, the exact pixel diff and its count are
retained and reported. Larger changes fail. This exception never applies to the
stage-1 pixel-equivalence gate.

`ui-theme.playwright.config.ts` runs the seven requested shell-related E2E files
using an independent local build/preview and result directory. It inherits the
normal memory-based worker selection and all original assertions from the root
configuration. The existing visual spec writes screenshots under its own
`output/playwright/screenshots` path with a `stage2-` project prefix.

Each E2E invocation uses a fresh `BITATLAS_UI_E2E_RUN` value (for example
`3-1440`) and `BITATLAS_UI_E2E_BUILD=build-local-2`. The project name becomes
`stage2-3-1440-chromium-1440`; output is `e2e-results-3-1440` and
`e2e-3-1440.json`. A parent-process guard refuses to reuse existing evidence;
workers inherit the active-run marker when they reload configuration.

The screenshot fixture injects the same fixed time into the browser and server
through the existing `createApp({ now })` test hook. Keeping only the browser
clock frozen causes different Beijing dates after midnight and correctly hides
the mismatched daily plan. `attempt-4` preserves this diagnostic failure;
`attempt-5` is the completed capture. No application date logic was changed.

Stage 4 removes retired sidebar and dashboard branches from the current CSS with
`node tools/ui/prune-legacy-shell.mjs --write`; `--check` verifies that none remain
without writing. This is a later edit to the stage-2 outputs. Preserve the stage-2
receipt and do not run its writer over the current styles. The stage-4 pruning
receipt is `output/verification/stage-4-data-2026-11-24/css-pruned.json`.
