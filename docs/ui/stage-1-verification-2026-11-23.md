# 阶段 1：样式拆分与设计令牌验收

2026-11-23 · Codex CLI · 仅本地。结论：拆分/颜色/层叠旧字号控制组 24/24 零像素差、24/24 零计算样式差；正式 13px 版本的剩余变化均归因于字体度量。没有未解释的样式回归。既有可访问性问题单列，不能把本阶段写成全站设计验收完成。

原文件实际 2964 行 / 272873 bytes，SHA256 `c071357042bd46920cb748875090dc3e847396949ae613c82a27134cc58d86fe`。21 个 import 保持原层叠分段顺序；main.tsx、页面/组件 TSX、schema、题包和依赖未修改。

## 改动与统计

- 22 份 CSS（入口加 21 个模块）；28 条完整选择器列表及媒体条件相同的重复规则合并，10 条被覆盖声明移除。原计划的 430 不是当前基线的准确计数。
- 保留 194 组共享选择器的 197 次额外出现：主要是逗号选择器共享的结构/状态规则；不同媒体条件也独立保存，不能删除其响应式语义。
- 572 处正字号声明放大到 13px；剩余正的 <13px CSS 声明 0。4 处原有零字号保留：`.mock-exam-topbar .primary-command`、`.practice-topbar .compact-command`、`.review-export`、`.stack-capacity-base`，分别是手机图标按钮视觉隐藏文字与栈底装饰。前 3 项可访问名称仍来自 DOM 文本。
- tokens.css 外硬编码颜色 0；tokens.css 内 363 个颜色字面量声明（含 root/night），其中 333 个精确旧色桥接令牌。保留多个相近颜色及 alpha 精度是零外观回归的要求；后续主题阶段再按语义收敛。备用昼/夜表已按组长修订加入 --ok-text。
- 全部变更由迁移脚本生成；输入摘要固定，--check 确定性通过。--write 遇到后续手工改动拒绝覆盖，不能用迁移脚本回滚阶段 2。

## 验证

- UI Vitest：44 文件、281/281 通过、0 失败、0 skipped，2 workers。typecheck 通过。独立生产构建 build-after-2 通过（server mode，201 静态文件、87 precache entries）。工具 ESLint 通过。没有改动或降低任何测试断言。
- Chrome：1 worker、1440×900 / 390×844（mobile + viewport meta），12 路由各 2 视口。基线快照 11940 个可见 DOM 记录；正式版本 11940 个，含 before/after 伪元素与几何/计算样式。
- before-4 → control-3：24/24 精确 RGBA 零像素差、24/24 计算样式零差。控制组是迁移后的完整 CSS，仅保持原字号。
- before-4 → after-2：24/24 的差异仅为字号、字体相关 line-height / em 字距及其尺寸、margin、grid track 和位置重排。没有颜色、边框、阴影、显示状态或其他未解释差异；逐元素明细保留。
- after-2 默认深色 → 显式 night：24/24 零像素差、24/24 计算样式零差。白昼值本阶段刻意未启用，不能声称白昼验收通过。
- 18px / 24px：48/48 无页面级横溢。两视口各 7 次键盘激活均有 focus-visible；完成开始题目、选择、提交、打开真实来源图片、卡片揭示和评分流程。两视口题库各渲染 18 个 KaTeX 公式，默认/24px 均无 katex-error。

## 精确像素差（均由字号变化引起）

| 路由 | 1440 差异像素 / 比例 | 390 差异像素 / 比例 |
|---|---:|---:|
| today | 244,580 / 12.985% | 47,645 / 14.475% |
| questions | 2,291,522 / 26.562% | 94,704 / 28.771% |
| practice | 37,459 / 2.747% | 5,817 / 1.767% |
| review | 2,218,563 / 15.254% | 49,568 / 15.059% |
| knowledge | 753,363 / 14.236% | 149,154 / 45.314% |
| stats | 385,840 / 22.882% | 146,153 / 44.402% |
| settings | 889,881 / 26.196% | 79,880 / 24.268% |
| more | 17,980 / 1.387% | 25,212 / 7.659% |
| data-structures | 580,109 / 27.201% | 143,491 / 43.593% |
| operating-systems | 649,149 / 30.792% | 179,774 / 29.836% |
| network | 1,391,705 / 44.455% | 223,369 / 23.141% |
| cpu | 209,752 / 16.185% | 82,476 / 25.057% |

全页 diff 使用两张图的最大宽高；字号导致内容变高时，新增底部像素也计入。截图无遮罩、无差异容差；稳定采集最多 4 次，须连续 2 张完全相同，不稳定首样本保留。

## 仍未通过或未覆盖的既有门禁

- 小于 24px 的控件仍存在（含当前视口下可排版但位于滚动区之外的元素）：今日 8、题库 4、练习 1、复习桌面 397 / 手机 84、知识 221、设置 1、CPU 1，其余所选路由 0；这些是既有文本链接、summary 或原生 select，未为保持外观而增加尺寸。
- 四处零字号隐藏例外如上。KnowledgeGraph.tsx 的 canvas 文字 9px / 10px 等 TSX 内字号没有修改；不能声称整个产品所有文字都 ≥13px。
- 本阶段没有全站对比度逐像素审计；原配色保持等价，昼/夜新配色的 4.5:1 门禁留给主题阶段。
- 未跑完整默认 E2E、8 workers 压力或所有 34 实验状态；本阶段为 12 路由自动对比与实际键盘流程，不能替代全仓浏览器封板。

## 失败与修复记录

- 根 npm build 参数透传丢失 --mode/--outDir，首轮报 server/index.html 不存在；改用明确 workspace 与 --name=value 后构建通过。原 build-before.log 保留。
- 首轮浏览器采集误用不存在的 .lab-page，桌面 8 路由后停止；改为实际 ds/vm/network 类名，后续完整 24/24，未把定向结果冒充完整结果。
- 初次控制组发现 alpha 舍入差异；修复为对整个声明按 esbuild 同等上下文规范化（渐变/普通颜色/自定义属性不能统一按 color 属性处理）。
- 初次知识图 canvas 可见但尚未绘制；增加非空像素等待。手机悬停快照时序增加移开指针及两帧等待。Chromium 首次 beyond-viewport 绘制会调整滚动高度，增加有界连续截图稳定检查，原不稳定图片保留。
- 工具初轮 ESLint 29 个 no-undef 来自 page.evaluate 浏览器全局；改为明确 globalThis 引用，未禁用规则。

## 关键命令与产物

```powershell
node tools/ui/migrate-styles.mjs --write
node tools/ui/migrate-styles.mjs --check
npm run test -- apps/web/src/pages apps/web/src/components --maxWorkers=2 --reporter=json --outputFile=output/playwright/opus-ui-2026-11-22/stage-1/vitest-ui.json
npm run typecheck
npm run build -w @408os/web -- --mode=server --outDir "../../output/playwright/opus-ui-2026-11-22/stage-1/build-after-2"
node --import tsx tools/verification/ui-style-regression.mjs capture before-4 output/playwright/opus-ui-2026-11-22/stage-1/build-before
node --import tsx tools/verification/ui-style-regression.mjs capture control-3 output/playwright/opus-ui-2026-11-22/stage-1/build-before output/playwright/opus-ui-2026-11-22/stage-1/control-original-fonts.css
node --import tsx tools/verification/ui-style-regression.mjs capture after-2 output/playwright/opus-ui-2026-11-22/stage-1/build-after-2
node --import tsx tools/verification/ui-style-regression.mjs compare before-4 control-3
node --import tsx tools/verification/ui-style-regression.mjs compare before-4 after-2
npx eslint tools/ui/migrate-styles.mjs tools/verification/ui-style-regression.mjs tools/verification/ui-style-evidence.mjs tools/verification/ui-style-report.mjs
node tools/verification/ui-style-report.mjs
```

实际产物位于 `output/playwright/opus-ui-2026-11-22/stage-1/`。原始基线和最终 JSON 汇总：`original.css`、`migration.json`、`delivery.json`；图像/逐元素对比见 `compare-before-4-control-3/`、`compare-before-4-after-2/`。大快照采用可逆 gzip/base64 JSON 信封以限制常驻空间，由 `readEvidence()` 自动解码，原始内容 SHA256 和逐文件校验见 `evidence-encoding-receipt.json`。没有删除历史证据。

## 改动文件

- `apps/web/src/styles.css`
- `apps/web/src/styles/tokens.css`
- `apps/web/src/styles/base.css`
- `apps/web/src/styles/shell.css`
- `apps/web/src/styles/pages/dashboard.css`
- `apps/web/src/styles/pages/questions.css`
- `apps/web/src/styles/pages/stats.css`
- `apps/web/src/styles/pages/knowledge.css`
- `apps/web/src/styles/lab.css`
- `apps/web/src/styles/pages/settings.css`
- `apps/web/src/styles/pages/documents.css`
- `apps/web/src/styles/pages/practice.css`
- `apps/web/src/styles/pages/mock.css`
- `apps/web/src/styles/shell-tablet.css`
- `apps/web/src/styles/responsive.css`
- `apps/web/src/styles/lab-extended.css`
- `apps/web/src/styles/shell-narrow.css`
- `apps/web/src/styles/pages/content-review.css`
- `apps/web/src/styles/lab-exhibits.css`
- `apps/web/src/styles/lab-tablet.css`
- `apps/web/src/styles/base-motion.css`
- `apps/web/src/styles/reading.css`
- `tools/ui/migrate-styles.mjs`
- `tools/ui/README.md`
- `tools/verification/ui-style-regression.mjs`
- `tools/verification/ui-style-evidence.mjs`
- `tools/verification/ui-style-report.mjs`
- `docs/ui/stage-1-verification-2026-11-23.md`
- `docs/ui/opus-handoff.md`
- `HANDOFF.md`
- `notes.md`
