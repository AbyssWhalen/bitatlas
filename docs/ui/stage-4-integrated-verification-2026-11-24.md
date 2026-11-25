# 阶段 2b、阶段 4 寄存器与顶栏合并复验

2026-11-24，北京时间。验证已完成；**有一处产品对比度不达标，不能全绿封板。** 只修改验证工具与文档。受测的是阶段目录内的两份独立生产构建，未修改页面、样式、测试断言、题包、依赖或线上服务。实验展厅在并行施工，不属于本次结论。

证据根目录：`output/playwright/opus-ui-2026-11-22/stage-4-integrated/`。`delivery.json` 为汇总，`matrix.views` 关联每张截图及 SHA256；下列路径均相对此目录。Chrome 158.0.8127.37。回读两服务入口得到的 SHA256 与构建 `index.html` 一致：

| 模式 | 构建 | 入口 SHA256 |
| --- | --- | --- |
| 本地 | `build-local-1/` | `14f680b091689712e5e99c9c6a4f008f6b8ead1e50de507c169347c5cd32c02c` |
| 服务器 | `build-server-1/` | `b08819b5eac7c42d6aff40511bcb9bc6941f229516a461431f04453366499b87` |

## 产品失败

在一次性账号做错一题，打开 `/review`，“错题”标签右侧计数为 `1`。`apps/web/src/pages/ReviewPage.tsx:235` 输出 `.sec-tab-badge`；`apps/web/src/styles/pages/secondary.css:231` 对 13px、700 字重的数字使用 `--signal-text`，底色又掺入 14% 相同颜色。白昼实际前景 `rgb(184,50,26)`、背景 `rgb(229,210,202)`，比值 **4.10435:1**，低于普通文字 **4.5:1**。夜班同元素 **5.26447:1**，达标。归属摩卡；已告知组长，本任务未代改。

| 失败组合 | 实测比值 | 截图（同名 `-contrast.json.gz` 内有选择器、坐标及背景帧摘要） |
| --- | ---: | --- |
| 白昼 1440 / 18px | 4.10435 | `matrix-1-day-1440/review-18px.png` |
| 白昼 1440 / 24px | 4.10435 | `matrix-1-day-1440/review-24px.png` |
| 白昼 390 / 18px | 4.10435 | `matrix-1-day-390/review-18px.png` |
| 白昼 390 / 24px | 4.10435 | `matrix-1-day-390/review-24px.png` |

## 静态与浏览器检查

全仓 ESLint 最终检查 **396 份文件，0 错误、0 警告**（`lint-final.json`）。`npm run typecheck` 七个 workspace 完成、退出码 0（`typecheck-2.json/.log`）；此前 `AppShell.test.tsx:47` 的错误未再出现。全量 Vitest **127 文件，1393/1393，0 跳过、0 todo**（`vitest-1.json`）。本地和服务器构建均成功生成 service worker；两份日志各含两处上游 Zod 注释提示，以及独立输出目录不自动清空的提示。

**14 个页面状态 × 2 视口 × 2 主题 × 2 字号 = 112/112 张**。沿用上一轮八个非实验页面：今日、题库（2009 筛选）、答题中、复习、知识、统计、设置、更多。补入有记录的错题、真实练习总结、共享资料、服务器登录，以及本地资料和本地设置。登录使用实际退出后的 AccountGate；24px 来自退出前的真实字号选择，另外验证了直接访问 `/` 的登录首帧。

| 视口 / 主题 | 截图 | 可见文字样本 | 不达标 | 文档 / 主区横溢 |
| --- | ---: | ---: | ---: | --- |
| 1440 白昼 | 28 | 4,829 | 2 | 0 / 0 |
| 390 白昼 | 28 | 4,487 | 2 | 0 / 0 |
| 1440 夜班 | 28 | 4,835 | 0 | 0 / 0 |
| 390 夜班 | 28 | 4,495 | 0 | 0 / 0 |
| **合计** | **112** | **18,646** | **4** | **0 / 0** |

112 个文档、104 个实际存在的 `.main-area` 均无横溢；8 个独立登录表单没有 `.main-area`，标为不适用。390 均启用移动视口并核对 viewport meta。未捕获页面运行异常。两种阅读字号都滚动采样，包含 DOM、SVG text、表单值和占位符，每个文字矩形在抑制文字绘制后的真实背景截图取三个点。普通文字要求 4.5，大字要求 3。Canvas 绘字、来源图片内的字及未触发的交互状态不在此数字内。

两个构建的首帧/存储/系统回退各 **17/17**；另对每个页面状态、视口和主题阻断 React 模块，在空根节点检查 HTML 首帧：**56/56** 属性、`theme-color` 与 `--bone` 一致（操作系统设为与显式主题相反）。首帧主题不依赖阅读字号。

## 寄存器和外壳

`register-2/receipt.json` 共 **17/17**。实包 102 格（28/22/22/30）；桌面实测最小 **26×26px**，两轴最小间距 **6px**；390 展开后 **30×30px**，间距 **8px**。手机初始四条进度条、零个可见概念格，只展开数据结构后可见 28 格，其余三科仍折叠。两视口每科一个可按 Tab 停靠的格子；各测 28 次方向键、Home、End 和边界钳制，焦点描边与说明同步。鼠标点击、跨科及手机详情均写入对应 `?subject=…&node=…`，显示概念名、状态、已练题、卡片及最近学习，按钮状态类未变。寄存器与首页四科概要中均无百分号。

单独本地浏览器在模拟的北京 11 月 23、24 日通过界面完成 **6 次客观作答、3 次卡片评分**；没有直接写入学习表或设置状态类。102 格得到 **99 未开始、1 练习中、1 待巩固、1 稳定**；当天 12 项映射为 10 个不同概念，逐格与实际标记一致，首页显示本周 2 天。截图像素确认两主题的空底、中心点、半填充、实心四态不同；右上角三角实际为昼 `#C8381A`、夜 `#FF6A4A`。详见 `register-2/register-1440-{day,night}-with-history.png`、单格裁图及逐键回执。

主题按钮白昼月亮、夜班太阳，点击、刷新、外部属性变更均同步。`shell-1/receipt.json`：本地和未登录无同步徽标；本次服务器登录初见“无待同步记录”；断网真实答题后“待同步 4 条”与当前账号 outbox 索引计数相同；恢复网络，观察到成功事件 `2026-11-24T13:05:33.312Z` 后显示“已同步 21:05”。均为隔离夹具。

组长要求的首屏已先行送达：`priority-1/knowledge-1440-day.png`、`priority-1/knowledge-1440-night.png`、`priority-1/knowledge-390-day-collapsed.png`、`priority-1/knowledge-390-day-expanded.png`、`priority-1/today-1440-day.png`。

## E2E 范围

| 模式 / 视口 | 通过 / 执行 | 实际 worker | 失败 / 跳过 / flaky | 独立报告 |
| --- | ---: | ---: | --- | --- |
| 本地 1440 | 47/47 | 1 | 0 / 0 / 0 | `e2e-1-chromium-1440/report.json` |
| 本地 1366 | 47/47 | 1 | 0 / 0 / 0 | `e2e-1-chromium-1366/report.json` |
| 本地 390 | 47/47 | 1 | 0 / 0 / 0 | `e2e-1-chromium-390/report.json` |
| 服务器 1440 | 7/7 | 1 | 0 / 0 / 0 | `e2e-1-server-desktop/report.json` |
| 服务器 390 | 7/7 | 1 | 0 / 0 / 0 | `e2e-1-server-mobile/report.json` |
| **合计** | **155/155** | 每批 1 | **0 / 0 / 0** | `delivery.json` |

全默认本地发现清单是 30 份 spec、234 条（`all-local-discovery.json`）。按任务预先排除 18 份 `*-lab.spec.ts` 和 3 份 `*-labs.spec.ts` 共 81 条；另排除 `visual`、`study-flow` 里的四个 CPU/RV32I 实验专用用例 × 三视口共 12 条。其余 9 份本地 spec 的 141 条全跑，包括 code-only 模式最后的实验入口连通性断言；未对实验模块交互或截图作本轮验收。服务器全部 7 用例 × 两视口均跑。未跑全默认、不含固定 8 worker 压测、未测部署环境。

项目名沿用真实设备分支，独立工作目录接收用例内写死的相对截图路径。服务器 spec 的临时副本只适配 3 个硬编码 `4323` 到授权 `4349` 及相对 fixture import；生成器反向替换后逐字节等于原测试，两个摘要在各自 `batch.json`。原 spec 和断言未改。

## 命令与中断

实际验证命令（`$D` 为上述证据根目录的绝对路径；采集与 E2E 的新标签均拒绝覆盖既有目录）：

```powershell
npm run lint -- --format json --output-file "$D/lint-final.json"
npm run typecheck
npm run test -- --maxWorkers=2 --reporter=json --outputFile=output/playwright/opus-ui-2026-11-22/stage-4-integrated/vitest-1.json
npm run build -w @408os/web -- --outDir="$D/build-local-1"
npm run build -w @408os/web -- --mode=server --outDir="$D/build-server-1"
npm run preview -w @408os/web -- --host 127.0.0.1 --port 4351 --strictPort --outDir "$D/build-local-1"
node --import tsx tools/verification/ui-integrated-browser.mjs serve fixture-1
node --import tsx tools/verification/ui-integrated-browser.mjs priority priority-1
node --import tsx tools/verification/ui-integrated-e2e.mjs local e2e-1 chromium-1440 chromium-1366 chromium-390
node --import tsx tools/verification/ui-integrated-e2e.mjs server e2e-1 server-desktop server-mobile
node --import tsx tools/verification/ui-integrated-register.mjs register-2
node --import tsx tools/verification/ui-integrated-shell.mjs shell-1
node --import tsx tools/verification/ui-integrated-report.mjs delivery
```

矩阵命令为 `node --import tsx tools/verification/ui-integrated-matrix.mjs matrix-1-{主题}-{宽度} {主题} {宽度}`，每个组合实际执行；补采为同一入口、标签 `matrix-tail-{主题}-{宽度}`、最后追加 `tail`。首轮四批各完成 23/28 后中断：从 `/settings` 退出再登录会正确留在设置页，旧采集助手误等首页。仅改工具的就绪条件，四批各补剩余 5 张；没有补采覆盖或剔除那四条真实低对比度记录。`register-1` 保留两处工具问题：跨科 URL 先于详情提交，首次读取抓到旧标题；遍历随展开而缩短的折叠按钮选择器时失去最后一个索引。`register-2` 等到所点概念的标题并按稳定行定位，完整通过。两项均未改产品。五批 E2E 均自然结束、未中断。`services-closed.json` 已核对 4349、4351 均无监听，未触碰其他成员端口。

下一步：摩卡调整错题数徽标的前景或底色。用新构建、已有错题条件重新测两个视口的昼夜配色；新证据与本轮失败分开保存。
