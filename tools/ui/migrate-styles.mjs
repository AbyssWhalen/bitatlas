// Reproducible, bounded migration of the reviewed 2026-11-23 stylesheet.
// node tools/ui/migrate-styles.mjs --write    (refuses any unrecognized source/output)
// node tools/ui/migrate-styles.mjs --check    (recomputes every generated file)
// The immutable input is retained with the browser evidence, not duplicated in product CSS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { transformSync } from 'esbuild';

const root = process.cwd();
const evidence = path.join(root, 'output', 'playwright', 'opus-ui-2026-11-22', 'stage-1');
const input = path.join(evidence, 'original.css');
const expected = 'c071357042bd46920cb748875090dc3e847396949ae613c82a27134cc58d86fe';
const original = await readFile(input, 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
assert.equal(sha(original), expected, 'This migration is pinned to the captured working-tree baseline.');
const write = process.argv.includes('--write');
assert(write || process.argv.includes('--check'), 'Pass --write or --check.');
const css = postcss.parse(original, { from: input });
const rootRule = css.nodes[0];
assert.equal(rootRule.selector, ':root');
const report = { sourceSha256: expected, sourceBytes: Buffer.byteLength(original), sourceLines: original.split('\n').length,
  mergedRules: [], removedDeclarations: [], fontChanges: [], colorReplacements: 0, files: [] };

// Exact selector + enclosing conditions only. Different media queries remain distinct.
// Merged rules stay at their first position; declaration order within each merged rule
// is unchanged. Full browser equivalence is separately checked with the old-font control.
const seen = new Map();
css.walkRules((rule) => {
  const chain = [];
  for (let parent = rule.parent; parent.type !== 'root'; parent = parent.parent) {
    chain.unshift(`${parent.name}:${parent.params}`);
  }
  if (chain.some((part) => part.startsWith('keyframes:'))) return;
  const key = JSON.stringify([chain, rule.selector]);
  if (!seen.has(key)) { seen.set(key, rule); return; }
  const earlier = seen.get(key);
  report.mergedRules.push({ selector: rule.selector, conditions: chain, from: rule.source.start.line, to: earlier.source.start.line });
  earlier.append(...rule.nodes.map((node) => node.clone()));
  rule.remove();
});
css.walkRules((rule) => {
  const winners = new Map();
  for (const declaration of [...rule.nodes].reverse()) {
    if (declaration.type !== 'decl') continue;
    const later = winners.get(declaration.prop);
    if (later && (later.important || !declaration.important)) {
      report.removedDeclarations.push({ selector: rule.selector, line: declaration.source.start.line, property: declaration.prop, value: declaration.value });
      declaration.remove();
    } else winners.set(declaration.prop, declaration);
  }
});

const semantic = {
  '--ink': '#d9e0da', '--bone': '#0a0e0c', '--paper': '#121815', '--muted': '#adb9b0',
  '--signal': '#a93523', '--signal-text': '#e8573f', '--lit': '#3ecf8e', '--off': '#1f221e',
  '--ok-text': '#80dbb4',
};
const canonical = (color) => {
  const value = color.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^#[\da-f]{3,4}$/.test(value)) return `#${[...value.slice(1)].map((digit) => digit.repeat(2)).join('')}`;
  return value;
};
const colors = new Map(Object.entries(semantic).map(([token, value]) => [canonical(value), token]));
const oldTokens = new Map();
rootRule.each((node) => {
  if (node.type === 'decl' && node.prop.startsWith('--')) {
    oldTokens.set(node.prop, node.value);
    if (/^#[\da-f]+$/i.test(node.value) && !colors.has(canonical(node.value))) colors.set(canonical(node.value), node.prop);
    node.remove();
  }
});
const palette = new Map();
const productionValues = new Map();
function productionValue(property, value) {
  const key = `${property}:${value}`;
  if (!productionValues.has(key)) {
    // Color compaction is property/context dependent: e.g. ordinary backgrounds
    // become #RRGGBBAA while gradient stops and custom properties retain rgb().
    // Normalize the whole declaration, exactly as the baseline production build.
    const result = transformSync(`x{${key}}`, { loader: 'css', minify: true,
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'] }).code;
    productionValues.set(key, postcss.parse(result).nodes[0].nodes[0].value);
  }
  return productionValues.get(key);
}
function replaceColors(value) {
  // Skip strings and url() payloads. Replace color tokens even inside gradients/shadows.
  return value.replace(/(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)|#[\da-fA-F]{3,8}\b|\brgba?\([^)]*\)|\b(?:transparent|black|white)\b/g, (literal) => {
    if (/^["']|^url\(/.test(literal)) return literal;
    const color = canonical(literal);
    if (!colors.has(color)) {
      const token = `--palette-${color.replace(/^#/, 'hex-').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
      colors.set(color, token);
      palette.set(token, literal);
    }
    report.colorReplacements++;
    return `var(${colors.get(color)})`;
  });
}
const tokenValues = new Map(Object.entries(semantic));
for (const [name, value] of oldTokens) {
  if (tokenValues.has(name)) continue;
  if (colors.get(canonical(value)) === name) tokenValues.set(name, value);
  else tokenValues.set(name, replaceColors(value));
}
css.walkDecls((declaration) => {
  if (!/#|\brgba?\(|\b(?:transparent|black|white)\b/.test(declaration.value)) return;
  declaration.value = replaceColors(declaration.prop.startsWith('--') ? declaration.value : productionValue(declaration.prop, declaration.value));
});
const pendingThemes = `/*
Stage 2 palette, intentionally inactive during the appearance-preserving migration.
Authority: docs/ui/opus-handoff.md, design review amendments on 2026-11-23.
Day:   --ink: #222220; --bone: #ECECE7; --paper: #F7F7F3; --muted: #55554F;
       --signal: #C8381A; --signal-text: #B8321A; --lit: #C8F03C; --off: #D6D6CF; --ok-text: #2A6B34;
Night: --ink: #D6D6D0; --bone: #161615; --paper: #1E1E1C; --muted: #A3A39C;
       --signal: #FF6A4A; --signal-text: #FF6A4A; --lit: #9EC22E; --off: #2C2C2A; --ok-text: #68C778;
The palette-* bridge tokens retain distinct legacy colors; do not approximate them
while stage-1 pixel equivalence is required. Their names are stable color identities.
*/\n`;
const declarations = (values) => [...values].map(([name, value]) => `  ${name}: ${value};`).join('\n');
const tokens = `${pendingThemes}:root {\n${declarations(tokenValues)}\n\n  /* Exact legacy palette, centralized for subsequent theme work. */\n${declarations(palette)}\n}\n\n:root[data-theme="night"] {\n${declarations(Object.entries(semantic))}\n}\n`;

// Contiguous source ranges preserve cascade order, including the responsive and
// reading-first appendices. Splitting never sorts rules by selector or by media query.
const sections = [
  [1, 'base.css'], [63, 'shell.css'], [136, 'pages/dashboard.css'],
  [188, 'pages/questions.css'], [236, 'pages/stats.css'], [268, 'pages/knowledge.css'],
  [310, 'lab.css'], [1248, 'pages/settings.css'], [1254, 'pages/documents.css'],
  [1289, 'pages/practice.css'], [1390, 'pages/mock.css'], [1478, 'shell-tablet.css'],
  [1495, 'responsive.css'], [1863, 'lab-extended.css'], [2162, 'shell-narrow.css'],
  [2170, 'pages/content-review.css'], [2365, 'lab-exhibits.css'],
  [2895, 'lab-tablet.css'], [2900, 'base-motion.css'], [2904, 'reading.css'],
];
function split(tree) {
  const chunks = new Map(sections.map(([, file]) => [file, postcss.root()]));
  for (const node of tree.nodes) {
    const section = sections.findLast(([start]) => node.source.start.line >= start)[1];
    chunks.get(section).append(node.clone());
  }
  return new Map([...chunks].filter(([, tree]) => tree.nodes.length)
    .map(([name, tree]) => [name, `/* Stage-1 migration: original cascade segment; see tools/ui/migrate-styles.mjs. */\n${tree.toString().trim()}\n`]));
}
const control = `${tokens}\n${css.toString()}\n`;
css.walkDecls((declaration) => {
  if (!['font', 'font-size'].includes(declaration.prop)) return;
  const match = /(?<![\w.-])(\d+(?:\.\d+)?)px\b/.exec(declaration.value);
  if (!match || Number(match[1]) >= 13) return;
  const previous = declaration.value;
  declaration.value = declaration.value.slice(0, match.index) + '13px' + declaration.value.slice(match.index + match[0].length);
  report.fontChanges.push({ selector: declaration.parent.selector, line: declaration.source.start.line,
    property: declaration.prop, before: previous, after: declaration.value });
});
const chunks = split(css);
const residuals = { colors: [], smallFonts: [], zeroFontExceptions: [] };
for (const [file, text] of chunks) postcss.parse(text).walkDecls((declaration) => {
  const literals = declaration.value.match(/(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)|#[\da-fA-F]{3,8}\b|\brgba?\([^)]*\)|(?<![\w-])(?:transparent|black|white)(?![\w-])/g) ?? [];
  const hardcoded = literals.filter((literal) => !/^["']|^url\(/.test(literal));
  if (hardcoded.length) residuals.colors.push({ file, property: declaration.prop, literals: hardcoded });
  if (['font', 'font-size'].includes(declaration.prop)) {
    if (/^0(?:$|\/)/.test(declaration.value)) residuals.zeroFontExceptions.push({
      file, selector: declaration.parent.selector, value: declaration.value,
      reason: declaration.parent.selector === '.stack-capacity-base'
        ? 'Existing hidden stack-base decoration; not displayed reading text.'
        : 'Existing icon-only mobile button; DOM text retains its accessible name.',
    });
    const match = /(?<![\w.-])(\d+(?:\.\d+)?)px\b/.exec(declaration.value);
    if (match && Number(match[1]) < 13) residuals.smallFonts.push({ file, selector: declaration.parent.selector, value: declaration.value });
  }
});
assert.equal(residuals.colors.length, 0, 'Literal colors escaped token migration.');
assert.equal(residuals.smallFonts.length, 0, 'Sub-13px declarations escaped font migration.');
const outputs = new Map([['tokens.css', tokens], ...chunks]);
const imports = [...outputs.keys()].map((file) => `@import "./styles/${file}";`).join('\n') + '\n';
const webSource = path.join(root, 'apps', 'web', 'src');
const manifestFile = path.join(evidence, 'migration.json');
let previous;
try { previous = JSON.parse(await readFile(manifestFile, 'utf8')); } catch { /* First migration. */ }
const writes = [['styles.css', imports], ...[...outputs].map(([name, value]) => [path.join('styles', name), value])];
for (const [relative, text] of writes) {
  const file = path.join(webSource, relative);
  let current;
  try { current = await readFile(file, 'utf8'); } catch { /* New generated file. */ }
  if (write) {
    if (current !== undefined) {
      const oldHash = relative === 'styles.css' && sha(current) === expected
        ? expected : previous?.files.find((entry) => entry.path === relative)?.sha256;
      assert(sha(current) === sha(text) || sha(current) === oldHash, `Refusing to overwrite subsequent edits: ${relative}`);
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text);
  } else assert.equal(current, text, `Generated file differs: ${relative}`);
  report.files.push({ path: relative, sha256: sha(text), bytes: Buffer.byteLength(text) });
}
report.mergedRuleCount = report.mergedRules.length;
report.removedDeclarationCount = report.removedDeclarations.length;
report.enlargedFontDeclarations = report.fontChanges.length;
report.paletteTokens = palette.size;
report.hardcodedColorsOutsideTokens = residuals.colors.length;
report.sub13pxFontDeclarations = residuals.smallFonts.length;
report.zeroFontExceptions = residuals.zeroFontExceptions;
report.generatedFiles = report.files.length;
if (write) {
  await writeFile(path.join(evidence, 'control-original-fonts.css'), control);
  await writeFile(path.join(evidence, 'final-flattened.css'), `${tokens}\n${css.toString()}\n`);
  await writeFile(manifestFile, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ mode: write ? 'write' : 'check', ...Object.fromEntries(
  Object.entries(report).filter(([, value]) => !Array.isArray(value))) }, null, 2));
