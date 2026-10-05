# BitAtlas 代码复审与完成情况

审查日期：2026-10-04（Asia/Shanghai）。基线：`main` / HEAD `564d046`。审查当前本地源码、上次修复、内容管线、学习数据路径和生产构建；未验证当前线上部署。产品源码与真实题包均未修改。

后续状态：用户随后授权修复，本报告保留修复前的审查事实。R1–R5 的实现、验证及仍存在的默认 E2E 超时见 [修复记录](review-fixes-2026-10-04.md)。

2026-10-05 清理说明：本次旧 `dist` / `dist-next` 已按授权删除，复现脚本、原始日志、trace、报告和截图保留；重新运行双构建脚本前需重建对应产物。最新推送状态见 [发布检查](RELEASE.md)。

## 结论

**比上次更完善，个人学习 Beta 的功能主干已经较齐，但可靠性和正式内容仍未完成。信心：高。**

本轮确认 **5 项可复现缺陷：2 项 P1、2 项 P2、1 项 P3**。其中题面版本和已审核题包保护，是上次修复留下的边界缺口；另外发现 PWA 跨版本更新、跨日计划和跨年份统计问题。

静态检查、1102 项单元测试、内容与构建检查均通过。默认 8 workers 浏览器集合为 **193/204**，11 项失败；对这 11 项仅做一次单 worker 复查，结果 **11/11**。这不能改写为全量通过，也不足以确定超时根因。

## 发现

### R1 · P1：新 Service Worker 接管后，旧页面加载动态模块失败

- 位置：[vite.config.ts:52](D:/CodexProject/personal-projects/408OS/apps/web/vite.config.ts:52)，关联 [main.tsx:8](D:/CodexProject/personal-projects/408OS/apps/web/src/main.tsx:8) 的懒加载路由。
- 原因：`registerType: 'autoUpdate'` 让新 worker 跳过等待并配合 `clientsClaim` 接管旧页面；应用没有导入配套的页面注册/更新逻辑。实际生成的 `registerSW.js` 只有 `navigator.serviceWorker.register(...)`，没有处理页面切换。新 worker 清理旧预缓存后，旧页面仍引用旧 hash 的模块文件。
- 触发条件：旧标签页保持打开，新部署的 worker 激活，旧 chunk 已不再由服务器或 HTTP 缓存提供；随后进入尚未加载的路由。
- 真实 Chrome 复现：保留当前生产构建的总览页，切换到第二份生产构建并触发正常的 registration update。第二份仅通过审查专用 Vite transform 修改真题页标题，产品源码没有变化。新 controller 已 activated，页面标记仍为 `original-page`、入口仍为 `index-DzjJG-YR.js`，但缓存只保留新 `QuestionsPage-Y1vU8QaK.js`。点击“真题”请求旧 `QuestionsPage-wLRzdiDc.js` 得到 404，整页显示 `Unexpected Application Error! / Failed to fetch dynamically imported module`。刷新后加载新入口 `index-DJc-6MX9.js`，页面恢复。
- 影响：正常发布更新可使仍打开的页面在导航时失效。单版本离线刷新通过不能覆盖这个路径。
- 建议：接入与自动更新配套的页面生命周期，明确草稿保存与切换新版的时机，并为动态导入失败提供恢复入口；增加“旧页面保持打开 → 新构建激活 → 跳转懒加载页面”的真实 SW 回归。
- 信心：高。本地双构建服务器使用 `no-store` 排除旧 HTTP 缓存的掩盖；未声称线上已经发生相同故障。
- 证据：[更新前](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-pwa-initial.log)、[worker 接管后](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-pwa-updated.log)、[错误页](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-pwa-failure.log)、[404 与控制台](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-pwa-console.log)、[刷新恢复](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-pwa-recovered.log)、[截图](D:/CodexProject/personal-projects/408OS/output/playwright/review-2026-10-04-pwa-update-failure.png)。

### R2 · P1：题面版本门禁允许倒退，默认参数会重新使用旧版本

- 位置：[build-year.mjs:577](D:/CodexProject/personal-projects/408OS/tools/content-importer/src/build-year.mjs:577)，默认版本位于 [build-year.mjs:597](D:/CodexProject/personal-projects/408OS/tools/content-importer/src/build-year.mjs:597)。
- 原因：`assertSemanticContentVersioned()` 只在两个版本字符串相等时比较题面，任何不同版本都直接放行；省略 `--content-version` 时又固定退回 `<year>.0-draft.2`。
- 复现：用真实 2010 题包构造修订 fixture，将 Q1 题面修改并升级为 `draft.3`；再按默认值生成 `draft.2` 的候选包。实际门禁接受 `draft.3 → draft.2`；原始题面下的 `draft.2` Attempt 经实际 `projectCurrentQuestionProgress()` 又被计入新题面。对照组中，相同版本直接改题面被正确拒绝，旧 Attempt 在 `draft.3` 下也被正确隔离。
- 影响：维护者完成第一次显式升级后，下一次常规重建忘带参数，就可能重新混合旧作答、旧会话与新题面。上次增加的门禁尚不能持续保护版本隔离。
- 建议：默认沿用已发布版本或要求显式选择版本；升级时按数值版本规则验证单调递增，禁止重新使用已发布旧版本。补 `draft.2 → draft.3 → 省略参数重建` 的回归。已混合的历史记录仍需保守保留，不能猜测迁移。
- 信心：高。探针调用的是实际门禁和统计函数；本轮没有执行会写入产品题包的重建命令。
- 证据：[探针](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/probes.ts)、[结果中的 versionRollback](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/probe-results.json)。

### R3 · P2：后台下载期间导入的 Verified 题包仍会被草稿覆盖

- 位置：[storage.ts:424](D:/CodexProject/personal-projects/408OS/apps/web/src/app/storage.ts:424)；过早读取的 manifest 快照在 [storage.ts:381](D:/CodexProject/personal-projects/408OS/apps/web/src/app/storage.ts:381)。
- 原因：`installExtraContent()` 在下载 16 个年份之前只读一次 `listPacks()`，安装时继续用旧快照判断防降级。内容 repository 的替换事务没有再次检查当前审核状态。扩展安装在首屏可用后后台进行，用户此时可以进入数据页导入正式包。
- 复现：在独立 fake IndexedDB 中启动扩展年份安装并暂缓 2010 下载；通过真正的 `installVerifiedContentPack()` 完成 verified fixture 的整包、资产摘要校验与安装；再释放先前的草稿响应。结果从 `verified` 变成 `needs-review`，`issues=[]`。对照组中，调用后台安装前就已存在的 verified 包得到正确保护。
- 影响：用户刚导入的已审核版本可能被静默替换；非并发重启测试无法发现该交错。
- 建议：把“读取当前 manifest、检查保护策略、替换内容”放在同一内容库事务中，覆盖后台安装与手动导入、跨标签页安装的交错回归。
- 信心：高。verified 只存在于隔离测试的内存克隆中，没有将仓库真实内容标为已审核。
- 证据：[结果中的 verifiedAlreadyInstalled / verifiedConcurrentImport](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/probe-results.json)。

### R4 · P2：总览停留过夜后，“今日计划”仍使用昨天的数据

- 位置：[DashboardPage.tsx:32](D:/CodexProject/personal-projects/408OS/apps/web/src/pages/DashboardPage.tsx:32)。
- 原因：每日计划的 `useMemo` 内部读取 `new Date()`，依赖却只有 `attempts` 和 `questions`；没有日期状态、跨日定时更新或恢复可见时的日期检查。
- 真实 Chrome 复现：页面加载完成后，把隔离浏览器时钟设为北京时间 `10-04 23:59:40`，使用 Playwright Clock 快进 90 秒。实际时间已为 `2026-10-05 00:01:10`，页面仍显示 `DAILY REVIEW / 2026-10-04`。刷新后才变为 `2026-10-05`。
- 影响：PWA 或浏览器标签页过夜恢复时，到期队列和完成状态仍按昨天显示；若昨天已全部完成，按钮也可能继续显示“今日已完成”，直到重新挂载或学习数据变化。
- 建议：以北京时间日期键作为显式依赖，在跨午夜和页面恢复可见时更新；保持同一天队列稳定的既有合同。
- 信心：高。只修改了隔离浏览器时钟，没有修改系统时间。
- 证据：[跨日与刷新对照](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-day-rollover.log)。

### R5 · P3：2009 年卡片显示了所有年份的已掌握数

- 位置：[DashboardPage.tsx:26](D:/CodexProject/personal-projects/408OS/apps/web/src/pages/DashboardPage.tsx:26)，使用位置为 [DashboardPage.tsx:135](D:/CodexProject/personal-projects/408OS/apps/web/src/pages/DashboardPage.tsx:135)。
- 原因：`mastered` 汇总所有年份的 `currentProgress`，却放在限定 2009 的试卷卡片中；同卡片题数、题型数量和进度条均按 2009 过滤。
- 真实 Chrome 复现：空学习记录中仅把 2025 Q1 手动标为“已掌握”。2025 列表正确显示已掌握，全局已练仍为 `0/799`；但 2009 卡片显示 `1 已掌握`，2009 实际没有掌握记录。
- 影响：年度进度具有误导性，长期使用后该值还可能超过该年总题数。
- 建议：按 `questions2009` 的题目 ID 计算卡片掌握数；全局掌握数如需显示，放在明确标为全局的指标中。
- 信心：高。
- 证据：[读取结果](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-year-count.log)、[截图](D:/CodexProject/personal-projects/408OS/output/playwright/review-2026-10-04-year-count.png)。

## 上次五项问题的复查

| 上次发现 | 本轮结果 |
| --- | --- |
| F1 题面变化沿用版本 | 同版本变更已被门禁拒绝；仍存在 R2 的版本倒退缺口 |
| F2 扩展年份 verified 降级 | 普通启动对照已通过；仍存在 R3 的下载期间导入竞态 |
| F3 手动掌握度与列表不一致 | 已通过：2025 手动标记、刷新、返回该年列表均保持；没有真实 Attempt 时已练数量仍为 0 |
| F4 HTTP 503 被当成缺包 | 已通过：2009 抛 HTTP 503 错误；16 个扩展年份分别保留故障诊断 |
| F5 练习标题固定 2009 | 已通过：桌面/手机均显示 2025；现有非 2009 回归在三个 E2E 项目中通过 |

## 验证结果

| 检查 | 本轮实测 |
| --- | --- |
| `npm run lint` | 通过 |
| `npm run typecheck` | 全部 workspace 通过 |
| `npx --no-install vitest run --maxWorkers=4` | 97 files / 1102 tests passed |
| `npm run test:release` | 10/10 passed |
| `npm run test:year -w @408os/content-importer` | 31/31 passed |
| `npm run content:validate` | 17/17；799 题、367 资产记录；verified 0 |
| 当前 production build | 通过；198 static-copy，88 PWA entries / 2800.73 KiB |
| 完整 E2E：8 workers、1440/1366/390 | **193 passed / 11 failed / 0 skipped**，395.1 秒 |
| 仅失败集合定向复查：1 worker | **11/11 passed**，约 1.1 分钟；没有第三轮复跑 |
| 隔离门禁/安装/投影探针 | 全部执行完成，结果与对照见 probe-results.json |
| 真实 Chrome 日常流程 | 2025 筛选、手动掌握度、作答判分、390px 断网 reload 恢复通过；SW activated，页面宽度/滚动宽度均为 390 |
| 真实 Chrome 边界流程 | R1、R4、R5 复现；R1 手动刷新恢复对照通过 |

完整 E2E 使用 [审查配置](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/playwright.review.config.ts) 继承原始测试集合、8 workers、视口、超时与 SW 设置，只改为独立构建的 preview 和本轮结果目录。部分 PDF 用例自行允许 SW；其余沿用默认 block，因此另做了真实 SW 更新和离线验证。

11 项失败分布如下：

| 用例 | 失败视口 |
| --- | --- |
| Q3 二叉树遍历 | 1440 |
| Q5 完全二叉树 | 1440 |
| 内容复核双标签页 | 1440、1366、390 |
| Q37 CSMA/CD | 1440 |
| 模考双标签页 | 1440、1366、390 |
| 普通练习双标签页 | 1440、1366 |

失败包含 30 秒总超时、15 秒模考恢复标题等待、5 秒作答/冲突状态等待，以及截图等待。单 worker 通过不能证明是机器负载、应用主线程阻塞或测试设计中的哪一个原因。上一轮审查使用 4 workers，本轮使用默认 8 workers，不能直接把两个通过率的差异归因于代码回归。

原始证据：[全量摘要与错误位置](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/e2e-summary.json)、[全量 HTML](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/e2e-report/index.html)、[定向日志](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/e2e-recheck.log)、[手机离线结果](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/ui-offline-mobile.log)。断网时的 17 条网络错误均为主动更新题包请求，页面从本地数据库恢复成功。

## 仍值得改进的地方

1. **先保护发布更新与学习证据。** 优先处理 R1/R2，再把 R3 的保护做到事务内。新增回归应覆盖跨版本升级和异步交错，不能只验证一次安装或一个版本的正常路径。
2. **稳定默认浏览器门禁。** 对保留的失败 trace 做有界性能诊断，关注首屏恢复、双标签页与截图耗时。当前还不能把发布标准写成“全量 E2E 已绿”，也不应仅增大超时或降低并发来替代原因分析。
3. **推进内容审核。** 本轮重新计算仍为 2009–2025 共 17 年、799 题，全部 `needs-review`；2024/2025 共 80 道选择题缺文字解析，791 道题的第二提示使用通用模板。导入覆盖已齐，正式正确性尚未形成审核成果。先完成 2009 的逐题审核可打通正式模考，之后按年份推进。
4. **同步产品范围与文档。** [README.md:52](D:/CodexProject/personal-projects/408OS/README.md:52) 仍写 2010 及之后未导入；[ARCHITECTURE.md:25](D:/CodexProject/personal-projects/408OS/docs/ARCHITECTURE.md:25) 仍写干净克隆没有 2009；导入器文档也应补上新增版本参数及修订流程。多年份练习已实现，知识图/人工复核/正式模考仍主要限定 2009，应明确这一范围。

没有完整的终版需求验收清单，因此不把“完成度”编成一个精确百分比。当前更适合描述为：**个人学习功能主干较完整；发布更新、并发保护与日历状态尚有缺陷；正式内容审核未完成。**

## 复现与工作区边界

- 在项目根运行 `npx --no-install tsx output/code-review-2026-10-04/probes.ts` 可复现 R2/R3 并验证 F2/F3/F4 的对照路径；使用 fake IndexedDB，不读取个人浏览器数据库。
- 当前构建命令：`npm run build -w @408os/web -- --outDir ../../output/code-review-2026-10-04/dist --emptyOutDir false`。
- PWA 第二份构建配置：[vite.next.config.ts](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/vite.next.config.ts)。在 `apps/web` 中运行 `npx --no-install vite build --config ../../output/code-review-2026-10-04/vite.next.config.ts --outDir ../../output/code-review-2026-10-04/dist-next --emptyOutDir false`，再从项目根运行 [pwa-update-server.mjs](D:/CodexProject/personal-projects/408OS/output/code-review-2026-10-04/pwa-update-server.mjs)。先打开 localhost:4197 总览并等 SW activated，再 POST `/__review/use-next`、调用当前 registration 的 `update()`，待 controller 更换后点击“真题”。切换仅更改服务进程内的目录选择，不删除文件。
- 浏览器使用 Playwright CLI 0.1.22 的已缓存安装；桌面与手机截图均已实际目检。PWA 动作/网络 trace 保存在本轮 `.playwright-cli/traces/`。
- 本轮只新增审查报告、隔离验证产物并更新 HANDOFF/notes；未修改产品源码、数据库 schema、真实题包、CI 或部署。原有未跟踪 `.workbuddy/` 保持不动；未提交、推送或主动清理项目文件。审查用两个 Chrome 会话及 localhost 4196/4197 服务已关闭。
