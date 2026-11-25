// Stage 4 only: prune individual selector branches from the current styles.
// The stage-1/2 migration receipts describe their original, immutable baselines.
import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';

const mode = process.argv[2] ?? '--check';
if (!['--check', '--write'].includes(mode)) throw new Error('Expected --check or --write');
const files = ['base', 'shell', 'shell-tablet', 'shell-narrow', 'responsive', 'reading', 'pages/dashboard'];
const retired = /^\.(?:sidebar(?:-status)?|primary-nav|reading-preferences|daily-plan-(?:heading|actions|list|number|state)|dashboard-columns|year-band|subject-progress-(?:section|list|row)|pack-status|year-progress|year-facts|thin-progress)(?![\w-])/;
const removals = [];
for (const file of files) {
  const path = new URL(`../../apps/web/src/styles/${file}.css`, import.meta.url);
  const original = await readFile(path, 'utf8');
  const sheet = postcss.parse(original);
  sheet.walkRules((rule) => {
    const selectors = rule.selectors;
    const keep = selectors.filter((selector) => !(retired.test(selector)
      || selector === '.page-header h1::after'
      || (file === 'shell-tablet' && selector === '.brand-block > div:last-child')
      || (['shell', 'shell-tablet'].includes(file) && selector === '.app-shell')));
    for (const selector of selectors) {
      if (!keep.includes(selector)) removals.push({ file, selector });
    }
    if (!keep.length) rule.remove();
    else if (keep.length !== selectors.length) rule.selectors = keep;
    else if (['shell', 'shell-tablet'].includes(file) && rule.selector === '.main-area') {
      rule.walkDecls('grid-column', (decl) => {
        removals.push({ file, property: '.main-area grid-column' });
        decl.remove();
      });
      if (!rule.nodes.length) rule.remove();
    }
  });
  sheet.walkAtRules((rule) => {
    if (rule.name === 'keyframes' && ['cursor-blink', 'boot-flicker'].includes(rule.params)) {
      removals.push({ file, keyframes: rule.params });
      rule.remove();
    } else if (rule.name === 'media' && !rule.nodes?.length) rule.remove();
  });
  const result = sheet.toString();
  if (result !== original && mode === '--write') await writeFile(path, result);
}
console.log(JSON.stringify({ mode, removals }, null, 2));
if (mode === '--check' && removals.length) process.exitCode = 1;
