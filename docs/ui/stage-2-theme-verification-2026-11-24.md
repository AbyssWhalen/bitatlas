# 阶段 2 主题验收（2026-11-24）

当前采集 `attempt-5`；截图 100 张，首帧/系统回退检查 17 项。
文字采样 10758 条，未达标 0 条；横溢失败 0。
范围为12路由、1440/390、白昼/夜班、18/24px；额外1024首页。对比度采样使用18px阅读偏好。

## 迁移

- 启用17个语义令牌。按属性用途映射 401 个引用、164 个不同旧令牌；545 处原声明变化。
- 直接映射、渐变/投影移除合计消除 422 个 palette 引用。保留 408 个引用，仅实验样式使用，详见下表；333个兼容定义仍保留在 tokens.css。
- 蓝色 17 处归中性文字/内容面，黄色 37 处归 warn-text；组长已认可。逐声明选择器、旧值、新值和理由在 migration.json，人工规格在 tools/ui/theme-mapping.json。
- 原4个 lab CSS 摘要保持不变，夜班岛边界修正网络位标尺/未命中行透明度、DS图白底浅字；同步通知的收起按钮补显式主题色。输入占位字显式 muted。
- 未编辑TSX、新shell-v2/today/reading-layer样式、main.tsx、题包、schema、依赖或CI。未提交、推送、部署。

| 文件 | 原 palette 引用 | 当前引用 |
|---|---:|---:|
| base.css | 9 | 0 |
| shell.css | 57 | 0 |
| pages/dashboard.css | 38 | 0 |
| pages/questions.css | 43 | 0 |
| pages/stats.css | 9 | 0 |
| pages/knowledge.css | 14 | 0 |
| lab.css | 280 | 280 |
| pages/settings.css | 2 | 0 |
| pages/documents.css | 26 | 0 |
| pages/practice.css | 89 | 0 |
| pages/mock.css | 25 | 0 |
| shell-tablet.css | 0 | 0 |
| responsive.css | 12 | 0 |
| lab-extended.css | 44 | 44 |
| shell-narrow.css | 0 | 0 |
| pages/content-review.css | 93 | 0 |
| lab-exhibits.css | 84 | 84 |
| lab-tablet.css | 0 | 0 |
| base-motion.css | 0 | 0 |
| reading.css | 5 | 0 |

## 逐页采样

对比度使用实际背景截图取样（每文字矩形3点），计算未抗锯齿的前景色并合成有效透明度。滚动覆盖文档/main-area；包含DOM、SVG、KaTeX可见文字及原生控件/占位字。禁用按钮也检查。背景截图、逐条选择器和比例均保留。

| 主题/宽度/页面 | 文本数 | 正常文字最小比 | 大字最小比 | 未达标 | 18px页面溢出 | 24px页面溢出 |
|---|---:|---:|---:|---:|---:|---:|
| day-1440-today | 94 | 5.203 | 5.049 | 0 | 0 | 0 |
| day-1440-questions | 403 | 4.558 | 15.544 | 0 | 0 | 0 |
| day-1440-practice | 57 | 5.138 | — | 0 | 0 | 0 |
| day-1440-review | 498 | 5.203 | 15.544 | 0 | 0 | 0 |
| day-1440-knowledge | 857 | 5.006 | 14.839 | 0 | 0 | 0 |
| day-1440-stats | 70 | 5.875 | 14.839 | 0 | 0 | 0 |
| day-1440-settings | 191 | 5.001 | 14.839 | 0 | 0 | 0 |
| day-1440-more | 36 | 5.875 | 15.544 | 0 | 0 | 0 |
| day-1440-data-structures | 94 | 4.565 | 11.655 | 0 | 0 | 0 |
| day-1440-operating-systems | 121 | 4.565 | 15.052 | 0 | 0 | 0 |
| day-1440-network | 297 | 4.565 | 15.052 | 0 | 0 | 0 |
| day-1440-cpu | 63 | 4.565 | 15.052 | 0 | 0 | 0 |
| day-390-today | 86 | 5.203 | 5.049 | 0 | 0 | 0 |
| day-390-questions | 323 | 4.558 | 15.544 | 0 | 0 | 0 |
| day-390-practice | 48 | 5.138 | — | 0 | 0 | 0 |
| day-390-review | 490 | 5.203 | 15.544 | 0 | 0 | 0 |
| day-390-knowledge | 849 | 5.006 | 14.839 | 0 | 0 | 0 |
| day-390-stats | 62 | 6.331 | 14.839 | 0 | 0 | 0 |
| day-390-settings | 183 | 5.001 | 14.839 | 0 | 0 | 0 |
| day-390-more | 28 | 6.014 | 15.544 | 0 | 0 | 0 |
| day-390-data-structures | 82 | 5.252 | 11.503 | 0 | 0 | 0 |
| day-390-operating-systems | 105 | 5.424 | 15.052 | 0 | 0 | 0 |
| day-390-network | 203 | 5.560 | 15.052 | 0 | 0 | 0 |
| day-390-cpu | 51 | 6.581 | 15.052 | 0 | 0 | 0 |
| day-1024-today | 88 | 5.203 | 5.049 | 0 | 0 | 0 |
| night-1440-today | 94 | 5.975 | 6.392 | 0 | 0 | 0 |
| night-1440-questions | 403 | 4.901 | 15.279 | 0 | 0 | 0 |
| night-1440-practice | 57 | 5.515 | — | 0 | 0 | 0 |
| night-1440-review | 498 | 5.975 | 14.088 | 0 | 0 | 0 |
| night-1440-knowledge | 857 | 5.975 | 11.441 | 0 | 0 | 0 |
| night-1440-stats | 70 | 5.975 | 11.441 | 0 | 0 | 0 |
| night-1440-settings | 191 | 5.975 | 11.441 | 0 | 0 | 0 |
| night-1440-more | 36 | 5.975 | 15.279 | 0 | 0 | 0 |
| night-1440-data-structures | 94 | 4.565 | 11.655 | 0 | 0 | 0 |
| night-1440-operating-systems | 121 | 4.565 | 15.052 | 0 | 0 | 0 |
| night-1440-network | 297 | 4.565 | 15.052 | 0 | 0 | 0 |
| night-1440-cpu | 63 | 4.565 | 15.052 | 0 | 0 | 0 |
| night-390-today | 86 | 6.503 | 6.392 | 0 | 0 | 0 |
| night-390-questions | 323 | 4.901 | 15.279 | 0 | 0 | 0 |
| night-390-practice | 48 | 5.515 | — | 0 | 0 | 0 |
| night-390-review | 490 | 6.503 | 14.088 | 0 | 0 | 0 |
| night-390-knowledge | 849 | 6.237 | 11.441 | 0 | 0 | 0 |
| night-390-stats | 62 | 6.581 | 11.441 | 0 | 0 | 0 |
| night-390-settings | 183 | 6.503 | 11.441 | 0 | 0 | 0 |
| night-390-more | 28 | 6.581 | 15.279 | 0 | 0 | 0 |
| night-390-data-structures | 82 | 5.252 | 11.503 | 0 | 0 | 0 |
| night-390-operating-systems | 105 | 5.424 | 15.052 | 0 | 0 | 0 |
| night-390-network | 203 | 5.560 | 15.052 | 0 | 0 | 0 |
| night-390-cpu | 51 | 6.581 | 15.052 | 0 | 0 | 0 |
| night-1024-today | 88 | 6.503 | 6.392 | 0 | 0 | 0 |

## 边界

- Canvas内绘字和来源图片文字无法通过CSS DOM取样覆盖；KnowledgeGraph内部9/10px及硬编码色留待阶段4。该画布维持深底，外围随主题。
- 检查默认路由状态与滚动范围，不宣称覆盖所有交互/所有实验模块状态。24px验证布局与截图，完整文字对比度采样在18px偏好下运行。
- 0 张截图接受了已记录的Chrome渐变1级RGB抖动（最大通道差≤1），原样本/差分全部保留。此规则只用于本阶段截图，不改变阶段1零像素差合同。
- 17令牌表在off灰面上不适合叠白昼状态文字：signal-text 4.097、ok-text 4.423、warn-text 4.058；当前受测页面状态文字均使用纸面或轻微状态底。完整颜色配对在token-contrast.json。

脚本：`tools/ui/migrate-theme.mjs`、`tools/verification/ui-style-regression.mjs themes`、`ui-theme-regression.mjs`、`ui-text-contrast.mjs`、`ui-theme-report.mjs`。
可复跑命令与保护边界见 `tools/ui/README.md`。实际单测、构建、E2E和历史失败在下方阶段记录补充。

## 暂停停点与实际验证

2026-11-24 组长转达维护者今晚暂停，只允许当时正在执行的批次自然结束并交接。当前批次均已完成，任务保持 `in_progress`，没有启动后续修复或新验证。此报告的浏览器通过结论仅对应 `build-3` / `build-local-2`；全仓 lint 未通过，阶段未封板。

| 实际命令 | 实际结果 | 证据 |
|---|---|---|
| `node tools/ui/migrate-theme.mjs --check` | exit 0，确定性复算与4个实验原文件摘要通过 | `migration-check-2.log` |
| `npm run test -- apps/web/src/pages apps/web/src/components --maxWorkers=2 --reporter=json --outputFile=output/playwright/opus-ui-2026-11-22/stage-2-theme/vitest-ui-2.json` | 45文件，289 passed，0 failed/skipped | `vitest-ui-2.json` |
| `npm run typecheck` | exit 0，全部配置workspace通过 | `typecheck-2.log` |
| `npm run build -w @408os/web -- --mode=server --outDir "../../output/playwright/opus-ui-2026-11-22/stage-2-theme/build-3"` | exit 0，201复制项、88预缓存项 | `build-3.log` |
| `npm run build -w @408os/web -- --outDir "../../output/playwright/opus-ui-2026-11-22/stage-2-theme/build-local-2"` | exit 0，198复制项、95预缓存项 | `build-local-2.log` |
| `node --import tsx tools/verification/ui-style-regression.mjs themes attempt-5 output/playwright/opus-ui-2026-11-22/stage-2-theme/build-3` | exit 0，100图、10,758文本，0对比度/横溢/运行错误；17首帧/回退检查通过 | `attempt-5/receipt.json` |
| `npm run lint` | exit 1，16 errors、0 warnings，均在其他成员阅读层文件 | `lint-2.log`、`lint-2-errors.json` |

外壳相关 E2E 使用 `BITATLAS_UI_E2E_BUILD=build-local-2`，依次设 `BITATLAS_UI_E2E_RUN=3-1440`、`3-1366`、`3-390`，执行：

```powershell
npx playwright test --config=tools/verification/ui-theme.playwright.config.ts --project=stage2-3-1440-chromium-1440
npx playwright test --config=tools/verification/ui-theme.playwright.config.ts --project=stage2-3-1366-chromium-1366
npx playwright test --config=tools/verification/ui-theme.playwright.config.ts --project=stage2-3-390-chromium-390
```

每批实际1 worker、40/40，分别97.926s、103.306s、103.556s；合计120 passed、0 failed/skipped/flaky。包括两份study-flow、visual、learning-loop、code-only-mode、mock-exam、data-structures-lab共7文件。JSON汇总 `e2e-3-summary.json`；不是全默认E2E，也未运行固定8workers压力。

全仓 lint 待修的16条逐项位置：

| 文件 | 行 | 失败 |
|---|---|---|
| `ReadingImageLightbox.tsx` | 23 | `react-hooks/set-state-in-effect` |
| `CardReviewPage.tsx` | 63 | 未用 `_rating` |
| `CardReviewPage.tsx` | 66、241 | render期间refs |
| `PracticePage.tsx` | 299、300、301 | 未用 `_optionId`、两个 `_timeStamp` |
| `PracticePage.tsx` | 370、375、380、385、391、402、412、718、1223 | render期间refs |

已通知组长与摩卡，未改其TSX或降低规则。字体、交互和新阅读层由其所属成员继续处理。`styles.css`在构建检查点之后增加了 `pages/secondary.css` 导入（该文件00:27落盘）；当前新层不在此次独立构建证据中，明天恢复后需先核对实际差异再复验。其余检查点内186文件在停止时仅此入口摘要变化。

## 修改清单与修复记录

实际改变15个原文件：`apps/web/index.html`；`styles/{tokens,base,shell,reading,responsive}.css`；`styles/pages/{dashboard,questions,stats,knowledge,settings,documents,practice,mock,content-review}.css`。`shell-tablet.css`、`shell-narrow.css`、`base-motion.css`虽纳入确定性输出但字节未变；4个lab文件字节未变。

新增 `tools/ui/{migrate-theme.mjs,theme-mapping.json}`、`tools/verification/{ui-theme-regression.mjs,ui-text-contrast.mjs,ui-theme-report.mjs,ui-theme.playwright.config.ts}`；修改共享验证入口 `ui-style-regression.mjs`、使用说明 `tools/ui/README.md`；同步本报告、`opus-handoff.md`、根 `HANDOFF.md` / `notes.md`。

- 蓝色17处归中性，黄色37处归warn-text；组长认可，无新增语义令牌。非实验palette引用0；旧CSS中tokens外硬编码颜色声明0。兼容别名的实验使用量为lab159、lab-extended27、lab-exhibits26、responsive的QAM规则1，非实验0。
- 网络位标尺和未命中行的低透明度、DS图浅节点上的浅字在夜班岛边界修正。四实验白昼截图实测底色 `rgb(22,24,23)`、正文 `rgb(214,214,208)`、纸面 `#1E1E1C`。
- `attempt-3` 21条失败：阅读层3类禁用按钮×2主题×2视口=12条，由摩卡把opacity改1；同步通知收起按钮夜班9条，由本任务补显式ink/paper-2。`attempt-5`全部归零；练习页正文最小昼5.138、夜5.515，全部页面采样最小昼4.558、夜4.565。
- `attempt-1/2`为截图稳定性诊断，保留图和日志。`attempt-3`完整但对比度未达标。`attempt-4`已通过17个启动检查，随后首页空任务超时：浏览器冻结于11月23日，服务器真实时间已到11月24日，产品正确拒绝不同日期计划。工具通过已有server `now`注入口同步固定时间解决，未改产品时间/计划逻辑。
- `e2e-1`进程结束但无最终报告，日志81通过/6失败/33无结果；6失败都是两桌面视口的3个followNav旧“更多”link定位超时。组长仅将两份辅助函数改为精确名称link或button，后续断言未改。`e2e-2-1440`是工具输出保护误在worker重载触发，7启动失败/33未执行；修复保护后采用全新目录，历史保留。

首页四图：`attempt-5/day-1440-today-18px.png`、`night-1440-today-18px.png`、`day-390-today-18px.png`、`night-390-today-18px.png`；题库 `attempt-5/day-1440-questions-18px.png`。1024与24px同命名规则；四实验白昼为 `attempt-5/day-1440-{data-structures,operating-systems,network,cpu}-18px.png`。

00:28北京时间已确认本任务进程树及Chrome全部退出，4349/4351无监听，回执 `pause-process-check.json`。停止时未删除历史证据，未提交/推送/部署。明天必须等待明确恢复，再由文件owner修lint、整合secondary层并确定验证范围；旧侧栏失效规则清理及尚未指派的数据接口均未开始。
