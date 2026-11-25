import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { readEvidence } from './ui-style-evidence.mjs';

const root = process.cwd();
const evidence = path.join(root, 'output', 'playwright', 'opus-ui-2026-11-22', 'stage-1');
const read = async (file) => JSON.parse(await readFile(path.join(evidence, file), 'utf8'));
const migration = await read('migration.json');
const control = await read('compare-before-4-control-3/summary.json');
const final = await read('compare-before-4-after-2/summary.json');
const unit = await read('vitest-ui.json');
assert.equal(control.pixelIdentical, 24);
assert.equal(control.styleIdentical, 24);
assert.equal((await read('after-2/receipt.json')).passed, true);
const allowedChanges = new Set(['height', 'width', 'font-size', 'letter-spacing', 'margin',
  'grid-template-rows', 'grid-template-columns', 'line-height']);
const unclassifiedChanges = [];
const propertyCounts = {};
const smallTargets = [];
let nightStylesEqual = 0, formulaCases = 0, smallPositiveText = 0, visibleZeroText = 0;
let snapshotRecords = 0, afterSnapshotRecords = 0;
for (const result of final.results) {
  const [before, after, night, large, differences] = await Promise.all([
    readEvidence(path.join(evidence, 'before-4', `${result.key}.json`)),
    readEvidence(path.join(evidence, 'after-2', `${result.key}.json`)),
    readEvidence(path.join(evidence, 'after-2', `${result.key}-night.json`)),
    readEvidence(path.join(evidence, 'after-2', `${result.key}-24px.json`)),
    readEvidence(path.join(evidence, 'compare-before-4-after-2', `${result.key}-styles.json`)),
  ]);
  snapshotRecords += before.records.length;
  afterSnapshotRecords += after.records.length;
  assert.equal(after.overflow, 0);
  assert.equal(large.overflow, 0);
  assert.equal(after.formulaErrors, 0);
  assert.equal(large.formulaErrors, 0);
  formulaCases += Number(after.formulaCount > 0);
  smallPositiveText += after.smallText.filter((entry) => parseFloat(entry.fontSize) > 0).length;
  visibleZeroText += after.smallText.filter((entry) => parseFloat(entry.fontSize) === 0).length;
  smallTargets.push({ key: result.key, before: before.smallTargets.length, after: after.smallTargets.length,
    at24px: large.smallTargets.length });
  if (JSON.stringify(after.records) === JSON.stringify(night.records)) nightStylesEqual++;
  assert.equal(result.nightPixels.changedPixels, 0);
  for (const change of differences) {
    if (change.kind) { unclassifiedChanges.push({ route: result.key, ...change }); continue; }
    if (change.field === 'rect') continue; // Font metrics change element placement and dimensions.
    const properties = change.field === 'pseudo'
      ? Object.keys(change.after).filter((property) => JSON.stringify(change.after[property]) !== JSON.stringify(change.before[property]))
      : [change.property];
    for (const property of properties) {
      propertyCounts[property] = (propertyCounts[property] ?? 0) + 1;
      if (!allowedChanges.has(property)) unclassifiedChanges.push({ route: result.key, ...change });
    }
  }
}
assert.equal(unclassifiedChanges.length, 0);
assert.equal(nightStylesEqual, 24);
assert.equal(smallPositiveText, 0);
let literalTokenDeclarations = 0;
postcss.parse(await readFile(path.join(root, 'apps/web/src/styles/tokens.css'), 'utf8')).walkDecls((declaration) => {
  if (/#|\brgba?\(|^transparent$/.test(declaration.value)) literalTokenDeclarations++;
});
const keyboard = await Promise.all([1440, 390].map((width) => read(`after-2/${width}-keyboard.json`)));
assert(keyboard.every((value) => value.passed));
const sameSelectorGroups = new Map();
for (const file of migration.files.filter((entry) => entry.path !== 'styles.css')) {
  const tree = postcss.parse(await readFile(path.join(root, 'apps/web/src', file.path), 'utf8'));
  tree.walkRules((rule) => {
    const chain = [];
    for (let parent = rule.parent; parent.type !== 'root'; parent = parent.parent) chain.unshift(`${parent.name}:${parent.params}`);
    for (const selector of rule.selectors) {
      const key = JSON.stringify([chain, selector]);
      sameSelectorGroups.set(key, (sameSelectorGroups.get(key) ?? 0) + 1);
    }
  });
}
const inputSource = await readFile(path.join(evidence, 'original.css'), 'utf8');
const currentSource = (await Promise.all(migration.files.filter((entry) => entry.path !== 'styles.css')
  .map((entry) => readFile(path.join(root, 'apps/web/src', entry.path), 'utf8')))).join('\n');
const summary = {
  status: 'stage-1-migration-verified-with-documented-legacy-accessibility-exceptions',
  source: { bytes: migration.sourceBytes, lines: migration.sourceLines, sha256: migration.sourceSha256 },
  migration: { generatedCssFiles: migration.generatedFiles, importedCssFiles: migration.generatedFiles - 1,
    mergedRules: migration.mergedRuleCount, removedDeclarations: migration.removedDeclarationCount,
    enlargedPositiveFontDeclarations: migration.enlargedFontDeclarations,
    positiveSub13pxDeclarations: migration.sub13pxFontDeclarations, zeroFontExceptions: migration.zeroFontExceptions,
    hardcodedColorsOutsideTokens: migration.hardcodedColorsOutsideTokens, exactPaletteTokens: migration.paletteTokens,
    literalTokenDeclarations, remainingSharedSelectorGroups: [...sameSelectorGroups.values()].filter((value) => value > 1).length,
    remainingSharedSelectorExtraOccurrences: [...sameSelectorGroups.values()].reduce((sum, value) => sum + value - 1, 0),
    originalZeroFontDeclarations: (inputSource.match(/font(?:-size)?:\s*0(?:[;/])/g) ?? []).length,
    currentZeroFontDeclarations: (currentSource.match(/font(?:-size)?:\s*0(?:[;/])/g) ?? []).length },
  tests: { uiFiles: unit.testResults.length, passed: unit.numPassedTests, failed: unit.numFailedTests,
    skipped: unit.numPendingTests, workers: 2, typecheck: 'passed', build: 'build-after-2',
    controlPixelExact: control.pixelIdentical, controlComputedStyleExact: control.styleIdentical,
    snapshotRecords, afterSnapshotRecords, routes: 12, viewports: [1440, 390], browserWorkers: 1,
    nightPixelExact: 24, nightComputedStyleExact: nightStylesEqual, overflowAt18px: 0, overflowAt24px: 0,
    keyboardFlows: keyboard.length, keyboardFocusActivations: keyboard.reduce((sum, value) => sum + value.activations, 0),
    sourceImageFlows: 2, formulaCases, formulaErrors: 0, visiblePositiveSub13pxText: smallPositiveText,
    visibleZeroText, unexplainedChanges: unclassifiedChanges.length },
  pixelResults: final.results.map((result) => ({ route: result.key, changedPixels: result.pixels.changedPixels,
    changedPercent: result.pixels.changedPercent, computedStyleChanges: result.computedStyleChanges })),
  computedStyleChangeProperties: propertyCounts,
  legacySmallTargets: smallTargets,
  unresolved: [
    'Four existing zero-size declarations intentionally hide three mobile button labels and the stack-base decoration.',
    'Canvas/TSX typography, including KnowledgeGraph.tsx font-size 9 and 10, is outside the CSS-only edit scope.',
    'Existing target dimensions below 24px remain; see legacySmallTargets. Changing them would exceed appearance-preserving stage-1 scope.',
    'A full contrast audit and the active day palette remain for subsequent theme stages; stage 1 preserves existing colors.',
    'Only twelve required routes were pixel-compared; all 34 lab states were not exhaustively browser-verified.',
  ],
};
await writeFile(path.join(evidence, 'delivery.json'), `${JSON.stringify(summary, null, 2)}\n`);
const allFiles = [
  ...migration.files.map((entry) => `apps/web/src/${entry.path.replaceAll(path.sep, '/')}`),
  'tools/ui/migrate-styles.mjs', 'tools/ui/README.md',
  'tools/verification/ui-style-regression.mjs', 'tools/verification/ui-style-evidence.mjs',
  'tools/verification/ui-style-report.mjs', 'docs/ui/stage-1-verification-2026-11-23.md',
  'docs/ui/opus-handoff.md', 'HANDOFF.md', 'notes.md',
];
const lines = [
  '# 阶段 1：样式拆分与设计令牌验收',
  '',
  '2026-11-23 · Codex CLI · 仅本地。结论：拆分/颜色/层叠旧字号控制组 24/24 零像素差、24/24 零计算样式差；正式 13px 版本的剩余变化均归因于字体度量。没有未解释的样式回归。既有可访问性问题单列，不能把本阶段写成全站设计验收完成。',
  '',
  `原文件实际 ${migration.sourceLines} 行 / ${migration.sourceBytes} bytes，SHA256 \`${migration.sourceSha256}\`。21 个 import 保持原层叠分段顺序；main.tsx、页面/组件 TSX、schema、题包和依赖未修改。`,
  '',
  '## 改动与统计',
  '',
  `- 22 份 CSS（入口加 21 个模块）；28 条完整选择器列表及媒体条件相同的重复规则合并，10 条被覆盖声明移除。原计划的 430 不是当前基线的准确计数。`,
  `- 保留 ${summary.migration.remainingSharedSelectorGroups} 组共享选择器的 ${summary.migration.remainingSharedSelectorExtraOccurrences} 次额外出现：主要是逗号选择器共享的结构/状态规则；不同媒体条件也独立保存，不能删除其响应式语义。`,
  `- 572 处正字号声明放大到 13px；剩余正的 <13px CSS 声明 0。4 处原有零字号保留：\`.mock-exam-topbar .primary-command\`、\`.practice-topbar .compact-command\`、\`.review-export\`、\`.stack-capacity-base\`，分别是手机图标按钮视觉隐藏文字与栈底装饰。前 3 项可访问名称仍来自 DOM 文本。`,
  `- tokens.css 外硬编码颜色 0；tokens.css 内 ${literalTokenDeclarations} 个颜色字面量声明（含 root/night），其中 ${migration.paletteTokens} 个精确旧色桥接令牌。保留多个相近颜色及 alpha 精度是零外观回归的要求；后续主题阶段再按语义收敛。备用昼/夜表已按组长修订加入 --ok-text。`,
  '- 全部变更由迁移脚本生成；输入摘要固定，--check 确定性通过。--write 遇到后续手工改动拒绝覆盖，不能用迁移脚本回滚阶段 2。',
  '',
  '## 验证',
  '',
  `- UI Vitest：44 文件、281/281 通过、0 失败、0 skipped，2 workers。typecheck 通过。独立生产构建 build-after-2 通过（server mode，201 静态文件、87 precache entries）。工具 ESLint 通过。没有改动或降低任何测试断言。`,
  `- Chrome：1 worker、1440×900 / 390×844（mobile + viewport meta），12 路由各 2 视口。基线快照 ${snapshotRecords} 个可见 DOM 记录；正式版本 ${afterSnapshotRecords} 个，含 before/after 伪元素与几何/计算样式。`,
  '- before-4 → control-3：24/24 精确 RGBA 零像素差、24/24 计算样式零差。控制组是迁移后的完整 CSS，仅保持原字号。',
  '- before-4 → after-2：24/24 的差异仅为字号、字体相关 line-height / em 字距及其尺寸、margin、grid track 和位置重排。没有颜色、边框、阴影、显示状态或其他未解释差异；逐元素明细保留。',
  '- after-2 默认深色 → 显式 night：24/24 零像素差、24/24 计算样式零差。白昼值本阶段刻意未启用，不能声称白昼验收通过。',
  '- 18px / 24px：48/48 无页面级横溢。两视口各 7 次键盘激活均有 focus-visible；完成开始题目、选择、提交、打开真实来源图片、卡片揭示和评分流程。两视口题库各渲染 18 个 KaTeX 公式，默认/24px 均无 katex-error。',
  '',
  '## 精确像素差（均由字号变化引起）',
  '',
  '| 路由 | 1440 差异像素 / 比例 | 390 差异像素 / 比例 |',
  '|---|---:|---:|',
];
for (const desktop of summary.pixelResults.filter((row) => row.route.startsWith('1440-'))) {
  const route = desktop.route.slice(5);
  const mobile = summary.pixelResults.find((row) => row.route === `390-${route}`);
  lines.push(`| ${route} | ${desktop.changedPixels.toLocaleString('en-US')} / ${desktop.changedPercent.toFixed(3)}% | ${mobile.changedPixels.toLocaleString('en-US')} / ${mobile.changedPercent.toFixed(3)}% |`);
}
lines.push('', '全页 diff 使用两张图的最大宽高；字号导致内容变高时，新增底部像素也计入。截图无遮罩、无差异容差；稳定采集最多 4 次，须连续 2 张完全相同，不稳定首样本保留。',
  '', '## 仍未通过或未覆盖的既有门禁', '',
  '- 小于 24px 的控件仍存在（含当前视口下可排版但位于滚动区之外的元素）：今日 8、题库 4、练习 1、复习桌面 397 / 手机 84、知识 221、设置 1、CPU 1，其余所选路由 0；这些是既有文本链接、summary 或原生 select，未为保持外观而增加尺寸。',
  '- 四处零字号隐藏例外如上。KnowledgeGraph.tsx 的 canvas 文字 9px / 10px 等 TSX 内字号没有修改；不能声称整个产品所有文字都 ≥13px。',
  '- 本阶段没有全站对比度逐像素审计；原配色保持等价，昼/夜新配色的 4.5:1 门禁留给主题阶段。',
  '- 未跑完整默认 E2E、8 workers 压力或所有 34 实验状态；本阶段为 12 路由自动对比与实际键盘流程，不能替代全仓浏览器封板。',
  '', '## 失败与修复记录', '',
  '- 根 npm build 参数透传丢失 --mode/--outDir，首轮报 server/index.html 不存在；改用明确 workspace 与 --name=value 后构建通过。原 build-before.log 保留。',
  '- 首轮浏览器采集误用不存在的 .lab-page，桌面 8 路由后停止；改为实际 ds/vm/network 类名，后续完整 24/24，未把定向结果冒充完整结果。',
  '- 初次控制组发现 alpha 舍入差异；修复为对整个声明按 esbuild 同等上下文规范化（渐变/普通颜色/自定义属性不能统一按 color 属性处理）。',
  '- 初次知识图 canvas 可见但尚未绘制；增加非空像素等待。手机悬停快照时序增加移开指针及两帧等待。Chromium 首次 beyond-viewport 绘制会调整滚动高度，增加有界连续截图稳定检查，原不稳定图片保留。',
  '- 工具初轮 ESLint 29 个 no-undef 来自 page.evaluate 浏览器全局；改为明确 globalThis 引用，未禁用规则。',
  '', '## 关键命令与产物', '',
  '```powershell',
  'node tools/ui/migrate-styles.mjs --write',
  'node tools/ui/migrate-styles.mjs --check',
  'npm run test -- apps/web/src/pages apps/web/src/components --maxWorkers=2 --reporter=json --outputFile=output/playwright/opus-ui-2026-11-22/stage-1/vitest-ui.json',
  'npm run typecheck',
  `npm run build -w @408os/web -- --mode=server --outDir "${path.relative(path.join(root, 'apps', 'web'), path.join(evidence, 'build-after-2')).split(path.sep).join('/')}"`,
  'node --import tsx tools/verification/ui-style-regression.mjs capture before-4 output/playwright/opus-ui-2026-11-22/stage-1/build-before',
  'node --import tsx tools/verification/ui-style-regression.mjs capture control-3 output/playwright/opus-ui-2026-11-22/stage-1/build-before output/playwright/opus-ui-2026-11-22/stage-1/control-original-fonts.css',
  'node --import tsx tools/verification/ui-style-regression.mjs capture after-2 output/playwright/opus-ui-2026-11-22/stage-1/build-after-2',
  'node --import tsx tools/verification/ui-style-regression.mjs compare before-4 control-3',
  'node --import tsx tools/verification/ui-style-regression.mjs compare before-4 after-2',
  'npx eslint tools/ui/migrate-styles.mjs tools/verification/ui-style-regression.mjs tools/verification/ui-style-evidence.mjs tools/verification/ui-style-report.mjs',
  'node tools/verification/ui-style-report.mjs',
  '```',
  '',
  '实际产物位于 `output/playwright/opus-ui-2026-11-22/stage-1/`。原始基线和最终 JSON 汇总：`original.css`、`migration.json`、`delivery.json`；图像/逐元素对比见 `compare-before-4-control-3/`、`compare-before-4-after-2/`。大快照采用可逆 gzip/base64 JSON 信封以限制常驻空间，由 `readEvidence()` 自动解码，原始内容 SHA256 和逐文件校验见 `evidence-encoding-receipt.json`。没有删除历史证据。',
  '', '## 改动文件', '',
  ...allFiles.map((file) => `- \`${file}\``), '',
);
await writeFile(path.join(root, 'docs/ui/stage-1-verification-2026-11-23.md'), lines.join('\n'));
console.log(JSON.stringify({ verified: true, tests: summary.tests, report: 'docs/ui/stage-1-verification-2026-11-23.md' }));
