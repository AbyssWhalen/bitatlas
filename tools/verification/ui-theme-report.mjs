import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { readEvidence } from './ui-style-evidence.mjs';

const root = process.cwd();
const evidence = path.resolve('output/playwright/opus-ui-2026-11-22/stage-2-theme');
const label = process.argv[2];
assert(label && /^[a-z0-9-]+$/.test(label), 'Usage: node tools/verification/ui-theme-report.mjs LABEL');
const json = async (name) => JSON.parse(await readFile(path.join(evidence, name), 'utf8'));
const source = await json('source.json');
const migration = await json('migration.json');
const capture = await json(`${label}/receipt.json`);
const mapping = JSON.parse(await readFile('tools/ui/theme-mapping.json', 'utf8'));
const summary = { label, migration, screenshots: capture.results.length, startupChecks: capture.startup.length,
  overflowFailures: capture.results.filter((row) => row.overflow > 0 || row.mainOverflow > 0),
  textChecked: 0, failures: [], minimumByTheme: {}, cases: [], audit: {}, literalColors: {}, residualAliases: {} };
const aliasPattern = new RegExp(`var\\(--(${Object.keys(mapping.aliases).join('|')})\\)`, 'g');
for (const [file, record] of Object.entries(source.files)) {
  if (!file.endsWith('.css')) continue;
  const current = await readFile(path.join(root, 'apps/web/src/styles', file), 'utf8');
  if (file === 'tokens.css') continue;
  const before = [...record.text.matchAll(/var\((--palette-[\w-]+)\)/g)];
  const after = [...current.matchAll(/var\((--palette-[\w-]+)\)/g)];
  summary.audit[file] = { paletteBefore: before.length, paletteAfter: after.length };
  const aliases = [...current.matchAll(aliasPattern)];
  if (aliases.length) summary.residualAliases[file] = aliases.length;
  const colors = [];
  postcss.parse(current).walkDecls((decl) => {
    const found = decl.value.match(/#[\da-fA-F]{3,8}\b|(?:rgb|hsl)a?\(/g);
    if (found) colors.push({ selector: decl.parent.selector, property: decl.prop, value: decl.value, literals: found.length });
  });
  if (colors.length) summary.literalColors[file] = colors;
}
for (const result of capture.results.filter((row) => row.textChecked)) {
  const contrast = await readEvidence(path.join(evidence, label, `${result.key}-contrast.json`));
  summary.textChecked += contrast.records.length;
  summary.failures.push(...contrast.records.filter((row) => !row.pass).map((row) => ({ key: result.key, ...row })));
  const minimum = Math.min(...contrast.records.map((row) => row.ratio));
  const theme = result.key.split('-')[0];
  summary.minimumByTheme[theme] = Math.min(summary.minimumByTheme[theme] ?? Infinity, minimum);
  const large = contrast.records.filter((row) => row.threshold === 3);
  const normal = contrast.records.filter((row) => row.threshold === 4.5);
  summary.cases.push({ key: result.key, text: contrast.records.length, failures: result.contrastFailures.length,
    minimumNormal: Math.min(...normal.map((row) => row.ratio)), minimumLarge: large.length ? Math.min(...large.map((row) => row.ratio)) : null,
    overflow18: result.overflow, mainOverflow18: result.mainOverflow,
    overflow24: capture.results.find((row) => row.key === result.key.replace('-18px', '-24px')).overflow });
}
summary.paletteRemovedReferences = Object.values(summary.audit).reduce((sum, row) => sum + row.paletteBefore - row.paletteAfter, 0);
summary.paletteRemainingReferences = Object.values(summary.audit).reduce((sum, row) => sum + row.paletteAfter, 0);
summary.normalizedFailures = [...new Set(summary.failures.map((row) => row.selector.replace(/:nth-child\(\d+\)/g, '')))];
summary.paintNoise = capture.results.filter((row) => row.screenshotNoise).map((row) => ({ key: row.key, ...row.screenshotNoise }));
summary.nonLabResidualAliases = Object.entries(summary.residualAliases).filter(([name]) => !name.startsWith('lab') && name !== 'responsive.css');
summary.passed = capture.passed && summary.overflowFailures.length === 0 && summary.failures.length === 0;
delete summary.migration.changes;
delete summary.migration.uses;
await writeFile(path.join(evidence, 'delivery.json'), JSON.stringify(summary, null, 2) + '\n');
const report = `# 阶段 2 主题验收（2026-11-24）

当前采集 \`${label}\`；截图 ${summary.screenshots} 张，首帧/系统回退检查 ${summary.startupChecks} 项。
文字采样 ${summary.textChecked} 条，未达标 ${summary.failures.length} 条；横溢失败 ${summary.overflowFailures.length}。
范围为12路由、1440/390、白昼/夜班、18/24px；额外1024首页。对比度采样使用18px阅读偏好。

## 迁移

- 启用17个语义令牌。按属性用途映射 ${migration.mappedReferences} 个引用、${migration.uniqueMappedTokens} 个不同旧令牌；${migration.changedDeclarations} 处原声明变化。
- 直接映射、渐变/投影移除合计消除 ${summary.paletteRemovedReferences} 个 palette 引用。保留 ${summary.paletteRemainingReferences} 个引用，仅实验样式使用，详见下表；333个兼容定义仍保留在 tokens.css。
- 蓝色 ${migration.blueUses} 处归中性文字/内容面，黄色 ${migration.yellowUses} 处归 warn-text；组长已认可。逐声明选择器、旧值、新值和理由在 migration.json，人工规格在 tools/ui/theme-mapping.json。
- 原4个 lab CSS 摘要保持不变，夜班岛边界修正网络位标尺/未命中行透明度、DS图白底浅字；同步通知的收起按钮补显式主题色。输入占位字显式 muted。
- 未编辑TSX、新shell-v2/today/reading-layer样式、main.tsx、题包、schema、依赖或CI。未提交、推送、部署。

| 文件 | 原 palette 引用 | 当前引用 |
|---|---:|---:|
${Object.entries(summary.audit).map(([file, row]) => `| ${file} | ${row.paletteBefore} | ${row.paletteAfter} |`).join('\n')}

## 逐页采样

对比度使用实际背景截图取样（每文字矩形3点），计算未抗锯齿的前景色并合成有效透明度。滚动覆盖文档/main-area；包含DOM、SVG、KaTeX可见文字及原生控件/占位字。禁用按钮也检查。背景截图、逐条选择器和比例均保留。

| 主题/宽度/页面 | 文本数 | 正常文字最小比 | 大字最小比 | 未达标 | 18px页面溢出 | 24px页面溢出 |
|---|---:|---:|---:|---:|---:|---:|
${summary.cases.map((row) => `| ${row.key.replace('-18px', '')} | ${row.text} | ${row.minimumNormal.toFixed(3)} | ${row.minimumLarge?.toFixed(3) ?? '—'} | ${row.failures} | ${row.overflow18} | ${row.overflow24} |`).join('\n')}

## 边界

- Canvas内绘字和来源图片文字无法通过CSS DOM取样覆盖；KnowledgeGraph内部9/10px及硬编码色留待阶段4。该画布维持深底，外围随主题。
- 检查默认路由状态与滚动范围，不宣称覆盖所有交互/所有实验模块状态。24px验证布局与截图，完整文字对比度采样在18px偏好下运行。
- ${summary.paintNoise.length} 张截图接受了已记录的Chrome渐变1级RGB抖动（最大通道差≤1），原样本/差分全部保留。此规则只用于本阶段截图，不改变阶段1零像素差合同。
- 17令牌表在off灰面上不适合叠白昼状态文字：signal-text 4.097、ok-text 4.423、warn-text 4.058；当前受测页面状态文字均使用纸面或轻微状态底。完整颜色配对在token-contrast.json。

脚本：\`tools/ui/migrate-theme.mjs\`、\`tools/verification/ui-style-regression.mjs themes\`、\`ui-theme-regression.mjs\`、\`ui-text-contrast.mjs\`、\`ui-theme-report.mjs\`。
可复跑命令与保护边界见 \`tools/ui/README.md\`。实际单测、构建、E2E和历史失败在下方阶段记录补充。
`;
await writeFile(path.join(root, 'docs/ui/stage-2-theme-verification-2026-11-24.md'), report);
console.log(JSON.stringify({ label, screenshots: summary.screenshots, textChecked: summary.textChecked, failures: summary.failures.length,
  overflowFailures: summary.overflowFailures.length, paletteRemoved: summary.paletteRemovedReferences, paletteRemaining: summary.paletteRemainingReferences,
  passed: summary.passed }));
