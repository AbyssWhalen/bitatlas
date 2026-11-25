// Stage 2: replayable semantic-theme migration from the captured stage-1 files.
// Source and generated hashes protect concurrent edits. No dependencies are installed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

const root = process.cwd();
const styles = path.join(root, 'apps/web/src/styles');
const evidence = path.join(root, 'output/playwright/opus-ui-2026-11-22/stage-2-theme');
const inputPath = path.join(evidence, 'source.json');
const receiptPath = path.join(evidence, 'migration.json');
const map = JSON.parse(await readFile(path.join(root, 'tools/ui/theme-mapping.json'), 'utf8'));
const files = [
  'tokens.css', 'base.css', 'shell.css', 'pages/dashboard.css', 'pages/questions.css',
  'pages/stats.css', 'pages/knowledge.css', 'lab.css', 'pages/settings.css', 'pages/documents.css',
  'pages/practice.css', 'pages/mock.css', 'shell-tablet.css', 'responsive.css', 'lab-extended.css',
  'shell-narrow.css', 'pages/content-review.css', 'lab-exhibits.css', 'lab-tablet.css', 'base-motion.css', 'reading.css',
];
const mode = process.argv[2];
assert(['--capture', '--write', '--check'].includes(mode), 'Usage: node tools/ui/migrate-theme.mjs --capture|--write|--check');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const diskPath = (file) => file === 'index.html' ? path.join(root, 'apps/web/index.html') : path.join(styles, file);
await mkdir(evidence, { recursive: true });
if (mode === '--capture') {
  const source = { authority: map.authority, files: {} };
  for (const file of [...files, 'index.html']) {
    const text = await readFile(diskPath(file), 'utf8');
    source.files[file] = { sha256: hash(text), text };
  }
  await writeFile(inputPath, json(source), { flag: 'wx' });
  console.log(`Captured ${Object.keys(source.files).length} original files; previous source is never overwritten.`);
  process.exit(0);
}
const source = JSON.parse(await readFile(inputPath, 'utf8'));
for (const record of Object.values(source.files)) assert.equal(hash(record.text), record.sha256);
const originalTokens = postcss.parse(source.files['tokens.css'].text);
const rawTokens = new Map();
originalTokens.nodes.find((node) => node.selector === ':root').walkDecls((decl) => rawTokens.set(decl.prop, decl.value));
const changes = [];
const uses = [];
const output = {};

function parseColor(value) {
  if (value === 'transparent') return [0, 0, 0, 0];
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((char) => char + char).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16),
      hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1];
  }
  const rgb = value.match(/^rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[/,]\s*([\d.]+)(%)?)?\)$/);
  assert(rgb, `Unknown legacy color: ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1)];
}
function resolve(name) {
  const value = rawTokens.get(name);
  assert(value, `Unknown token: ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? resolve(alias[1]) : parseColor(value);
}
function colorFamily([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta < 34 || delta / Math.max(max, 1) < .23) return 'neutral';
  const hue = ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
  if (hue < 23 || hue >= 335) return 'red';
  if (hue < 80) return 'yellow';
  if (hue < 175) return 'green';
  return 'blue';
}
function mixed(token, alpha) {
  return alpha < .999 ? `color-mix(in srgb, var(--${token}) ${Number((alpha * 100).toFixed(2))}%, transparent)` : `var(--${token})`;
}
function contextRole(prop) {
  if (/^(color|fill|stroke|caret-color|text-decoration-color)$/.test(prop)) return 'text';
  if (/border|outline/.test(prop)) return 'border';
  if (/background|accent-color/.test(prop)) return 'surface';
  return 'other';
}
function translate(name, prop, selector, file) {
  const role = contextRole(prop);
  const alias = map.aliases[name.slice(2)];
  if (!name.startsWith('--palette-') && !alias) return `var(${name})`;
  const rgba = resolve(name), family = colorFamily(rgba);
  const brightness = Math.max(...rgba.slice(0, 3));
  let target;
  let alpha = rgba[3];
  if (!alpha) target = 'transparent';
  else if (role === 'text') {
    // Legacy text opacity is not carried into the new accessible text roles.
    alpha = 1;
    target = alias || ({ red: 'signal-text', green: 'ok-text', yellow: 'warn-text', blue: 'ink-strong' }[family]);
    if (!target) target = brightness >= 224 ? 'ink-strong' : brightness >= 198 ? 'ink' : 'muted';
    if (/^surface|sidebar$/.test(name.slice(2))) target = 'ink';
  } else if (role === 'border') {
    target = { red: 'signal-text', green: 'ok-text', yellow: 'warn-text', blue: 'line' }[family] || 'line';
    if (alias === 'line' || alias === 'muted') target = 'line';
  } else {
    if (['--red', '--red-bright', '--red-dark', '--danger'].includes(name)) target = 'signal';
    else if (name === '--green') target = 'lit';
    else if (name === '--yellow') target = 'warn-text';
    else if (name === '--blue') target = 'ink-strong';
    else if (alias) target = alias;
    else if (family !== 'neutral') {
      target = { red: 'signal-text', green: 'ok-text', yellow: 'warn-text', blue: 'ink-strong' }[family];
      // Panels use a subdued tint. Solid status marks keep their semantic color.
      if (alpha >= .999 && !/legend|evidence-|progress|data-level|^\.(?:bit|dot)/.test(selector)) alpha = .10;
      else if (alpha < .8) alpha = Math.min(alpha, .13);
    } else {
      target = /hover|selected|active|current|number|palette|input|textarea|canvas|index|pre\b/.test(selector) ? 'paper-2' : 'paper';
      if (/sidebar|main-area|practice-shell|mock-exam-shell/.test(selector)) target = 'bone';
      if (/scrollbar-thumb/.test(selector)) target = 'muted';
      if (brightness > 200 && alpha < .5) target = 'ink';
    }
  }
  const value = target === 'transparent' ? 'transparent' : mixed(target, alpha);
  uses.push({ file, selector, property: prop, from: name, role, family, to: value });
  return value;
}
// The responsive appendix contains an ordered group of lab rules; preserve those.
function isLabRule(rule, file) {
  if (file !== 'responsive.css') return false;
  return /\.(?:lab-|cpu-|ds-|vm-|riscv-|radix-|register-|machine-code|ieee-|network-|binary-tree-|forest-|complete-tree-|linked-list-|stack-|min-heap-|sort-pass-|tcp-|cidr-|gbn-|qam-|csma-|ftp-|switch-|hrrn-|filesystem-|segmentation-|semaphore-|deadlock-)/.test(rule.selector);
}
function update(decl, value, file, reason) {
  if (decl.value === value) return;
  changes.push({ file, selector: decl.parent.selector, line: decl.source.start.line, property: decl.prop, before: decl.value, after: value, reason });
  decl.value = value;
}
for (const file of files) {
  if (file === 'tokens.css') continue;
  if (file.startsWith('lab')) continue;
  const css = postcss.parse(source.files[file].text);
  css.walkRules((rule) => {
    if (isLabRule(rule, file)) return;
    const selector = rule.selector;
    const background = rule.nodes.find((decl) => /^(background|background-color)$/.test(decl.prop));
    const originalBackground = background?.value || '';
    const primary = /^\.primary-command(?::|$)/.test(selector) && !selector.includes('disabled');
    const solidRed = primary || /(?:palette-grid button.current|question-number:hover|option-list > button\.(?:selected|incorrect) > span)/.test(selector);
    const solidGreen = /option-list > button.correct > span/.test(selector);
    rule.walkDecls((decl) => {
      const override = map.overrides.find((item) => item.file === file && item.selector === selector && item.prop === decl.prop);
      if (override) { update(decl, override.value, file, override.reason); return; }
      let value = decl.value;
      let reason = 'Semantic role mapping';
      if (decl.prop === 'box-shadow') {
        value = primary && !selector.includes(':active') ? '2px 2px 0 var(--ink-strong)' : 'none';
        reason = 'Keep hard shadow only on primary buttons';
      } else if (decl.prop === 'text-shadow' || (decl.prop === 'filter' && value.includes('drop-shadow')) || decl.prop === 'backdrop-filter') {
        value = 'none'; reason = 'Remove glow and translucent blur';
      } else if (decl.prop === 'animation' && /boot-flicker|cursor-blink/.test(value)) {
        value = 'none'; reason = 'Remove decorative flicker';
      } else if (/^background/.test(decl.prop) && /gradient/.test(value)) {
        // Single flat surface; choose state/progress role where it is meaningful.
        if (/::after/.test(selector)) value = 'none';
        else if (solidRed) value = 'var(--signal)';
        else if (/progress span/.test(selector)) value = /practice/.test(selector) ? 'var(--signal)' : 'var(--lit)';
        else {
          const status = /warning|hint/.test(selector) ? 'warn-text' : /selected/.test(selector) ? 'signal-text' : null;
          value = status ? mixed(status, .08) : /hover|active|index|canvas/.test(selector) ? 'var(--paper-2)' : 'var(--paper)';
        }
        reason = 'Replace decorative gradient with flat semantic surface';
      } else {
        value = value.replace(/var\((--[\w-]+)\)/g, (all, name) => translate(name, decl.prop, selector, file));
        if (/^border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?$/.test(decl.prop)) {
          value = value.replace(/(?<![-\w.])(\d*\.?\d+)px/g, (all, size) => Number(size) > 1 ? '1px' : all);
        }
      }
      if (decl.prop === 'color' && (solidRed || solidGreen)) {
        value = solidRed ? 'var(--signal-ink)' : 'var(--lit-ink)';
        reason = 'Pair foreground with opaque action/state fill';
      }
      if (/^background(?:-color)?$/.test(decl.prop) && solidGreen) value = 'var(--lit)';
      if (/^background(?:-color)?$/.test(decl.prop) && primary) value = 'var(--signal)';
      if (decl.prop === 'color' && !originalBackground && selector === '.primary-command') value = 'var(--signal-ink)';
      update(decl, value, file, reason);
    });
  });
  output[file] = css.toString() + (map.appendRules[file] ? `\n/* Stage-2 measured corrections. */\n${map.appendRules[file]}\n` : '');
}
function themeDeclarations(theme) {
  return Object.entries(map.themes[theme]).map(([key, value]) => `  --${key}: ${value};`).join('\n');
}
const keepTokens = ['--reading-font-size', '--mono', '--radius-sm', '--radius-md', '--radius-lg', '--ease'];
const rootTokens = keepTokens.map((name) => `  ${name}: ${rawTokens.get(name)};`).join('\n');
const palette = [...rawTokens].filter(([name]) => name.startsWith('--palette-')).map(([name, value]) => `  ${name}: ${value};`).join('\n');
const aliases = Object.entries(map.aliases).map(([from, to]) => `  --${from}: var(--${to});`).join('\n');
// Legacy aliases retain exact colors only inside the temporary dark lab island.
function legacyLiteral(name) {
  const value = rawTokens.get(name);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? legacyLiteral(alias[1]) : value;
}
const labAliases = Object.keys(map.aliases).map((name) => `  --${name}: ${legacyLiteral(`--${name}`)};`).join('\n')
  + '\n' + ['--shadow', '--shadow-xs', '--shadow-sm', '--shadow-md', '--focus-ring']
    .map((name) => `  ${name}: ${rawTokens.get(name)};`).join('\n');
output['tokens.css'] = `/* Generated by tools/ui/migrate-theme.mjs; decisions in tools/ui/theme-mapping.json. */
:root {
${themeDeclarations('day')}
  --theme-color-scheme: light;
${rootTokens}
${aliases}
  --shadow: none;
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow-md: none;
  --focus-ring: none;

  /* Legacy lab colors remain exact until the stage-5 exhibit migration. */
${palette}
}
:root[data-theme="night"] {
${themeDeclarations('night')}
  --theme-color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${themeDeclarations('night').split('\n').map((line) => `  ${line}`).join('\n')}
    --theme-color-scheme: dark;
  }
}

/* Every current lab page has .page and a *-lab-page class. No TSX change required.
   Keep night semantic roles and exact legacy aliases local to this boundary. */
.page[class*="-lab-page"] {
${themeDeclarations('night')}
${labAliases}
  --theme-color-scheme: dark;
  color-scheme: dark;
  color: var(--canvas-ink);
  background: var(--canvas);
}
/* Measured legibility corrections; original lab files and colors are retained. */
${map.islandCorrections}
`;
const themeScript = `    <script>
      (() => {
        const root = document.documentElement;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const readPreference = () => {
          try { return localStorage.getItem('bitatlas.ui.theme'); } catch { return null; }
        };
        const resolveTheme = () => {
          const value = readPreference();
          return value === 'day' || value === 'night' ? value : media.matches ? 'night' : 'day';
        };
        const updateMeta = () => {
          const color = root.dataset.theme === 'night' ? '${map.themes.night.bone}' : '${map.themes.day.bone}';
          document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
        };
        root.dataset.theme = resolveTheme();
        updateMeta();
        new MutationObserver(updateMeta).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        media.addEventListener('change', () => { root.dataset.theme = resolveTheme(); });
        window.addEventListener('storage', (event) => {
          if (event.key === 'bitatlas.ui.theme' || event.key === null) root.dataset.theme = resolveTheme();
        });
      })();
    </script>`;
output['index.html'] = source.files['index.html'].text.replace(/<meta name="theme-color" content="[^"]+" \/>/, `<meta name="theme-color" content="${map.themes.day.bone}" />\n${themeScript}`);
let previous = null;
try { previous = JSON.parse(await readFile(receiptPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const [file, text] of Object.entries(output)) {
  const current = await readFile(diskPath(file), 'utf8');
  if (mode === '--check') assert.equal(current, text, `Generated file differs: ${file}`);
  else {
    assert([source.files[file].sha256, previous?.outputs[file]?.sha256, hash(text)].includes(hash(current)), `Refusing to overwrite concurrent change: ${file}`);
    await writeFile(diskPath(file), text);
  }
}
const remaining = {};
for (const file of files.filter((file) => file !== 'tokens.css')) {
  const text = output[file] ?? source.files[file].text;
  const matches = [...text.matchAll(/var\((--palette-[\w-]+)\)/g)];
  if (matches.length) remaining[file] = { references: matches.length, uniqueTokens: new Set(matches.map((match) => match[1])).size };
}
const receipt = {
  sourceSha256: hash(await readFile(inputPath)), mappingSha256: hash(await readFile(path.join(root, 'tools/ui/theme-mapping.json'))),
  semanticTokens: Object.keys(map.themes.day).length, changedDeclarations: changes.length,
  mappedReferences: uses.length, uniqueMappedTokens: new Set(uses.map((use) => use.from)).size,
  blueUses: uses.filter((use) => use.family === 'blue').length,
  yellowUses: uses.filter((use) => use.family === 'yellow').length,
  remaining, outputs: Object.fromEntries(Object.entries(output).map(([file, text]) => [file, { sha256: hash(text), bytes: Buffer.byteLength(text) }])),
  unchangedLabs: files.filter((file) => file.startsWith('lab')).map((file) => ({ file, sha256: source.files[file].sha256 })),
  changes, uses,
};
for (const lab of receipt.unchangedLabs) assert.equal(hash(await readFile(diskPath(lab.file))), lab.sha256);
if (mode === '--write') await writeFile(receiptPath, json(receipt));
console.log(json({ mode, semanticTokens: receipt.semanticTokens, changedDeclarations: changes.length, mappedReferences: uses.length, uniqueMappedTokens: receipt.uniqueMappedTokens, remaining }));
