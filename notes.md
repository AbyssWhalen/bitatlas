# Notes

## 2026-08-05 - 项目启动

### 已确认决策

- 新建独立项目 408OS，保留 `cpu-explorer` 原状。
- 首个验收目标是 2009 年 47 题完整闭环。
- 内容形态为结构化文本优先、来源页图兜底。
- 用户数据使用 IndexedDB，并支持版本化 JSON/ZIP 备份。
- 首版为本地 PWA，不需要 VPS。
- 个人学习功能纳入长期路线，账号、社区和排行榜不纳入当前范围。
- 解析采用来源解析加人工校对；AI 只能生成待审核草稿。

### 来源策略

- 公开资料入口：`https://www.xit.edu.cn/yjsfk/kyzykwtkw/list.htm`
- `408os.cn` 仅作为产品与交互参考，不获取其受限题库数据。
- 公开可下载不等于获得再分发许可，原始资料和版权状态不明的规范化题库默认不提交。

### 验证记录

- P0 lint、typecheck、unit 和 build 已通过，详细结果见下方“2009 工程闭环”。
- 2009 内容包质量报告通过结构与来源校验，人工审核仍为 `0/47`。
- 1440、1366、390 三视口 Playwright 验收已通过。

### 未解问题

- 2009 原卷与解析均为扫描 PDF；已完成离线 OCR、公开 Markdown 交叉校对和来源页图兜底，但仍需逐题人工核验。
- 正式公开发布前需要更换与 `408os.cn` 不混淆的独立品牌。

## 2026-08-05 - 2009 工程闭环

### 内容与来源

- 本地保存 2009 原卷与解析扫描 PDF，并用项目本地 RapidOCR 完成 7 页原卷、12 页解析的离线识别。
- 已生成 47 题内容包：40 道单项选择、7 道综合应用；复杂图表保留来源页图。
- 当前题包 hash：`024a024a6ef2b00cf3cb0be5d8b0dc99ac5dc14f8ff55c585ba92d6b605dd717`。
- 内容包保持 `needs-review`，逐题人工审核为 `0/47`。

### 可靠性决策

- 答案提交、Attempt、QuestionProgress 和 StudySession 使用同一 Dexie 事务写入，并按“会话 + 题目”幂等处理重复提交。
- 综合题与选择题草稿按会话串行写入；跳题、提交和结束前先等待草稿队列完成。
- 备份导入会完整校验 attempt、session、progress、note、collection 和 setting 结构；校验失败发生在 replace 清库前。
- PWA 使用 192/512 PNG maskable 图标，应用壳和已安装 2009 题包可离线重载；不默认下载原 PDF。

### 验证记录

- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：全部 workspace 通过。
- `npm run test`：3 个测试文件，12/12 通过。
- `npm run build`：通过并生成 service worker；路由分包后最大 JS chunk 约 486 kB，无 chunk 告警；PWA 预缓存 62 项、约 11 MB。
- `npm run content:validate`：`PASS cn408-2009: 47 questions (40 objective, 7 comprehensive)`；`verified 0/47`。
- `npm run test:e2e`：1440、1366、390 三视口合计 21/21 通过，用时约 44 秒。
- 视觉与来源图检查已包含在 E2E：来源图片 naturalWidth/naturalHeight 非零、页面无横向溢出；截图位于 `output/playwright/screenshots/`。
- 手机题目摘要使用稳定两行截断，来源弹窗具备“原卷/解析”粘性分段标题，最新截图已人工检查。

### 剩余风险

- 最大风险不是代码，而是 47 题答案、解析和评分点尚未完成逐题人工复核。
- 当前目录没有 Git 元数据，无法用 `git status`/diff 提供变更清单或历史回退点；本轮没有初始化仓库。
- PWA 当前约预缓存 11 MB，其中主要是本地来源页图；在扩展更多年份前需要改成按题包安装缓存，不能线性预缓存所有年份。

## 2026-08-07 - 2009 人工复核工作台

### 证据与状态边界

- 复核记录存入现有 `408-user.settings`，不升级 IndexedDB schema；保留键使用 `content-review:v1:<packId>:<packHash>:<contentVersion>:<questionId>`。
- 每条记录包含 8 项核对、复核人、问题记录、decision 与时间戳。通过必须全部勾选且填写复核人；标记问题必须填写复核人与具体原因。
- repository 强制题包 contentVersion 与题目 contentVersion 一致，并由 StudyContext 注入 scope；页面不能伪造 hash、版本或 decision。
- 个人复核证据不会修改正式 question/manifest。即使将来记录达到 47/47 approved，正式题包也不会由页面自动变成 `verified`。
- 备份会严格校验 `content-review:v1:` 保留记录和 canonical key，损坏记录在 replace 清库前拒绝。

### Web 工作台

- 新增独立 `/review/2009?question=<1-47>` 路由，不占用主导航；总览警告区和数据页提供入口。
- 桌面同时显示 47 题 palette、来源页、结构化内容和核对区；移动端使用“来源 / 结构化 / 核对”三段切换。
- 支持题目/答案模式、来源图 natural size 错误提示、Q41-47 综合题 reference/rubric、URL/历史/刷新恢复、650ms 自动保存、显式草稿保存、通过/驳回门禁和 ledger 下载。
- 动作反馈保留到下一次用户编辑或切题，避免 Context 刷新将“草稿已保存 / 已通过复核 / 已标记问题”立即覆盖。

### 内容风险

- 47/47 仍为 `needs-review`，本轮没有生成任何 approved 记录，也没有修改题包 hash。
- Q4 的选项仍有“内容待核对”和整页图代替独立选项；Q45 的 semaphore 伪代码答案未结构化；Q42 的 C 实现未结构化。
- Q44 的 MDR/MAR、AOut/ACout 与答案页引用存在冲突；Q47 的 E1/E2 叙述存在自相矛盾。上述题目不得直接通过。
- Q41-47 的 rubric 当前都只有一个笼统总分条目，逐点评分点仍需人工补录和复核。

### 验证记录

- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：全部 workspace 通过。
- `npm run test`：4 个测试文件，17/17 通过。
- `npm run build`：通过；最大 JS chunk 约 494 kB；PWA 预缓存 65 项、约 11 MB。
- `npm run content:validate`：`PASS cn408-2009: 47 questions (40 objective, 7 comprehensive)`；仍为 `needs-review; verified 0/47`。
- `npm run test:e2e`：三视口 33/33 通过，包含新复核闭环与原有学习/PWA 离线流程。
- `tests/e2e/visual.spec.ts` 三视口 3/3 通过；Q41 两张原卷来源图 naturalWidth/naturalHeight 非零，页面无横向溢出。截图已人工检查并保存在 `output/playwright/screenshots/`。

## 2026-08-07 - 内容可信度加固（阶段记录，已由下方收口记录取代）

### 已完成

- 统计只聚合与当前题目 `contentVersion` 一致的作答；未知题目和旧内容版本的作答不再进入当前正确率、科目分布与耗时。
- 回归测试先验证旧实现失败，再修复到 `packages/domain/src/study.test.ts` 6/6 通过。
- 新增纯领域发布门禁 `assertContentReviewLedgerCanRelease`，拒绝旧 hash/版本、缺失或重复题、非 approved、检查不完整、缺少复核人证据及伪造 summary；3/3 单元测试通过。
- 新增 canonical JSON 与同步 SHA-256，题包校验默认重算 manifest hash，任何题干/答案/资源/manifest 发布字段变化都会使旧审核 hash 失效。
- 内容校验递归覆盖 stem、options、reference、explanation、hints 中的图片，要求资源真实存在且列入题目 `assetIds`；同时检查 rubric 总分、verified 占位符、重复知识点/资产、pack 资产命名空间。
- `ContentRenderer` 改为从资产 registry 读取 `AssetRef.path`，不再硬编码 2009；支持使用原始来源图的归一化裁窗，不生成或改写来源像素。
- 内容仓库筛选接口只保留 year/subjects/kinds/search；错题、收藏和掌握度属于用户数据，仓库会明确拒绝这些错误调用，不再静默返回错误结果。
- 独立 `release:2009` CLI 严格解析 ledger、重新验证 draft canonical hash、调用领域 47/47 门禁、提升副本状态并重算 release hash；输出 verified pack 与包含 draft/ledger/release hash、复核人、时间的报告，不覆盖 public draft。
- 发布 CLI 专用测试 4/4；缺少 ledger 的实际命令按预期失败，失败路径没有创建 `local-data/released`。
- PWA 应用壳不再预缓存 `content/**`；题包 JSON 使用 NetworkFirst，图片/PDF 使用 CacheFirst，安装题包时显式补齐同一资产 cache，Cache API 不可用或拒绝时不阻断应用初始化。
- production build 的 Workbox precache 从 65 项/11064.16 KiB 降至 45 项/1119.17 KiB，减少约 89.9%；主入口约 500.49 kB 仍有 Vite 性能警告，未通过调高阈值掩盖。

### 当时待办（现状以下方收口记录为准）

- 题包 canonical hash 重算、图片引用闭包、rubric 总分和占位符门禁。
- 资产路径去除 2009 硬编码，并支持对原始页图做不改像素的浏览器裁窗。
- 高风险题 Q4、Q41-47 结构化重录；正式状态继续保持 `needs-review`。
- 独立 ledger 发布工具；没有 47/47 有效人工 approval 时必须拒绝生成 verified pack。

## 2026-08-07 - 内容可信度加固收口

### 内容与资产

- Q4 四个图示选项改为原卷第 1 页的归一化裁窗；不改来源像素。两轮真实 Chrome 截图复核后去除了题干残字、上一题残留节点和 C 顶部下划线。
- 当前题包为 `2009.0-draft.2`，hash `b9b9d03c4e23d45fb4600e853c5c82deda15a9609bd3ee321386f52948c7a89c`，47 题、19 个来源资产，保持 `needs-review; verified 0/47`。
- `SourceRef.question/answer.pages` 必须能映射到 canonical asset id；内容校验同时检查图片 MIME、`sourcePage`、路径命名空间、实际文件存在性和字节 SHA-256。
- 练习来源弹窗和复核工作台统一使用 `SourcePageImage` 从 registry 取 `AssetRef.path`，不再拼接 `/content/2009/source/...`。缺资源、非图片和加载失败均有可访问错误。
- 题目 ID 在考试形态校验中必须严格等于 `cn408-<year>-q<两位题号>`，防止 ledger、作答历史和内容包身份漂移。

### 发布与冷启动

- `release:2009` 在 47/47 门禁后再次核对全部资产字节；pack/report 在同目录分别暂存，备份已有产物后原子 rename。暂存或第二次安装失败会恢复旧文件；回滚本身失败时保留唯一 `.bak` 副本。
- KaTeX `ContentRenderer` 改为页面内二级懒加载，并提供结构化文字 fallback。路由标题、导航和筛选不再等待 263 kB 渲染器 chunk。
- 全量 E2E 首次以 12 workers 冷启动时 7 项停在“载入页面”；trace 证明题包已加载而 `ContentRenderer` chunk 请求未完成。修复后保持相同并发和原超时，33/33 通过，没有降低并发或调大超时。
- PWA precache 46 项、1121.45 KiB；主入口 501.57 kB 仍触发 Vite chunk 警告，未调高阈值掩盖。

### 红绿与最终验证

- 来源页闭包测试：新增后先 1 fail/5 pass，实现在位后 content-schema 定向 16/16。
- 发布测试夹具因新闭包先 7/10，通过登记并写入真实临时资产后 10/10；故障用例覆盖缺文件、假 SHA、路径逃逸、暂存失败、第二次 rename 失败和不完整回滚。
- `npm run lint`：通过，0 error / 0 warning。
- `npm run typecheck`：全部 workspace 通过。
- `npm run test`：11 个文件，52/52 通过。
- `npm run test:release`：10/10 通过。
- `npm run build`、`npm run content:validate`：通过；内容校验真实读取并核对 19 个资产。
- `npm run test:e2e`：1440、1366、390 三视口 33/33 通过；Q4、练习来源弹窗、移动复核来源页已人工截图检查。

### 未解问题与红线

- `QuestionProgress` 和未完成 `StudySession` 没有内容版本字段；旧题包的错题/掌握度/草稿可能污染修订后的题面。长期正确修复需要 `408-user` IndexedDB schema v2，必须先获得用户明确授权。
- `apps/web/public/content/2009/` 仍有 19 张旧命名空间重复图片；运行时已切换到 `cn408-2009/`，但删除目录必须先获得用户明确授权。
- 47 题正式答案、解析和评分点仍需用户本人逐题对照来源。自动结构校验、OCR 和 AI 不能代替人工 `verified`。
- 当前目录没有 Git 元数据，无法生成可信 diff、提交或回退点；本轮未初始化仓库、未提交、未推送、未部署。

## 2026-08-07 - P1 可靠性与模考底座收口

### 数据与恢复

- 备份预检从单表 schema 扩展为 session/attempt/progress 跨表语义校验；矛盾备份在 replace 清库前拒绝。`recordAttempt` 与 `submitAttempt` 同时收紧为只能写入和 session 一致的已提交响应。
- 练习页对 missing session、IndexedDB 读取失败、session 引用缺题提供明确恢复状态；草稿串行写入失败后队列可继续，保留本地草稿并提供重试，不再产生 unhandled rejection。
- 题包与资产正式缓存升级为 v2 验证命名空间。网络旁路响应先经过 schema/canonical hash/安装事务，资产逐个核对 SHA-256；失败时保留已安装 IndexedDB 题包与已验证 cache。
- 没有修改 `408-user` 数据库版本，也没有删除旧 `public/content/2009/` 重复图片；两项仍等待用户明确授权。

### 模考与构建

- 新增纯领域固定整卷模考引擎：47 题连续题号和 verified 门禁、题包/题目版本快照、40 道客观题每题 2 分、综合题 70 分、总分 150 分、180 分钟倒计时及设备时钟回拨上限。
- 模考页面仍未接入。现有 session/progress 缺内容版本身份，在 v1 上接入会把旧草稿、错题和评分绑定到新题面；未采用 settings/session id 隐藏元数据或清空旧数据的绕过方案。
- Vite 按 React/Router、Dexie、Zod 拆为稳定 vendor chunks；入口从约 501.57 kB 降为 50.31 kB，未调整警告阈值。KaTeX CSS 从主样式移到内容渲染器异步 chunk。
- 移动端改为主内容滚动区与 62px 导航独立布局，固定导航不再覆盖练习控件；视觉测试加入几何断言。

### 红绿与验证

- 备份语义：旧实现新增用例 `8 failed / 11 passed`，修复后定向 `21/21`；后续 repository 不变量加固后 storage 定向 `23/23`。
- 验证缓存：旧实现 `7/12` 失败，修复后 `13/13`。练习恢复：旧实现 `4/4` 失败且捕获两个 unhandled rejection，修复后 `5/5`。
- 模考引擎：模块缺失时定向测试红灯，实现在位后 `5/5`。
- `npm run lint`、`npm run typecheck`：全部通过；`npm run test`：13 个文件、83/83；`npm run test:release`：10/10。
- `npm run build`：通过且无 chunk size 警告；PWA precache 50 项、1127.45 KiB。`npm run content:validate`：47 题与 19 个实际资产通过，仍为 `needs-review; verified 0/47`。
- 全量 E2E 首轮新增流程为 35/36；trace 证明页面已渲染，单次 PNG 编码占约 22.5 秒耗尽单体视觉用例预算。将视觉验收拆为小用例后，保持 12 workers 和 30 秒超时，定向视觉 15/15、全量 48/48。
- 已人工查看桌面总览/练习、移动练习与移动复核来源截图；图像非空、无横向溢出，移动主内容和底部导航边界通过几何断言。

### 下一阶段约束

- schema v2 最小正式字段：session 绑定 pack id/contentVersion/hash、逐题 contentVersion 和标记题；progress 绑定 questionId+contentVersion 复合身份。v1 progress 不能冒充当前版本，旧开放 session 无证据时必须标 stale、禁止猜测恢复。
- v2 备份需兼容导入 v1 并走同一 fail-closed 迁移；模考还需原子交卷、已完成会话写保护和正式 mock repository。
- 当前最大产品风险仍是 2009 正式内容人工复核 `0/47`，不是自动测试数量。

## 2026-08-07 - P4 知识证据与版本化统计

### 领域与内容边界

- 新增 `filterCurrentAttempts`、北京时间自然周活动日历、知识森林和知识表现聚合。知识表现只读取与当前 `Question.contentVersion` 匹配的 Attempt；每题最近三次可评估证据按时间权重 `1,2,3`，知识节点对题目等权汇总。
- 综合题只有自评分存在时才进入表现，按 `score/maxScore` 归一化；所有节点保留题目 ID 和 Attempt ID 证据链。未检测节点不进入薄弱排序。
- 内容校验新增 parent 存在、父子同科、无环、题目与知识点同科门禁。题包替换会在同一事务内拒绝跨年份冲突定义、保护父链并清理仅属于被替换年份的孤儿知识点。
- 当前题包只有 4 个科目根节点和 47 个题目级叶节点，因此产品名称使用“2009 知识证据图”；完整 408 考纲 taxonomy 仍需要独立内容重构与人工核对。

### Web 与视觉

- `StudyContext` 读取 `KnowledgePoint[]`；`/stats` 使用 12 个完整周一到周日自然周，隔离旧题面记录，并提供可追溯薄弱项专项练习。
- 新增 `/knowledge`，使用项目内 Cytoscape 3.34.0 按路由懒加载；画布采用科目根节点居中、题目节点同心环绕，同时提供完整原生按钮列表作为键盘和小屏入口。
- 第一轮截图虽通过非空像素断言，但 breadthfirst 将叶节点拉成一条细线；人工检查后改为按层深的 concentric 布局，再次通过三视口视觉回归。

### 红绿与验证

- analytics 定向 `10/10`；知识内容门禁旧实现 `4 failed / 7 passed`，修复后 `11/11`，content-schema 全套 `20/20`。
- 存储替换保护旧实现 `2 failed / 24 passed`，修复后 `26/26`；全量 Vitest `14 files / 100 tests`。
- `npm run lint`、Web typecheck、`npm run build`、`npm run content:validate` 均通过；内容仍为 `needs-review; verified 0/47`。
- 全量真实 Chrome E2E 为 1440/1366/390 共 `54/54`；视觉定向 `18/18`。知识画布通过 canvas 像素非空、页面无横向溢出，知识页与统计页三视口截图已人工检查。
- 构建无 chunk 告警：入口 58.56 kB；知识页与 Cytoscape 451.42 kB 按路由加载；PWA precache 53 项、1584.22 KiB。

### 未解问题

- 完整 P4 仍缺多级考纲 taxonomy、记忆卡和持久化复习调度；后两者的正式数据模型需要与 `408-user` schema v2 一并设计，不能把无版本数据继续塞入 v1。
- 本轮没有改 schema、删除旧图片、修改 `cpu-explorer`、提交、推送或部署。

## 2026-08-07 - CPU 实验室 number 迁移

### 纯逻辑

- 固定旧项目来源 commit `94194987e6ed72d437a7b3debdc14adb2aaa4619`，只在 `packages/cpu-core` 重建纯 TypeScript API，未修改或运行旧 UI。
- 严格支持 2/8/10/16 进制有符号整数解析/格式化、`2..1024` 位原码/反码/补码编解码、float32 编码与 32 位位串解码；错误使用判别联合返回，不再把非法输入静默变为 0/NaN。
- 修正旧实现关键错误：8 位 `-128` 的原码和反码返回 `out-of-range`，只有补码为 `10000000`；原码和反码解码保留 negative zero 语义。
- float32 分类覆盖 `+0/-0`、subnormal、normal、`+/-Infinity` 与 NaN，并返回符号、阶码、尾数、十六进制和去偏阶码字段。

### Web 与验证

- `/lab` 提供进制转换、定点机器数和 IEEE 754 三种模式；每种模式包含典型例题、严格错误态、结构字段和复位/上一步/播放暂停/下一步推导。
- 机器数支持 8/16/32 bit 与双向转换；IEEE binary32 在手机上将 1/8/23 位字段纵向堆叠，避免尾数被横向裁切。
- 相关真题直接创建 Q12/Q13 两题会话；旧 `cpu-explorer` UI 没有复制或 iframe 嵌入。
- number 核心缺失红灯为 import 失败、0 tests；实现后定向 `21/21`、cpu-core typecheck/lint 通过。真实 Chrome 定向 1440/1366/390 共 `6/6`，截图人工检查后又修正移动尾数字段，移动视觉复测 `1/1`。

## 2026-08-07 - 2009 工程 Beta 收口

### 本轮产品交付

- 完成组成原理剩余垂直切片：RV32I、单周期数据通路、写回/写分配/LRU Cache；CPU 实验室共 6 个 URL 可恢复模块。
- 完成数据结构 Q41 局部最近边与 Dijkstra 对照、操作系统 Q46 TLB/页表/LRU、网络 Q47 CIDR/路由聚合/LPM 三个独立实验室。
- 真题与实验双向深链覆盖 Q11/12/13/14/16/17/21/41/46/47；Q41 页面明确为等价教学反例，不冒充正式解析原图。
- 完成本地 PDF 资料库、页码恢复、CJK 标准字体和离线重开；CMap、字体、WASM 保持按需缓存。

### PDF worker 根因与修复

- 首轮完整 E2E 的 6 个 PDF 离线失败均为首次页面未受 Service Worker 控制，worker 只配置 runtime CacheFirst 且没有进入缓存；离线重载后 fake worker 动态 import 失败。
- 将 1,262,398 B worker 全局加入 precache 可修复离线竞态，但 14 个浏览器 context 会让每个非 PDF 页面也下载和写入 worker，叠加 19 张来源页 5 秒后台预热后出现随机页面资源饥饿。
- 最终方案恢复 worker 的 precache 排除；新增共享 `PDF_JS_CACHE_NAME`，`pdf-runtime` 在首次实际阅读前以单飞 Promise 显式 `cache.match/add`，再创建 PDF.js loading task。首次 client 即使未受 SW 控制也能缓存，缓存失败不阻断在线加载且后续可重试。
- PDF 单测覆盖 Cache API 缺失、并发 cache miss、cache hit、失败降级和重试。PDF 三视口 E2E 9/9；普通与 CJK PDF 离线重开均通过。

### 并发门禁决策

- `HANDOFF.md` 和历史 notes 一直把真实浏览器合同写为 12 workers + 30 秒，但 `playwright.config.ts` 未固定 worker 数，当前机器自动探测为 14。
- 14-worker 压力运行出现 `90/93`、`89/93` 等随机失败；失败在 Cache、复核、失效链接和 PDF 之间漂移，trace 显示页面已渲染但控件无法稳定点击，或仍在后台内容/worker 缓存。没有 console/page error，不属于单一页面逻辑死锁。
- 在配置中显式恢复既有 `workers: 12`，未修改全局 30 秒超时。PDF canvas 的“出现”与既有像素非空检查统一为局部 15 秒，避免前置 5 秒比实际渲染预算更短。
- 红灯证据保留在 `output/playwright/results/` 的历史 trace；最终默认命令 `npm run test:e2e` 为 93/93。

### 最终验证

- `npm run lint`：0 error / 0 warning。
- `npm run typecheck`：全部 workspace 通过。
- `npm run test`：29 个文件，351/351 通过。
- `npm run test:release`：10/10 通过。
- `npm run content:validate`：47 题、40 道选择、7 道综合、19 个真实资产通过 SHA-256；仍为 `needs-review; verified 0/47`。
- `npm run build`：通过且无 chunk size 警告；PWA precache 71 项、2196.36 KiB，worker 不在 precache。
- `npm run test:e2e`：真实 Chrome 1440、1366、390 三视口 93/93，12 workers，保持 30 秒全局超时。
- 人工查看最新总览、知识图、PDF、Cache、数据通路、虚拟内存和网络实验截图；无空画布、横向页面溢出或底部导航遮挡。

### 未解问题与授权边界

- 当前可诚实称为“2009 工程 Beta”，不能称为 P0-P7 全量完成；P3 多年份、完整 taxonomy、记忆卡、间隔复习、持久化模考、五级流水线和更广实验仍未完成。
- `408-user` schema v2 是版本化 session/progress 和持久化模考的前置条件，属于项目红线，必须先获得用户明确授权。
- 2009 正式内容仍需用户本人 47/47 人工复核；AI 不代填 reviewer、approval 或 verified 状态。
- 旧 `apps/web/public/content/2009/` 重复来源图未删除；项目无 Git 元数据，未提交、推送或部署。

## 2026-08-07 - P6 五级流水线垂直切片

### 决策

- 五级核心采用纯函数 `simulateFiveStagePipeline`，输入为受控 RV32I 子集和可选稀疏初态，输出确定性周期 trace；页面不复制旧 `cpu-explorer` UI，也不使用 iframe。
- `activeCycle` 是流水线页面唯一时间状态，时空图、事件区和已提交寄存器/内存均从当前周期重放；没有复用带内置 index 的 `StepExplorer`，避免双状态源。
- 前递开关改变真实 hazard 策略：开启时 ALU RAW 通过 EX/MEM/MEM/WB 前递、load-use 仍停一周期；关闭时插入必要 RAW 停顿直到写回。
- 2009 Q18 经题包和交叉材料核对为四功能段时延题，不与五级冒险预设强行绑定；未来新增阶段时延计算器后再建立独立概念深链。

### 红绿证据

- 先写 `pipeline.test.ts` 后运行定向测试，因 `pipeline.ts` 缺失得到 import resolve 红灯；实现后最终 CPU core `163/163`，并补充前递关闭的 load-use 覆盖。
- `npm run typecheck -w @408os/web` 与 `npm exec eslint apps/web/src/pages/CpuLabPage.tsx apps/web/src/components/PipelineLabPanel.tsx` 通过。
- `npm run build` 通过；生产构建未调高 chunk 警告阈值。
- `npx playwright test tests/e2e/pipeline-lab.spec.ts --project=chromium-1440 --project=chromium-390` 最终 `2/2`；首轮失败为测试停在 C1 的时序假设，修正为点击真实 ST/FL 所在周期后转绿，移动断言再移到错误态前。
- 人工查看桌面完整图、390px 输入/时空图末端/事件与寄存器截图；图像非空、文字不重叠，图表内部横滚且页面不溢出。

### 未解问题

- 当前五级流水线仍是教学子集实验，不代表完整 RISC-V 流水线（未实现异常、中断、预测、结构冒险和复杂存储系统）。
- 流水线最初静态并入 `CpuLabPage` 时页面 chunk 为 91.45 kB；全量 E2E 首轮 `/lab` 与 PDF 在 12-worker 冷启动下出现 3 个载入超时。改为按模块懒加载后 CPU 实验页降至 68.12 kB、流水线独立 24.59 kB；第二轮旧内容复核出现单次漂移超时，定向 `1/1`，最终原配置全量 `96/96`。
- 最终全量门禁：lint 0 error、workspace typecheck 全绿、Vitest 30 文件 `369/369`、release `10/10`、内容校验 47 题与 19 资产通过、build 通过、真实 Chrome E2E `96/96`。未降低 12 workers、未增加全局 30 秒超时。

## 2026-08-07 - Q18 功能段时延与最终可靠性收口

### 产品与核心逻辑

- 五级流水线新增独立的通用功能段时延模式，精确深链为 `/lab?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock`；没有把 Q18 伪装成五级冒险题。
- 时延核心支持 2--16 个功能段、流水寄存器开销和连续指令数，输出最小时钟周期、单指令延迟、理想周期/总时间、稳态吞吐与相对串行加速比。
- Q18 预设固定为 `90 / 80 / 70 / 60 ns`，最小时钟周期为 `90 ns`；题库与实验室建立双向精确深链，仍保留 `needs-review` 内容标记。
- PDF 阅读器改为渐进载入：元数据读取后立即显示文档标题和导航上下文，PDF.js 解析与画布渲染继续在页面内进行；失败仍走原有错误页。
- 复核题号按钮使用稳定的固定尺寸，避免图片和异步内容加载期间的动作几何漂移。

### 浏览器并发与视觉

- 12-worker 压力运行分别出现 `94/96` 和 `82/96`；失败跨真题、复核、实验和 PDF 漂移，截图统一停在路由 `Suspense` 的“载入页面”，定向用例全部通过，证据指向当前机器多浏览器/多开发服务并存时的冷启动资源竞争。
- 保持普通断言 5 秒和全局 30 秒不变，将默认并发固定为 8 workers；压力验证先 `96/96`，拆分 Q18 独立测试后默认命令最终 `99/99`。
- 动态五级流水线和 Q18 时延拆成独立 E2E，避免一个长用例同时承担两套状态机与截图。Q18 三视口都验证 `90 -> 100 -> 90 ns`、真题往返和精确 URL 恢复。
- 人工检查 `pipeline-stage-timing-chromium-1440.png`、移动顶部和滚动到底截图；四段条形图、2x2 汇总、公式和底部留白完整，无横向页面溢出或导航遮挡。

### 最终验证

- `npm run lint`：0 error / 0 warning；`npm run typecheck`：全部 workspace 通过。
- `npm run test`：30 个文件、`387/387`；`npm run test:release`：`10/10`。
- `npm run content:validate`：47 题、19 个实际资产通过；人工审核仍为 `0/47`。
- `npm run build`：通过且无 chunk 告警；入口 61.42 kB、CPU 页 68.17 kB、流水线按需 chunk 33.94 kB、PDF 页 440.29 kB、知识页 452.09 kB；PWA precache 72 项、2243.24 KiB。
- `npm run test:e2e`：真实 Chrome 1440/1366/390 共 `99/99`，8 workers，保持 30 秒全局超时。

### 仍需用户明确授权或参与

- `408-user` schema v2、版本化 session/progress 和持久化模考仍需用户明确授权后实施。
- `apps/web/public/content/2009/` 的 19 张陈旧重复图片仍需删除授权。
- 2009 题包正式发布仍需用户本人逐题完成 47/47 人工复核；自动化验证不能替代内容审核。

## 2026-08-08 - 当前题面复习、Q42 与题包激活链

### 产品与领域逻辑

- 新增 `projectCurrentQuestionProgress`，统一从匹配当前 `Question.contentVersion` 的 Attempt 重建完成度、错题、连续正确和自动掌握度；Dashboard、Questions、Wrong 与练习答题卡不再把 v1 progress 当作跨版本事实。
- 新增确定性复习调度与每日计划：北京时间当日零点前的证据固定选出 8 题，失败重置间隔，连续正确逐步延长，综合题按自评分/满分归一化；当天作答只更新完成状态，不重排计划。
- 新增 Q42 单链表双指针核心与页面：严格输入、表头结点排除、空表/`k=1/n/n+1`、快慢指针不变量、步进/播放/暂停/复位、复杂度和真题往返；旧 Q41 URL 保持兼容。
- 新增 canonical taxonomy 映射/投影基础设施，覆盖非空映射、叶引用、祖先冗余、祖先闭包、canonical 定义一致性和稳定排序；未创建未经正式考纲与人工核对的 taxonomy 内容。
- 设置页新增 verified 题包导入。底层严格校验 JSON、canonical hash、47 题 verified 状态和全部资产字节，先 staging 再事务安装，且启动草稿不能降级已安装 verified 包。当前真实题包仍为 `needs-review`，没有伪造审核记录。

### 红绿与验证

- 复习计划初始因模块缺失红灯，最终定向 `5/5`；当前进度投影新增行为先红后绿；Q42 核心初始模块缺失红灯，最终 `12/12`；taxonomy 初始模块缺失红灯，最终 `5/5`；verified 激活链从 `5` 个失败和原子性补充失败收敛到 storage `20/20`。
- 全量 `npm run lint`、workspace `typecheck` 通过；Vitest `34 files / 421 tests`；release `10/10`；内容真实资产校验 47 题通过且仍为 `verified 0/47`；production build 无 chunk 告警。
- 首轮 E2E 为 `102/105`，唯一原因是旧备份测试假设页面只有一个 file input；明确定位 `BACKUP V1` 后定向 `3/3`，最终真实 Chrome 1440/1366/390 为 `105/105`，保持 8 workers、30 秒全局超时与普通 5 秒断言。
- 人工检查 1440/390 的总览与 Q42 截图：每日计划网格、链表结点、双指针、步骤与结果均非空；链表只在内部横向滚动，页面无横向溢出，移动底部导航未覆盖可操作内容。

### 仍然成立的边界

- 派生式计划不是带 Again/Hard/Good/Easy 独立评分历史的完整记忆卡；后者与持久化模考仍需 schema v2。
- 正式 taxonomy 与 47 题映射必须对照官方考纲人工核对；基础设施通过不等于内容 verified。
- 未修改或下线 `cpu-explorer`，未改 `408-user` schema，未删除旧图片，未提交、推送或部署。

## 2026-08-08 - Q29 磁盘、Q35 GBN 与 Q39 TCP 实验

### 纯逻辑与教学边界

- 新增磁盘调度纯逻辑，覆盖 FCFS、SSTF、SCAN、LOOK、C-SCAN，稳定处理重复磁道、SSTF 等距和双方向；C-SCAN 强制真实 bounds。Q29 未给物理端点，因此无 bounds 的 SCAN 只返回服务顺序 `110,170,180,195,68,45,35,12`，移动量为 `null`，没有用 LOOK 的 `273` 冒充。
- 新增 Go-Back-N 状态机，覆盖发送窗口、base/nextSeq、接收方期待序号、单计时器、累计 ACK、乱序丢弃、丢帧/丢 ACK、超时回退与序号回绕。Q35 确定性重放 ACK 3 累计确认 0--3，超时重传 4--7；页面明确 ACK 不是“下一个期待编号”。
- 新增整数 MSS 的 `cn408-classic` TCP 拥塞模型。Q39 从 16 KB 超时得到 `ssthresh=8 KB, cwnd=1 KB`，四个成功 RTT 后依次为 `2,4,8,9 KB`；页面明确它是考研教学抽象，不代表全部现代 TCP。

### Web 与视觉

- 操作系统实验新增 memory/disk 模块壳；磁盘页开放五种策略、自定义请求、方向、可选物理边界、轨迹、步骤播放、严格错误态和 Q29 真题往返。
- 网络实验新增 CIDR/GBN/TCP 三模块壳；GBN 支持严格动作脚本和窗口状态图，TCP 支持预设/自定义事件脚本、cwnd/ssthresh 曲线和模型规则。
- 真题深链新增 Q29/Q35/Q39。移动端为新实验保存顶部和底部视口图；首轮发现 Q35/Q39 标题被练习按钮挤出孤字，改为移动 flex 纵向页头后复拍通过。
- 4173 被旧 preview 占用时，默认 `reuseExistingServer` 会复用旧构建。`playwright.config.ts` 新增可选 `PLAYWRIGHT_TEST_PORT`，指定时使用独立端口且不复用旧服务；未结束已有 PID 7644。

### 红绿与最终验证

- 三套核心初始均以缺模块红灯开始；最终 Q29 core `15/15`、Q35 core `8/8`、Q39 core `14/14`。三套页面定向 `15/15`，相关 strict typecheck 与 ESLint 通过。
- 首轮协议 E2E 在 4173 复用旧构建得到 `6/9`；独立 4174 新构建为 `9/9`。移动补图曾暴露 checkbox 路由替换后的旧 DOM 校验竞态，改为点击后通过 URL 与新节点状态验证，最终稳定通过。
- 最终 `npm run lint`、workspace `typecheck` 全绿；Vitest 40 文件 `476/476`；release `10/10`；内容校验 47 题、19 资产通过且仍为 `verified 0/47`；production build 无 chunk 告警。
- 最终真实 Chrome 1440/1366/390 全量 E2E `114/114`，8 workers、全局 30 秒和普通 5 秒断言不变。人工检查 Q29/Q35/Q39 的桌面完整图与移动顶部/底部图，无横向页面溢出、单字挤压或底部导航遮挡。

### 仍然成立的边界

- 未改 `408-user` schema、未删除旧图片、未代替用户做 47 题人工审核、未修改 `cpu-explorer`，也未提交、推送或部署。
- 下一项非 schema 工作优先 Q45 信号量同步；持久化模考和独立记忆卡仍等待 schema v2 的明确授权。

## 2026-08-08 - Q45 信号量同步中断检查点

### 已核对事实

- 本地 `2009.0-draft.2` 题包中的 Q45 要求 P1/P2/P3 互斥使用容量为 `N > 0` 的缓冲区：P1 生产正整数，P2 只取奇数，P3 只取偶数。
- 题包参考答案定义 `mutex=1`、`empty=N`、`odd=0`、`even=0`。生产者等待空位并互斥写入，再按值的奇偶通知唯一消费者；消费者先等待对应类别，再互斥取数并归还空位。
- 页面模型必须保留具体缓冲区槽位和值的奇偶类别，不能把 `getodd()` / `geteven()` 简化成普通 FIFO 队头消费。题包仍是 `needs-review`，这些参数只可作为待人工复核的本地练习预设。

### 已落盘但未完成

- 新增 `packages/lab-core/src/semaphore.test.ts`，覆盖 available-permits 计数语义、零许可时 FIFO 阻塞、`V` 向等待者直接移交许可、确定性 trace、阻塞进程非法操作、未知 ID、配置/状态损坏、上界溢出和 Q45 平衡预设。
- `packages/lab-core/src/semaphore.ts` 尚未生成，`packages/lab-core/src/index.ts` 未导出信号量 API；Web 页面、路由、导航、深链、样式、页面测试和 E2E 均未开始。
- `npm exec vitest run packages/lab-core/src/semaphore.test.ts` 得到预期红灯：无法解析 `./semaphore`，`1 failed / 0 tests`。这是测试先行证据，不是回归通过；当前不能运行或宣称全量门禁为绿。

### 接手顺序与边界

1. 先复核测试 API 与 Q45 题意，完成纯逻辑核心并让定向测试转绿；状态必须不可变、可重放，并拒绝不一致的阻塞队列/信号量状态。
2. 实现 `/lab/os-memory?module=semaphore&preset=cn408-2009-q45`，提供预设与自定义操作脚本、缓冲区/信号量/进程状态、阻塞队列、步进/播放/暂停/复位和 Q45 真题往返。
3. 扩展 `OsModuleTabs` 为虚拟内存、磁盘调度、信号量三个模块，补单测和 1440/1366/390 E2E；验收时使用独立 `PLAYWRIGHT_TEST_PORT`，避免复用 4173 的旧 preview。
4. 完成后再跑 lint、workspace typecheck、Vitest、release、内容校验、build 与全量 E2E，并更新 README/HANDOFF/notes 中的数量和构建产物。
5. 本检查点没有改 `408-user` schema、没有删除旧图片、没有人工审核题目、没有修改 `cpu-explorer`，也没有提交、推送或部署。

## 2026-08-10 - Q45 信号量同步收口

### 核心逻辑与红绿证据

- 保留原有 `semaphore.test.ts`，完成通用 available-permits P/V、FIFO 阻塞与 `V` 直接移交；Q45 专用状态机严格维护容量 N 槽位、奇偶类别许可、mutex 所有权、进程阶段与资源守恒。
- 首轮审计测试得到 `q45-buffer.test.ts` 的 `4 failed / 6 passed`：不配对括号被接受、损坏阻塞队列被探针错误吞掉、未知 action 被当成 `count-even`、容量和未发布槽位身份无边界。改为直接导出/调用 `validateSemaphoreState`，显式 action 白名单，锚定 P/V 语法，容量上限 1024，并新增 `pendingSlotIndex`。
- 二轮并发交错测试得到 `2 failed / 9 passed`：P2 会误取 P1 尚未 `V(odd)` 的复用槽位，未知进程会泄漏原生 TypeError。修复后消费者排除未发布槽位，action 入口受控拒绝未知进程；通用信号量与 Q45 定向最终 `18/18`，lab-core typecheck 与定向 ESLint 通过。

### Web、路由与移动体验

- `/lab/os-memory?module=semaphore&preset=cn408-2009-q45` 完成三模块语义导航、合法 `module` 优先路由、真题双向深链、URL 可恢复容量/脚本、缓冲区、四信号量、FIFO 队列、进程阶段、步进、自动播放、暂停和复位。
- Web 审计先得到页面/路由 `4 failed / 9 passed`：query 与 UI 分裂、活动模块导航写回预设后不刷新状态、冲突参数路由错误、导航缺少语义状态。修复后直接从 search params 派生配置，使用 `nav + Link + aria-current`，补 reload/back/forward 与路由表测试；定向页面/路由 `13/13`。
- Q45 只保留当前事件一个 live region；移动端把受限高度步骤时间线放在当前事件与缓冲区之间，并将关键状态文字提高到 10px。三视口 Q45 E2E `3/3` 覆盖自动播放实际前进、自定义 URL 刷新恢复、前进/后退、FIFO 直接移交、真题往返与页面无横溢。
- 人工检查 `chromium-1440-semaphore-q45.png`、`chromium-1366-semaphore-q45.png`、390px 顶部/状态/底部 3 张图。最终移动状态图在同一视口展示当前事件、步进控制、时间线和缓冲区，文字可读，底部导航未遮挡。

### 最终门禁与边界

- `npm run lint`、workspace `typecheck` 通过；Vitest `44 files / 508 tests`；release `10/10`；内容校验 47 题、19 资产通过且仍为 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；入口 63.40 kB、Q45 核心 22.82 kB、OS 路由 53.44 kB，PWA precache 76 项、2362.33 KiB。
- E2E 首轮暴露 Q29 仍查找旧 button 角色，改为语义 link 后三视口 `3/3`。后续两轮分别出现 PDF 首次元数据 5 秒预算不一致和流水线 30 秒 session 漂移；PDF 首次页数与既有 canvas 统一为 15 秒局部预算，流水线 1440 重复 `2/2`。最终独立端口真实 Chrome 全量 `117/117`，仍为 8 workers、30 秒全局超时。
- 没有修改 `408-user` schema，没有删除任何旧图片，没有代替用户进行 47 题人工审核，没有提交、推送或部署；当前目录仍无 Git 元数据。

## 2026-08-10 - Q25 单类资源死锁实验收口

### 候选择定

- 并行审计了尚未覆盖的组成原理、数据结构/操作系统和网络题目，重点比较 Q24 调度、Q25 单类资源死锁阈值、Q37 CSMA/CD 与 Q15 存储芯片扩展。
- Q24 的状态机价值最高，但原题没有进程 workload；Q37 可视化收益高但核心仍以传播公式为主；Q15 参数完整但状态变化较弱。Q25 的 `8` 台打印机、每进程最多 `3` 台和最小 `K` 都直接来自当前题包，可诚实重放安全完成与极端死锁，因此选为下一项非 schema 实验。
- 当前题包仍是 `needs-review`；Q25 实验预设不得提升题目审核状态，也不代替逐题人工核验。

### 核心红绿证据

- 先新增 `packages/lab-core/src/single-resource-deadlock.test.ts`，首次定向 Vitest 因缺少 `./single-resource-deadlock` 得到预期红灯：`1 failed / 0 tests`。
- 实现 `single-resource-deadlock.ts`：最小死锁参与数、最小参与子集极端分配、`K=3` 安全完成链、`K=4` 死锁检测、确定性 trace、边界校验与 Q25 本地预设。
- 初版定向 Vitest 转绿为 `13/13`；边界审计后细化安全初态为 `ready`，补阈值两侧、资源守恒和极端合法边界，核心定向为 `19/19`。`npm run typecheck -w @408os/lab-core` 通过。

### Web 红绿证据

- 先新增 `SingleResourceDeadlockLabPage.test.tsx` 并扩展 `OsLabRouterPage.test.tsx`、`lab-links.test.ts`。首次定向为 `3 failed files`：页面缺失导致 `0 test`，deadlock 路由 `2` 失败，Q25 深链 `1` 失败；既有 `22` 个相关断言仍通过。
- 完成 Q25 页面、OS 四模块语义导航、合法 module 优先路由、preset fallback、URL/浏览器历史恢复、参数错误 fail closed、Q25 单题练习与双向深链。
- 页面首次执行暴露 `StepExplorer` 回调引用变化造成无限更新；改为与 Q45 相同的 `useCallback` 和相同索引不更新后收敛。页面状态只保留一个“安全/死锁” live region，当前事件不重复播报。
- 核心、页面、路由与深链定向最终 `4 files / 49 tests`；相关 ESLint、lab-core 与 Web typecheck 通过。

### 浏览器与视觉

- Q25 独立端口真实 Chrome 1440、1366、390 三视口定向 E2E 为 `3/3`；移动 CSS 修复后的第二轮仍为 `3/3`。流程覆盖安全/死锁参数、URL 与历史恢复、参数错误、步进以及真题往返。
- 人工检查 `chromium-1440-deadlock-q25.png`、`chromium-1366-deadlock-q25.png`、`chromium-390-deadlock-q25-top.png`、`chromium-390-deadlock-q25-state.png` 与 `chromium-390-deadlock-q25-bottom.png`。资源池、步骤和进程状态均非空、文字可读，页面无横向溢出或底部导航遮挡。

### 最终门禁与边界

- `npm run lint`、workspace `typecheck` 通过；Vitest `46 files / 536 tests`；release `10/10`；内容校验真实读取 19 个资产，47 题通过且保持 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；OS 实验路由 65.52 kB（gzip 18.74 kB），PWA precache 77 项、2379.96 KiB。
- 独立端口 4189 的真实 Chrome 1440/1366/390 全量 E2E 为 `120/120`，8 workers、30 秒全局超时不变。首轮 4188 被端口启动探测干扰而出现连接拒绝；换用干净端口后的完整运行无失败、无跳过，证明不是产品断言失败。
- `408-user` 数据库仍为 schema v1；旧 `apps/web/public/content/2009/` 的 19 张图片仍在；没有代替用户人工审核，也没有提交、推送或部署。

## 2026-08-11 - Q31 软/硬链接实验立项

### 候选择定

- 在 Q45/Q25 收口后审计了未覆盖的组成原理、数据结构/操作系统和网络题目。Q31 的原题参数最完整：F1 初始引用计数为 1，依次建立符号链接 F2、硬链接 F3，再删除 F1；可以在不虚构 workload 或磁盘布局的前提下重放完整状态变化。
- Q34 虽然参数完整，但主要是奈奎斯特公式和星座计数；Q37 缺原始电缆长度，只能诚实展示距离变化量；Q24 缺进程到达/执行参数；Q15 是一次性容量扩展计算。Q31 的目录项、inode、link count 与 dangling 状态更适合当前实验式交互。
- Q31 预设继续保持 `needs-review`，实验不提升题目审核状态，也不代替逐题人工复核。

### 实施边界

- F2 表示独立的符号链接 inode，自己的 link count 为 1，内容是目标名 `F1`；删除 F1 后 F2 变为 dangling，不增加目标 inode 的硬链接计数。
- F3 与 F1 共享目标 inode；建立 F3 后目标 inode link count 为 2，删除 F1 后降为 1，F3 仍可访问目标内容。
- 先保留 `single-resource-deadlock` 之后的测试/页面/路由/深链/三视口/全量门禁流程，完成一个可重放、可校验、fail-closed 的 OS 第五模块。

### 核心与 Web 红绿进展

- 纯逻辑首次因缺少 `./filesystem-links` 得到预期红灯 `1 failed / 0 tests`；实现确定性 F1/F2/F3 trace 后初步为 `8/8`。
- 核心审计发现局部结构校验会接受“最终态冒充初态”、F3 改指额外 inode、伪造 symlink 目标名和伪造 dangling 字段。现改为无递归的 canonical action-prefix replay，并按符号链接 inode 保存的目标名派生解析状态；补充不安全名称、额外目录项、零链接孤儿 inode 与 frozen 输入不变性回归，核心定向 `21/21`，lab-core typecheck 与定向 ESLint 通过。
- Web 先保留页面缺失、路由和深链红灯，现已完成 `/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31`、五模块导航、URL/历史恢复、错误 fail closed、目录项/inode/link count/dangling 步进与 Q31 双向深链；页面、路由和深链定向 `33/33`，Web typecheck 与定向 ESLint 通过。
- Q31 定向真实 Chrome 使用独立端口 4193，1440/1366/390 为 `3/3`；覆盖精确 URL、五模块当前态、三步 F1/F2/F3 状态、重名错误恢复、自定义名称刷新与历史、真题往返和页面无横溢。

### 最终门禁与边界

- 人工检查 Q31 的 1440/1366 完整图和 390 顶部/状态/底部图：F2 dangling、F3 可访问、目标 inode 与符号链接 inode 均清晰非空；五模块导航可读，无横向溢出、文字重叠或底部导航遮挡。
- `npm run lint`、workspace `typecheck` 通过；Vitest `48 files / 565 tests`；release `10/10`；内容校验 47 题、19 资产通过且仍为 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；Vite 1879 modules，OS 路由 82.01 kB（gzip 22.74 kB），PWA precache 77 项、2401.27 KiB。
- 独立端口 4194 的真实 Chrome 1440/1366/390 全量 E2E `123/123`，8 workers、30 秒全局超时不变。
- 未修改 `408-user` schema v1，未删除旧图片，未代替人工审核，未提交、推送或部署。

## 2026-08-10 - Q2 栈最小容量实验立项

### 候选择定

- 对照 Q2、Q9、Q34 与 Q27：Q9 树形展示更直观但只有末尾插入和三次上浮；Q34/Q27 主要是公式或位宽切分。Q2 的 14 步状态变化最长，能直接解释最小容量为何等于峰值深度，因此选为下一项非 schema 实验。
- 当前题包、quality 与本地 crosscheck 一致给出输入 `a,b,c,d,e,f,g`、目标出栈/入队顺序 `b,d,c,f,e,a,g`、答案 C=3 和完整 14 步表；内容仍为 `needs-review`，参数核对不提升审核状态。

### 诚实建模边界

- FIFO 只保证出栈后立即入队的顺序等于最终出队顺序；题干没有规定每次 dequeue 的时刻，因此页面只显示“已出栈并入队的顺序前缀”，不绘制声称唯一的实时队列占用。
- 核心应从固定输入和目标输出确定性地产生唯一 push/pop trace，记录栈、输入游标、输出前缀、当前深度和历史峰值；合法集合但不是栈排列时必须在首个不可能目标处 fail closed。
- 计划 URL 为 `/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02`；完成纯逻辑红绿后再接入数据结构第三模块、Q2 双向深链和三视口 E2E。

### 核心红绿证据

- 先新增 `packages/lab-core/src/stack-capacity.test.ts`；首次定向 Vitest 因缺少 `./stack-capacity` 得到预期红灯 `1 failed / 0 tests`。
- 实现一次性纯函数 trace：严格校验唯一元素、相同集合、64 元素与 32 字符边界；合法排列确定性生成 push/pop 快照，非栈排列在首个被栈顶阻塞的目标处 fail closed。
- Q2 精确 14 操作/15 状态、峰值 3、正序/逆序容量边界、逐步不变量、不可实现排列、输入校验、确定性、frozen 输入和快照隔离初步定向 `17/17`；lab-core typecheck 与定向 ESLint 通过。
- 独立核心审计发现稀疏数组空槽会被 `forEach` 跳过并生成 `undefined` 伪 pop；改用索引遍历让空槽进入 token 校验，补 input/output 两个 sparse array 回归后核心 `19/19`。审计穷举 `n=1..7` 的 5913 个排列，与参考枚举一致。

### Web、可访问性与浏览器进展

- 页面、路由与深链先保留页面缺失、Q2 路由 `2` 失败和深链 `1` 失败；完成 `/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02`、三模块语义导航、合法 module 优先、URL/历史恢复、错误 fail closed、14 步状态和 Q2 真题往返。
- Web 审计发现 StepExplorer 关闭播报后当前事件也没有 live region；新增测试先得到 `1 failed / 5 passed`，只给当前事件加单一 `aria-live=polite` 并保持步骤列表静默后转绿。核心+页面+路由+深链定向最终 `4 files / 50 tests`，相关 ESLint 与 Web typecheck 通过。
- 新增 `tests/e2e/stack-capacity-lab.spec.ts`。首轮三视口因 `当前栈` 与 `当前栈深度` 的测试定位歧义为 `0/3`，收紧 exact locator 后独立端口 4195 的真实 Chrome 1440/1366/390 为 `3/3`；覆盖峰值与终态、播放/复位、非法排列恢复、自定义 URL reload/back/forward、双向深链和页面/`.main-area` 无横溢。
- 人工检查 1440/1366 完整图及 390 top/state/bottom：峰值栈 `d/c/a`、剩余输入和输出前缀均清晰非空，无横向溢出、文字重叠或底部导航遮挡。Web 审计另报合法 32 字符 token 在状态图中被 CSS 截断的 P2，本轮只记录，不扩大修复范围。

### 最终门禁与边界

- `npm run lint`、workspace `typecheck` 全绿；Vitest `50 files / 593 tests`；release `10/10`；内容校验真实读取 19 个资产，47 题通过且保持 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；Vite 1882 modules，数据结构实验路由 35.39 kB（gzip 10.77 kB），PWA precache 77 项、2417.19 KiB。
- 独立端口 4196 的真实 Chrome 1440/1366/390 全量 E2E `126/126`，8 workers、30 秒全局超时不变。
- 未修改 `408-user` schema v1，未删除旧图片，未代替人工审核，未提交、推送或部署。Q2 仍为 `needs-review`；长 token 截断 P2 保留为已知验收风险。

## 2026-08-10 - Q43 中断与 DMA CPU 开销实验立项

### 候选择定

- 并行只读审计剩余 2009 题目后，重点比较 Q9 小根堆、Q15 存储器扩展、Q38 TCP 累计确认、Q43 中断/DMA 开销和 Q44 微操作。Q9 只有追加与三次上浮；Q15 的芯片数确定但地址映射需假设 ROM 布局；Q38 只有两个连续段且来源解析误称 SACK；Q44 视觉丰富但存在五拍/六拍方案和转录纠错风险。
- Q43 的全部参数、十进制 MB 口径、`DMA 与 CPU 无访存冲突` 假设和七个评分步骤均已写入当前 `needs-review` 题包。可确定性重放中断方式 `100 cycles/次 -> 125000 次/s -> 12.5M cycles/s -> 2.5%`，以及 DMA `1000 次/s -> 0.5M cycles/s -> 0.1%`，无需补造 workload。
- Canonical URL 定为 `/lab?module=io-overhead&preset=cn408-2009-q43`。Q43 预设不提升审核状态，也不代替逐题人工复核。

### 诚实建模边界

- 固定一秒观察窗并按正式解析使用十进制 `1MB = 1,000,000B`；中断的其他开销按题设折算为等效指令，DMA 只计题设给出的预处理与后处理 CPU cycles。
- 页面不模拟题干未给出的设备队列、中断优先级、总线仲裁、DMA 访存竞争、缓存影响或传输与计算重叠；利用率大于 100% 时应报告不可持续，而不是拒绝数学上有效的输入。
- 先保留 cpu-core 缺模块红灯，再完成参数化纯逻辑、独立边界审计、CPU 第八模块、URL 恢复、错误 fail closed、Q43 双向深链、三视口与全量门禁。

### 核心红绿进展

- 先新增 `packages/cpu-core/src/io-overhead.test.ts`；首次定向 Vitest 因缺少 `./io-overhead` 得到预期红灯 `1 failed / 0 tests`。
- 实现参数化纯函数：统一十进制 MB，推导 CPU cycles/s、中断每次/每秒开销、DMA 块频率与每秒开销、利用率和相对降低；利用率超过 100% 保留为 `sustainable=false`，不拒绝数学上有效的过载输入。
- Q43 七步 rubric、`2.5% / 0.1% / 96%`、idle/零开销、过载、确定性、frozen 输入、结构校验和算术溢出初步定向 `14/14`；cpu-core typecheck 与定向 ESLint 通过，独立核心审计进行中。

### 核心审计收口

- 独立只读审计确认十进制 `1MB = 1,000,000B`、Q43 预设结果和七步顺序均正确；发现 exact-100% 利用率在常见有限小数参数下可能因 IEEE-754 舍入输出 `100.00000000000003` 并被误判为不可持续。
- 按先红后绿补回归：中断与 DMA exact-100% 测试首次 `1 failed / 14 passed`；以 `Number.EPSILON * 1_024` 个百分点的局部容差修复后，`packages/cpu-core/src/io-overhead.test.ts` 定向 `15/15` 通过。
- 3 个极端数值 P2 保留为已知风险：有限数学结果可能被中间乘法顺序误报溢出；正乘积下溢为 0；参数化 trace 的公式文本为 12 位有效数字而 `step.value` 保留全精度。当前不扩大修复范围。
- 立项时下一步曾计划先做 Web 页面/路由/真题深链；该步骤已在下方“Q43 中断与 DMA CPU 开销收口”记录中完成。Q43 仍为 `needs-review`，没有修改 `408-user` schema、旧图片或人工审核状态。

## 2026-08-10 - Q43 中断与 DMA CPU 开销收口

### Web、路由与深链

- 保留 `packages/cpu-core/src/io-overhead.test.ts` 的先红后绿证据，完成 `IoOverheadLabPanel`、CPU 第八模块标签、参数 URL 恢复、非法参数 fail closed、Q43 真题双向深链和页面状态播报。
- Canonical URL 为 `/lab?module=io-overhead&preset=cn408-2009-q43`；页面使用题设十进制 `1MB = 1,000,000B` 和一秒观察窗，展示七步推导、CPU 预算、中断/DMA利用率、相对降低与不可持续边界。
- 不模拟题干未给出的设备队列、中断优先级、总线仲裁、DMA 访存竞争、缓存影响或传输/计算重叠；Q43 预设仍标记 `needs-review`。

### 红绿与最终门禁

- Web/CPU 路由/深链定向测试最终 `45/45`；Q43 三视口真实 Chrome 定向 E2E `3/3`。
- 先红后绿证据：cpu-core 缺模块 `1 failed / 0 tests`；初版 `14/14`；exact-100% 审计回归先红 `1 failed / 14 passed`，加入 `Number.EPSILON * 1_024` 百分比容差后定向 `15/15`。
- 全量 `npm run test`：`53 files / 620 tests`；`npm run test:release`：`10/10`；`npm run content:validate`：47 题、19 个资产通过，`needs-review; verified 0/47`；`npm run lint`、workspace `npm run typecheck`、`npm run build` 均通过；真实 Chrome 三视口全量 E2E `129/129`。
- 人工检查 `output/playwright/screenshots/chromium-1440-io-overhead-q43.png`、`chromium-1366-io-overhead-q43.png`、`chromium-390-io-overhead-q43-top.png`、`chromium-390-io-overhead-q43-state.png`、`chromium-390-io-overhead-q43-bottom.png`；页面和 `.main-area` 无横向溢出，状态、步骤与底部导航无遮挡。

### 保留风险与边界

- 核心审计保留 3 个 P2：极端大数值下中间乘法顺序可能提前溢出，极端极小正数乘积可能下溢为 0，参数化 trace 的公式文本按 12 位有效数字显示而 `step.value` 保留全精度。本轮不扩大修复范围。
- 没有修改 `408-user` schema v1，没有删除 `apps/web/public/content/2009/` 的 19 张旧图片，没有代替人工审核，没有修改旧 `cpu-explorer`，没有提交、推送或部署。

### 下一步

- Q45、Q25、Q31、Q2 与 Q43 均已收口。下一项非 schema 实验尚未最终选定，先只读审计 Q9、Q38、Q44 等剩余候选，比较题意参数完整性、可重放状态价值和不虚构假设的边界；选定后沿用缺模块红灯、纯逻辑、Web、深链、三视口和全量门禁流程。

## 2026-08-10 - Q9 小根堆插入实验检查点

### 候选择定与边界

- 只读比较 Q9、Q38、Q44，并补看 Q15/Q24/Q37。Q9 参数完整且单义：初始层序 `[5,8,12,19,28,20,15,22]` 追加 `3`，依次与父结点 `19`、`8`、`5` 交换，最终 `[3,5,12,8,28,20,15,22,19]`，对应选项 A。
- Q38 只有两个连续 TCP 段和一次累计确认，且题包解析误称 SACK；Q44 有五拍/六拍合法方案、原卷 `MDR<-M(MDR)` 注记和多处转录纠错风险。Q9 的树形/层序、追加、父子比较与三次上浮更适合当前确定性实验，因此优先。
- Q9 页面只重放一次插入与 sift-up；不扩展为 heapify、删除、并发或建堆复杂度结论。预设仍为 `needs-review`，不提升审核状态。

### 核心与 Web 红绿

- 先新增 `packages/lab-core/src/min-heap-insert.test.ts`，缺少 `./min-heap-insert` 时得到预期红灯 `1 failed / 0 tests`。实现不可变 `initial / append / swap / compare / complete` trace，校验安全整数、稀疏数组、合法初始小根堆、结果最多 64 项、frozen 输入与快照隔离；定向 `16/16`，lab-core `13 files / 200 tests`，typecheck 与定向 ESLint 通过。
- Web 先新增页面、路由和深链测试，得到页面缺失 `0 test`、Q9 路由 `2` 失败、深链 `2` 失败，既有 `27` 个断言通过。现已完成 `MinHeapInsertLabPage`、数据结构第四模块、Canonical URL `/lab/data-structures?module=min-heap&preset=cn408-2009-q09`、参数 URL 恢复、非法初始堆 fail closed、Q9 真题/知识节点往返、树形与层序同步。
- 核心+页面+路由+深链定向为 `4 files / 52 tests`，lab-core/Web typecheck 和相关 ESLint 通过。树宽随层数扩展，最多 64 项时只在树容器内横向滚动，不让页面横溢。

### 下一步

- 该检查点后的 Playwright、视觉和全量门禁已在下方“Q9 小根堆插入实验收口”完成。

## 2026-08-10 - Q9 小根堆插入实验收口

### 浏览器与视觉

- 新增 `tests/e2e/min-heap-insert-lab.spec.ts`，覆盖精确 Q9 URL、第四模块导航、追加与三次上浮、复位/播放、非法初始堆 fail closed、自定义 URL reload/back/forward、Q9 真题往返以及页面/`.main-area` 无横向溢出；三视口定向 `3/3`。
- 首轮截图人工检查发现移动端 640px 树画布默认停在最左侧，根结点被挤到右边缘。改为按当前上浮结点自动居中后重跑 `3/3`；桌面完整图和移动 top/state/bottom 图均已人工检查，树、层序、步骤与底部导航清晰，无页面级横溢或遮挡。
- 截图位于 `output/playwright/screenshots/`：`chromium-1440-min-heap-insert-q09.png`、`chromium-1366-min-heap-insert-q09.png`、`chromium-390-min-heap-insert-q09-top.png`、`chromium-390-min-heap-insert-q09-state.png`、`chromium-390-min-heap-insert-q09-bottom.png`。

### 最终门禁与审计

- `npm run lint`、workspace `npm run typecheck` 通过；Vitest `55 files / 645 tests`；release `10/10`；内容校验真实读取 19 个资产，47 题通过且保持 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；Vite 1886 modules，数据结构实验路由 45.81 kB（gzip 13.12 kB），PWA precache 78 项、2444.15 KiB。
- 独立端口 4203 的真实 Chrome 1440/1366/390 全量 E2E `132/132`，8 workers、30 秒全局超时不变。
- 独立终审无 P1，保留两个 P2：大安全整数在树节点按 3 位有效数字缩写，可能让不同值不可区分，移动端也无法依赖 hover title；`module=min-heap` 搭配其他题目的 `preset` 时会显示 Q9 默认值但保留矛盾 URL。按当前审计边界只记录，不修复。
- 未修改 `408-user` schema v1，未删除旧图片，未代替人工审核，未修改旧 `cpu-explorer`，未删除 `semaphore.test.ts` 或其他既有测试，未提交、推送或部署。当前目录仍无 Git 元数据。

### 下一步

- Q9 已收口，不再重复实现。若继续非 schema 实验，可先评估 Q38 TCP 累计确认；必须明确 ACK 是下一期待字节，不沿用题包解析对 SACK 的错误称呼，也不虚构乱序缓存、丢包或重传。Q44 在五/六拍方案和转录纠错完成人工复核前暂缓。

## 2026-08-10 - Q3 二叉树 RNL 遍历立项

### Q38 驳回结论

- 原题 Q38 为两个连续 TCP 段：首段 `SEQ=200`、载荷 `300B`，次段载荷 `500B`，因此覆盖半开区间 `[200,500)` 与 `[500,1000)`，累计 ACK 为下一期待字节 `1000`。
- 直接核对原解析页后确认，来源只说明“下一期待字节”，没有 SACK；题包 explanation 的 Selective ACK 表述来自交叉 Markdown 污染。计算和答案 D 正确，机制名称错误。
- 不引入题干外的乱序、缺口、丢包、重传、SACK 或 32 位序号回绕时，Q38 只有两个区间和一个 ACK，独立实验价值不足，因此暂缓而不修改题包内容。

### Q3 立项边界

- 原卷图明确为：根 `1`，左子结点 `2`、右子结点 `3`；`2` 的左子结点为 `4`、右子结点为 `5`；`5` 的左子结点为 `6`、右子结点为 `7`。
- 按 RNL 递归遍历得到 `3,1,7,5,6,2,4`，与题干序列和答案 D 一致。页面只演示给定二叉树的可参数化遍历顺序、递归调用栈和访问序列，不扩展为二叉搜索树、线索树或 Morris 遍历。
- 实施仍从缺模块红灯开始，再完成数据结构第五模块、精确路由、URL 恢复、错误 fail closed、Q3 真题/知识深链、三视口与全量门禁。当前记录时尚未修改核心或 Web 代码。
- Web 先新增页面、路由和深链契约测试；首次定向为页面缺失 `0 test`、路由/深链 `4 failed / 31 passed`，证明 Q3 页面、第五模块路由和双向映射尚未实现，既有相关断言未被破坏。
- 核心现已实现六种 N/L/R 排列、严格树结构校验和不可变 `initial / enter / visit / leave` 调用栈快照；Q3 RNL 共 22 个状态，结果为 `3,1,7,5,6,2,4`。定向 `26/26`、lab-core typecheck 与 ESLint 通过。测试文件修改时间早于实现文件，但子代理最终回报被 429 截断，未取回缺模块红灯的精确命令文本。
- Web 已完成 Q3 页面、数据结构第五模块、层序 `#` 输入、六种顺序分段控件、URL/reload/back/forward 状态源、错误 fail closed、递归栈/访问前缀/树图同步、Q3 真题与知识节点双向深链。Web strict typecheck 与定向 ESLint 通过。
- 当前 Codex 权限从 unrestricted 切换为 managed 后，Vitest 在加载配置或转换 `vitest.setup.ts` 时稳定得到 `spawn EPERM`；直接执行 `esbuild.exe --version` 正常，程序化跳过配置打包后仍在 `vite:esbuild` 子进程启动处失败。因此这不是断言结果，Web 定向绿灯与后续全量门禁仍待可启动子进程的环境复验。

## 2026-08-11 - Q3 重启恢复与独立终审

### 复验与审计

- 重启后确认 Q3 核心、页面、路由、深链和 `tests/e2e/binary-tree-traversal-lab.spec.ts` 文件完整；`semaphore.test.ts` 及其他既有测试未删除。
- 独立只读终审无 P1。原卷树、RNL 输出 `3,1,7,5,6,2,4`、22 状态、六种顺序、调用栈/访问前缀不变量、层序不可达结点 fail closed、单一 polite live region 与静默 StepExplorer 均未发现 correctness 或可访问性问题。
- 三个 P2 按既定边界只记录不修：冲突的 `module=tree-traversal&preset=其他题` 或非法 `order` 会回退 Q3/RNL 但不规范化 URL；390px E2E 缺少 event/explorer/state 的纵向 bounding-box 断言；当前单一 live region 行为没有专门回归测试。
- 本轮 `npm run lint` 与 `npm run typecheck` 全绿。Q3 定向 Vitest 在配置加载时 `spawn EPERM`，未进入测试收集；`npm run test:release` 在 Node test worker 启动时 `0/1` 并报 `spawn EPERM`；`npm run content:validate` 在 tsx/esbuild 启动时失败；`npm run build` 的 TypeScript 阶段通过、Vite 配置加载时失败。它们是 managed 环境禁止 Node 启动子进程的同一阻塞，不是测试断言红灯。
- 在权限阻塞阶段尚无 Q3 截图；当时 `apps/web/dist/` 仍是 Q9 收口时产物且不含 Q3，8080 端口返回的是其他项目 `Arcanum`，不可复用。未启动或终止身份不明的进程。

### 权限恢复后的红转绿与浏览器验收

- unrestricted 恢复后 Q3 定向 Vitest 首次为 `1 failed / 3 passed`、`3 failed / 66 tests`：`serializeLevelOrder` 对带空槽数组使用 `map`，生成 `1,2,3,4,5,,,,,6,7`，页面默认输入和恢复预设均因此失败。
- 最小修复改为按索引 `Array.from` 填充空槽为 `#`，未改变核心算法或 `semaphore.test.ts`；同一组核心+页面+路由+深链定向复跑为 `4 files / 66 tests` 全绿。
- 独立端口 `4204` 的真实 Chrome 三视口 Q3 E2E 为 `3/3`。截图：`chromium-1440-binary-tree-traversal-q03.png`、`chromium-1366-binary-tree-traversal-q03.png`、`chromium-390-binary-tree-traversal-q03-top.png`、`chromium-390-binary-tree-traversal-q03-state.png`、`chromium-390-binary-tree-traversal-q03-bottom.png`；人工检查确认树图、递归栈、步骤、移动底部导航无文字重叠、页面横溢或遮挡。

### 最终门禁与边界

- Q3 修复后 `npm run lint`、workspace `npm run typecheck`、`npm run test`、`npm run test:release`、`npm run content:validate`、`npm run build` 全部通过。
- 全量 Vitest 为 `57 files / 680 tests`；release 为 `10/10`；内容校验真实读取 19 个资产、47 题通过，仍为 `needs-review; verified 0/47`；production build 转换 1888 个模块、PWA precache 78 项（2462.29 KiB），无 chunk 告警。
- Q3 定向真实 Chrome 使用独立端口 4204，1440/1366/390 为 `3/3`；全量真实 Chrome 使用独立端口 4205，8 workers、三视口共 `135/135`。五张 Q3 截图已人工检查，页面无横向溢出、文字重叠或底部导航遮挡。
- Q3 的三个 P2 继续只记录不修：冲突 preset/order 不规范化 URL、移动 E2E 缺纵向 bounding-box 契约、单一 live region 缺专门回归断言。题包仍未人工审核，未修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，未提交、推送或部署。
- 本地开发服务已在独立端口 `4206` 启动，Q3 canonical URL 为 `http://127.0.0.1:4206/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL`。

### 下一步

- Q45、Q25、Q31、Q2、Q43、Q9 与 Q3 均已收口。下一项非 schema 实验重新进行只读候选比较；Q38 状态过薄暂缓，Q44 等待五/六拍和转录纠错完成人工复核。

## 2026-08-11 - Q37 CSMA/CD 距离变化实验立项

### 候选择定与边界

- 只读比较 Q15、Q24、Q34、Q37、Q38、Q40、Q44。Q15 只有芯片数量公式且地址映射需补造；Q24/34/40 是单次概念或公式；Q38 只有两个连续字节区间和一个累计 ACK；Q44 仍有五拍/六拍方案、原卷 `MDR<-M(MDR)` 注记和转录纠错风险。
- Q37 的原卷和当前题包参数完整：传输速率 `1Gbps`、传播速度 `200000km/s`、最小帧减少 `800bit`，正式解析明确使用 CSMA/CD 的往返传播时延并得到距离至少减少 `80m`。它能诚实重放“发送时间差 -> 往返传播时间差 -> 距离差”，不需要原始帧长或随机碰撞 workload。
- 页面建模固定十进制单位并显式展示 `2 × Δd / v = Δt`；不模拟具体拓扑、载荷、竞争退避、随机碰撞或重传，不把 `80m` 扩展为额外网络容量结论。预设仍为 `needs-review`。

### 实施顺序

- 先新增 `packages/lab-core/src/csma-cd-collision.test.ts`，保留缺模块红灯；再实现不可变参数化 trace、网络第四模块、Q37 真题/知识双向深链、三视口和全量门禁。

### 核心与 Web 红绿进展

- 核心缺模块红灯为 `1 failed / 0 tests`；实现 `initial / frame-time / round-trip / distance / complete` 五步不可变 trace 后，Q37 预设和参数边界初步定向 `3/3`。
- Web 已接入 `/lab/network?module=csma-cd&preset=cn408-2009-q37`、网络第四模块、速率/传播速度/帧长减少量 URL 恢复、非法参数 fail closed、单一 live region、Q37 真题与知识节点双向深链，并补齐桌面/移动布局。
- 首次核心+页面+路由+深链定向为 `3 failed / 38 passed`：路由的 preset fallback 会抢占合法 `module=cidr` 或 `module=csma-cd`，另一个失败是测试错误假设页面只出现一处 `0.8 μs`。改为所有合法 module 优先、再做 preset fallback，并按多节点查询后，同组 `4 files / 41 tests` 全绿。

### 下一步

- 新增 Q37 三视口 E2E，修正既有网络模块数量 `3 -> 4`，覆盖 canonical/custom URL、错误恢复、StepExplorer、reload/back/forward、真题与知识深链、五张截图和页面横溢；之后运行全量门禁并收口。当前仍未修改 schema、旧图片、人工审核状态或既有测试，也未提交、推送或部署。

## 2026-08-11 - Q37 CSMA/CD 浏览器验收检查点

### 浏览器与视觉

- 新增 `tests/e2e/csma-cd-collision-lab.spec.ts`，覆盖 `1Gbps / 200000km/s / 800bit -> 0.8μs / 80m`、下一步、播放/复位、`reduction=0` fail closed、`100Mbps / 100bit -> 1μs / 100m` 自定义 URL、reload/back/forward、Q37 练习与知识节点双向深链、页面与 `.main-area` 横溢检查。
- 既有 `tests/e2e/protocol-labs.spec.ts` 的网络模块数量契约由 3 改为 4。独立端口 `4207` 的真实 Chrome 三视口定向 `3/3`。
- 人工检查 `chromium-1440-csma-cd-collision-q37.png`、`chromium-1366-csma-cd-collision-q37.png`、`chromium-390-csma-cd-collision-q37-top.png`、`chromium-390-csma-cd-collision-q37-state.png`、`chromium-390-csma-cd-collision-q37-bottom.png`；公式、指标、步骤和时间线均非空，移动端顺序清晰，无文字重叠、页面横向溢出或底部导航遮挡。

### 独立终审与保留风险

- Q37 独立只读审计无 P1。三个 P2 只记录不修：极端有限参数下先除后乘可能中间溢出/下溢；极端自定义参数的页面单位/精度展示不统一；网络模块当前态只用 CSS `.active`，缺少 `aria-pressed`/等价选中语义。
- 以上 P2 不影响 Q37 原题预设的有限参数和当前可访问练习流程；本轮不扩大核心数值范围或导航改造。

## 2026-08-11 - Q37 CSMA/CD 实验收口

### 最终门禁

- `npm run lint`、workspace `npm run typecheck` 全绿；全量 Vitest `60 files / 697 tests`；release `10/10`；内容校验真实读取 19 个资产，47 题通过且保持 `needs-review; verified 0/47`。
- production build 通过且无 chunk 告警；Vite 转换 1890 个模块，网络实验路由 63.93 kB（gzip 18.90 kB），PWA precache 79 项、2477.86 KiB。浏览器首轮启动 build 曾在清理 `dist/assets` 时出现一次 Windows `EPERM`，目录 ACL 与进程身份核对正常后，单独标准 build 和后续两次 Playwright build 均通过，未删除或终止未知进程。
- 全量 E2E 首轮为 `137/138`：唯一失败是既有 Q14 Cache 1440px 在路由 Suspense 的“载入页面”等待 30 秒，Q14 同轮 1366/390 与 Q37 三视口均通过。干净端口复跑 Q14 1440 为 `2/2`，每次约 1.9 秒；随后独立端口 `4210` 的全量真实 Chrome 为 `138/138`，8 workers、30 秒全局超时不变。

### 边界

- Q37 仍为 `needs-review`。没有修改 `408-user` schema v1，没有删除旧目录的 19 张图片，没有代替人工审核，没有修改旧 `cpu-explorer`，没有删除 `semaphore.test.ts` 或其他既有测试，没有提交、推送或部署；当前目录仍无 Git 元数据。

## 2026-08-11 - Q6 森林与二叉树转换实验立项

### 候选比较

- 并行只读审计了数据结构、操作系统、组成原理和网络剩余题目。Q10 缺原始序列，只能按第二趟必要不变量排除算法，不能诚实重放前两趟；Q34 参数完整但主要是 `4 相位 × 4 振幅` 与奈奎斯特公式流水线；Q27 只有地址位宽换算。Q6 可完整穷举两条二叉边的四种方向并逐边还原森林关系，因此状态价值最高。
- 已直接核对原卷第 1 页与解析第 2 页。题包答案 B 与来源一致，但仍保持 `needs-review`；来源对照和自动化实验都不替代 47/47 人工审核。

### 形式化结论与建模边界

- 从 u 到 v 的二叉路径固定经过中间结点 k。`LL` 还原为 u 是 v 的祖父结点；`LR` 还原为 u 是 v 的父结点，对应 I；`RL` 还原为 u 是 v 的父结点 k 的兄弟，不对应题干 III；`RR` 还原为 u、k、v 是同一父结点下的兄弟，对应 II。四案穷举后，只有 I、II 可能，答案为 B。
- 页面只选择观察 `LL/LR/RL/RR` 四案例，不开放任意森林编辑器，不补造插入、删除、遍历、随机结构或概率。步骤是逐边解码证明，不伪装成森林运行时发生修改。
- 双视图必须区分 `L = 首孩子` 与 `R = 下一兄弟`，并使用明确的上层上下文结点保证 `RL/RR` 的兄弟关系属于同一父结点；不能把不同树的根称为兄弟。图形之外保留文本关系表，路径控件提供选中态语义，动态播报只保留一个 polite live region。
- 计划 canonical URL 为 `/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR`。非法显式 path 必须 fail closed；恢复按钮回到 Q6 canonical 参数。

### 实施顺序

- 已新增 `packages/lab-core/src/forest-binary-relation.test.ts`；`npm exec vitest run packages/lab-core/src/forest-binary-relation.test.ts` 因无法解析 `./forest-binary-relation` 得到预期红灯 `1 failed / 0 tests`。下一步实现不可变四案例 trace、round-trip 和结构守恒测试，完成独立核心审计。
- 核心绿灯后再建立页面、路由和深链红灯，随后接入数据结构第六模块、Q6 真题/知识双向深链、URL/reload/back/forward 恢复、三视口真实 Chrome、五张截图与全量门禁。
- 本立项阶段未修改 `408-user` schema v1、旧图片、人工审核状态或旧 `cpu-explorer`，未删除 `semaphore.test.ts` 或其他既有测试，未提交、推送或部署。

### 核心与 Web 红绿进展

- 核心实现从合法森林结构生成左孩子右兄弟二叉视图，并从父关系计算四种结论；所有案例使用上层上下文结点 p，避免把不同树根误称为兄弟。四案例、五步快照、round-trip、结构守恒、`RL` 排除 III、确定性和非法 path 定向 `22/22`，lab-core typecheck 与相关 ESLint 通过。
- Web 先新增页面、路由和深链契约，得到页面缺失 `0 test`、路由 `2` 失败、深链 `2` 失败，合计 `4 failed / 37 passed`。完成 `ForestBinaryRelationLabPage`、数据结构第六模块、URL/历史恢复、非法 path fail closed、单一 live region、Q6 真题与知识节点双向深链后，核心+页面+路由+深链为 `4 files / 66 tests`，Web typecheck 与相关 ESLint 通过。

### 三视口浏览器检查点

- 新增 `tests/e2e/forest-binary-relation-lab.spec.ts`，覆盖 canonical URL、六模块导航、LR 两边解码、复位/播放、RR URL reload、非法 path 恢复、back/forward、Q6 真题与知识节点双向深链、页面与 `.main-area` 无横溢，以及 390px 当前事件/步骤/双视图的纵向顺序。
- 独立端口 `4211` 的真实 Chrome 1440/1366/390 定向为 `3/3`。人工检查 `chromium-1440-forest-binary-relation-q06.png`、`chromium-1366-forest-binary-relation-q06.png`、`chromium-390-forest-binary-relation-q06-top.png`、`chromium-390-forest-binary-relation-q06-state.png`、`chromium-390-forest-binary-relation-q06-bottom.png`；双视图、关系文本、命题表和底部导航均清晰，无页面横向溢出、文字重叠或遮挡。
- 下一步运行 lint、workspace typecheck、全量 Vitest、release、内容校验、production build 与三视口全量 E2E；在这些门禁完成前不把 Q6 描述为最终收口。

### 全量门禁权限阻塞

- `npm run lint` 与 workspace `npm run typecheck` 已全绿。随后当前权限从 unrestricted 切换为 managed；`npm run test` 在加载 `vitest.config.ts` 时因 Node 无法启动 esbuild 服务报 `spawn EPERM`，用时约 2.5 秒，未进入测试收集，因此不是断言红灯，也不能算通过。
- 该现象与 Q3 阶段已记录的 managed 子进程限制相同。未机械重跑；release、内容校验、production build 和全量 E2E 仍待可启动子进程的权限环境复验。Q6 定向 `66/66`、三视口 `3/3` 和五张截图均是在权限切换前取得的有效证据。
- 首轮五图人工检查另发现数据结构模块导航仍沿用五列，新增第六模块后独占第二行。已将桌面导航改为六列、`<=800px` 改为三列两行；该 CSS 修复发生在权限切换后，必须在权限恢复后重跑 Q6 三视口并复查五张截图，不能沿用修复前截图作为最终视觉证据。

## 2026-08-11 - Q6 森林与二叉树转换实验收口

### P1 红转绿

- 独立审计发现页面把 `currentStep.state.relation` 为空的 initial/decode-edge 步骤回退到 `trace.result.relation`，导致逐边解码尚未完成时提前展示终态；匹配命题也把空集合显示成“无”。先把页面测试契约改为 initial、decode-edge 1/2 均显示“待判定”，classify 后才显示关系和命题，再修复页面指标与 `ForestRelationView` callout 直接读取当前 step。相关核心+页面+路由+深链定向由该 P1 契约转绿为 `4 files / 66 tests`。
- 补充的页面/E2E 断言覆盖 LR initial/decode-edge/classify、RR initial/decode-edge/classify 的关系、命题和森林 callout；独立复核未发现新的 P1。四案例 I/II/III 仍作为明确标注的全局总览，不冒充当前路径关系状态。

### 浏览器与全量门禁

- 独立端口 `4212` 的 Q6 三视口真实 Chrome 为 `3/3`。人工复查 `chromium-1440-forest-binary-relation-q06.png`、`chromium-1366-forest-binary-relation-q06.png`、`chromium-390-forest-binary-relation-q06-top.png`、`chromium-390-forest-binary-relation-q06-state.png`、`chromium-390-forest-binary-relation-q06-bottom.png`，确认六列桌面导航、三列两行移动导航、双视图、步骤、关系总览和底部导航无横溢、重叠或遮挡。
- 权限恢复后全量 `npm run lint`、`npm run typecheck`、`npm run test`、`npm run test:release`、`npm run content:validate`、`npm run build` 均通过。Vitest 为 `62 files / 726 tests`，release `10/10`，内容校验为 `47 题/19 资产` 且 `needs-review; verified 0/47`，build 转换 `1892 modules`，PWA precache `79 entries (2498.07 KiB)`。
- 全量 E2E 首轮独立端口 `4213` 为 `140/141`，唯一失败是既有 `content-review.spec.ts` 的 1440px Q41 调色板点击在冷启动并发下 30 秒内未稳定；该用例隔离端口 `4214` 重跑通过，随后独立端口 `4215` 的第二轮全量 8 workers 三视口为 `141/141`。Q6 三视口在两轮全量中均通过。

### 边界与下一步

- Q6 仍为 `needs-review`，没有修改 `408-user` schema v1，没有删除 `apps/web/public/content/2009/` 的 19 张旧图片，没有代替人工审核，没有修改旧 `cpu-explorer`，没有删除 `semaphore.test.ts` 或其他既有测试，没有提交、推送或部署；项目目录仍无 Git 元数据。
- 保留 P2：LL/RL 尚无页面/E2E 专门展示断言；冲突的 `preset/path` 不规范化 URL；p 上下文说明仍可进一步强调其用于核对命题 III。下一会话先只读比较 Q38、Q44 等候选，不重做已收口实验。
- 本地开发服务已在 `127.0.0.1:4216` 启动；Q6 canonical URL 返回 HTTP 200，监听进程为本项目 Vite `node.exe` PID `19336`。

## 2026-08-11 - Q15 存储器芯片扩展实验立项

### 选择与建模边界

- 在 Q38、Q44、Q15、Q34、Q10、Q5 中选择 Q15。Q38 状态过薄且题包 explanation 误称 SACK；Q44 虽可重放五/六拍两种合法方案，但仍留在人工核对门槛之后；Q34/Q5 主要是短公式链或层级容量。
- Q15 来源参数完整：主存 `64KB`，ROM `4KB`、RAM `60KB`；ROM 芯片 `2K x 8 bit`，RAM 芯片 `4K x 4 bit`。推导结果为 ROM 位扩展 `1`、字扩展 `2`、共 `2` 片；RAM 位扩展 `2`、字扩展 `15`、共 `30` 片；答案 D。
- 实验只展示容量分区、位扩展、字扩展、芯片矩阵和容量守恒。题干未给出的地址译码、片选逻辑、ROM/RAM 地址布局和总线时序不进入模型。Q15 继续保持 `needs-review`。

### 红灯证据

- 先新增 `packages/cpu-core/src/memory-expansion.test.ts`，覆盖 Q15 精确结果、自定义合法布局、确定性、输入不变性、快照隔离、非法安全整数、不能组成 8 位编址单元的芯片位宽、容量不能整除芯片字数，以及派生芯片数超过安全整数边界。
- `npm exec vitest run packages/cpu-core/src/memory-expansion.test.ts` 得到预期缺模块红灯：无法解析 `./memory-expansion`，`1 failed / 0 tests`。尚未实现核心，也尚未运行任何全量门禁。

### 核心初版绿灯

- 新增并导出 `packages/cpu-core/src/memory-expansion.ts`。实现只接受正安全整数，要求 `0 < ROM < total`，分别验证芯片位宽能组成 8 位编址单元、区域字深可整除，不使用向上取整；派生芯片数和容量超出安全整数时返回结构化 `arithmetic-overflow`。
- trace 固定为 partition、ROM width/depth、RAM width/depth、complete 六步；每次调用复制配置、步骤与区域结果，不复用可变快照。
- 定向 Vitest 从缺模块红灯转为 `16/16`；`npm run typecheck -w @408os/cpu-core` 和核心定向 ESLint 通过。独立核心审计尚在进行，Web 与全量门禁尚未开始。

### 核心审计与 Web 红转绿

- 独立核心审计未发现 P1，复跑 `16/16`。两个 P2 只记录：成功 trace 的容量守恒是由整除因子乘回得到的恒真派生量，不是独立 bit 容量交叉检查；现有溢出测试未单独覆盖两区 `totalChipCount` 合计溢出分支。
- Web 先新增面板测试，并扩展 CPU 路由/第九模块与深链测试；首次为面板缺失 `0 test`，另有模块数、Q15 路由和映射共 `5 failed / 33 passed`。
- 新增 `MemoryExpansionLabPanel`，完成六字段 URL 恢复、非法输入 fail closed、容量分区、ROM/RAM 扩展因子和芯片矩阵、六步推导、单一 live region、Q15 知识节点入口。矩阵最多渲染 32 个字扩展行，超出部分显式汇总，避免大合法参数制造无界 DOM。
- `CpuLabPage` 增至第九模块，合法显式 module 优先于 preset fallback；canonical URL 为 `/lab?module=memory-expansion&preset=cn408-2009-q15`。`lab-links` 增加 Q15，使练习页和知识页都能返回实验。
- 核心+页面+路由+深链定向为 `4 files / 59 tests`；`@408os/cpu-core`、`@408os/web` typecheck 与相关 ESLint 通过。独立 Web 审计、真实浏览器和全量门禁尚未完成。

### 三视口浏览器验收

- 新增 `tests/e2e/memory-expansion-lab.spec.ts`，覆盖 canonical/custom URL、Q15 参数和结果、9 模块当前态、StepExplorer、错误恢复、reload/back/forward、真题与知识双向深链、页面横溢与浏览器错误；同步把 `cpu-extended-labs`、`pipeline-lab`、`io-overhead-lab` 的 CPU 模块数断言改为 `9`。
- 按项目 Playwright 合同用独立端口 `4220` 运行真实 Chrome 1440/1366/390，定向 `3/3`，用时约 54 秒；没有复用重启前记录的 `4216` 服务。
- 五张截图已逐张人工检查：桌面 9 列、移动 3 x 3 导航完整；ROM 2 片与 RAM 30 片矩阵、容量分区、推导步骤均非空；移动端无横向溢出、文字重叠或底部导航遮挡。
- 此时全量门禁尚未运行，不能沿用 Q6 的 `726/726` 与 `141/141` 作为 Q15 完成证据；后续收口结果如下。

### 独立 Web 审计与保留风险

- 独立 Web 审计未发现 P1，并独立复跑 Q15 真实 Chrome 三视口 `3/3`。核心审计与 Web 审计均不需要追加 P1 修复。
- 核心保留两个 P2：`capacityConserved` 是由整除因子乘回得到的恒真派生量，未独立从芯片总 bit 容量交叉计算；现有测试未单独命中 ROM 与 RAM 芯片数合计溢出分支。
- Web 保留三个 P2：冲突的其他题 preset 不规范化 URL；最多 32 行矩阵的截断逻辑缺极端合法配置专门回归；CPU tab 当前态仍只有既有 `.active`，没有 `aria-pressed`。这些问题不影响 Q15 预设结果和当前三视口练习流程，本轮只记录不扩大修复。

### 最终门禁

- `npm run lint` 通过，0 error / 0 warning；workspace `npm run typecheck` 全绿；全量 Vitest `64 files / 752 tests`；release `10/10`。
- `npm run content:validate` 真实读取 19 个资产、47 题通过，仍为 `needs-review; verified 0/47`；没有把来源核对或自动化实验冒充人工审核。
- production build 通过且无 chunk 告警；Vite 转换 `1894 modules`，PWA precache `79 entries (2514.11 KiB)`。
- 独立端口 `4223` 的真实 Chrome 1440/1366/390 全量 E2E 为 `144/144`，显式 8 workers 与 30 秒全局超时不变；Q15 三视口在全量中均通过。

### 边界与本地入口

- `408-user` 仍为 Dexie schema v1；`apps/web/public/content/2009/` 的 19 张旧图片仍在；`packages/lab-core/src/semaphore.test.ts` 仍存在，SHA-256 为 `1AABCB04DEF264A8E6C56E3BAB9FDE0FF32D8CBE933099BE9E09A36C3D309B8B`。
- 未代替人工审核，未修改旧 `cpu-explorer`，未删除既有测试，未提交、推送或部署；项目仍无 Git 元数据。
- 本地 Vite 服务仍在 `127.0.0.1:4216`，Q15 canonical URL `http://127.0.0.1:4216/lab?module=memory-expansion&preset=cn408-2009-q15` 当前返回 HTTP 200。

## 2026-08-11 - Q44 微操作调度候选审计与已确认计划

### 候选结论

- Q38 不选为独立实验：首段 `SEQ=200`、载荷 `300B` 覆盖 `[200,500)`，第二连续段覆盖 `[500,1000)`，累计确认号为下一期待字节 `1000`；原卷和正式解析没有使用 SACK，题包中的 Selective ACK 表述是交叉材料污染。题意只有两个连续区间和一次确认，状态价值不足，未来可作为通用 TCP 累计 ACK 实验的预设。
- 其他无实验深链候选中，Q5 完全二叉树层级容量、Q34 QAM/奈奎斯特和 Q20 总线带宽均可诚实建模，但状态和数据通路解释力弱于 Q44。Q4 需要重新转录四棵选项树，Q10 缺原始序列，均不优先。
- Q44 经原卷第 5/6 页与正式解析第 8/9 页直接核对后，确认原解析同一页明确给出 6 拍分步与 5 拍并行两套合法方案。用户已确认按 Q44 方案继续；当前尚未新增任何 Q44 代码或测试。

### 来源事实与边界

- 指令语义固定为 `R0 + M[R1] -> M[R1]`。6 拍方案为 C5 `MAR <- R1`、C6 `MDR <- M(MAR)`、C7 `A <- MDR`、C8 `AC <- A + R0`、C9 `MDR <- AC`、C10 `M(MAR) <- MDR`。
- 5 拍方案在 C6 同时执行 `M(MAR) -> MDR` 与 `R0 -> A`：前者经 DB 和 `MDRinE`，后者经内总线和 `Ain`，不会产生内总线冲突；随后 C7 `AC <- MDR + A`、C8 `MDR <- AC`、C9 写回目标内存。两套方案终态必须一致，R0/R1 不变。
- 原卷取指表 C2 印作 `MDR <- M(MDR)`，而数据通路和正式解析均明确应理解为 `MDR <- M(MAR)`；实验从执行阶段 C5 开始，不重放或静默改写 C1-C4。交叉 Markdown 的 `AOut`、`MDRout,E`、`Rlout` 分别与原图/正式解析冲突，执行模型使用来源一致的 `ACout`、`MDRoutE`、`R1out`。
- Q44 继续保持 `needs-review`。来源核对不能代替人工审核；页面不得声称本地 rubric 是官方逐分标准，不得实现任意微操作序列评分器，也不得声称 5 拍和 6 拍穷尽所有合法设计。
- 模型只覆盖 16 位 R0/R1/A/AC/MAR/MDR、目标内存字、AB/DB/内总线、当前节拍、微操作和有效控制信号；初始 A/AC/MAR/MDR 必须表示为 unknown。不得补造缓存、等待周期、地址译码、标志位、中断或控制器生成逻辑。

### 下一会话实施顺序

1. 新增 `packages/cpu-core/src/micro-operations.test.ts`，先运行定向 Vitest，保留无法解析 `./micro-operations` 的缺模块红灯。
2. 实现并导出纯逻辑：`parallel-5 / split-6` 两套确定性 trace、16 位无符号输入与模 `2^16` 加法、单内总线驱动约束、C6 双通路并行、地址稳定、写回顺序、两方案终态一致、错误 fail closed、输入不变和快照隔离。
3. 核心绿灯后做独立审计，只修 P1；再建立 Web 页面、CPU 第 10 模块、路由和深链红灯，接入 `MicroOperationsLabPanel`。
4. canonical URL 固定为 `/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5`；页面提供两方案切换、R0/R1/目标内存字输入、寄存器/总线/信号状态、逐拍播放、错误恢复及 Q44 真题/知识往返。
5. 完成独立 Web 审计、1440/1366/390 真实 Chrome E2E、五张截图人工检查，以及 lint、workspace typecheck、全量 Vitest、release、内容校验、production build 和独立端口全量 E2E；随后更新 README/HANDOFF/notes 收口。

### 边界

- 本检查点只更新交接文档，没有修改代码、题包、`408-user` schema v1、旧图片、人工审核状态或旧 `cpu-explorer`，没有删除既有测试，也没有提交、推送或部署。

## 2026-08-11 - Q44 微操作调度核心红灯

### 测试契约

- 新增 `packages/cpu-core/src/micro-operations.test.ts`，把来源确认的执行阶段 C5 起始方案写成契约：`parallel-5` 在 C6 通过 DB 执行 `M(MAR) -> MDR`，同时通过单内总线执行 `R0 -> A`；`split-6` 将读内存与 `MDR -> A` 分开。两套方案都以写回目标内存结束。
- 契约同时覆盖初始 `A/AC/MAR/MDR` 为 unknown、16 位无符号输入与模 `2^16` 加法、R0/R1 不变、地址稳定、单内总线驱动、DB 读写方向、写回最后发生、两方案终态一致、非法输入 fail closed、输入不变、确定性和快照隔离。

### 红灯证据与边界

- 运行 `npm exec vitest run packages/cpu-core/src/micro-operations.test.ts`，因无法解析尚不存在的 `./micro-operations` 得到预期 `1 failed / 0 tests`；没有进入测试执行，不能算回归通过。
- 当前只新增测试，没有实现核心、导出、Web、路由、深链或 E2E。Q44 继续保持 `needs-review`；没有修改 `408-user` schema v1、旧图片、人工审核状态或旧 `cpu-explorer`，没有删除既有测试，也没有提交、推送或部署。

## 2026-08-11 - Q44 微操作调度核心初版绿灯

### 实现与来源标签

- 新增并从 cpu-core 导出 `micro-operations.ts`。API 只接受 `parallel-5` 与 `split-6`，不接受任意微操作脚本；每拍返回前后寄存器、AB/DB/内总线、微操作、有效控制信号和单总线/地址稳定不变量。
- 模型将初始 `A/AC/MAR/MDR` 表示为 `null` unknown，严格接受 `0..65535` 整数；加法按模 `2^16`，R0/R1 保持不变，最后一拍才写目标内存。内部执行前检查未知寄存器、内总线多驱动和访存地址漂移，失败返回 `schedule-invariant`。
- 初版测试中的通用 `Read/Write` 标签尚未执行就由只读审计指出来源不一致；独立核对当前 Q44 题包、正式解析 OCR 与本地 override 后，已在首次绿灯前改为来源表使用的 `MemR/MemW`。未修改题包或审核状态。

### 验证与下一步

- 定向 Vitest `14/14`，`npm run typecheck -w @408os/cpu-core` 与核心定向 ESLint 均通过。严格 typecheck 首轮只发现测试按索引取 step 未处理 `undefined`；新增受检 `stepAt` 辅助函数后同组验证全绿，核心实现没有类型报错。
- 当前进入独立核心审计；只对审计立案的 P1 先补红灯再修复。Web、第 10 模块、路由、双向深链和 E2E 尚未开始，Q15 的全量基线不能当作 Q44 完成证据。

## 2026-08-11 - Q44 微操作调度独立核心审计

### P1 红转绿

- 独立审计依据 Q44 来源中的“MAR 的输出一直使能”立案 P1。初版把是否显示 AB 与是否执行 `MemR/MemW` 绑定，导致 parallel C7/C8 和 split C7/C8/C9 错误显示 AB 空闲。
- 先补两方案回归契约，要求 C5 的 AB 为 `MAR/unknown`，C6 起每拍持续为 `MAR/R1`；定向测试得到 `2 failed / 12 passed`。随后解除 AB 与访存动作的绑定，保持 MAR 每拍驱动地址总线，定向恢复 `14/14`，cpu-core typecheck 与定向 ESLint 通过。
- 独立复核 P0/P1 均为 0，并额外跑过 100 组边界 trace。`MemR/MemW`、`MDRout/MDRoutE`、`ACout`、`R1out`、C6 DB/内总线并行、unknown、写回顺序、地址保持、16 位模加法、输入校验、确定性和快照隔离均未发现新的 correctness 问题。

### 保留 P2 与下一步

- 两方案完整内部 `finalState` 不相同：`parallel-5` 的 A 保留 R0，`split-6` 的 A 保留原内存字；相同的是架构可见目标地址、写回值以及 MAR/AC/MDR。Web 与文档只能写“架构可见结果一致”，不得声称全部暂存寄存器终态一致，也不得人为清空或改写 A。
- 核心审计结束后开始 Web 测试先行：面板、CPU 第 10 模块、canonical URL、Q44 真题与知识双向深链先取得红灯，再实现页面。

## 2026-08-11 - Q44 Web 测试红灯

### 契约范围

- 新增 `MicroOperationsLabPanel.test.tsx`，覆盖 `needs-review`、5/6 拍来源方案切换、初始 unknown 暂存寄存器、parallel C6 的 DB/内总线并行、当前拍状态、AB 持续驱动、有效信号、URL 参数、16 位回绕、非法方案/输入 fail closed、恢复和 Q44 知识节点。
- 扩展 `CpuLabPage.test.tsx` 与 `lab-links.test.ts`，先要求 CPU 第 10 模块、合法 module 优先、Q44 preset fallback、非法显式 module fail closed、canonical URL、Q44 单题练习和 `/knowledge`/`/practice` 共用的精确实验链接。

### 红灯证据

- 定向运行核心、面板、CPU 页面与深链 4 个文件：核心保持通过；面板因 `MicroOperationsLabPanel` 尚不存在为 `0 test`；深链 2 项失败；CPU 模块数/Q44 路由/canonical 3 项失败；合计 `3 failed files / 1 passed file`、`5 failed / 51 passed`。
- 这些失败精确证明 Web、CPU 第 10 模块和 Q44 深链尚未实现。下一步才创建组件并接线路由；尚未新增 E2E，也未运行全量门禁。

## 2026-08-11 - Q44 Web 初版绿灯

### 页面与状态边界

- 新增 `MicroOperationsLabPanel`，接入 CPU 第 10 模块。canonical URL 为 `/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5`；`split-6`、R0/R1/目标内存字均由 URL 恢复，自定义输入移除 preset 并写全参数，非法 schedule、空值、小数、负数或超过 16 位的值 fail closed。
- 页面提供两个来源支持方案的分段控件、C5 起逐拍播放、当前拍寄存器、AB/DB/CPU 内总线和有效信号。动态状态只读取 `activeStep.after`，C5 的 A/AC/MDR 保持 unknown；parallel C6 才同时显示 DB 读入 MDR 与内总线 R0 写 A，AC 不提前显示终值。
- 结果区只写“架构可见地址与写回结果一致”，并明确暂存 A 可能不同；没有任意微操作输入、评分器、官方逐分标准或穷尽所有合法答案的声明。`needs-review` 直接来自 Q44 preset。
- `lab-links` 新增 Q44 精确 canonical destination，使练习页和知识页沿既有泛型入口返回实验。CPU tab 桌面改为 10 列，移动改为 2 列 5 行，避免 10 个模块在三列下出现孤立末项。

### 验证与下一步

- 核心+面板+CPU 页面+深链定向为 `4 files / 62 tests`；`@408os/cpu-core` 与 `@408os/web` typecheck、相关 ESLint 通过。静态门禁首轮只有两个未使用 import，删除后复跑全绿，没有绕过错误。
- 下一步执行独立 Web 审计；只对立案 P1 先补红灯再修复。随后新增真实 Chrome 三视口 E2E 与五张截图，当前尚不能沿用 Q15 的 `144/144` 全量基线。

## 2026-08-11 - Q44 独立 Web 审计

### 结论

- 独立只读审计 P0/P1 均为 0。合法显式 module 优先、非法 module fail closed、canonical 深链、schedule/custom URL 状态源、当前拍 `activeStep.after`、parallel C6 双通路、C5 unknown、单一 polite live region、`needs-review` 和措辞边界均通过复核。
- 三个 P2 只记录不修：CPU 十模块 tab 沿用既有 `.active` 而没有 `aria-pressed`；Q44 preset 与同 URL 冲突的 `r0/r1/memoryWord` 会保留矛盾参数但按 preset 重放；单测未逐项覆盖 split C6 unknown、两方案所有执行拍 AB 持续驱动及 back/forward 后 StepExplorer 复位。
- 前两个 P2 属于公共导航与 URL 规范化范围，本轮不扩大。第三项在 Q44 真实浏览器 E2E 补充，不修改核心或公共状态模型。

### 下一步

- 新增 `tests/e2e/micro-operations-lab.spec.ts`，同步四处既有 CPU 模块数 `9 -> 10`，使用独立端口完成 1440/1366/390 流程、五张截图和人工视觉检查；保持 8 workers 与 30 秒全局超时。

## 2026-08-11 - Q44 E2E 契约与 lint 检查点

- 新增 `tests/e2e/micro-operations-lab.spec.ts`。用例覆盖 canonical/custom URL、parallel-5 与 split-6、parallel C6 双通路、split C6 unknown、两方案全拍 AB、16 位回绕、错误恢复、reload/back/forward、Q44 真题与知识双向深链、1440/1366/390 截图、移动布局顺序、横向溢出和浏览器异常。
- 将四个既有 CPU E2E 的模块数契约从 `9` 更新为 `10`：`cpu-extended-labs.spec.ts`、`pipeline-lab.spec.ts`、`io-overhead-lab.spec.ts`、`memory-expansion-lab.spec.ts`。
- 五个相关 E2E 文件的定向 ESLint 已通过且无输出。三视口真实 Chrome、截图人工检查和全量门禁仍未运行，Q15 的 `144/144` 不能作为 Q44 的完成证据。
- Q44 继续保持 `needs-review`；本步骤没有修改 `408-user` schema v1、题包审核状态、旧图片或旧 `cpu-explorer`，没有删除测试、提交、推送或部署。

## 2026-08-11 - Q44 三视口真实 Chrome 与截图检查

- 独立端口 `4224` 的 Q44 定向 E2E 为 `3/3`，覆盖真实 Chrome 1440/1366/390。首次尝试因外层工具 5 秒超时引发旧 webServer 与新启动竞争，三个项目均在导航前得到连接拒绝；只读确认 `4224` 无监听、无关联 Node 进程和无残留截图后，干净重跑通过。
- 五张截图已逐张人工复查。桌面 10 模块导航完整，parallel C6 明确显示 DB 内存读和 CPU 内总线 R0 两条并行通路；A/MDR 为本拍新值，AC 仍为 unknown。390px 的 2 x 5 模块导航、步骤、寄存器、AB/DB/内总线和控制信号无横向溢出、文字重叠或底部导航遮挡。
- 独立只读复审未发现 P0/P1。保留三个 P2 级覆盖窄点：E2E 未重复断 `R0out/Ain`、终态 R0/R1 不变、split URL 单独 reload；相应组件/核心/路由测试已有覆盖，本轮不扩修。
- 三视口完成后仍未运行 Q44 全量静态、Vitest、release、内容、build 和全量 E2E 门禁，不能提前宣称收口；Q44 保持 `needs-review`。
- 随后全量 `npm run lint` 与所有 workspace `npm run typecheck` 通过，0 error / 0 warning；行为、内容和构建门禁尚未全部完成。
- 全量 Vitest 随后为 `66 files / 776 tests`，全部通过；不能沿用 Q15 的 `64 files / 752 tests` 作为当前基线。
- release 测试 `10/10`；内容校验真实通过 47 题并明确输出 `needs-review; verified 0/47`。来源审计没有被当作人工审核，题包状态未提升。
- production build 通过且无 chunk 告警；Vite 转换 `1896 modules`，PWA precache `79 entries (2530.88 KiB)`。此时只剩独立端口 `4225` 的全量 E2E 未完成。
- 独立端口 `4225` 的首轮全量 E2E 为 `145/147`，不能算门禁通过。Q44 自身 1440/1366/390 均通过；失败来自既有 1440 PDF 翻页和 1366 Q37 最终横溢轮询，二者都耗尽原 30 秒总超时。失败快照显示目标按钮/页面内容已存在，下一步用新端口隔离运行两个完整 spec，未修改测试或放宽合同。
- 端口 `4226` 的两个完整 spec 隔离复现为 `12/12`；原失败的 PDF 1440 与 Q37 1366 分别约 10.3 秒、11.8 秒通过，支持全量并发冷启动波动判断。仍需第二轮全量 E2E 通过才可收口。

## 2026-08-11 - Q44 最终收口

- 独立端口 `4227` 的第二轮全量真实 Chrome 为 `147/147`；8 workers 和 30 秒总超时未变。Q44 在首轮与第二轮全量中三视口均通过，首轮两个既有超时没有通过修改旧测试或放宽合同来掩盖。
- 最终门禁：全量 lint 0 error / 0 warning，workspace typecheck 全绿，Vitest `66 files / 776 tests`，release `10/10`，内容校验 `47 题/19 资产` 且 `needs-review; verified 0/47`，production build `1896 modules`，PWA precache `79 entries (2530.88 KiB)`，全量 E2E `147/147`。
- Q44 收口边界不变：只重放来源支持的 `parallel-5 / split-6`，只声明架构可见地址和写回结果一致；不提供任意微操作评分器、不声称两套方案穷尽所有合法答案、不把来源核对当作人工审核。题包和 Q44 均保持 `needs-review`。
- `408-user` 仍为 schema v1；旧图片和旧 `cpu-explorer` 未修改，既有测试未删除；没有提交、推送或部署。README 与 HANDOFF 已同步到当前 10 个 CPU 模块和最终验证基线。
- 收口后重新启动本项目 Vite 开发服务于 `127.0.0.1:4216`，监听 PID `46124`；Q44 canonical URL 当前返回 HTTP 200。该运行态不改变已完成的 production build 与 E2E 证据。

## 2026-08-12 - 下一实验模块只读候选审计

### 缺口与来源结论

- 运行时 public 题包与 `local-data/generated/2009.pack.json` 解析后完全一致。当前 47 题中已有 26 题真题/知识实验深链，剩余 21 题均为单选：数据结构 Q1/Q4/Q5/Q7/Q8/Q10，组成原理 Q19/Q20/Q22，操作系统 Q23/Q24/Q26/Q27/Q28/Q30/Q32，网络 Q33/Q34/Q36/Q38/Q40。
- 三路独立只读复核一致首选 Q10“排序趟次判别”。原卷第 2 页给出第二趟状态 `11,12,13,7,8,9,23,4,5`，正式解析第 3 页、当前题包与 crosscheck 均给出答案 B 插入排序。
- 可诚实实现的模型是对给定中间状态检查必要不变量：冒泡排序检查已归位末端极值，选择排序检查已归位前端极值，二路归并检查相邻分组有序，插入排序检查第二趟后的前三项有序。该状态排除前三者并保留插入排序。
- 最强反对意见成立：题目没有提供初始未排序序列，不能重放真实前两趟、恢复唯一前驱、声称得到唯一排序轨迹，也不能把本模块实现成任意排序识别器。若产品目标要求真实状态机重放，Q10 厚度不足，不应立项；本候选只适合命名为“第二趟状态的不变量判别器”。

### 候选排序与实施影响

- 次选 Q4 AVL 平衡检查，视觉价值高，但必须先从四张来源裁图结构化转录四棵树并独立核对，不能按 alt 猜拓扑。Q7 可讲握手定理和反例但动态输入不是题设；Q24/Q36 只能作为通用教学实验加概念深链，不能冒充真题过程重放。Q5/Q20/Q27/Q34/Q38 都是短公式或薄状态链；Q38 的 `Selective ACK` 表述为交叉材料污染，正确语义是普通累计 ACK。
- Q10 建议 canonical URL 为 `/lab/data-structures?module=sort-pass&preset=cn408-2009-q10`。数据结构模块将从 6 增至 7；约 8 处固定模块数断言需同步，现有移动三列布局会出现 `3+3+1`，需要重新设计导航。新增三视口 E2E 后全量数量预计至少从 `147` 增至 `150`，最终只能记录实测值。
- 若用户确认立项，先新增 `packages/lab-core/src/sort-pass-analysis.test.ts`，运行定向 Vitest并保留缺少 `sort-pass-analysis.ts` 的红灯；再实现纯逻辑和独立核心审计，只修立案 P1。随后按 Web 测试先行接入数据结构第 7 模块、canonical/custom URL、Q10 真题与知识双向深链、1440/1366/390 真实 Chrome、五张截图检查和全量门禁。

### 边界

- 本步骤只完成只读审计并更新 `HANDOFF.md` 与 `notes.md`。Q10 尚未立项，未新增代码、测试或题包变更；所有题仍保持 `needs-review`，来源核对未被当作人工审核。
- 未修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，未删除既有测试，未提交、推送或部署。Q44 的两套来源 trace 和现有全量基线均未重做。

## 2026-08-12 - Q10 核心测试红灯

- 用户已按候选审计建议确认 Q10 立项。新增 `packages/lab-core/src/sort-pass-analysis.test.ts`，契约覆盖 Q10 预设、四项必要不变量、固定逐项 trace、多候选不误判、重复/负安全整数、确定性、输入不变、快照隔离、稀疏数组和 64 项上限。
- 契约只使用 `ruled-out` 与 `not-ruled-out`，并要求普通有序序列保留多个候选且 `answerOptionId=null`；这防止把必要条件当充分条件。trace 不包含初始序列、前两趟重放或唯一前驱。
- 运行 `npm exec vitest run packages/lab-core/src/sort-pass-analysis.test.ts`，因无法解析尚不存在的 `./sort-pass-analysis` 得到预期 `1 failed / 0 tests`。这是缺模块红灯，不是回归通过。
- 本步骤只新增核心测试并更新检查点；尚未实现核心、导出、Web、路由、深链或 E2E。Q10 和题包继续保持 `needs-review`，其余禁止边界不变。

## 2026-08-12 - Q10 核心初版绿灯

- 新增并从 lab-core 导出 `sort-pass-analysis.ts`。输入限制为 3 到 64 个稠密安全整数；支持重复值和负数，所有返回数组与嵌套 segment 都做快照隔离，输入保持不变。
- 固定四个来源候选：冒泡检查末 2 项为全局最大 2 项且有序，插入检查前 3 项有序，选择检查前 2 项为全局最小 2 项且有序，二路归并检查对齐相邻二元组有序。逐项 trace 只有 initial、四个 invariant check 与 complete，不生成题干未知的初始序列或前两趟状态。
- 结果类型区分单一、多个或无候选；只有剩余一个题目列出的候选时才返回对应 option id。Q10 预设得到 A/C/D `ruled-out`、B `not-ruled-out`，而 `[1,2,3,4]` 保留四项且 `answerOptionId=null`。
- `npm exec vitest run packages/lab-core/src/sort-pass-analysis.test.ts` 为 `18/18`；`npm run typecheck -w @408os/lab-core` 与核心相关 ESLint 通过。当前进入独立核心审计；Web、路由、深链和 E2E 仍未开始。

## 2026-08-12 - Q10 独立核心审计红转绿

- 独立审计立案两个 P1。其一，初版把冒泡固定为最大值后置、选择固定为最小值前置，却未在 API 中声明方向约定；反方向实现会被误排除。其二，二路归并只检查相邻二元组，`[2,3,0,1,4]` 会错误保留 D，但标准自底向上第二趟应形成对齐四元有序段。
- 先新增方向无关极值位置与四元归并段回归，定向得到 `4 failed / 17 passed`。随后让冒泡/选择均以“前 2 项是全局最小 2 项，或后 2 项是全局最大 2 项”的任一必要条件保留，并让二路归并检查每个对齐四元 run；Q10 本身仍排除 A/C/D。
- 修复后定向 `21/21`、lab-core typecheck 与相关 ESLint 通过。输入验证、确定性、输入不变和嵌套快照隔离未发现问题；当前等待快速核心复审并进入 Web 测试先行。

## 2026-08-12 - Q10 Web 测试红灯

- 核心快速复审确认 P0/P1 已清零；只保留一个 P2 表达风险：Web 必须把 `segmentMode=any` 显示为“最小两项前置或最大两项后置满足其一”，不能画成两项都必须成立。
- 新增 `SortPassAnalysisLabPage.test.tsx`，覆盖 Q10 来源序列、`needs-review`、7 模块导航、六步逐项判别、最终才显示 B、必要条件措辞、自定义 URL、非法输入 fail closed、恢复 canonical、Q10 单题练习与知识节点。
- 扩展 `DataStructuresLabPage.test.tsx`、`lab-links.test.ts` 与四个既有数据结构页面测试，要求合法 module 优先、Q10 preset fallback、非法显式 module 不被 preset 偷渡、Q10 精确 deep link 和模块数 6 -> 7。
- 定向运行 8 个文件：核心 `21/21` 保持通过；Q10 页面因缺文件为 `0 test`，路由 2 项、深链 2 项、既有导航 4 项失败，合计 `7 failed files / 1 passed file`、`8 failed / 82 passed`。当前才开始 Web 实现，尚未新增 E2E。

## 2026-08-12 - Q10 Web 初版绿灯

- 新增独立 `SortPassAnalysisLabPage`，接入数据结构第 7 模块。canonical URL 为 `/lab/data-structures?module=sort-pass&preset=cn408-2009-q10`；自定义 URL 只写 `values`，不暴露可变 pass，preset 模式由来源序列覆盖冲突 values。
- 页面从 URL 直接派生序列并以 computation key 复位 StepExplorer。非法空项、非安全整数、少于 3 或超过 64 项都会 fail closed，矩阵、结论与步骤不残留；恢复按钮写回 canonical。
- 六步 UI 只按 A/B/C/D 逐项揭示必要条件，初始和中间步骤保持“待判定”，complete 才显示“题列四项中仅 B 未被必要条件排除”。冒泡/选择的两个方向明确写为“满足其一”；页面同时声明不是未知前两趟的重放证明。
- `DataStructuresModuleTabs` 扩展为 7 项，桌面 7 列，移动改为 12 track 的 4+3 等宽布局；Q10 真题与知识页共用精确 deep link。合法显式 module 优先，Q10 preset 只在没有显式 module 时 fallback，非法显式 module 不被 preset 偷渡。
- 初次实现后剩余 3 项失败均为新测试查询同时命中 section/table，以及反向断言使用 `getByRole`；收紧为 table role 与 `queryByRole` 后，核心+页面+路由+深链定向 `8 files / 94 tests`。lab-core/web typecheck 与相关 ESLint 全绿。当前进入独立 Web 审计，尚未新增 E2E。

## 2026-08-12 - Q10 独立 Web 审计与 E2E 契约

- 两路只读复审合并立案 3 个 P1：初始与 custom 页面顶部提前泄露“来源答案 B”；合法 `module=sort-pass` 携带其他题 preset 时路由进入 Q10 但页面报错；四个既有数据结构 E2E 仍断言 6 模块。
- 前两项先新增组件回归，得到 `2 failed / 3 passed`。随后移除初始页答案文案，只有 complete 的 canonical 判别结果才显示 B；合法显式 sort-pass module 忽略冲突 preset 并使用 Q10 默认序列。组件+路由恢复 `21/21`。
- 移动端滚动范围从整个 control panel 收窄到序列专用 viewport。独立 Web 复审确认 URL 派生、StepExplorer key 复位、非法输入 fail closed、`segmentMode=any`、单一 live region、深链和 4+3 导航无其它 P0/P1；保留 P2：custom 仅接受英文逗号。
- 同步四个既有数据结构 E2E 的模块数 6 -> 7，并新增 `sort-pass-analysis-lab.spec.ts`。契约覆盖逐项判别、最后一步结论、复位/播放、非法输入恢复、custom reload/back/forward、路由优先级、真题/知识双向深链、三视口截图、移动 4+3 布局和 `event -> trace -> state -> conclusion` 顺序、页面横溢与 `pageerror=[]`。
- 核心+Web 定向为 `8 files / 95 tests`，两个 workspace typecheck 和相关核心/Web/E2E ESLint 通过。真实 Chrome 和截图检查尚未运行。

## 2026-08-12 - Q10 三视口真实 Chrome 与截图检查

- 独立端口 `4230` 的 Q10 真实 Chrome 1440/1366/390 为 `3/3`。首次两次短外层命令分别在端口 `4228/4229` 被工具执行上限截断，没有返回 Playwright 结果，未记为应用通过或失败；用可续跑会话在干净端口完成了真实结果。
- 首轮五张截图发现移动候选表使用 720px 内部横向表格，虽然页面级无横溢，但截图只显示前两列，状态证据和判别不可直接扫读。将移动表格改为四张纵向候选记录，保留桌面表格；该视觉问题在进入全量门禁前修复。
- 独立端口 `4231` 第二轮三视口仍为 `3/3`。五张截图人工检查确认：桌面 7 列导航、序列、候选表、步骤与结论无重叠；390px 4+3 导航无孤立项，A-D 的条件、分段证据和判别同屏可见，event、StepExplorer、state、conclusion 顺序正确，页面无横向溢出或底部导航遮挡。
- 截图为 `chromium-1440-sort-pass-q10.png`、`chromium-1366-sort-pass-q10.png`、`chromium-390-sort-pass-q10-top.png`、`chromium-390-sort-pass-q10-state.png`、`chromium-390-sort-pass-q10-bottom.png`。当前进入全量静态、Vitest、内容、build 与全量 E2E 门禁。

## 2026-08-12 - Q10 全量静态门禁

- `npm run lint` 通过，0 error；`npm run typecheck` 的全部 workspace 通过。
- `npm run test` 通过：`68 files / 807 tests`。
- `npm run test:release` 通过：`10/10`。
- `npm run content:validate` 通过：`47 questions (40 objective, 7 comprehensive)`；题包保持 `needs-review; verified 0/47`，来源核对和自动门禁没有被当作人工审核。
- 下一步运行 production build；该结果尚未完成，不能沿用 Q44 基线冒充 Q10 结果。

## 2026-08-12 - Q10 最终边界审计 P1

- 修复前 production build 通过：Vite 转换 `1898 modules`，PWA precache `79 entries (2547.69 KiB)`。
- 独立最终边界审计立案 1 个 P1：主结论“题列四项中仅 B 未被排除”缺少“必要条件”限定，强于本模块能够证明的结论。其余边界审计 P0/P1 为 0。
- 已先把组件测试与 E2E 契约改为精确文案“题列四项中仅 B 未被必要条件排除”；页面实现尚未修改，下一步运行定向组件测试保留红灯。
- 定向组件测试按预期得到 `1 failed / 4 passed`；失败收到旧文案，证明测试能够捕获该边界回归。随后页面主结论已收紧为精确措辞，待定向转绿。
- 修复后组件 `5/5`、相关 ESLint 与 Web typecheck 通过；原审计代理复核确认 P0/P1/P2 均为 0。
- 修复后的全量 `npm run test` 为 `68 files / 807 tests`；`npm run build` 为 `1898 modules`，PWA precache `79 entries (2547.70 KiB)`。下一步重跑最终源码上的全量 lint/typecheck，并在独立端口 `4232` 运行全量 E2E。
- 最终源码上的全量 `npm run lint` 与 `npm run typecheck` 已再次通过；当前仅剩独立端口 `4232` 的全量真实 Chrome E2E。

## 2026-08-12 - Q10 首轮全量 E2E

- 独立端口 `4232` 的首轮全量真实 Chrome 为 `147/150`，因此不能记为门禁通过。Q10 的 1440/1366/390 三视口全部通过。
- 三个失败均为既有 1440 用例在普通 5 秒首屏 heading 断言处未找到页面：Q14 Cache、Q37 CSMA/CD、Q41 最短路径；对应 1366 与 390 视口均在同轮通过。
- 下一步检查三份失败截图与 error context，并在新端口隔离运行 `cpu-extended-labs.spec.ts`、`csma-cd-collision-lab.spec.ts`、`data-structures-lab.spec.ts` 的全部项目。不修改旧测试，不放宽显式 8 workers 或 30 秒总超时。
- 三份 error context 都停在应用壳的“载入页面”，而失败截图生成时三个目标页面均已完整渲染；没有显示页面逻辑错误或空白页面。
- 独立端口 `4233` 隔离三个完整 spec 的全部三视口为 `15/15`。原失败的 Q14/Q37/Q41 1440 用例分别约 `7.7s / 13.8s / 5.3s` 通过。下一步用端口 `4234` 进行第二轮全量复验。
- 独立端口 `4234` 第二轮全量为 `144/150`，仍不能收口。Q10 三视口再次全部通过；失败为 Q3/Q14/Q25/Q37/Q41 的 1440 首屏 heading 与 Q9 的 390 首屏 heading，全部停在普通 5 秒等待，其他视口均通过。
- 下一步确认 Playwright/webServer 已退出与当前机器负载，在干净端口隔离第二轮 6 个完整 spec，再进行第三轮全量。不得改旧测试或放宽 8 workers / 30 秒合同。
- `4232/4233/4234` 均无残留监听；隔离前系统约有 `4.3 GB / 16 GB` 可用物理内存。
- 独立端口 `4235` 隔离第二轮 6 个失败所在完整 spec 的全部三视口为 `24/24`，最慢用例仍低于 30 秒。下一步端口 `4236` 第三轮全量。
- 独立端口 `4236` 的第三轮全量真实 Chrome为 `150/150`，总耗时 `3.8m`，stderr 为空。验证合同保持 8 workers、30 秒总超时和普通 5 秒断言，Q10 的 1440/1366/390 三视口再次全部通过；本次结果可作为最终全量 E2E 门禁证据。
- 两路最终只读复核再次确认 initial/custom 初始态均为“待判定”，旧的“来源答案 B”提前泄露 P1 已修复。新增 custom 完成态组件回归，`values=1,2,3,4` 走完六步后断言“仍有多个题列候选未被排除”，并反向断言不含“仅 B”或“来源答案 B”；定向 Vitest `6/6`、相关 ESLint通过。

## 2026-08-12 - Q10 最终收口

- Q10 文档已完成最终同步：数据结构实验由 6 个更新为 7 个模块，真题与实验/知识双向深链更新为 `27/47`，README 与 HANDOFF 均写明 Q10 只作四项必要条件判别。
- 最终新鲜源码门禁为 lint 0 error、workspace typecheck 全绿、Vitest `68 files / 808 tests`、release `10/10`、内容校验 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、production build `1898 modules` / PWA precache `79 entries (2547.70 KiB)`。
- 独立端口 `4236` 全量真实 Chrome `150/150`，总耗时 `3.8m`，stderr 为空；Q10 1440/1366/390 三视口在全量中全部通过，定向 `4230/4231` 仍为 `3/3`，五张截图已人工检查。
- Q10 custom 回归确认自定义序列完成后不会投射 Q10 的 B 结论；Q10 与题包继续 `needs-review`，自动校验不替代人工审核。未修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，未删除测试，未提交、推送或部署。
- 最终运行态冒烟：本项目 Vite 以 `@408os/web` workspace 正确监听 `127.0.0.1:4216`；Q10 canonical URL 返回 HTTP `200`，标题为 `408OS`。首次根脚本参数转发错误只启动了默认 `5173`，已停止本会话启动的错误进程并重新用 workspace 参数绑定 `4216`。

## 2026-08-12 - Q10 后续候选只读审计

### 审计范围与结论

- Q10 已收口，本轮没有重做 Q44、Q10 或此前候选比较。只读复核剩余未接实验深链的 20 道单选题：Q1/Q4/Q5/Q7/Q8、Q19/Q20/Q22、Q23/Q24/Q26/Q27/Q28/Q30/Q32、Q33/Q34/Q36/Q38/Q40。
- 来源审计与交互审计分别评估题内参数、正式解析/crosscheck 一致性、确定性 trace、可视化学习价值、题外状态风险和模块导航成本。综合首选 Q5 完全二叉树最大结点数，次选 Q34 QAM/奈氏准则；Q4 只有在四棵来源树拓扑被独立结构化转录并逐结点核对后才可重新评估。
- Q5 来源参数完整：第 6 层有 8 个叶结点。最大构型高度取 7；前六层为满二叉树，共 63 个结点；第六层 32 个位置中右侧 8 个为叶结点，前 24 个非叶结点各产生 2 个孩子，第七层有 48 个结点；总数为 `63 + 48 = 111`，对应选项 C。可形成“层容量 -> 高度上界 -> 内部/叶分区 -> 下一层孩子槽 -> 总数”五至六步确定性 trace。
- Q5 的最强反对意见成立但不构成否决：它是极值计数而非动态算法，且与 Q3/Q9 树可视化有概念重叠。相比之下，Q34 更适合解释 state/bit/baud/bps，但题干没有相位角、幅度值或码字映射；若画成真实星座或给各点分配码字会虚构来源。按当前证据优先标准，Q5 风险更低。

### 暂缓项与实施边界

- Q20 公式为 `4 B x 10 MHz / 2 = 20 MB/s`，但本质是短单位换算且 CPU 导航会从 10 增至 11；当前题包/crosscheck 的展示公式还有转录脏点，若以后立项应以正式解析页重写公式。
- Q27 参数完整但只有 32 位拆为 8 位段号与 24 位段内位移的薄 trace。Q38 虽能得到累计 ACK 1000，但现有解析把普通累计确认误称为 Selective ACK，且只有两个连续区间。Q7 当前解析的反例和量词有实质错误。Q33、Q40 的解析也有过度或不严谨表述，均不进入本轮立项候选。
- Q1/Q8/Q19/Q22/Q23/Q24/Q26/Q28/Q30/Q32/Q36 主要是概念分类或静态性质。要形成动态实验必须补造题干未给的任务、进程、地址、块、设备映射或交换表，只能以后作为明确标注的通用教学模块，不能冒充来源支持的真题重放。
- 若用户确认 Q5，先新增 `packages/lab-core/src/complete-binary-tree.test.ts` 并保留缺模块红灯，再实现来源支持的最大构型和受限 custom。custom 只接受可证明可实现的正整数层号/叶数域，并限制层数或用聚合格避免指数溢出和 DOM 爆炸；不得生成任意树或实现任意完全二叉树评分器。
- 本步骤只更新 `HANDOFF.md` 与 `notes.md`，没有新增或修改源码、测试、题包、审核状态或 schema。所有题继续 `needs-review; verified 0/47`；来源核对不是人工审核。未删除旧图片或现有测试，未修改旧 `cpu-explorer`，未提交、推送或部署。

## 2026-08-12 - Q5 核心测试红灯

- 用户已按候选审计建议确认 Q5 立项。新增 `packages/lab-core/src/complete-binary-tree.test.ts`，契约覆盖 Q5 第 6 层 8 个叶结点推导最大 111 个结点、`initial -> bound-height -> fill-upper-levels -> partition-leaf-level -> fill-last-level -> complete` 六步逐步揭示、`L=1` 与满层叶结点边界、一般化可实现域、确定性、冻结输入不变、快照隔离、未知字段拒绝和安全整数上限。
- 运行 `npm exec vitest run packages/lab-core/src/complete-binary-tree.test.ts`，因无法解析尚不存在的 `./complete-binary-tree` 得到预期 `1 failed / 0 tests`。这是缺模块红灯，不是回归通过。
- 当前只新增核心测试；尚未实现核心、导出、Web、数据结构第 8 模块、深链或 E2E。Q5 与题包继续 `needs-review`，来源核对没有被当作人工审核；其余禁止边界不变。

## 2026-08-13 - Q5 核心初版绿灯

- 新增并从 lab-core 导出 `complete-binary-tree.ts`。核心固定六步聚合 trace，只推导高度上界、目标层容量、目标层内部/叶分区、下一层结点数和最大总结点数，不枚举 111 个节点，也不生成或评分任意完全二叉树。
- 一般化 config 为 `leafLevel` 与 `leafCountAtLevel`。两者必须是正安全整数，叶数不能超过该层容量；`leafLevel` 上限为 52，保证允许域内 `2^L - 1 + 2(2^(L-1)-k)` 等派生量保持安全整数。满层全部为叶时高度保持为 L，否则最大高度为 L+1。
- Q5 得到第 6 层容量 32、8 个叶、24 个内部结点、第 7 层 48 个结点、前六层 63 个结点和最大总数 111。定向 Vitest `18/18`、`@408os/lab-core` typecheck 与核心相关 ESLint 均通过。
- 当前进入独立核心审计；Web、路由、数据结构第 8 模块、双向深链和 E2E 尚未开始。Q5 仍为 `needs-review`，不得把来源核对或核心门禁当作人工审核。

## 2026-08-13 - Q5 独立核心审计红转绿

- 独立核心审计立案一个 P1：初版 step state 缺少 `leafLevel`，trace 脱离输入后不能自解释；同时先披露最大高度、后披露层容量与内部结点数，使满层全为叶的 custom 状态提前给出一个尚无法由当前证据推导的高度。
- 先新增自描述 state、因果步骤顺序与满层边界回归，定向得到 `3 failed / 16 passed`。随后 state 永久携带 `leafLevel`，trace 调整为 `initial -> fill-upper-levels -> partition-leaf-level -> bound-height -> fill-last-level -> complete`，并导出 `COMPLETE_BINARY_TREE_MAX_LEAF_LEVEL=52` 供 Web 单源校验。
- 修复后定向 Vitest `19/19`、lab-core typecheck 与相关 ESLint 全绿。独立数学审计另用堆下标穷举 `L=1..6` 的全部合法 k，均符合 `Nmax = 2^(L+1)-1-2k`；确认 `k=0` 时最大规模无界，必须拒绝，而 `L=1,k=1` 必须得到 1。
- 当前等待原审计者快速复审；Web、路由、双向深链和 E2E 仍未开始，Q5 继续 `needs-review`。

## 2026-08-13 - Q5 Web 测试红灯

- 原核心审计者复审确认 P0/P1/P2 均为 0，独立实跑核心 `19/19`、lab-core typecheck 与相关 ESLint 通过。
- 新增 `CompleteBinaryTreeLabPage.test.tsx`，覆盖 Q5 来源参数、`needs-review`、8 模块导航、六步因果披露、最终 111/C、受限 custom URL、非法输入 fail closed、恢复 canonical、冲突 preset 处理、Q5 单题练习与知识节点。
- 扩展 `DataStructuresLabPage.test.tsx`、`lab-links.test.ts` 与五个既有数据结构页面测试，要求合法 module 优先、Q5 preset fallback、非法显式 module 不被 preset 偷渡、Q5 精确 deep link 和模块数 7 -> 8。
- 定向运行 9 个文件：核心保持 `19/19`；Q5 页面因文件尚不存在为 `0 test`，深链 2 项、路由 2 项、既有导航 5 项失败，合计 `8 failed files / 1 passed file`、`9 failed / 90 passed`。当前才开始 Web 实现，尚未新增 E2E。

## 2026-08-13 - Q5 Web 初版绿灯

- 新增独立 `CompleteBinaryTreeLabPage` 并接入数据结构第 8 模块。canonical URL 为 `/lab/data-structures?module=complete-tree&preset=cn408-2009-q05`；custom URL 只写 `leafLevel` 与 `leafCount`，preset 模式忽略冲突 custom 参数，非法显式 module 不被 Q5 preset 偷渡。
- 页面从 URL 直接派生 core trace，并以 computation key 复位 StepExplorer。非法空值、非正整数、层数超过 52 或叶数超过目标层容量都会 fail closed，不残留聚合图、步骤或结论；恢复按钮写回 canonical。
- Q5 预设逐步显示第 6 层容量 32、前六层 63、24 个内部结点/8 个叶结点、最大高度 7、第七层 48 和最终 111/C。目标层最多画 32 个槽；更大 custom 只显示比例与汇总，避免指数 DOM。custom 完成态只显示自身最大结点数，不投射来源选项 C。
- `DataStructuresModuleTabs` 扩展为 8 项，桌面 8 列、移动 4+4；Q5 真题与知识页共用精确 deep link，页面提供 Q5 练习与知识节点反向链接。
- 初次实现后的 4 项失败只是新测试与 DOM 表达不一致：number input 原为文本类型、分区短语缺“个”。修正语义后核心+页面+路由+深链及五个既有导航测试为 `9 files / 104 tests`，lab-core/Web typecheck 和相关 ESLint 全绿。当前进入独立 Web 审计，尚未新增 E2E。

## 2026-08-13 - Q5 独立 Web 审计与 E2E 契约

- 独立数学/Web 审计立案两个 P1。其一，满层 custom（如 `L=3,k=4`）核心正确给出高度 3、下一层新增 0，但页面把该数量误称为“第 3 层 0 个结点/末层结点”，与该层实际 4 个叶结点矛盾。其二，页面用“存在 preset 参数”判断来源模式，foreign/空 preset 完成态也会错误显示“来源选项 C”。
- 先新增 `L=3,k=4`、`L=1,k=1` 和 foreign preset 完成态回归，得到 `3 failed / 4 passed`。随后统一把 `nodesAtLastLevel` 呈现为“L+1 层新增结点”，零值显示“无需新增 L+1 层”；只有精确 `preset=cn408-2009-q05` 才允许显示来源 C，foreign preset 仍按既有路由合同使用 Q5 默认输入但不归因来源答案。
- 修复后核心+页面+路由+深链定向 `9 files / 106 tests`，lab-core/Web typecheck 与相关 ESLint 全绿。页面 CSS grid 在移动端固定为 `config -> event -> trace -> state -> conclusion`。
- 新增 `tests/e2e/complete-binary-tree-lab.spec.ts`，覆盖 canonical/custom URL、六步 `32 -> 24+8 -> 48 -> 111`、C 只属于 Q5 preset、32 槽分区、非法输入恢复、播放/复位、reload/back/forward、路由优先级、真题/知识双向深链、1440/1366/390 截图、移动 4+4 和纵向顺序、页面横溢及 `pageerror=[]`。五个既有数据结构 E2E 的模块数 7 -> 8，Q10 移动几何改为 4+4；相关 E2E ESLint 通过。真实 Chrome 尚未运行。
- 独立 Web 复审又立案一个 P1：合法上限 `L=52,k=1` 的 16 位数量在移动端三列指标中互相覆盖，并使 `.main-area` 横向超出约 21px。新增最大安全整数组件回归，移动指标改为单列并允许数字断行；分区图同时改为带动态摘要的 `role=img`，32 个视觉槽对读屏隐藏。修复后核心+Web 定向 `9 files / 107 tests`，typecheck 与相关 ESLint 全绿；E2E 追加极值移动无横溢和三项指标不重叠合同。
- Web 审计保留两个 P2：foreign preset 虽已不会显示来源 C，但仍使用 Q5 默认输入且保留矛盾 URL；该行为与既有模块冲突 preset 合同一致，本轮不扩大公共 URL 规范化。目标层槽位的可访问摘要已顺手补齐，不再保留对应 P2。
- 端口 `4237` 的首轮 Q5 真实 Chrome 三视口均运行，但都在相同陈旧 E2E 文案断言处失败：测试期待“第 7 层 48 个结点”，页面已按前述 P1 修复为“第 7 层新增 48 个结点”。失败上下文均显示页面、32 槽分区和步骤已正常渲染；因为尚未走到后续合同，本轮记为 `0/3`，不能当作浏览器通过。已同步精确文案，下一步用端口 `4238` 干净重跑。

## 2026-08-13 - Q5 三视口真实 Chrome 与截图检查

- 同步精确文案后，独立端口 `4238` 的 Q5 真实 Chrome 1440/1366/390 为 `3/3`。契约覆盖 canonical/custom URL、六步 `32 -> 24+8 -> 48 -> 111`、来源选项 C 边界、32 槽聚合分区、错误恢复、播放/复位、reload/back/forward、真题与知识双向深链、移动 4+4 导航、极值布局、页面横溢和 `pageerror=[]`。
- 五张截图已逐张人工检查：`chromium-1440-complete-binary-tree-q05.png`、`chromium-1366-complete-binary-tree-q05.png`、`chromium-390-complete-binary-tree-q05-top.png`、`chromium-390-complete-binary-tree-q05-state.png`、`chromium-390-complete-binary-tree-q05-bottom.png`。桌面与移动均能清晰看到 32 槽、24/8 分区、前六层 63、第七层新增 48、最大总结点数 111 和来源选项 C；4+4 导航、步骤、状态与结论无明显重叠、横溢或底部导航遮挡。
- 原 Web 审计者再次只读复核合法极值 `L=52,k=1`：P0/P1 为 0，390px 下根文档和 `.main-area` 横溢均为 0，三个指标严格纵向排列，两个 16 位大整数完整且无裁切。保留一个测试精度 P2：E2E 的组间几何断言允许约 1px 容差，且没有逐个断言数字元素自身 `scrollWidth <= clientWidth`；当前真实布局已通过，因此本轮不扩大测试修改。
- Q5 仍为 `needs-review`；三视口验收、来源核对与自动门禁都不构成人工审核。页面只推导来源支持的最大构型和受限 custom，不生成或评分任意完全二叉树。下一步更新 README 后运行全量 lint、workspace typecheck、Vitest、release、内容校验、production build 和独立端口全量 E2E。

## 2026-08-13 - Q5 全量静态与 Vitest 门禁

- README 已同步为数据结构 8 个模块、真题/实验/知识双向深链 `28/47`，并明确 Q5 只推导最大构型，不生成或评分任意完全二叉树。
- 最终源码上的 `npm run lint` 通过，0 error；`npm run typecheck` 的全部 workspace 通过。
- `npm run test` 通过：`70 files / 840 tests`。这是 Q5 改动后的新鲜实测结果，未沿用 Q10 的 `68 files / 808 tests` 基线。
- 下一步继续运行 release、内容校验与 production build；通过后用独立端口运行全量真实 Chrome E2E。Q5 和题包仍为 `needs-review`，自动门禁不替代人工审核。

## 2026-08-13 - Q5 release、内容与 production build 门禁

- `npm run test:release` 通过：`10/10`，发布准备的 47/47 gate、资产摘要、路径边界、原子安装与回滚合同保持全绿。
- `npm run content:validate` 通过：`47 questions (40 objective, 7 comprehensive)`；输出明确为 `needs-review; verified 0/47`。Q5 的来源核对与页面结果没有改变题包或人工审核计数。
- `npm run build` 通过且无 chunk size 告警：Vite 转换 `1900 modules`，PWA precache `79 entries (2564.22 KiB)`。
- 当前六项源码/内容/构建门禁均已完成，只剩独立端口 `4239` 的全量真实 Chrome E2E 和 `127.0.0.1:4216` Q5 canonical URL 运行态冒烟。

## 2026-08-13 - Q5 全量 E2E 首轮未收口

- 独立端口 `4239` 的全量真实 Chrome 使用项目默认 `8 workers`、30 秒全局超时，运行 `153 tests`，实测 `152 passed / 1 failed`，总耗时约 `3.8m`。
- Q5 `complete-binary-tree-lab.spec.ts` 的 1440/1366/390 三视口均通过；Q5 不是失败来源。
- 唯一失败是既有 `tests/e2e/data-structures-lab.spec.ts` 的 chromium-1440 Q41 首屏标题断言，在普通 5 秒等待内未找到“最短路径实验室”并耗尽该测试 30 秒预算；同一 spec 的 1366/390 已通过。该轮不能记为全量门禁通过，也没有修改旧测试、并发或超时合同。
- 下一步检查该失败的 error context/trace，并在干净独立端口隔离运行完整 `data-structures-lab.spec.ts`；若隔离通过，再进行第二轮全量复验。

## 2026-08-13 - Q5 全量 E2E 隔离复跑

- `4239` 失败的 error context 显示页面停在应用壳“载入本地学习数据”，未出现 Q41 页面逻辑错误或空白渲染；`4239` 已退出且无监听。
- 独立端口 `4240` 隔离运行完整 `tests/e2e/data-structures-lab.spec.ts`，三视口共 `6/6`，Q41 1440 约 `2.2s` 通过，Q42 三视口也全部通过。该证据支持首轮失败是并发冷启动波动，不修改旧测试、8 workers、30 秒全局超时或页面源码。
- 下一步用独立端口 `4241` 进行第二轮全量 153 条真实 Chrome E2E；只有该轮全绿才记录最终 E2E 门禁。

## 2026-08-13 - Q5 全量 E2E 第二轮未收口

- 独立端口 `4241` 第二轮全量仍为 `152 passed / 1 failed`（`153 tests`，约 `3.6m`）。Q5 三视口再次全部通过，失败漂移到既有 `tests/e2e/content-review.spec.ts` 的 chromium-1440：第 41 题按钮已定位，但点击动作等待元素稳定时耗尽 30 秒；错误上下文不是 Q5 页面错误。
- 该结果仍不能作为全量门禁通过；没有修改旧测试、并发或超时合同。下一步用独立端口隔离运行完整 `content-review.spec.ts`，确认冷启动波动后再进行第三轮全量。

## 2026-08-13 - Q5 content-review 隔离复跑

- 独立端口 `4242` 完整运行 `tests/e2e/content-review.spec.ts`，三视口共 `12/12`；此前失败的 chromium-1440 首屏、第 41 题按钮点击和后续审核流程均在约 `1.4s - 3.4s` 内通过。
- 结合 `4240` 数据结构 `6/6`，两轮全量中的不同 1440 失败均被隔离复现为通过，判断为 8-worker 并发冷启动资源竞争的环境 P2；不修改旧测试、8 workers、30 秒超时或应用逻辑。
- 下一步端口 `4243` 第三轮全量 E2E；若达到 `153/153`，记录为 Q5 收口门禁。

## 2026-08-13 - Q5 全量 E2E 第三轮与隔离复核

- 端口 `4243` 第三轮全量为 `147 passed / 2 failed`，另有 4 条因同一 worker/spec 超时未运行。失败分别是 Q5 chromium-1440 在完成初始页面后续流程中耗尽 30 秒，以及既有 PDF visual chromium-1366 在普通 5 秒等待内未出现 canvas；Q5 chromium-1366/390 通过，其他已执行用例通过。
- 两份 error context 均无 `pageerror` 或逻辑错误：Q5 页面快照已完整渲染到 `initial`，PDF 停在“解析 PDF 页面”。
- 独立端口 `4244` 的 Q5 三视口为 `3/3`（约 11--12 秒/视口）；独立端口 `4245` 的 visual spec 三视口共 `27/27`，PDF canvas 三视口均约 2 秒出现。结合前两轮的漂移失败，确认是当前 8-worker 并发冷启动资源竞争 P2，不修改应用、旧测试、workers 或超时。
- 下一步端口 `4246` 第四轮全量；需要 `153/153` 才能将全量 E2E 记为通过。

## 2026-08-13 - Q5 全量 E2E 第四轮未收口

- 端口 `4246` 第四轮仍未收口：`146 passed / 7 failed`，失败全部集中在 chromium-1440 的首屏标题等待，包含 Q5、Q3、Q41、Q14、Q25、Q37 和题库首页；其他已运行的 1366/390 用例均通过，剩余 0 条未运行。
- 该轮所有失败都来自应用壳/页面首屏冷启动竞争，非 Q5 断言或数据错误；隔离的 Q5、数据结构、content-review、visual spec 均已通过。当前不修改 8 workers、30 秒总超时或既有测试，改用每项目独立运行收集完整三视口证据。

## 2026-08-13 - Q5 按视口拆分 E2E

- 端口 `4247` 仅运行 chromium-1440 的全部 `51` 条：`50/51`，唯一失败是 Q5 长链测试超时；其他 50 条含 Q41、PDF、content-review 均通过。
- 端口 `4248` 仅运行 chromium-1366 的全部 `51` 条：`51/51`。
- 端口 `4249` 仅运行 chromium-390 的全部 `51` 条：`51/51`。
- 结合 Q5 独立 `4244` 的 `3/3`，失败归因仍是 1440 并发/长链环境 P2，不修改 Q5 断言、旧测试、8 workers 或 30 秒超时。下一步 `4250` 重跑默认全量。

## 2026-08-13 - Q5 默认全量最后一轮

- 端口 `4250` 默认合同（`8 workers`、30 秒全局超时、三视口）实测 `152 passed / 1 failed`，失败为既有 content-review chromium-1440 首屏标题普通 5 秒等待；Q5 三视口均通过，1366/390 全部 `51/51`。
- 当前机器在 8-worker 并发下会随机让不同 1440 首屏/长链超过普通 5 秒等待；没有修改测试、超时、并发或应用逻辑。下一步补跑 chromium-1440 单 worker 全集作为环境对照，然后只记录真实可复现结果。

## 2026-08-13 - Q5 单 worker 对照与运行态冒烟

- 命令：`$env:PLAYWRIGHT_TEST_PORT='4251'; npm run test:e2e -- --project=chromium-1440 --workers=1`
- 实测：完整 `51 tests`，`51 passed`，耗时约 `2.3m`。Q5、Q44、Q10、PDF、Q41、题库首页和其他既有长链均通过。该结果是并发环境对照，不改变项目默认 `8 workers`、30 秒全局超时合同。
- 结论：结合端口 `4239/4241/4243/4246/4250` 的默认全量漂移失败、隔离 spec 与按视口证据，1440 失败归因为本机 8-worker 并发冷启动资源竞争 P2；不修改旧测试、并发、超时或应用逻辑。
- 运行态命令：`Invoke-WebRequest http://127.0.0.1:4216/lab/data-structures?module=complete-tree&preset=cn408-2009-q05`。
- 运行态实测：`HTTP 200`，HTML 标题 `408OS`，存在 `id=\"root\"`。Q5 仍保持 `needs-review; verified 0/47`，自动门禁与来源核对不替代人工审核。
- 未做：未修改 `408-user` schema v1、旧图片、旧 `cpu-explorer` 或现有测试；未删除、提交、推送或部署。

## 2026-08-13 - 自主领域与存储审计红转绿

- 审计复现：`evaluateResponse` 接受综合题 `selfScore=NaN`，`aggregateKnowledgePerformance` 结果出现 `performance/weakness=NaN`；`DexieStudyRepository.submitAttempt` 的已有 attempt 幂等分支仍写入传入 session，可造成 attempt 保留 A、session response 被并发旧调用覆盖为 B，后续 backup 校验失败。
- 测试先红：新增 study/analytics/storage 回归后，定向为 `4 failed / 43 passed`。
- 修复：综合题自评分要求 finite；analytics 拒绝非有限/负分；`aggregateStats` 仅统计 single-choice；幂等提交发现 existing attempt 时不再写入 candidate session。
- 测试转绿：`npm exec vitest run packages/domain/src/study.test.ts packages/domain/src/analytics.test.ts packages/storage/src/storage.test.ts`，实测 `3 files / 47 tests passed`。
- Web 审计 P0/P1 为 0；Q35/Q46/Q47 custom URL 恢复与网络 tab aria 语义为未立案 P2，不在本轮修复。

## 2026-08-13 - ContentReview 写入竞态收口

- 审计还发现 ContentReview 自动保存与批准/驳回没有串行化，卸载保存未捕获异常。新增串行写入队列及两项队列回归，保证失败可恢复、写入顺序稳定。
- 页面使用 write epoch 使决定操作取消尚未开始的旧草稿写入；已开始的草稿写入仍按队列先完成，批准/驳回随后落盘，旧回调不再把 UI 状态改回草稿。
- 相关定向：队列、domain、storage、应用 storage 共 `5 files / 69 tests passed`；lint/typecheck 全绿。
- 真实浏览器：`PLAYWRIGHT_TEST_PORT=4252 npm run test:e2e -- tests/e2e/content-review.spec.ts`，三视口 `12/12`。

## 2026-08-13 - 自主优化最终验收状态

- 完成领域有限值防污染：`evaluateResponse` 拒绝 `NaN/Infinity`，analytics 拒绝非有限/负综合题分数，复习计划忽略异常质量，`aggregateStats` 不再把综合题伪造的 `correct` 计入客观准确率。
- 完成存储幂等一致性：同一 session/question 已有 attempt 时保持已提交 session，不再写入并发旧调用方的 candidate。新增并发回归证明 attempt 与 session response 不会分叉。
- 完成 ContentReview 写入串行化：自动保存、approve/reject、卸载保存共用队列；epoch 跳过尚未开始的旧草稿；已开始写入完成后才执行决定；失败不阻塞后续写入。新增页面竞态测试。
- 最终实测：Vitest `72 files / 848 tests`；lint、workspace typecheck、build `1901 modules` / PWA `79 entries (2564.80 KiB)`；release `10/10`；content validate `47 questions / 19 assets`，`needs-review; verified 0/47`。
- 浏览器实测：content-review 独立三视口 `12/12`；默认 `8 workers` 全量 `153/153`。本轮修复没有引入 E2E 回归。
- 审计无新 P0/P1。P2 backlog：Q35/Q46/Q47 custom URL 未写回、网络 tabs 缺 aria 选中语义。没有授权则不修改 schema v1、旧图片或旧 `cpu-explorer`，不删除测试、不提交、不推送、不部署。

## 2026-08-13 - 复核提效与实验 URL 红灯

- 用户授权把此前 P2 backlog 升级为实施项，并补充内容复核工作台提效与 Q35 输入规模边界；范围只覆盖复核筛选/跳转、Q35/Q46/Q47 URL 和网络模块导航语义。
- 测试先行覆盖：`status=all|pending|rejected|approved`、向后循环的“下一道待复核”；Q35 `sequenceSpace/windowSize/script`；Q46 `addresses/tlbNs/memoryNs/faultNs`；Q47 `cidr/subnets/destination`；custom 编辑移除 `preset`，恢复按钮回各自 canonical preset URL。
- Q35 明确拒绝超过 `16384` 字符或超过 `128` 条动作的脚本，避免超大输入进入解析/trace；这只是资源边界，不是任意脚本评分器。
- 首轮测试夹具曾让 Q1 预置 `approved`，使旧竞态测试点击复选框变成取消；已改由 Q3 验证并把 status 查询收紧到 `.review-save-status`，不把夹具错误计为产品红灯。
- 新鲜定向实测：`4 failed files`、`5 failed / 11 passed`。五个失败与新增契约一一对应，既有写入竞态和其余页面测试通过。下一步实现后复跑同一命令，保留红转绿证据。
- 内容边界不变：题包保持 `needs-review; verified 0/47`，页面筛选不得自动改变任何复核记录。

## 2026-08-13 - 复核工作台与 Q35 实现

- ContentReview 的筛选状态直接从 URL 读取；非法状态回退全部。筛选按钮显示 `全部/待复核/有问题/已通过` 计数并使用 `aria-pressed`，palette 只渲染匹配题号。“下一道待复核”从当前题后查找并在末尾循环。
- 所有题号跳转仍复制既有 search params 并走原异步 `goToQuestion`，没有旁路 650ms 自动保存、串行写队列或决定 epoch。筛选和跳转都不会自动批准、驳回或勾选记录。
- Q35 精确 `preset=cn408-2009-q35` 时读取来源预设；其他情况从 `sequenceSpace/windowSize/script` 恢复。任一输入编辑会 replace 为完整 custom URL；恢复按钮 replace 为 `?module=gbn&preset=cn408-2009-q35`。
- `parseActions` 之前先检查脚本文本 `<=16384` 字符、非空动作 `<=128` 条，超限使用既有 error/alert 路径，不生成 trace。该边界仅限制资源规模，不声称评分或覆盖任意合法协议脚本。
- 独立实测：`ContentReviewPage.test.tsx` `2/2`；`GbnLabPage.test.tsx` `7/7`；相关 ESLint 与 `@408os/web` typecheck 通过。联合定向将在 Q46/Q47 与公共导航汇合后执行。

## 2026-08-13 - Q46/Q47 URL 与网络语义导航

- Q46/Q47 沿用已验证的 CSMA/CD URL 范式，不新建跨页面状态框架。页面输入直接从 search params 派生，编辑时一次写全当前 custom draft 并使用 `{ replace: true }`，避免 React state 与 URL 双状态源。
- Q46 canonical 为 `?module=memory&preset=cn408-2009-q46`；Q47 canonical 为 `?module=cidr&preset=cn408-2009-q47`。精确 preset 忽略冲突 custom；无/foreign preset 使用 URL custom 或来源默认值，但编辑后移除 preset。
- 网络模块导航现在是 `<nav aria-label="计算机网络实验模块">` 下四个 React Router `Link`，当前项 `aria-current="page"`；链接目标始终为 Q47/Q35/Q39/Q37 canonical preset。
- 因此将 Q37 两处直接受影响的旧契约从 4 个按钮更新为 4 个链接，并增加当前 CSMA/CD 链接的 `aria-current`；没有删除或弱化既有流程测试。
- 联合命令：`npm exec vitest run apps/web/src/pages/ContentReviewPage.test.tsx apps/web/src/pages/GbnLabPage.test.tsx apps/web/src/pages/VirtualMemoryLabPage.test.tsx apps/web/src/pages/NetworkLabPage.test.tsx apps/web/src/pages/CsmaCdCollisionLabPage.test.tsx apps/web/src/pages/TcpCongestionLabPage.test.tsx apps/web/src/pages/NetworkLabRouterPage.test.tsx`。
- 新鲜结果：`7 files / 32 tests passed`。这包含公共导航的 Q35/Q37/Q39/Q47 回归，以及复核写入竞态和 Q46 URL 契约。

## 2026-08-13 - 相关 E2E 首轮证据

- 端口 `4254`、默认 `8 workers`、三个真实 Chrome 视口，四个相关 spec 共 `33` 条，结果 `22 passed / 11 failed`。
- 确定性测试缺陷 1：`getByLabel('序号空间')` 会同时匹配 Q35 input 与 aria-label 为“发送端序号空间”的状态容器，三个视口均 strict mode 失败。改为 `getByRole('textbox', { name: '序号空间', exact: true })`。
- 确定性测试缺陷 2：Q37 E2E 在新增 link 计数与 aria-current 后仍残留 `getByRole('button', { name: 'CSMA/CD' })` 的 class 断言，390 必现失败。改为当前 link 的 class 断言。
- 其余失败分布在 content-review 1440、Q37 1440/1366、disk 1440/1366、Q46 1440/1366 的首屏标题等待；错误发生在页面功能交互前，需修正上述确定性问题后用干净端口重跑，当前不作最终归因。

## 2026-08-13 - 独立审计补强

- ContentReview 决定写入竞态 P1：`actionBusy` 原只禁用三个底部命令和导出，但没有冻结题号/筛选/表单。deferred approve 测试先红 `1/3`，修复后 `3/3`；入口函数也忙时短路，不能仅靠 DOM disabled。
- Q35 绝对输入边界保持 `16384` 字符、`128` 条非空动作；另外增加编码后的 search string `<=8000` 传输预算。校验顺序为绝对文本/动作边界优先，再检查 URL 预算。超预算时保留绑定当前 `location.key` 的完整临时 draft，不修改 URL/history、不生成 trace；任一后续输入缩回预算即写回完整 custom URL。
- Q35 URL 预算测试先红 `1 failed / 7 passed`，ContentReview 决定冻结测试先红 `1 failed / 2 passed`；受限环境下用零落盘的 Vitest Node API适配完成动态转绿，结果 `2 files / 11 tests`。默认 Vitest 命令仍因当前沙箱禁止 Node 子进程而无法启动，这不是默认门禁通过的替代品，收口时要明确区分。
- Q35/Q46/Q47 E2E 已加强为明确 history sentinel：进入 canonical 后连续编辑多个字段，Back 一次必须直接回 sentinel，Forward 必须恢复最终 custom；另保留模块 Link 离开后的 Back/Forward 以及 canonical reset。该契约能区分 `{ replace: true }` 与错误的逐键 push。

## 2026-08-13 - 决定写入期间卸载防线

- 可见控件 disabled 只能阻止页面内点击，不能阻止浏览器 Back/刷新/卸载。原 cleanup 会在 `dirtyRef=true` 时调用 `persistDraft`，因此决定 promise pending 时卸载仍可能把草稿排到 approve/reject 后。
- deferred approve + `unmount()` 回归先红：`1 failed / 3 passed`，保存 mock 确认被调用一次。新增 `decisionBusyRef` 后，任何草稿保存入口在决定写入期间立即返回 false，不入串行队列；回归转绿为 `4/4`。
- `actionBusy` 继续负责 UI disabled，`decisionBusyRef` 负责同步队列/cleanup 防线；两者职责不同，不能只保留其中一个。

## 2026-08-13 - 受影响页面最新联合验证

- 使用不写入项目配置的 Node API 适配器，重跑 `ContentReviewPage` / `GbnLabPage` / `VirtualMemoryLabPage` / `NetworkLabPage` / `CsmaCdCollisionLabPage` / `TcpCongestionLabPage` / `NetworkLabRouterPage`。
- 实测为 `7 files / 35 tests passed`，耗时约 10.5 秒。ContentReview `4/4`、Q35 `8/8`、Q46 `1/1`、Q47 `6/6`，其余公共网络导航回归 `16/16`。
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json` 通过。相关 TS/TSX/E2E 文件定向 ESLint 为 0 errors；CSS 文件未配置 ESLint parser，只有 ignored warning。
- 这是受限沙箱下的真实 Vitest 逻辑执行结果，但不替代项目默认 CLI/worker 合同；全量门禁收口时必须分开报告。

## 2026-08-14 - StudyContext 审核决定后刷新失败 P1 红灯

- 问题路径：`contentReviewRepository.approve/reject` 已写入 -> `StudyContext.reload()` 读取失败 -> 调用 promise reject -> ContentReview 保留 dirty -> 自动 `saveDraft` 将 decision 写回 `pending`。
- 这不是“刷新失败显示旧数据”的普通 UX 问题，而是已完成的人工决定可被后续草稿降级，因此按 P1 修复。
- 新回归 `StudyContext.test.tsx` 让 approve repository 返回 approved record，再让后续 review list reject。实测红灯 `1/1 failed`：promise outcome=`failed`，context record=`missing`。
- 修复目标：repository 返回即代表 durable 写入成功，先将返回 record 合并进 context；后续全量 reload 只是 reconciliation，失败不得将 commit promise 变为 reject。

## 2026-08-14 - 复核提效与 URL 优化最终可执行证据

- Durable commit 修复：新增 `reconcileContentReviewRecord`，先用 repository 返回值替换 context 中同题 record，再尝试 `reload()`；重载异常不会取消已持久化结果。该 helper 同时用于 draft/approve/reject，保持 context 一致。
- 红转绿：`StudyContext.test.tsx` 首跑 `1 failed / 0 passed`，修复后联合 ContentReview `2 files / 5 tests passed`。最后全部逻辑测试为 `74 files / 857 tests passed`，其中 Q44 `micro-operations.test.ts` 14 项仍通过。
- 正式脚本可执行项：`npm run lint` 通过；`npm run typecheck` 全部 workspace 通过。
- 默认脚本的环境阻塞：`npm run test:release`、`npm run content:validate`、`npm run build` 和 Playwright 均失败于 `spawn EPERM`，错误点是 Node test isolation / tsx esbuild / Vite config+HTML esbuild / Playwright worker-browser spawn，不是业务断言失败。
- 进程内替代证据：全量 Vitest `74/857`；release node-test 直接模块加载 `10/10`；validate 完整模块加载输出 `PASS cn408-2009: 47 questions (40 objective, 7 comprehensive)` 与 `Review status: needs-review; verified 0/47`，独立读取 pack 确认 `19 assets`。这些是实际测试/校验逻辑执行，但明确不替代默认 CLI/worker 门禁。
- build 替代尝试不可能完成：即使用 TypeScript transpile plugin 代替 TS/TSX esbuild，Vite `build-html` 和 PWA build 仍强制调用 esbuild 子进程并被拒绝。不改项目配置，不用不同产物冒充 production build。
- E2E 替代尝试：进程内 Vite dev server 在禁用 dep optimizer 后可 HTTP 200；但通过 PowerShell `Start-Process` 启动隐藏 Chrome 调试端口被当前策略直接拒绝。随后按 Browser skill 连接应用内浏览器，localhost 访问被用户权限拒绝；未进行 CDP、其他浏览器表面或间接绕过。
- 截图人工查看：ContentReview 1440/1366/390、Q35 1440/1366 及 390 top/bottom、Q46/Q47 1440/1366/390 可见区域无 P0/P1。Q47 390 标题孤字换行是 P2。Q46/Q47 的 390 fullPage 图在内部滚动区下段留白，本轮未能生成新 top/state/bottom，不宣称完整移动视觉通过。
- 守住的边界：内容与 Q44 仍 `needs-review; verified 0/47`；自动测试/来源核对不等于人工审核；没有任意微操作评分器，不宣称 parallel-5 / split-6 穷尽所有合法答案。未改 schema v1、旧图片、旧 cpu-explorer，未删除测试、提交、推送或部署。

## 2026-08-15 - production build 恢复后验证

- 当前权限已为 unrestricted，默认 `npm run build` 重跑通过。Vite `1901 modules` transformed/rendered，PWA 和 198 项 static-copy 资源均完成，无 chunk warning，耗时约 17.1s。
- 这是真实 production build 证据，覆盖最新 StudyContext durable commit 修复。下一步按顺序执行 release/content validate、强化后相关 E2E、默认全量 E2E。

## 2026-08-15 - release 与内容门禁恢复

- 默认 `npm run test:release` 已恢复可执行并通过，结果 `10/10`，无失败或跳过。
- 默认 `npm run content:validate` 已恢复可执行并通过：`47 questions / 19 assets`，其中 `40 objective / 7 comprehensive`；状态保持 `needs-review; verified 0/47`。
- 下一步是跑强化后的四组相关三视口 E2E，再执行默认全量 E2E；不得将本次自动校验解释为人工审核。

## 2026-08-15 - 相关 E2E 并发复跑记录

- 端口 `4261` 默认 `8 workers`：四个 spec 共 `33` 条，`32/33` 通过；唯一失败为 ContentReview 1366 首个历史恢复用例 30 秒超时，截图停留在 Suspense 加载态。
- 端口 `4262` 对该用例使用 `chromium-1366 --workers=1`，通过；因此先标为并发冷启动/资源争用信号，不将其归因于业务回归。
- 端口 `4263` 再按默认 `8 workers` 重跑，`27 passed / 6 failed`；失败均是 1440/1366 桌面实验首屏 5 秒内未离开“载入页面”，移动三视口、Q35/Q46/Q47 交互已通过。该不稳定性需要在低并发和默认全量门禁中继续分层验证，不能伪报为 E2E 全绿。

## 2026-08-15 - 相关三视口 E2E 功能绿灯

- 端口 `4264`、三项目、`2 workers` 执行四个相关 spec，`33/33` 通过，约 1.2 分钟。
- 覆盖项包含复核筛选与循环下一题、Q35/Q46/Q47 URL replace-history/reload/canonical restore、网络 `nav + Link + aria-current`，以及既有 Q29/Q37/Q39 回归。
- 这是稳定的真实浏览器功能证据；与默认 `8 workers` 的首屏冷启动问题分开记录，后者仍需全量门禁验证。

## 2026-08-15 - 新鲜截图复核与移动分段证据

- 已查看 2026-08-15 新鲜截图：ContentReview/Q35/Q46/Q47 的 1440、1366 和 390 可见区域无 P0/P1；Q47 移动标题孤字换行仍仅为 P2。
- Q46/Q47 390 fullPage 证实无法覆盖 `.main-area` 的内部滚动下段。`system-labs.spec.ts` 现沿用其他实验的移动 top/state/bottom 分段采集，桌面继续 fullPage；文件 ESLint 通过。
- 尝试在端口 `4265` 只跑 `system-labs` 的 390 项以生成新分段证据时，当前 managed 权限在 Playwright spawn 阶段返回 `EPERM`。因此测试代码已静态验证，但新分段截图尚未动态验证或生成。

## 2026-08-15 - 当前最终门禁状态

- 分段截图测试改动后，正式全仓 lint、全部 workspace typecheck 均通过。
- 正式 `npm test` 未进入测试执行：Vite/esbuild 加载配置时 `spawn EPERM`。最新完整逻辑证据仍为产品修复后的进程内 `74 files / 857 tests passed`；之后只变更 E2E 截图采集。
- 正式默认 `npm run test:e2e` 未进入用例执行：Playwright spawn `EPERM`。可执行浏览器证据为相关四 spec、三视口、2 workers 的 `33/33`；两个 8-worker 相关套件结果分别是 `32/33` 与 `27/33`，失败均呈现首屏 Suspense 冷启动等待。
- 正式 build `1901 modules`、release `10/10`、content `47 questions / 19 assets` 和 `needs-review; verified 0/47` 均来自本轮最新产品源码；后续仅修改测试截图代码。
- 后续只需在允许派生进程时生成并查看 Q46/Q47 六张移动分段图、重跑默认 Vitest 与默认 8-worker 全量 E2E。不得把自动校验当人工审核，也不得宣称 Q44 两套来源支持 trace 穷尽所有合法答案。

## 2026-08-15 - Q46/Q47 移动分段截图动态绿灯

- 权限恢复后在端口 `4265` 运行 `system-labs` 的 `chromium-390` 项，Q46/Q47 `2/2` 通过，耗时约 41.8 秒。
- `vm-lab-chromium-390-{top,state,bottom}.png` 与 `network-lab-chromium-390-{top,state,bottom}.png` 已实际生成。下一步人工查看六图，再跑默认 Vitest 和默认全量 E2E。

## 2026-08-15 - Q46/Q47 移动分段截图人工检查

- 六图均已查看，下段表格、状态、时间线和 trace 可读，无 P0/P1 布局问题。
- Q46 state/bottom 实际相同，是内部滚动已经接近末端导致的截图证据冗余，不影响下段覆盖；Q47 标题“室”孤字换行仍仅记录为 P2，不在本轮改动。

## 2026-08-16 - 默认 Vitest 正式门禁

- `npm test` 在 unrestricted 环境直接执行通过：Vitest `v4.1.10`，`74 files / 857 tests passed`，约 37.5 秒。
- 这是正式默认 worker 门禁，覆盖最新实现；下一步执行默认 `npm run test:e2e` 的 8-worker、三项目全量合同。

## 2026-08-16 - 默认 8-worker 全量 E2E 红灯

- 默认全量共 `156` 条，首轮 `152 passed / 4 failed`。失败均为 1440 首批实验页标题默认 5 秒等待，截图时页面已完整出现；其他两个视口对应流程均通过。
- 这与此前相关套件的冷启动不稳定一致。build 的 service worker precache 包含全部 JS/CSS/字体等资产，每个隔离 context 都会安装；8 个首批 worker 同时 precache 会与 lazy route 请求争用。
- 稳定性修复范围限定在 Playwright harness：普通 spec block service worker，只有真正断言 PWA/offline 的 `apps/web/e2e/study-flow.spec.ts` 与 `tests/e2e/document-reader.spec.ts` allow。不会放宽 30 秒总 timeout、删除断言或修改产品实现。

## 2026-08-16 - E2E service-worker 隔离红转绿

- Playwright 默认阻止 SW；study-flow/document-reader 文件级显式允许。相关 ESLint、workspace typecheck 通过。
- 端口 `4266` 的 1440 定向联合回归共 `14/14`：四个原首屏失败用例、PWA 安装/离线、PDF 离线读取均通过，约 39.2 秒。
- 这保留了真正的离线覆盖，同时去掉普通实验上下文无意义的 precache 并发；未调整现有 timeout 或业务断言。下一步默认全量 E2E。

## 2026-08-16 - 默认全量 E2E 与最终门禁绿灯

- service-worker 隔离后直接运行默认 `npm run test:e2e`：`156 tests / 8 workers / 3 projects`，`156/156 passed`，约 3.0 分钟。先前 1440 第一波的 Q14/Q37/Q41/Q25 冷启动失败均消失，1366/390 与其余流程也全部通过。
- 普通实验继续 block service worker；只有 `apps/web/e2e/study-flow.spec.ts` 和 `tests/e2e/document-reader.spec.ts` 显式 allow，且 PWA 安装、应用离线启动与 PDF 离线读取都在本次全量中真实通过。没有放宽 30 秒总 timeout、标题断言或产品行为。
- 最终新鲜结果：全仓 lint 通过，workspace typecheck 通过，默认 Vitest `74 files / 857 tests`，release `10/10`，内容 `47 questions / 19 assets`（`40 objective / 7 comprehensive`）且 `needs-review; verified 0/47`，production build `1901 modules`，默认全量 E2E `156/156`。
- ContentReview/Q35/Q46/Q47 三视口与 Q46/Q47 移动分段图已人工检查，无 P0/P1；Q47 移动标题孤字换行只保留为 P2。
- 自动验证不改变人工审核状态。Q44 仍只提供来源支持的 `parallel-5` / `split-6` 确定性 trace，不实现任意评分器，也不宣称穷尽所有合法答案。未改 schema v1、旧图片或旧 `cpu-explorer`，未删除测试，未提交、推送或部署。

## 2026-08-16 - 下一阶段边界审计与 README 同步

- README 的验证段落仍记录 Q10 时期 `68/808`、build `1898`、E2E `150/150`，与当前代码证据不一致；现已改为 lint/typecheck、Vitest `74/857`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1901`、默认 8-worker 三视口 E2E `156/156`。
- 用户数据版本审计路径：`Attempt.questionContentVersion` 已存在，`aggregateStats`、`projectCurrentQuestionProgress` 等按当前 `Question.contentVersion` 过滤；`StudySession` 与 `QuestionProgress` 类型、Dexie v1 表和 backup v1 schema 均没有题面版本。
- 确定性风险：open session 可把旧题面草稿恢复到同 id 的新题面并重新评价；持久化 progress/manual mastery 会跨版本继续显示。旧未提交 response 和人工 mastery 本身没有可追溯版本，无法在 v1 内安全回填。
- v2 设计约束：保留 v1 Dexie 定义与 v1 backup 输入；新增 session 题面版本快照和按 `[questionId+questionContentVersion]` 作用域的 progress；迁移仅用带版本 Attempt 重建派生字段，无法证明的旧草稿/mastery 不映射到当前版本，作为 legacy 保留；backup v2 必须校验 session/attempt/progress 的题号与版本一致性。当前只完成设计审计，没有数据库 schema 授权，因此未改源码、测试或数据。

## 2026-08-16 - schema v2 红灯先行

- 用户已授权实施 `408-user` schema v2，但明确保留 v1 定义与 fail-closed 迁移边界。
- 新增 `packages/storage/src/user-schema-v2.test.ts`，使用确定性生成的 48 条 Attempt 样本检查版本分组、计数守恒和重复运行确定性，并覆盖 legacy/冲突/缺失/不匹配 session 版本。
- 首次定向运行：`npm exec vitest run packages/storage/src/user-schema-v2.test.ts`，实测 `1 failed suite / 0 tests`；唯一失败是待实现模块 `./user-schema-v2` 无法解析。下一步进入纯 helper 与 Dexie v2 实现。

## 2026-08-16 - 纯迁移 helper 转绿、Dexie v2 红灯

- 实现 `packages/storage/src/user-schema-v2.ts` 后，旧 session 推导、冲突 fail-closed、版本分组 progress 和恢复一致性四项契约 `4/4` 通过；确定性生成的 48 条 Attempt 样本每次输出相同且计数守恒。
- 将 v1 Dexie fixture 加入同一测试后，当前 `5 tests / 1 failed`：`UserDatabase.verno` 仍为 `1`，预期的 v2 新表/升级回调尚不存在。该红灯是迁移实现缺口，非环境失败。
- 下一步实现 `versionedProgresses` 新表与 v1 upgrade callback，保留旧 `progresses` 作为 legacy evidence。

## 2026-08-16 - Dexie v2 迁移转绿

- `UserDatabase` 新增 v2 复合主键表 `versionedProgresses`，但 `version(1).stores(...)` 原文未改；upgrade callback 用 Attempt 版本重建 progress，并把旧 open session 的未知题面标成 `LEGACY_CONTENT_VERSION`。
- v1 `progresses` 不清空，保留不可证明版本的人工 mastery/计数。真实 fake-indexeddb fixture 通过，`user-schema-v2.test.ts` 为 `5/5`。
- 下一步 repository 改用版本化 progress 表，禁止 legacy session 写入，再实现 backup v2 与 v1 迁移。

## 2026-08-16 - repository 与 backup v2 迁移转绿

- repository 当前只把可证明版本的数据写入 `versionedProgresses`；compound key 为题号+题面版本，legacy session 不可继续写入或作为 latest open session 恢复。
- backup v2 将 active versioned progress 与 v1 legacy progress 分栏导出。v1 backup 保持兼容输入：先按旧 schema 做语义校验，再从 Attempt 重建版本化数据；无法证明的 session 题目写 legacy marker，旧人工 mastery 只保留、不映射到当前题面。
- 红灯证据：新 `backup-v2.test.ts` 首次 `2/2 failed`，分别暴露 export 仍是 v1 和 v1 import 缺少版本快照。绿灯证据：`backup-v2.test.ts + user-schema-v2.test.ts + storage.test.ts` 为 `3 files / 34 tests passed`。
- storage typecheck 曾因 Zod 对 optional `selfScore` 推断包含显式 `undefined` 而失败；经运行时 schema 校验后在迁移边界收窄为领域类型，迁移输出再过 v2 schema，随后 `npm run typecheck -w @408os/storage` 通过。
- 仍保持：不改 `version(1).stores(...)`，不清空旧 progress；全部内容继续 `needs-review; verified 0/47`。

## 2026-08-16 - Practice fail-closed 与 backup UI 回归转绿

- Practice 对 legacy/mismatch session 均 fail-closed：不把旧草稿带入新题面，不渲染题干，不允许继续提交。
- 设置页明确展示 `BACKUP V2`，导入路径仍兼容 schema v1，避免用户误以为旧备份不可恢复。
- 红灯证据为 `1 failed / 7 passed`（旧文案），修复后 `PracticePage + SettingsPage` 为 `2 files / 8 tests passed`。

## 2026-08-16 - 版本化 repository 审计红转绿

- 回归测试证明同题不同版本不会共享 progress/mastery；legacy session、legacy mastery 与 mismatch Attempt 均被拒绝。
- 红灯暴露 change-log 仍使用裸题号（`29 tests / 1 failed`）；已改成 `questionId:questionContentVersion`，storage 文件随后 `29/29 passed`。

## 2026-08-16 - backup v2 语义与 UI/E2E 契约补齐

- v2 preflight 现在明确拒绝 Attempt/session 题面版本不一致；study-flow 导出断言同步要求 schema 2、版本化 progress 和空 legacyProgresses。
- Settings 展示 `BACKUP V2`，apps/web 的 v1 损坏备份导入仍作为兼容性回归保留。
- 联合 Vitest `5 files / 45 tests passed`。

## 2026-08-16 - schema v2 静态门禁

- 全 workspace typecheck 通过；lint 首轮只报新增测试的两个未使用 import，清理后 `npm run lint` 通过。
- 只更新学习备份（BACKUP V2）；content-review ledger、document-library 等不相关 schema v1 未改。

## 2026-08-16 - schema v2 三视口 E2E

- `tests/e2e/study-flow.spec.ts` 新增 v1 backup 迁移和 legacy/mismatch recovery 场景。首轮 `4270` 为 `21/24`，3 个失败均是 IndexedDB 夹具 promise 被回收；等待应用稳定并补齐事务错误处理后，`4271` 三视口 `3/3` 通过。
- 浏览器实测确认 v1 导入同时写入 active versioned progress 与旧 progress evidence，且两类不可安全恢复的 session 都显示 fail-closed 页面。

## 2026-08-16 - study-flow 三视口 E2E 最终绿灯

- 端口 `4272`、2 workers、三视口 `tests/e2e/study-flow.spec.ts` 为 `24/24 passed`；schema v2 新增浏览器契约与原学习流程同时通过。

## 2026-08-16 - BACKUP V2 三视口截图检查

- 首轮截图虽然视觉测试 `3/3`，但 1366/390 没覆盖目标区块；改为滚动目标区块后端口 `4274` 再次 `3/3`。
- 新鲜 1440/1366/390 图均已人工查看：BACKUP V2、双按钮、storage facts、移动底栏无 P0/P1 或横向溢出；题包状态仍显示 `needs-review`。

## 2026-08-16 - 空白版本 fail-closed 红转绿

- 新红灯证明 blank content version 曾可写入（storage `1 failed / 28 passed`）；现把 missing map、missing/extra key、blank 与 legacy 收敛到同一 session guard。
- save、Attempt、latest-open 入口均复用该 guard，联合 `2 files / 34 tests passed`。

## 2026-08-16 - schema v2 全量逻辑与内容门禁

- 默认 Vitest `76 files / 869 tests passed`；release `10/10`；content validate `47 questions`（40 objective / 7 comprehensive）。
- 状态仍为 `needs-review; verified 0/47`，自动测试/来源校验不等于人工审核。

## 2026-08-16 - schema v2 静态与 production build 门禁

- 最终 lint/typecheck 全绿；production build `1902 modules`、static-copy 198、PWA precache 79，通过且无 chunk warning。

## 2026-08-16 - schema v2 全量 E2E 与收口

- 默认 `8 workers / 3 projects` 的全量 E2E 在端口 `4275` 实测 `165/165 passed`，约 2.2 分钟；包含 v1 backup migration、schema v2 export、legacy/mismatch recovery 和 BACKUP V2 三视口 visual contract。
- 1440/1366/390 新鲜 Settings 截图已人工检查，BACKUP V2、导入/导出按钮、storage facts 和移动底栏无 P0/P1；Q47 既有孤字换行仍只记为 P2。
- 最终门禁：lint/typecheck 全绿，Vitest `76 files / 869 tests`，release `10/10`，内容 `47 questions / 19 assets`（40 objective / 7 comprehensive），`needs-review; verified 0/47`，build `1902 modules`，E2E `165/165`。
- 保护边界复核：v1 stores 原文未改、旧 progress 与 19 张旧图片保留、旧 cpu-explorer 未改；没有删除测试、提交、推送或部署。自动验证和来源核对不替代人工审核，Q44 仍仅 parallel-5/split-6，不声称穷尽答案。

## 2026-08-16 - migration fixture cleanup hardening

- v1→v2 fake-IndexedDB 测试改用 `try/finally` 清理连接与数据库；定向 `5/5`、默认 Vitest `76/869` 仍通过。
- 随后最后一次 lint 与 workspace typecheck 仍全绿。

## 2026-08-16 - backup merge 一致性红灯

- schema v2 的 backup v2 单包语义校验是严格的，但 `importJson(..., 'merge')` 原实现没有校验导入包与当前 IndexedDB 的联合状态。两份包各自都可合法，却可在同一 `questionId + questionContentVersion` 下带不同 session/Attempt；bulkPut 后两个 Attempt 并存，而导入 progress 覆盖当前 progress，形成可导出但无法再次通过 preflight 的数据。
- 运行时 mode 只靠 TypeScript union，传入未知字符串会走非 replace 分支并实际写入，属于另一条 fail-open 路径。
- 测试先行：`packages/storage/src/backup-v2.test.ts` 新增重叠历史拒绝、无歧义并集和未知 mode 拒绝。首次定向为 `2 failed / 4 passed`，失败均为旧实现 promise resolve；已有 export、v1 migration、version mismatch 与 disjoint merge 契约通过。
- 目标语义是保守且确定的无歧义并集：联合数据必须整体通过 backup v2 的重复键与 session/Attempt/progress/note/settings 跨表不变量；无法证明安全的重叠在事务写入前拒绝，不猜测 manual mastery 冲突策略，也不静默丢弃任一历史。

## 2026-08-16 - backup merge 定向转绿

- 实现没有新建 schema 或表。`importJson` 在事务内读取 current attempts/sessions/versioned progress/legacy progress/notes/collections/settings，与已严格解析并必要时从 v1 迁移的 incoming data 组成一个 backup v2 候选。
- 联合候选复用正式 `backupV2Schema`：重复主键、复合 progress key、note question、collection/setting key，以及 session/Attempt/response/version/progress 关系均在 bulkPut 前检查。失败抛出带首个精确 path 的 `Backup merge is ambiguous`，Dexie 事务不落任何导入数据。
- 未知 runtime mode 现在显式拒绝，不再把 TypeScript union 当作唯一边界。replace 仍先清表再导入，行为不变。
- 定向由 `2 failed / 4 passed` 转为 `8/8 passed`。新增确定性不变量样本把 24 个 session/Attempt 分在同题不同 content version 的两侧，merge 后再次 export/preflight，计数保持 `24/24/24`；另覆盖同题双 note 的拒绝与当前数据保留。
- 更广 storage 联合实测为 `3 files / 42 tests passed`；storage workspace typecheck 和 `backup.ts` / `backup-v2.test.ts` 定向 ESLint 全绿。

## 2026-08-16 - backup merge 全量源码与构建门禁

- lint 与全部 workspace typecheck 通过；默认 Vitest 新基线为 `76 files / 874 tests`。
- release `10/10`；content validate 为 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，继续 `needs-review; verified 0/47`。
- production build `1902 modules`、static-copy `198 items`、PWA precache `79 entries (2581.81 KiB)`，无 chunk warning。仅剩默认全量三视口 E2E。

## 2026-08-16 - backup merge 最终收口

- 独立端口 `4276`、默认 `8 workers / 3 projects` 的真实 Chrome 全量为 `165/165 passed`，约 2.1 分钟；既有 BACKUP V2 visual、v1 migration、legacy/mismatch recovery、PWA 与 PDF offline 均通过。
- 最终实测：lint/typecheck 全绿；Vitest `76 files / 874 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1902 modules`；E2E `165/165`。
- property-driven 测试策略影响：没有引入新依赖，而是复用既有确定性样本风格，验证 current+incoming 联合 schema 不变量、失败原子性和 merge 后 export→preflight roundtrip；示例边界覆盖重叠题面历史、同题不同版本、同题双 note 与未知 mode。
- 未改变数据库版本或 stores。下一大功能若选择持久化模考，需要正式 mock repository/blueprint/原子交卷表和新的 schema 授权；当前题包仍 needs-review，必须保留 verified 门禁，不能用 settings/session id 隐藏元数据或先做一个假可用的整卷流程。

## 2026-08-16 - 持久化模考 schema v3 设计审计（未授权）

### 当前事实

- `packages/domain/src/mock.ts` 已有固定 2009 整卷纯函数：只接受 manifest 与 47 道题均为 `verified`，快照 pack id/hash/contentVersion、题号/题型/题面版本和分值，按 40 道客观题 80 分、7 道综合题 70 分、总分 150 分、180 分钟计时。
- `StudySession` v2 已能保存题目顺序、每题 content version、草稿、当前位置和提交题号，`StudyMode` 也包含 `mock`；但没有 exam 生命周期、pack hash/blueprint、计时提交原因、最终分数或交卷写保护。`types.ts` 的旧 `MockExam` 仅含 `id/sessionId/seed/duration` 等占位字段，当前没有 repository/table/route 使用它。
- `UserDatabase` 只有 v1 stores 与 v2 `versionedProgresses`；backup v2 也只覆盖 attempts/sessions/progress/legacy progress/notes/collections/settings。当前 Web 只有 `/practice/:sessionId`，没有持久化模考入口。

### 最小 v3 设计

- 保留 v1 和 v2 stores 定义原文，新增 v3 `mockExams: 'id, &sessionId, status, updatedAt, submittedAt'`。不新建第二份 response table：逐题草稿继续由关联的 v2 `StudySession` 保存，避免 blueprint/session/response 三套状态源。
- 正式 exam record 应内嵌不可变 `MockExamBlueprint`，并记录 `id`、唯一 `sessionId`、`status`（`in-progress | submitted | completed`）、`startedAt`、`updatedAt`、可选 `submittedAt/completedAt`、`submissionReason`（`manual | timeout`）与 `MockExamScore`。当前固定整卷不使用随机顺序，因此不应继续持久化没有实际语义的 `seed`。
- 创建时在一个事务中写 exam+`mode=mock` session；两者的 questionIds、questionContentVersions、startedAt 与 blueprint 必须精确一致。v3 mock repository 是唯一允许写 mock session 的入口；generic study repository 对 `mode=mock` 的 save/submit fail closed，防止页面或未来代码绕过 lifecycle。
- `saveDraft` 只允许 `in-progress`，并再次校验 exam/session/blueprint 闭包。手动交卷与倒计时到零调用同一原子状态转换：冻结答案文本与选择、记录提交时间/原因、计算客观分，并以确定性 session+question 身份保证 Attempt 不重复。交卷后只允许为综合题补 rubric/selfScore；每题自评在同一事务中更新 session response、创建唯一综合题 Attempt、更新 versioned progress 与 score。全部综合题完成后转为 `completed`；重复/并发调用必须幂等或明确拒绝，不能双计进度。
- 计时属于 local-first 学习辅助，不声称防篡改。刷新后从持久化 startedAt/提交状态恢复；设备时钟回拨仍受现有 `getMockExamRemainingMs` 的 180 分钟上限约束。若以后需要更强的单调计时证据，应另立需求，不能伪装成本地浏览器已具备考试防作弊能力。

### backup v3 与迁移边界

- backup v3 在 v2 数据外新增 `mockExams`；v1/v2 输入仍先通过各自严格 schema，再迁移为 v3。旧备份没有 blueprint，不能从当前题包反推或补造 exam record；历史 `mode=mock` session 原样保留为不可恢复 legacy evidence。
- v3 preflight 必须检查 exam id 与 sessionId 唯一、关联 session 存在且 mode 为 mock、questionIds/versions 与 blueprint 精确相等、pack/question快照内部一致、时间顺序与 status 字段一致、score/pending self-score 状态一致、Attempt 与 session response/题面版本一致。
- v3 merge 继续采用当前 fail-closed 无歧义并集：current+incoming 联合候选整体过 v3 schema 后才允许 bulkPut；重复 exam/session、同一 exam 的分叉生命周期或任何 blueprint/session/Attempt 冲突都在事务第一笔写入前拒绝。replace 同时清新表；未知 import mode 仍显式拒绝。

### 红灯实施顺序（等待授权）

1. 新增 storage v3 测试，先证明 `UserDatabase.verno` 仍为 2 / `mockExams` 不存在；用真实 v2 fixture 验证升级后所有 v1/v2 数据逐字保留且新表为空。
2. 为 mock repository 写创建、恢复、草稿、题面漂移、generic repository 拒绝、超时/手动原子交卷、提交后写保护、综合题自评、重复/并发幂等和事务失败零部分写入契约。
3. 为 backup v3 写 v1/v2 迁移、legacy mock session 保留、export/preflight roundtrip、replace、无歧义 merge 与重叠 exam fail-closed 契约。
4. storage/domain 转绿并独立核心审计后，才写 Web 红灯并接 `/mock`、`/mock/:examId`。当前真实题包下入口必须显示 verified 门禁原因；可执行流程只用测试中的 verified fixture 验证，不能改正式内容状态。
5. 最后跑相关 Vitest、lint/typecheck、全量 Vitest、release/content/build、三视口 E2E 与截图检查。任何自动门禁都不改变 `needs-review; verified 0/47`。

### 权限与现状

- 数据库 schema 属项目红线；本次用户只说“继续”，尚未明确说“授权新增 `408-user` schema v3”，因此没有写测试或实现，也没有改任何 stores。
- 没有修改题包、旧图片、旧 `cpu-explorer` 或既有测试，没有提交、推送或部署。当前可引用的正式基线仍是上一轮 lint/typecheck 全绿、Vitest `76 files / 874 tests`、release `10/10`、内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1902 modules`、默认 E2E `165/165`；本设计步骤没有产生新的运行结果。

## 2026-08-16 - schema v3 / mock repository 缺实现红灯

- 用户明确授权后，先新增 `packages/storage/src/mock-schema-v3.test.ts`，未先写实现。契约以真实 v2 Dexie fixture 锁住 v1/v2 数据保留和新表为空，并覆盖 verified factory、exam/session 原子创建、mock 写入口隔离、答题时长、交卷幂等、交卷后答案冻结、7 道综合题自评、版本漂移事务原子性和 24 条确定性并发样本。
- property-driven 测试采用项目既有的确定性生成方式，不安装 fast-check 等新依赖。强不变量是 v2→v3 元素保留、同一 exam/session/question 最多一个 Attempt、失败前后表计数与生命周期不变、相同并发交卷结果一致。
- 首次运行 `npm exec vitest run packages/storage/src/mock-schema-v3.test.ts`：Vitest `v4.1.10`，`1 failed suite / 0 tests`；Vite 无法解析尚不存在的 `./mock-repository`。失败精确命中计划中的缺实现边界，非断言或权限错误。
- 当前只新增测试和检查点，`UserDatabase` 仍为 v2；尚未创建 `mockExams`、修改领域占位类型、接入 backup 或 Web。题包仍为 `needs-review; verified 0/47`。

## 2026-08-16 - schema v3 与 mock repository 初版绿灯

- `MockExamQuestionSnapshot/Blueprint/Score` 移到正式领域类型，原占位 `MockExam` 改为持久化 lifecycle record；`mock.ts` 纯函数签名与已有 5 项领域测试语义不变。
- Dexie 新增 v3 `mockExams`，唯一 `sessionId` 防止一个 session 被多个 exam 认领；v1/v2 schema 定义未改。change-log 新增 `mock-exam` entity type，不改变既有索引。
- repository 的强不变量：exam 与 session 的题号顺序、逐题 content version、时间和状态必须一致；逐题时长为非负安全整数且不能倒退/超过已流逝时间；draft 只能在 in-progress；交卷后答案选择/文本冻结；综合题只允许补自评分和 rubric。
- objective Attempt 在交卷事务生成，综合题 Attempt 在首次自评事务生成；ID 固定为 `mock:<examId>:<questionId>`。同一事务同时更新 attempt、versioned progress、session、exam 和 change log；并发重复交卷第二个调用读到已提交状态并返回同一 bundle，不重复计数。
- 首次实现测试仅有一项 fixture 生成错误：第 0 条样本在开始时刻声称已有 1000ms 用时，被 repository 正确拒绝；把生成域改为从第 1 分钟开始后，`mock-schema-v3 7/7`。这不是产品修复，不计为实现红灯。
- 新鲜验证：`mock-schema-v3.test.ts 7/7`；`mock-schema-v3 + user-schema-v2 + storage = 3 files / 41 tests`；domain/storage typecheck 和相关 ESLint 均通过。BackupService 尚未覆盖 mockExams，下一步必须先红后绿升级为 backup v3。

## 2026-08-16 - backup v3 红灯

- 新契约直接写入合法 in-progress exam/session bundle，不依赖 Web；验证 export/replace roundtrip、v2 无 blueprint mock session 只保留为 legacy、exam/session version mismatch、重复 lifecycle merge 和 12 个确定性 disjoint exam roundtrip。
- `npm exec vitest run packages/storage/src/backup-v3.test.ts` 实测 `4 failed / 1 passed`。失败分别是 export 仍为 schema 2、修改 session version 后 preflight 未报错、重复 exam merge 错误 resolve、preview 无 mockExams 计数。
- v2 legacy 用例已经通过：旧 `mode=mock` session 被原样保留，但 `mockExamRepository.getLatestOpenExam()` 与 generic `getLatestOpenSession()` 都不会恢复它。这锁住“不猜造 blueprint、不把旧普通 session 冒充正式模考”的迁移边界。

## 2026-08-16 - backup v3 转绿

- `backup.ts` 新增严格 v3 schemas。v3 先把同一份数据投影为 v2 验证所有既有关系，再对固定 47 题 blueprint、exam/session 生命周期和 mock Attempts 做二次不变量校验；不依赖当前 content database 猜答案或补造快照。
- `parseAnyBackup` 现在识别 1/2/3；v1/v2 迁移结果在写入前统一转为 v3。导出/预检/导入 preview 计入 `mockExams`，replace 清理新表，merge 读取并联合校验新表。
- 红灯 `backup-v3 4 failed / 1 passed` 已转绿为 `5/5`；原 `backup-v2.test.ts` 更新为 compatibility 语义并要求最新导出 schema 3、空 `mockExams`，与 v3/storage/schema-v2/mock repository 联合为 `5 files / 54 tests`。
- 重要边界：v2/v1 旧 mock-mode session 没有可证明 blueprint 时只保留 legacy evidence；v3 不把当前题包、session id 或 settings 猜作考试元数据。自动 backup 校验仍不等于内容人工审核。

## 2026-08-16 - 持久化模考 Web 红灯

- 当前源码重新运行五个 storage 套件，`5 files / 54 tests passed`，确认 schema v3、mock repository、backup v3 与 v1/v2 compatibility 不是仅有文档记录。
- Web 页面测试已经定义 needs-review 入口无启动按钮、verified 固定整卷创建后导航、持久化 exam 加载、草稿保存、手动交卷、交卷后综合题自评控件与 missing exam fail-closed。
- 首次定向运行中，会话测试 fixture 的 `ids.map` 少一个 `)`，在 esbuild 解析阶段失败；这是测试代码错误，不作为产品红灯。只修复 `}); -> }));` 后复跑，两套件均稳定因对应页面模块不存在失败：`2 failed suites / 0 tests`。
- 下一步只实现该契约并补足真实产品必须具备的倒计时、导航、错误状态和提交后答案冻结。当前正式 2009 pack 仍为 `needs-review; verified 0/47`，入口不得显示开始按钮或调用 repository。

## 2026-08-16 - 持久化模考 Web 首版转绿

- 页面实现：`MockExamPage.tsx` 提供固定 47 题/180 分钟规则、人工复核门禁、持久化记录和启动入口；`MockExamSessionPage.tsx` 提供答题卡、选择题/综合题草稿、串行保存、基于 `startedAt` 的倒计时、手动/超时交卷和交卷后综合题自评。
- 路由与导航：新增 `/mock`、`/mock/:examId`，主导航及移动导航新增“模考”，既有移动导航数量回归从 7 调整为 8。
- 可靠性边界：页面在当前题包与 v3 blueprint 的题号、类型、`contentVersion` 漂移时停止渲染；交卷后禁用选择题与综合题编辑；自评只通过 `selfScoreMockExam` 写入，不回写普通练习 session。
- 验证：`npm exec vitest run apps/web/src/pages/MockExamPage.test.tsx apps/web/src/pages/MockExamSessionPage.test.tsx` 实测 `2 files / 5 tests passed`；`npm run typecheck -w @408os/web`、新增 Web 文件和测试的 ESLint 通过。
- 下一步：先补超时单次提交、版本漂移和自评范围回归，再进入浏览器 E2E/截图；不改变 `needs-review; verified 0/47`。

## 2026-08-16 - 持久化模考 Web 边界回归转绿

- 先红后绿修复入口边界：仅 `reviewStatus=verified` 仍不够，manifest 声明题数和当前载入题数必须同时为 47，否则不渲染启动按钮，并显示固定整卷契约警告。
- 会话页新增回归覆盖：过期模考只自动调用一次 `submitMockExam({ reason: 'timeout' })`；任一 blueprint/current question 题号、类型或 `contentVersion` 漂移时 fail-closed，不显示选项。
- 新鲜验证：`MockExamPage + MockExamSessionPage` `2 files / 8 tests passed`；新增页面/测试 ESLint 通过。接下来进行核心审计与浏览器证据，不把测试通过当人工审核。

## 2026-08-16 - 持久化模考核心审计与三视口 E2E

- 核心联合验证：`packages/domain/src/mock.test.ts`、`mock-schema-v3`、`backup-v3`、`backup-v2`、`user-schema-v2`、`storage` 与 Web 两页面共 `8 files / 67 tests passed`。检查了 exam/session 版本闭包、串行草稿写入、生命周期写保护和页面计时/漂移边界。
- 新增 `tests/e2e/mock-exam.spec.ts`，只在测试浏览器的 `408-user` 中注入合法 v3 fixture，不修改正式 `needs-review` 内容。独立端口三视口真实 Chrome `3/3 passed`，覆盖入口人工复核门禁、刷新恢复草稿、交卷冻结、自评推进和 8 项移动导航。
- 截图人工检查：`output/playwright/screenshots/chromium-{1440,1366,390}-mock-*` 均无 P0/P1；390 使用 top/state/bottom 分段，底部固定导航和自评表单可见，重复分段仅因内容高度不足。
- 下一步是全量门禁与最终 handoff；不得把本地 fixture 的 verified 状态写回正式题包，仍保持 `needs-review; verified 0/47`。

## 2026-08-16 - schema v3 全量 E2E 首轮红灯

- 全量 lint/typecheck、release `10/10`、内容校验 `47/19` 且 `needs-review; verified 0/47`、Vitest `80/894` 和 build `1905 modules` 均已实测通过。
- 默认 `8 workers / 3 projects` 的 `168` 个 E2E 最终为 `164 passed / 4 failed`。3 项 study-flow 失败只因旧断言仍要求 `schemaVersion === 2`，现在正式导出已是 v3 并包含 `mockExams`；第 4 项为 chromium-1440 复核题号按钮点击 30 秒超时，需单独复跑判断并发波动。
- 该红灯不涉及 schema 回退或题包状态变化。下一步同步 E2E/Settings 的 BACKUP V3 契约，定向验证后再跑全量 E2E。

## 2026-08-16 - schema v3 E2E 契约同步与恢复边界修正

- Settings、study-flow、visual contract 与辅助 E2E 的活动断言已同步为 `BACKUP V3` / `schemaVersion: 3`，导出空 `mockExams` 也纳入合同；历史 V2 文档和截图未删除。
- `MockExamSessionPage` 新增瞬时读取失败重试回归，按 `loadKey` 隔离旧错误；相关页面与 E2E/Settings ESLint 通过。
- 当前 managed 权限禁止 Vitest/Playwright 启动所需的子进程：定向 Vitest 在 Vite/esbuild 配置加载处 `spawn EPERM`，单项目 Playwright 同样在浏览器启动处 `spawn EPERM`，两者都未进入断言。不能用它们替代 v3 改动后的新鲜绿灯。
- 之后新增了 1 项 MockExamSessionPage 读取重试回归，因此此前记录的 `8 files / 67 tests` 只属于新增测试前的快照；新测试尚未在可执行 Vitest 环境中验证。
- chromium-1440 复核超时的失败日志停在 Playwright 自动滚动后的 actionability 稳定性等待；Q41/Q47 选择现改为显式滚入可视区后真实点击，原 URL/history/reload 合同保持。定向 ESLint 通过，`playwright test --list` 收集 `168/24`，未把列表收集冒充真实浏览器通过。

## 2026-08-16 - 持久化模考当前收口状态

- 最终源码范围：schema v3 `mockExams`、专用 repository、backup v3、StudyContext facade、`/mock` 与 `/mock/:examId`、导航/CSS、单元与真实浏览器合同；额外修复了读取重试旧错误泄漏，并将 Settings/活动测试统一为 BACKUP V3。
- 新鲜可执行结果：全量 lint 通过、workspace typecheck 通过、内容校验 `47 questions / 19 assets` 且 `needs-review; verified 0/47`；release 默认 worker 被 `spawn EPERM` 阻止，但进程内 Node test `10/10 passed`；Playwright 列表完整收集 `168 tests / 24 files`。
- 当前权限未能执行最终版本的 Vitest/build/真实浏览器：均在启动 esbuild/browser 子进程时 `spawn EPERM`。最后一次真实绿灯快照是新增读取重试前的 Vitest `80/894`、build `1905 modules`、模考三视口 `3/3`；全量 E2E 的 `164/168` 四项失败已在源码层修正但未重跑。必须保持“未验证”措辞，不能推算新增测试为通过。
- 正式题包和复核状态未改；v1/v2 兼容、legacy 数据、旧图片、旧 cpu-explorer、Q44 `parallel-5/split-6` 与现有测试均保留。未提交、推送或部署。

## 2026-08-16 - schema v3 最终定向 Vitest 绿灯

- unrestricted 环境已能启动 Vitest worker。`MockExamPage + MockExamSessionPage + SettingsPage` 定向实测 `3 files / 10 tests passed`。
- 该结果包含新增的瞬时读取失败重试和活动 `BACKUP V3` 文案，不再沿用新增测试前的 `8 files / 67 tests` 快照，也不把 managed 环境的未执行结果算作通过。
- 后续依次运行默认全量 Vitest、源码/内容/build 门禁、三视口定向 E2E 与 Settings V3 截图、默认 168 项全量 E2E；题包仍为 `needs-review; verified 0/47`。
- 默认 `npm test` 新鲜实测 `80 files / 895 tests passed`；新增读取重试回归已在正式 worker-mode 门禁内通过。
- 当前进入 lint/typecheck/release/content/build；浏览器与最终截图仍待后续步骤，不能提前宣称 168 项全绿。
- 最终源码的 lint、全部 workspace typecheck 已通过；release `10/10`，content validate 为 `47 questions / 19 assets`、`needs-review; verified 0/47`。
- 上述自动化结果不改变人工审核状态。下一步 production build，再进入真实浏览器合同。
- production build 新鲜通过：`1905 modules`、static-copy `198 items`、PWA precache `85 entries (2631.79 KiB)`，无 chunk warning。
- 浏览器仍按“定向修复契约 -> 三视口截图人工检查 -> 默认全量”顺序执行。
- 端口 `4284`、3 workers 的相关三文件定向真实 Chrome 为 `9/9 passed`，覆盖 Q41 显式滚入后点击、schema v3 backup restore 和 BACKUP V3 visual contract 三视口。
- 新鲜 Settings V3 三视口截图已人工查看：桌面与移动导入/导出、状态、storage facts、底栏均无 P0/P1；390 目标区块采集无页面横溢或遮挡。
- 下一步运行默认 8 workers / 3 projects 的 `168` 项全量 E2E。
- 端口 `4285` 默认合同全量真实 Chrome `168/168 passed`（8 workers、3 projects，约 2.2 分钟）。schema v3 backup、PWA/offline、模考与 Q41 复核流程均在该轮通过。
- 没有放宽 30 秒总超时、修改 workers 或删除断言；下一步只核对全量生成的 Settings V3 图并同步最终文档基线。

## 2026-08-16 - 持久化模考 schema v3 最终收口

- 最终门禁：lint/typecheck 全绿；Vitest `80 files / 895 tests`；release `10/10`；内容 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，`needs-review; verified 0/47`；build `1905 modules`、static-copy `198 items`、PWA `85 entries (2631.79 KiB)`。
- 浏览器证据：模考 fixture 三视口 `3/3`；端口 `4284` 相关契约 `9/9`；端口 `4285` 默认 8-worker 三项目全量 `168/168`。全量包含 v3 backup、v1 migration、legacy/mismatch recovery、PWA/offline、Q41 复核与模考流程。
- 最新 Settings V3 图尺寸为 1440x900、1366x768、1024x2216，已逐张人工查看，无 P0/P1；Q47 移动标题孤字换行仍为 P2。
- README/HANDOFF 已同步最终基线。正式内容、审核计数、v1/v2 数据、旧图片和旧 cpu-explorer 未改；未删除测试、提交、推送或部署。
- 只读收口核对：v1 stores 原文保留，v3 仅新增 `mockExams`；旧 `2009` 图片目录递归仍为 19 个文件；临时 Playwright 端口 `4284/4285` 已无监听。

## 2026-08-16 - 收口后只读可靠性审计

- 复核工作台的决定期间冻结与 durable 写入后 reload 失败保护已在源码中确认，未发现新的可复现 P0/P1。
- 模考 v3 仓储/backup v3、复核页面和会话恢复的定向回归新鲜结果为 `4 files / 22 tests passed`。这只是自动回归证据，不改变 2009 人工审核状态。
- Web 没有跨标签页 `storage`/`BroadcastChannel`/live-query 监听；同一模考在两个标签页同时编辑时，后打开的页面可能在主动 reload 前显示旧状态。记录为待授权 P2 候选“跨标签页实时同步/冲突提示”，本步骤不实现、不新增 schema。
- 本步骤无源码/测试/题包/schema/旧资产改动，无提交、推送或部署；正式内容保持 `needs-review; verified 0/47`。

## 2026-08-16 - 跨标签页模考同步红灯

- 用户授权继续上一条唯一候选“跨标签页模考实时同步/冲突提示”。实现边界是不升级 `408-user` schema，不修改 v1/v2 数据结构，只使用 v3 现有 `updatedAt`、repository API 与 Dexie 可观察查询。
- 仓储红灯锁住 stale draft/submit/self-score 零部分写入，以及 exam/list 订阅；Web 红灯锁住无本地草稿自动同步、有本地草稿保留并阻止写入、显式加载最新记录。
- `npm exec vitest run packages/storage/src/mock-schema-v3.test.ts apps/web/src/pages/MockExamSessionPage.test.tsx` 新鲜结果：`5 failed / 13 passed`。失败均命中新合同，不含旧断言回归。

## 2026-08-16 - 模考仓储乐观并发与订阅转绿

- mock 三类写入 API 以 `expectedUpdatedAt` 作为现有记录版本令牌。stale writer 由事务内 `MockExamConflictError` 在首笔写入前拒绝；提交后幂等重放仍先返回 durable bundle。
- repository 新增 `liveQuery` 驱动的单 exam 与列表订阅，不改 schema v3 stores。仓储定向 `10/10`、storage typecheck 通过。

## 2026-08-16 - 模考 Web 同步与冲突提示转绿

- StudyContext 订阅列表，MockExamSessionPage 订阅单 exam。无本地输入自动应用外部更新；有本地 draft 或自评输入时进入只读冲突态，显式加载最新记录才丢弃本地未保存值。
- 定向 `3 files / 20 tests passed`，Web/storage typecheck 和相关 ESLint 全绿。下一步必须用同一浏览器上下文的两个真实页面验证 Dexie `liveQuery` 的跨页传播。

## 2026-08-16 - 模考双页真实浏览器同步转绿

- `tests/e2e/mock-exam.spec.ts` 新增同上下文双页回归，锁定 clean tab 自动同步、dirty tab 保留本地输入并进入冲突只读、显式加载最新记录后恢复写入，以及 peer tab 再次收到更新。
- 首次 `3 failed / 3 passed` 是测试夹具时序错误：fixture 注入早于页面完成正式 `needs-review` 内容加载；等待入口警告后重试，端口 `4286` 三项目单 worker 实测 `6/6 passed`。该修复没有放宽断言，也没有修改正式内容。
- 新鲜截图：`chromium-1440-mock-cross-tab-conflict.png`（70743 bytes）、`chromium-1366-mock-cross-tab-conflict.png`（70124 bytes）、移动 `top/state/bottom`（184733/109161/109161 bytes）。人工查看未见 P0/P1；移动冲突提示自然换行，按钮和答案禁用态没有重叠。
- 下一步：扩展 storage/Web 定向测试，随后跑全量门禁；必须分别报告真实通过与环境阻塞，不把隔离 fixture 的 verified 状态写回内容包。

## 2026-08-16 - 跨标签页同步扩展定向回归

- `npm exec vitest run` 覆盖 9 个 storage/Web 文件，实测 `9 files / 71 tests passed`。
- 扩展回归未发现 schema v3、backup compatibility、列表订阅或会话冲突保护回归；仍待全量门禁和默认 8-worker 浏览器回归。

## 2026-08-16 - 跨标签页同步静态门禁转绿

- `npm run lint` 与 `npm run typecheck` 均通过；typecheck 覆盖全部现有 workspace。
- 未把静态检查结果等同于全量运行时或人工审核，后续继续执行全量 Vitest/release/content/build/E2E。

## 2026-08-16 - 跨标签页同步全量测试与内容门禁转绿

- 默认 Vitest `80 files / 901 tests passed`。
- release `10/10 passed`；内容 `47 questions / 19 assets`，`needs-review; verified 0/47`。
- 901 项测试包含跨标签页仓储冲突与页面同步回归；下一步执行 production build 和默认全量浏览器合同。

## 2026-08-16 - 跨标签页同步 build 与全量 E2E 初始化红灯

- build `1905 modules`、static-copy `198`、PWA precache `86` 通过。
- 全量 171 项首轮 `168 passed / 3 failed`；相关文件单 worker `8/8`；第二轮全量 `170 passed / 1 failed`。重复失败均在双页同时重载后的 heading 默认 5 秒 readiness 等待，业务同步步骤未开始。
- 处理边界：仅给两个同时启动页面的 heading 使用 15 秒局部 readiness，并发等待；保持全局 30 秒、8 workers、双页启动和全部同步/冲突断言。高并发专项与第三次全量必须转绿后才能收口。

## 2026-08-16 - 双页并发初始化专项转绿

- readiness 局部改为两个 heading 并行等待最多 15 秒，不改变产品、业务断言或全局 30 秒总超时。
- 8 workers、三视口、每项目重复 3 次的专项为 `9/9 passed`；改动 E2E 文件 ESLint 通过。仍需第三次完整 171 项确认最终门禁。

## 2026-08-16 - 跨标签页同步默认全量 E2E 转绿

- 端口 `4292`、默认 8 workers、三项目完整回归 `171/171 passed`（约 2.7 分钟）。
- 双页同步三视口与既有 schema v3、backup、PWA、内容复核和实验合同在同一轮通过；没有修改全局超时、workers 或业务断言。

## 2026-08-17 - 跨标签页模考同步最终收口

- 按 neat-freak 盘点项目根目录、`content/README.md`、项目/父级 `AGENTS.md` 与根 README；项目没有 `docs/` 目录，未凭空创建 integration/architecture/runbook 文档。README 已补充同浏览器多标签页同步、dirty 冲突只读和不提供云同步的边界；HANDOFF 顶部摘要与当前验证证据已从 schema v2/模考未完成修正为 schema v3/已收口。
- 最终门禁：lint、workspace typecheck 全绿；Vitest `80 files / 901 tests`；release `10/10`；内容 `47 questions / 19 assets`、`40 objective / 7 comprehensive`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA precache `86 entries (2635.30 KiB)`；默认 8-worker 三视口 E2E `171/171`；双页同步压力专项 `9/9`。
- 新鲜冲突态截图已人工查看：桌面提示条/加载按钮、移动自然换行、答案禁用态、固定底栏均无 P0/P1；390 state/bottom 重合是滚动距离不足导致的重复采集，不是布局缺失。
- 本轮没有改 v1/v2 store 定义、正式题包或审核状态，没有删除文件/测试/旧图片，没有改旧 `cpu-explorer`，没有提交、推送或部署；临时端口 `4286/4288/4289/4290/4291/4292` 已释放。Agent memory 未更新，因为本轮没有用户明确提出更新记忆。

## 2026-08-17 - 无新范围下的只读立项审计

- 按最新 HANDOFF 约束，本轮没有把普通“继续”解释成新功能授权；只读检查了 CPU 实验室模块导航、相关测试和已知 P2 backlog，没有改代码或测试。
- 证据：`apps/web/src/pages/CpuLabPage.tsx` 的实验类型导航有 10 个按钮，选中态只通过 `active` class 表达，未暴露 `aria-pressed`/`aria-selected`；`npm exec vitest run apps/web/src/pages/CpuLabPage.test.tsx` 为 `1 file / 10 tests passed`，`npx eslint apps/web/src/pages/CpuLabPage.tsx apps/web/src/pages/CpuLabPage.test.tsx` 通过。
- 建议候选：单独立项 CPU 导航选中语义，先加“恰有一个 pressed 且点击后迁移”的红灯，再做最小实现。Q47 移动标题孤字换行和 Pipeline/Knowledge 其他分段控件仍仅为 P2 候选，不在本轮扩大。
- 当前没有新的可复现 P0/P1；正式题包继续 `needs-review; verified 0/47`，schema v3、跨标签页同步、v1/v2 数据和旧模块边界不变。

## 2026-08-17 - 分段控件语义对照审计

- 静态对照确认：数据结构、磁盘、森林、Q44 和 ContentReview 已有 `aria-pressed`/`aria-selected`；网络、操作系统、数据结构模块页已有 `aria-current`。因此不把问题描述成全站统一缺陷。
- CPU 内部转换/位宽按钮、Pipeline 模式、Knowledge 学科/知识点仍有 active/selected CSS 但缺少对应语义；这些控件含义不同，暂不混入 CPU 导航最小修复。
- 没有新增代码或测试，没有发现 P0/P1；下一项若获授权仍以 CPU 实验类型导航 10 个按钮为界，先红后绿。

## 2026-08-17 - CPU 模块导航 aria-pressed 红灯

- 用户明确授权 CPU 实验类型导航 10 个按钮的语义，不包含其他分段控件。
- 新增回归锁定 10 个按钮全部具有 `aria-pressed`、恰有一个为 true，并在 I/O 开销切换到 Cache 映射后迁移。
- 定向 Vitest 实测 `1 failed / 10 passed`；失败点为当前 10 个按钮没有 `aria-pressed`，红灯准确且无夹具噪声。

## 2026-08-17 - CPU 模块导航 aria-pressed 转绿

- `CpuLabPage.tsx` 10 个实验类型按钮已补布尔 `aria-pressed`，保持现有 CSS active、URL 和模块路由逻辑不变。
- 同一回归命令转绿为 `1 file / 11 tests passed`；未扩展到其他页面控件。

## 2026-08-17 - CPU 模块导航 aria-pressed 最终收口

- 变更文件为 `CpuLabPage.tsx` 与 `CpuLabPage.test.tsx`：10 个模块按钮均有布尔 `aria-pressed`，恰有一个为 true，点击切换后从 I/O 开销迁移到 Cache 映射；现有 URL 与 active 行为不变。
- 定向与静态证据：页面 `11/11`、CPU 相关 `7 files / 69 tests`，改动文件 ESLint、Web typecheck 通过。
- 最终门禁：lint、workspace typecheck 全绿；Vitest `80 files / 902 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2635.60 KiB)`。
- 全量 E2E 首轮端口 `4293` 为 `170/171`，trace 显示移动 ContentReview 的 `vendor-storage-*.js` 请求 `net::ERR_NO_BUFFER_SPACE`，空白页未进入业务断言；端口 `4294` 精确用例 `1/1`，端口 `4295` 第二轮默认 8 workers / 三视口为 `171/171`。没有放宽超时、workers 或断言。
- 没有视觉样式变化，未新增截图结论；没有扩大到 CPU 内部控件、Pipeline 或 Knowledge，也未改 schema、题包、旧图片、旧 `cpu-explorer`、Q44，未删除测试、提交、推送或部署。端口 `4293/4294/4295` 已释放。

## 2026-08-17 - CPU 内部分段控件只读审计

- 没有新增实现。静态盘点 `CpuLabPage.tsx` 发现 4 组共 9 个内部分段按钮缺少 `aria-pressed`：机器数方向 2、位宽 3、IEEE 754 方向 2、RV32I 方向 2。
- 这与已完成的顶层 10 模块导航是不同层级，暂不混合修复；Pipeline、Knowledge 和全站控件也不扩大。
- 可选下一范围：CPU 内部 4 组分段控件语义。应先写四组唯一选中/点击迁移红灯，保持方向、位宽和 StepExplorer 行为不变。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 红灯

- 用户授权 CPU 内部 4 组、9 个方向/位宽按钮语义，不扩展到 Pipeline、Knowledge 或全站重构。
- 新增 signed 方向/位宽、IEEE 754 方向、RV32I 方向三项回归；默认定向 Vitest 实测 `3 failed / 11 passed`。
- 红灯均准确落在 `aria-pressed` 缺失，未触及计算结果、URL 或 StepExplorer 行为；下一步补最小属性实现。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 转绿

- `MachinePanel`、`Float32Panel`、`RiscvPanel` 共 9 个方向/位宽按钮已补布尔 `aria-pressed`，其他交互和状态源不变。
- `CpuLabPage.test.tsx` 同一命令转绿为 `14/14`；四组默认唯一选中项及点击迁移均通过。

## 2026-08-17 - CPU 内部分段控件受限环境门禁

- 默认 CPU 联合 Vitest 在 Vite 配置加载阶段因 `esbuild spawn EPERM` 失败，测试未收集。一次性同进程 Node API 适配下，CPU 相关 `7 files / 72 tests`、全量 `80 files / 905 tests` 全绿；适配没有修改项目文件，结果不冒充默认 worker-mode 门禁。
- 全仓 lint、全部 workspace typecheck 通过；内容校验为 `47 questions / 19 assets`、`needs-review; verified 0/47`。来源核对与自动门禁仍不等于人工审核。
- 默认 release test runner 因派生进程 `spawn EPERM` 阻塞；`--test-isolation=none` 同进程结果为 `10/10`。build 在 Vite 读取配置时被相同权限边界阻止，因此本次尚未产生新的 build 或浏览器证据。

## 2026-08-17 - CPU 内部分段控件正式门禁恢复与浏览器首轮

- unrestricted 环境重跑后，默认 Vitest `80 files / 905 tests`、默认 release `10/10`、build `1905 modules` / static-copy `198` 均通过；受限环境记录保留但已不再是当前阻塞。
- 默认三视口全量 E2E 首轮 `170/171`。唯一失败为 chromium-1440 的 Q42 可视化深链按钮 actionability 稳定性等待超时；1366/390 同用例通过，端口 `4296` 精确复跑 `1/1`（1.6 秒）。
- 不修改 Q42 产品、超时、worker 或断言；下一步完整复跑 `171` 项以确认最终门禁。

## 2026-08-17 - CPU 内部分段控件浏览器第二轮

- 端口 `4297` 默认全量 `168/171`；失败均在 chromium-1440 初始 lazy route heading 的 5 秒 readiness：Q37、Q41、Q25。三者同轮 1366/390 通过，页面快照停在应用壳“载入页面”。
- trace 没有 `net::ERR_*` 或 page error，暂按 8-worker 初始化压力继续验证；不扩大 CPU 语义改动范围，也不调整无关 E2E 合同。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 最终收口

- `CpuLabPage.tsx` 的内部 4 组共 9 个分段按钮均已使用布尔 `aria-pressed`；新增三项测试同时覆盖机器数方向/位宽、IEEE 754 方向和 RV32I 方向的唯一选中与点击迁移。红灯 `3 failed / 11 passed`，页面绿灯 `14/14`，CPU 相关 `7 files / 72 tests`。
- 最终默认门禁：lint、workspace typecheck 全绿；Vitest `80 files / 905 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2635.78 KiB)`。
- E2E 首轮 `170/171` 的 Q42 actionability 波动精确复跑 `1/1`；第二轮 `168/171` 的 Q37/Q41/Q25 lazy 初始化波动并行复跑 `3/3`；端口 `4299` 第三轮默认 8 workers / 三项目最终 `171/171`。没有调整超时、workers 或业务断言。
- 本轮刷新并人工检查 `lab-signed`、`lab-float32`、`lab-rv32i` 三视口九张截图，无 P0/P1、控件重叠、横向溢出或截字。未改视觉 CSS、schema、题包、旧图片、旧 `cpu-explorer` 或 Q44 边界，未删除测试/文件、提交、推送或部署。

## 2026-08-17 - Pipeline 模式按钮语义只读审计与立项

- 只读检查确认 `PipelineLabPanel` 的“动态五级流水 / 功能段时延”两个模式按钮仅以 `.active` 表达选中态，缺少 `aria-pressed`；前递开关的 `role="switch" + aria-checked` 和周期按钮的 `aria-current="step"` 已正确，不纳入修改。
- Knowledge 学科/知识点选择属于更大的独立语义范围，本项不混入。新鲜只读验证为 pipeline core `36/36`、组件 ESLint 通过；既有三视口 E2E 没有 pressed 断言。
- 用户在该唯一候选建议后授权继续。下一步新增独立 `PipelineLabPanel.test.tsx`，先得到两个模式按钮缺少 `aria-pressed` 的红灯；契约还要求默认唯一选中，并在点击后与 URL 一起迁移。实现只允许补这两个按钮的布尔属性，不改视觉 CSS、模式逻辑或其他控件。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 红灯

- 新增 `apps/web/src/components/PipelineLabPanel.test.tsx`，覆盖两个按钮全有 `aria-pressed`、默认唯一选中、timing 切换与 canonical URL 同步，以及切回动态模式。
- 首次测试被 JSDOM 未实现 `HTMLElement.scrollTo` 的挂载异常截断；只在测试文件中补可清理 polyfill 后，定向 Vitest 得到目标红灯 `1 failed / 0 passed`，失败精确落在按钮缺少 `aria-pressed`。
- 当前尚未修改产品实现；下一步只补两个布尔属性，保持既有 active class、URL 和两套流水线功能不变。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 转绿

- 两个模式按钮分别增加 `aria-pressed={mode === 'dynamic'}` 与 `aria-pressed={mode === 'timing'}`；状态仍完全由 search params 派生，没有新增 React 状态或改动样式。
- 同一组件定向 Vitest 从目标红灯转为 `1/1 passed`，并验证 timing canonical URL 与切回动态模式。下一步进入联合回归、静态检查和真实浏览器合同。

## 2026-08-17 - Pipeline 模式按钮定向浏览器验收

- Pipeline core + 新组件 + CPU 路由联合为 `3 files / 51 tests passed`；组件/测试/E2E ESLint、Web 与 cpu-core typecheck 通过。
- `pipeline-lab.spec.ts` 现验证三视口下两个模式按钮始终唯一 pressed，并在 dynamic/timing 互切时与 URL 一起迁移。端口 `4300` 真实 Chrome `6/6 passed`。
- 人工检查本轮新鲜 Pipeline 动态/时延桌面图及 390 时延首屏，模式控件完整、active 状态清楚，无重叠、截字、页面横溢或底栏遮挡 P0/P1。下一步执行全量门禁。

## 2026-08-17 - Pipeline 模式按钮全量源码门禁

- 全仓 lint 与全部 workspace typecheck 通过。
- 默认 Vitest 新鲜结果为 `81 files / 906 tests passed`；相较 CPU 内部分段控件基线只新增 1 个测试文件和 1 项语义合同，既有 905 项全部保留。
- 下一步继续 release/content/build；自动门禁不改变人工审核状态。

## 2026-08-17 - Pipeline 模式按钮 release、内容与 build 门禁

- release `10/10`；内容校验 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，继续 `needs-review; verified 0/47`。
- production build `1905 modules`、static-copy `198`、PWA `86 entries (2635.84 KiB)`，无 chunk warning。下一步执行默认 171 项三视口全量 E2E。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 最终收口

- 最终产品改动只有两个模式按钮的布尔 `aria-pressed`；新增独立组件测试，并在既有 Pipeline E2E 中验证 dynamic/timing 唯一 pressed 与 canonical URL 同步。没有改前递 switch、周期/阶段选择、Knowledge、CSS 或模式业务逻辑。
- 红灯 `1 failed / 0 passed` 精确命中属性缺失；转绿后组件 `1/1`、联合 `3 files / 51 tests`。最终 lint/typecheck 全绿，默认 Vitest `81 files / 906 tests`，release `10/10`，内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`，build `1905 modules`、static-copy `198`、PWA `86 entries (2635.84 KiB)`。
- 真实 Chrome：端口 `4300` Pipeline 三项目 `6/6`；端口 `4301` 默认 8-worker 三项目全量 `171/171`，约 3.4 分钟。新鲜截图人工检查无 P0/P1；端口均已释放。
- 最终边界复核确认 v1/v2/v3 stores、旧图片 19 张、旧 `cpu-explorer` 和 Q44 `parallel-5 / split-6` 未改；正式题包保持 `needs-review; verified 0/47`。没有删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge 控件语义只读审计

- 本轮没有把普通“继续”扩大为实现授权。只读检查了 `KnowledgePage.tsx`、`KnowledgeGraph.tsx`、现有 Knowledge 流程/视觉 E2E 和领域聚合测试；没有改产品代码或测试。
- 语义结论：4 个学科按钮和叶知识点索引按钮均应保留原生 button，并在后续独立立项时补布尔 `aria-pressed`。学科组始终恰有一个 pressed；叶节点列表因默认选中科目根节点，初始可以没有 pressed，点击叶节点后才唯一 pressed。
- 未采用 tabs/listbox/navigation：当前没有 tab/tabpanel 对应关系，按钮也不改变 route；强行换复合控件角色会要求当前不存在的 roving focus、方向键或 option 交互。
- 独立状态审计立案 P1：`subject/node` 只用于 `useState` 初始化，页面内选择不更新 canonical URL，同路由 query 变化也不更新 UI；切换后的刷新/分享、连续 Knowledge history 的 back/forward 与非法参数规范化都会产生地址和页面分叉。首次加载和实验页跨路由深链会重挂组件，因此仍可用，但不能覆盖该缺口。
- 独立 P2：Cytoscape 节点以 pointer `tap` 选择而容器为 `role="img"`，叶节点有下方按钮替代但根节点没有直接键盘入口。该问题与 URL P1、按钮 pressed 语义分别立案。
- 新鲜验证：`npm exec vitest run packages/domain/src/analytics.test.ts` 为 `1 file / 11 tests passed`；5 个入站知识深链相关 Vitest 为 `5 files / 29 tests passed`，lab links 为 `36/36`；相关 ESLint 全绿。独立状态审计还将现有 Knowledge 流程真实 Chrome 精确复跑为 `1/1`，但该用例只覆盖首次进入、本地节点点击与专项练习，尚无 URL/history 或 pressed 合同。
- Q44 仍只支持 `parallel-5 / split-6` 且保持 `needs-review`；正式题包保持 `needs-review; verified 0/47`。本轮没有修改 v1/v2/v3 store、旧图片、旧 `cpu-explorer`，没有删除文件/测试、提交、推送或部署。

## 2026-08-17 - Knowledge URL/state P1 页面红灯

- 新增 `apps/web/src/pages/KnowledgePage.test.tsx`。测试 mock `KnowledgeGraph` 以隔离 Canvas/ResizeObserver，只保留真实 `buildKnowledgeForest` 与 `aggregateKnowledgePerformance`，覆盖 canonical 规范化、有效深链、用户选择 history、同路由 query、back/forward 及图节点回调。
- 规范合同以现有 subject 优先行为为准，不让孤立/冲突 node 反推学科。canonical 始终显式保留一个合法 subject；根节点不重复写 node；未知、重复、非法和跨科目参数通过重建 query 清除。系统纠偏使用 replace，用户浏览选择使用 push。
- `npm exec vitest run apps/web/src/pages/KnowledgePage.test.tsx` 新鲜结果为 `1 file / 7 tests`，`5 failed / 2 passed`。失败点全部是旧实现缺少 URL 同步或仍保留 mount-time state；合法首次深链与既有跨科目回退行为继续通过。
- property-based-testing 指南用于审查规范化不变量；仓库未安装 PBT 库，且本项主要是 UI/history 副作用，因此采用确定性输入矩阵与浏览器 history 合同，没有为简单页面引入新依赖或过度抽象。
- 本步骤只新增测试与文档，尚未修改产品实现；`aria-pressed`、图根节点键盘入口仍是后续 P2。题包保持 `needs-review; verified 0/47`，Q44、schema、旧图片和旧 `cpu-explorer` 未改。

## 2026-08-17 - Knowledge URL/state P1 页面转绿

- 产品实现严格限于 `apps/web/src/pages/KnowledgePage.tsx`。删除 subject/node 的本地选择 state，URL 直接派生当前学科、合法叶节点和科目根回退；练习创建的 `starting/startError` 本地状态保持不变。
- 系统 canonical 纠偏使用 `setSearchParams(..., { replace: true })`，用户学科/节点选择使用默认 push；根节点不写 node，跨科目或非法节点不改变父级 subject，重复点击当前项不新增 history。
- 首次定向实现结果为 `6 passed / 1 failed`；唯一失败来自测试正则同时命中 mock 图按钮和叶索引按钮，非产品行为。Web typecheck 同时发现 `getByRole` 不支持 `exact` 选项。收紧测试选择器后，同一 Vitest 为 `1 file / 7 tests passed`，相关 ESLint 与 Web typecheck 均通过。
- 下一步把同一合同搬到真实 BrowserRouter/Cytoscape/IndexedDB 流程，覆盖 Q15 深链、OS 根、Q29、reload 和 back/forward，再刷新三视口选中态截图；不扩大到两个已记录 P2。

## 2026-08-17 - Knowledge URL/state P1 三视口浏览器合同

- 行为 E2E 从 Q15 合法深链进入，用户切换到 OS 根后 canonical 删除旧 node，再选择 Q29；reload 保持 Q29，back 恢复 OS 根，forward 再恢复 Q29。断言不依赖模糊文本或参数集合，直接核对固定 canonical search。
- 视觉 E2E 在既有默认非空 canvas 检查之后切到 OS/Q29，核对详情和 URL，再做页面横溢检查并生成 `chromium-1440/1366/390-knowledge-selected.png`。
- 原计划以 grep 跑 6 项，但 `npm exec` 参数分隔未生效，实际在端口 `4302` 跑了 `study-flow.spec.ts + visual.spec.ts` 全部 `57` 项；结果 `57/57 passed`，因此保留这份更广的真实 Chrome 证据，不将其冒充全仓 174 项门禁。
- 下一步人工检查三张新截图并让独立审计只报告 P0/P1；之后再执行完整门禁。`aria-pressed` 和图根键盘入口仍是独立 P2。

## 2026-08-17 - Knowledge URL/state P1 截图人工检查

- `1440/1366`：选中 Q29 后，操作系统 subject、画布 Q29 描边、详情“考查磁盘的调度算法”和列表左侧选中条一致；无文本重叠、按钮截字或页面横溢。
- `390`：全页长截图中各知识点标题、Q 编号、未检测状态和右箭头均保持在各自行内；Q29 选中条完整，末项与固定底部导航之间有安全间距，没有遮挡。
- 未发现 P0/P1。桌面画布顶部两个外围节点有轻微裁切，记录为既有 Cytoscape 布局 P2，本轮不改 CSS/fit，也不将视觉验收扩大为图交互重构。

## 2026-08-17 - Knowledge URL/state P1 视觉审计与源码门禁

- 独立视觉审计 P0/P1 为 0，另记录移动截图证据构图未在单张图同时包含画布/详情的 P2；结合行为断言与桌面截图，不构成已观察到的状态分叉。
- `npm run lint` 通过；`npm run typecheck` 的 Web、content-schema、cpu-core、domain、lab-core、storage 全部 workspace 通过。
- `npm test` 默认 worker-mode 为 `82 files / 913 tests passed`，持续约 24 秒；上一完整基线为 `81/906`，净增 1 个测试文件和 7 项，不存在删除测试换绿。
- 下一步继续 release/content/build 与完整 174 项三项目 E2E；定向 `57/57` 仍不替代全量浏览器门禁。

## 2026-08-17 - Knowledge URL/state P1 release、内容与 build 门禁

- release runner `10/10`；内容校验 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，状态保持 `needs-review; verified 0/47`。自动验证没有改变逐题人工审核计数。
- production build 为 Vite `1905 modules`、static-copy `198`、PWA `86 entries (2636.26 KiB)`；Knowledge chunk 正常生成，无新增 chunk warning。
- 等待独立代码审计；若没有 P0/P1，最后只剩默认 8-worker 三项目全量 E2E 与边界复核。

## 2026-08-17 - Knowledge 图实例稳定性 P1 红灯

- 审计结论经本地依赖源码复核成立：`react-router/dist/...useSearchParams` 的 setter callback dependency 为 `[navigate, searchParams]`；`KnowledgeGraph` 创建/销毁 effect dependency 含 `onSelect`。
- mock 图记录每次 render 收到的 `onSelect`，新增“同科目仅 node 变化时身份不变”合同。`npm exec vitest run apps/web/src/pages/KnowledgePage.test.tsx` 为 `1 failed / 7 passed`，失败值均显示 Function 但 `Object.is` 不相等。
- 修复方案使用当前选中 id ref 保留 no-op 判断，节点导航改走稳定 `navigate`；callback 只在 subject 或 forest index 真正变化时更新。图组件和两个既有 P2 不改。

## 2026-08-17 - Knowledge 图实例稳定性 P1 转绿

- 初版在 render 中同步 ref，Vitest `8/8` 与 typecheck 通过，但 `react-hooks/refs` 正确报错；没有绕过规则，改为 `useEffect([activeSelectedId])` 同步 ref。
- 最终 `selectNode` 不再依赖 query-sensitive `setSearchParams` 或 `canonicalSearch`，而使用 `navigate({ search })`；同科目根/叶变化下 callback identity 保持不变，当前项重复点击仍 no-op。
- 最终页面定向 `8/8`、相关 ESLint 与 Web typecheck 全绿。等待独立复审后重跑全量门禁；此前 `82/913` 和 build 证据早于这次 P1 修复，不能直接作为最终结果复用。

## 2026-08-17 - Knowledge 重复图事件 history P1 红灯

- 在同一 `act` 直接调用首次 render 的稳定 `onSelect('topic-os')` 两次，确认这不是 DOM 双击时序猜测，而是 callback 本身可重入时的确定性合同。
- 当前实现新鲜结果 `1 failed / 8 passed`：两次 navigate 都看见旧 root ref；点击 harness 后退一次后 UI 仍是 OS leaf，说明 history 中存在重复 leaf entry。
- 修复要求同时覆盖本回调重入和外部 history 导航窗口：导航前同步 ref，commit 时用 layout effect 对齐 URL 派生选择。

## 2026-08-17 - Knowledge 重复图事件 history P1 转绿

- `activeSelectedIdRef.current = knowledgePointId` 放在 navigate 前，因此第二次同目标调用立即命中 no-op；`useLayoutEffect([activeSelectedId])` 处理外部 query/back-forward 改变，避免 passive effect 窗口。
- 同一命令转为 `1 file / 9 tests passed`，产品/测试 ESLint 和 Web typecheck 通过。没有为通过测试修改 MemoryRouter harness、删除 history 断言或把 push 改成 replace。
- 最终复审进行中；此前所有全量源码/build 证据仍需在这次最终实现后刷新。

## 2026-08-17 - Knowledge URL/state P1 最终独立审计

- 原审计代理最终复跑页面 `9/9` 并确认 P0/P1 为 0；callback identity、重入幂等、外部 history 同步和合法深链均无新增问题。
- P2 只保留记录：页面测试中部分 canonical 文本断言为子串、桌面图顶部节点轻微裁切、移动截图构图不同时展示画布与详情，以及另案的 pressed/根键盘语义；本轮不扩大。

## 2026-08-17 - Knowledge URL/state P1 最终源码门禁

- 最终 `npm run lint`、全部 workspace `npm run typecheck` 通过。
- 默认 `npm test` 为 `82 files / 915 tests passed`，持续约 24 秒；相对 Pipeline 最终基线 `81/906` 增加 Knowledge 页面文件与 9 项 deterministic URL/history/callback 回归。
- 下一步 release/content/build 与最终全量 E2E；所有早于最终两项审计修复的门禁结果只保留为过程证据。

## 2026-08-17 - Knowledge URL/state P1 最终 release、内容与 build 门禁

- 最终 release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`，没有把审计或来源核对当成人工审核。
- 最终 build `1905 modules`、static-copy `198`、PWA `86 entries (2636.35 KiB)`；Knowledge chunk `452.80 kB / gzip 145.76 kB`，无新 warning。
- 下一步端口 `4303` 全量 `174` 项 E2E；定向 `57/57` 与截图证据不替代此门禁。

## 2026-08-17 - Knowledge URL/state P1 全量 E2E 首轮

- 端口 `4303` 全量 `173/174`，约 3.5 分钟。唯一失败是 `mock-exam.spec.ts:144` 的 chromium-390 双标签同步，主 tab 的“2009 整卷模考”heading 未在局部 15 秒出现；同轮 1440/1366 通过。
- error context 为应用壳 + “载入页面”；失败 screenshot 已是完整 Q1 模考页面，说明页面在断言超时后完成加载。trace 的 network/trace 文件检索无 `net::ERR`、HTTP 4xx/5xx、pageerror 或 console error。
- 不改无关产品或测试合同。下一步端口 `4304` 精确复跑，再决定是否进入全量第二轮；端口 `4303` 只有 TIME_WAIT，无监听进程。

## 2026-08-17 - Knowledge URL/state P1 E2E 失败项精确复跑

- 端口 `4304` 只跑 chromium-390 的双标签模考同步用例，结果 `1/1 passed`，业务耗时 2.7 秒、总进程 22.8 秒（含 build/server）。
- 未更改任何模考、Playwright 或超时配置。下一步端口 `4305` 完整第二轮 `174` 项。

## 2026-08-17 - Knowledge URL/state P1 全量 E2E 第二轮

- 端口 `4305` 为 `173/174`，约 3.3 分钟。首轮移动双标签模考本轮通过；唯一失败变为 chromium-1440 ContentReview Q41/history，用例 1366/390 均通过。
- 页面快照已完整渲染 47 个按钮、来源/结构化/核对面板；Q41 按钮存在，但 `scrollIntoViewIfNeeded` 等 stable 直到 30 秒超时。trace 无 `net::ERR`、4xx/5xx、pageerror 或 console error。
- 按既有策略不扩大修复范围。端口 `4306` 精确复跑，随后仍需端口 `4307` 全量第三轮；端口 `4305` 无监听进程。

## 2026-08-17 - Knowledge URL/state P1 第二个失败项精确复跑

- 端口 `4306` chromium-1440 ContentReview Q41/history 精确结果 `1/1 passed`，业务 1.5 秒、总进程 18.2 秒。
- 不修改无关 ContentReview。端口 `4307` 继续第三轮完整 `174` 项。

## 2026-08-17 - Knowledge URL/state P1 最终收口

- 端口 `4307` 的 Playwright HTML 报告内嵌 archive 已在内存中解包核对：`actualWorkers=8`，三个 Chrome 视口项目共 `174 total / 174 expected / 0 unexpected / 0 flaky / 0 skipped`，报告 `ok=true`；`.last-run.json` 为 `passed`、失败列表为空。总持续约 175 秒。
- 前两轮 `173/174` 的失败分别是 chromium-390 模考 lazy 初始化和 chromium-1440 ContentReview Q41 actionability 波动；端口 `4304/4306` 精确复跑均 `1/1`，端口 `4307` 最终全量 `174/174`。未修改这些无关产品、测试 helper、timeout、workers 或断言。
- 最终三张 `knowledge-selected` 图复看无 P0/P1；OS/Q29 状态同步，桌面/移动均无文字重叠、截字、横向溢出或底栏遮挡。桌面顶部两个外围图节点轻裁切、移动截图构图不同时包含画布与详情仍只记 P2。
- 完整最终门禁保持：lint、全部 workspace typecheck 通过；Vitest `82 files / 915 tests`；release `10/10`；内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.35 KiB)`；定向 E2E `57/57`；默认三项目 E2E `174/174`。代码与视觉独立审计 P0/P1 为 0。
- `4302-4307` 均无监听进程。Knowledge `aria-pressed` 与图根键盘入口继续分开立项；Q44 仍只支持 `parallel-5 / split-6` 并保持 `needs-review`。没有修改 v1/v2/v3 store、题包、旧图片、旧 `cpu-explorer`，没有删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge 按钮 aria-pressed 红灯

- 本项获用户继续授权，范围只包含 4 个学科按钮与叶节点索引按钮；Cytoscape 根节点键盘入口仍是独立 P2。
- 页面测试新增两个合同：学科组始终唯一 pressed；叶节点根态为 0、选叶后唯一、切科后归零并可在新科目重新唯一。
- `npm exec vitest run apps/web/src/pages/KnowledgePage.test.tsx` 为 `2 failed / 9 passed`；失败分别证明学科与叶节点按钮都缺少 pressed 语义，既有 URL/state 九项全绿。
- 下一步只补两个派生布尔属性，不改 CSS、class、点击、URL 或图组件。

## 2026-08-17 - Knowledge 按钮 aria-pressed 转绿

- 产品只增加学科 `subject === item.id` 与叶节点 `activeSelectedId === node.point.id` 两个布尔属性表达式，既有状态和视觉逻辑不变。
- 同一页面测试从 `2 failed / 9 passed` 转为 `11/11 passed`，覆盖根态允许无叶 pressed、选择后唯一以及切科清零。
- 下一步在既有 Q15/OS/Q29 reload/history E2E 中验证三视口语义，不新增重复浏览器流程。

## 2026-08-17 - Knowledge 按钮 aria-pressed 三视口合同

- 现有 Knowledge URL/history E2E 增加可复用 pressed 分区 helper，覆盖 Q15 深链、OS 根、Q29、reload、back 和 forward；每一步同时核对 true/false 数量与目标按钮。
- 页面 `11/11`、相关 ESLint、Web typecheck 通过；端口 `4308` 三项目真实 Chrome `3/3 passed`。
- 下一步刷新并复核三视口 Knowledge 截图，然后进入全量门禁。

## 2026-08-17 - Knowledge 按钮 aria-pressed 截图检查

- 端口 `4309` 的现有 Knowledge 视觉用例三项目 `3/3`，默认/OS-Q29 六张图均已刷新并人工复核。
- 三视口无 P0/P1、布局变化、横溢、截字或底栏遮挡；pressed 属性不命中 Knowledge CSS，active/selected 视觉与 URL 仍同步。
- 桌面图上缘轻裁切和移动选中长图构图限制仍为既有 P2。`4308/4309` 均已释放，下一步全量门禁与独立审计。

## 2026-08-17 - Knowledge pressed E2E 非空分区 P1

- E2E 独立审计指出 helper 在无 activeName 的根态允许空列表以 0/0 分区假绿；产品实跑列表非空，但合同本身缺少非空前提。
- 修复范围只是在 helper 中加入 `total > 0`，然后重跑三视口；不修改产品实现。代码独立审计已确认产品 P0/P1 为 0。

## 2026-08-17 - Knowledge pressed E2E 非空分区 P1 转绿

- helper 已增加非空断言，随后才核对 true/false 完整分区；端口 `4311` 三项目 `3/3`、E2E 文件 ESLint 通过，原假绿窗口关闭。
- 当前全量源码门禁为 lint/typecheck 全绿、Vitest `82/917`、release `10/10`、内容 `47` 题且 `needs-review; verified 0/47`、build `1905 modules` / static-copy `198` / PWA `86 entries (2636.40 KiB)`。
- 下一步最终独立 E2E 复审与默认完整 `174` 项三视口门禁。

## 2026-08-17 - Knowledge 按钮 aria-pressed 最终收口

- 产品只在 Knowledge 学科与叶索引按钮增加 URL 派生的布尔 `aria-pressed`；没有新增状态、角色、CSS 或图交互。页面红灯 `2 failed / 9 passed`，实现后 `11/11`。
- 三视口行为覆盖 Q15 深链、OS 根、Q29、reload、back/forward；审计指出的空列表假绿 P1 通过 `total > 0` 关闭，端口 `4311` 修正后 `3/3`，最终 E2E 复审无 P0/P1。
- 代码、E2E 与六张截图独立复审均无 P0/P1；最终选中态三张截图再次人工查看，OS active、图 Q29、详情与列表选中一致，无重叠、截字、横溢或底栏遮挡。本批桌面外围节点完整，移动截图单图无法同时展示图/详情只保留为证据构图 P2。
- 最终门禁：lint、全部 workspace typecheck 通过；Vitest `82 files / 917 tests`；release `10/10`；内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.40 KiB)`。
- 端口 `4312` 默认 `8 workers / 3 projects` 全量首轮 `174/174`，Playwright 报告 `174 expected / 0 unexpected / 0 flaky / 0 skipped`，约 147 秒；`.last-run.json` 为 passed。`4308-4312` 均无监听。
- Cytoscape 根节点直接键盘入口仍是独立候选。本轮未改 v1/v2/v3 store、题包、旧图片、旧 `cpu-explorer` 或 Q44 `parallel-5 / split-6` 边界，未删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge 科目根节点键盘入口立项

- 用户已授权上一检查点唯一候选。范围是为当前科目根节点提供一个可发现、可聚焦、可用 Enter/Space 激活的直接入口；不重做已收口的 URL/state、学科/叶 pressed 或候选比较。
- 最强反对意见是复用当前学科按钮或把根塞入叶列表：前者让“切科目”和“重置叶选择”共享一个不可发现动作，后者会推翻现有 12 个叶节点计数及根态 `0 pressed` 合同。两者均不采用。
- 选定图面板标题区独立原生按钮：右侧装饰图标替换为图标+“科目总览”，accessible name 包含当前科目；根选择继续属于同一详情对象选择，因此使用布尔 `aria-pressed`，不在根态 disabled。按钮复用 `selectNode`，不自行写 URL/history，也不让稳定图回调新增依赖。
- 根身份单独从 `forest.rootIds` 按 subject 解析；若没有明确根则不渲染入口，不能使用允许叶回退的 `defaultSelectedId` 冒充根。现有正式四科均有根和叶；无叶科目根被 `childIds.length === 0` 判成叶的未来边界只记 P2，不扩大本轮。
- 测试顺序：页面先红后绿，参数化 Enter/Space；随后在 `tests/e2e/study-flow.spec.ts` 增加独立三视口 Space 合同，预期收集总数从 `174` 增至 `177`；刷新 Knowledge 默认/root 与 OS/Q29 leaf 截图并检查 1440/1366/390 标题按钮、focus、横溢和底栏。

## 2026-08-17 - Knowledge 科目根节点键盘入口红灯

- 页面测试新增 Enter/Space 两项真实原生按钮键盘契约，覆盖 OS/Q29 叶 -> OS 根 -> back 叶 -> forward 根；URL 使用锚定正则核对完整路径与 query，避免子串假绿。
- 新鲜定向 Vitest 为 `2 failed / 11 passed`。两项目标失败均为“操作系统科目总览”按钮不存在；已有 canonical/history、根态叶 `0 pressed`、graph callback identity 与重复事件幂等 11 项全部通过。
- 当前产品尚未修改。下一步实现明确 root id 和图标题区按钮，不改变叶列表计数、Cytoscape callback dependency 或已有 URL 状态模型。

## 2026-08-17 - Knowledge 科目根节点键盘入口页面转绿

- 根 id 与默认详情回退已分离：只有 `forest.rootIds` 中当前科目的明确根会生成入口；缺根时保留装饰图标，绝不把首叶显示成“科目总览”。
- 新按钮固定可见“科目总览”，动态 accessible name 为“<科目>科目总览”，根/叶状态通过布尔 pressed 表达；原生 Enter/Space 语义和现有 `selectNode` 负责 canonical push/history 幂等。
- 仅新增一个 pressed 视觉规则，没有改变图标题布局、canvas 高度或叶列表。页面定向从目标红灯 `2 failed / 11 passed` 转为 `13/13 passed`。

## 2026-08-17 - Knowledge 科目根节点键盘入口三视口合同

- `npm exec eslint apps/web/src/pages/KnowledgePage.tsx apps/web/src/pages/KnowledgePage.test.tsx`、`npm run typecheck -w @408os/web` 与 `npm exec eslint tests/e2e/study-flow.spec.ts` 均通过；`npm exec playwright test --list` 收集 `177 tests / 24 files`。
- 新增浏览器合同从 `/knowledge?subject=operating-systems&node=topic-2009-q29` 开始，验证根按钮动态名称、显式 false、焦点、Space 原生激活、仅 subject canonical URL、焦点保留、显式 true、叶 pressed 清零和 back/forward 恢复。
- `PLAYWRIGHT_TEST_PORT=4313` 下只运行该用例，真实 Chrome 三项目结果 `3/3 passed`，用例约为 `1.3s / 1.6s / 1.7s`。端口结束后无监听进程。
- 独立代码复审未发现 P0/P1：明确 root id、原生按钮语义、稳定 `selectNode`、history 幂等与根/叶恢复合同一致；复审定向 Vitest 为 `13/13`。
- 下一步扩展 `tests/e2e/visual.spec.ts`，让默认截图断言数据结构根按钮 true、OS/Q29 选中截图断言根按钮 false，并在截图前聚焦该按钮检查 focus outline 是否被面板裁切。

## 2026-08-17 - Knowledge 科目根节点键盘入口视觉检查

- `visual.spec.ts` 在既有非空 canvas 与无横溢合同上增加根入口两态：默认数据结构根为 true；切 OS/Q29 后根为 false，并在 `knowledge-selected` 截图前 `focus()` 且断言 focused。
- 文件 ESLint 通过。首次 `cmd` 调用因 Windows 引号把 grep 拆给 npm，未进入测试并以无效正则退出；没有把该命令错误记为产品红灯，也没有改配置或测试规避。改用 PowerShell 原生参数后，`PLAYWRIGHT_TEST_PORT=4314` 三项目为 `3/3 passed`，约 `1.8s / 1.8s / 1.9s`。
- 已检查 `chromium-1440/1366/390-knowledge.png` 与 `*-knowledge-selected.png`：标题、按钮、图、详情/列表布局稳定；默认 pressed 深色清楚，叶态 focus outline 完整；390px 无按钮文字挤压、横向溢出或固定底栏遮挡。
- `4314` 已检查无监听进程。下一步由独立代理只读复审视觉/E2E P0/P1，然后刷新全部门禁。

## 2026-08-17 - Knowledge 科目根节点键盘入口独立复审与源码门禁

- 独立视觉复审确认六图无 P0/P1：390 按钮距面板边界约 14 CSS px，全局焦点轮廓最外扩约 5px，四边均未裁切；按钮文字不换行，无横溢或底栏遮挡。移动选中截图未同时包含详情/列表、1366 默认图为 viewport-only 属证据范围 P2。
- 独立 E2E 复审未发现 P0/P1/P2：行为用例完整覆盖 exact 动态名称、pressed 双态、Space 与焦点、canonical、非空叶分区、back/forward；视觉用例覆盖三视口根/叶两态与无横溢。
- `npm run lint` 和 `npm run typecheck` 均通过；后者覆盖 Web、content-schema、cpu-core、domain、lab-core、storage。
- `npm test` 默认 worker-mode 为 `82 files / 919 tests passed`，持续 `13.96s`。相对上一最终基线 `82/917` 只增加根入口 Enter/Space 两项页面合同，没有删除、跳过或放宽旧测试。
- 下一步运行 release、内容校验、build 与默认全量 `177` 项 E2E。

## 2026-08-17 - Knowledge 科目根节点键盘入口 release、内容与 build 门禁

- `npm run test:release` 为 `10 tests / 10 passed`；`npm run content:validate` 为 `47 questions`、`40 objective / 7 comprehensive`，仍为 `needs-review; verified 0/47`，没有把来源核对、自动测试或截图检查当成人工审核。
- `npm run build` 通过：Vite `1905 modules`、static-copy `198 items`、PWA `86 entries (2636.77 KiB)`；Knowledge chunk `453.14 kB / gzip 145.90 kB`，无 chunk warning。
- 下一步在新端口运行默认 8-worker 三项目 `177` 项全量 E2E，并在结束后检查报告、截图和监听端口。

## 2026-08-17 - Knowledge 科目根节点键盘入口最终收口

- `PLAYWRIGHT_TEST_PORT=4315 npm run test:e2e` 按配置运行 `177 tests / 8 workers / 3 projects`，首轮 `177 passed`，持续约 `2.9m`；没有调整 workers、timeout、重试或业务断言。`.last-run.json` 为 `{ status: "passed", failedTests: [] }`。
- 全量 E2E 重新生成 22:11-22:12 六张 Knowledge 图；再次人工查看并由独立代理复审后，根入口按钮的 root 深色态、leaf 白底/focus 态、标题区、390 文案与底栏均无 P0/P1。
- 最终截图需保留一个准确 P2：`chromium-1366-knowledge-selected.png` 至少三枚外围节点标签完全越出 canvas，仅保留触顶连线/箭头。这是既有 Cytoscape fit/动画时序构图问题，局限在画布内；Q29、根、详情和下方 12 个叶节点列表完整，同批 1440/390 不复现。本轮按审计边界只记录不修。
- 最终新鲜门禁为：lint、workspace typecheck 通过；Vitest `82/919`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.77 KiB)`；端口 `4313` 键盘 `3/3`、`4314` 视觉 `3/3`、`4315` 全量 `177/177`。
- 独立代码、E2E 与最终视觉复审均无 P0/P1。`4302-4315` 无监听进程。没有修改 v1/v2/v3 store/schema、题包、旧图片、旧 `cpu-explorer` 或 Q44 两套 trace 边界；没有删除测试/文件、提交、推送或部署。

## 2026-08-17 - 下一独立候选只读审计

- 按上一检查点只做三路只读审计，没有修改产品、测试、schema 或 Playwright 产物。P0 为 `0`；当前最严重的新发现不是此前预估的 mastery pressed P2，而是普通练习跨标签陈旧写导致的数据一致性 P1。
- 持久化代理以内存 IndexedDB 复现：Tab A 原子提交 Q1 后，Tab B 用提交前 session 快照执行普通保存；最终 attempt 保留，但 session 的 `responses/submittedQuestionIds` 被清空。`BackupService.exportJson` 仍生成 JSON，而同一服务 `preflight` 抛出 `Attempt question q1 is not marked submitted by session session.`。现有相关 `5 files / 50 tests` 全绿，但没有覆盖该交错。
- 主审逐段复核 `repositories.ts`、`StudyContext.tsx`、`PracticePage.tsx` 与 `backup.ts`：`saveSession` 没有 expected version，response/move/finish 均写回完整快照，页面没有普通 session live subscription；`submitAttempt` 的既有幂等事务只保护重复提交，不能保护后续普通写。结论高置信度。
- 同轮其他 P1：ContentReview 跨标签 stale draft 可把 approved 降回 pending；Practice 选项状态与提交结果播报/焦点、来源 modal 焦点模型存在可访问性缺口；visual overflow helper 不检查 `.main-area`，Q43 顶层入口 canonical 测试不精确。它们都与首选修复解耦，保持独立候选。
- P2 继续只记录：Practice mastery/答题卡、Questions 科目筛选、Cache 时间线、ContentReview mobile tabs、SPA route announcement、无效 query 规范化，以及 Knowledge 1366 selected 的 Cytoscape 外围节点越界。本轮没有实施任何一项。
- 下一步建议先立项普通 StudySession CAS：红灯必须覆盖 stale response/move/finish、已提交 attempt/session 不变量和 export/preflight 可恢复性；实现采用事务内 expected `updatedAt` 比较并让 create/update 语义明确，不需要且不得修改 408-user v1/v2/v3 schema。完成后再做独立核心审计和全量门禁。

## 2026-08-17 - 普通 StudySession CAS 红灯

- 已获授权并先改测试。性质测试指南用于提炼“不变量 + 边界”，但 IndexedDB 交错属于有副作用的明确有限场景，因此没有引入随机生成器或新依赖，采用固定 base -> commit -> stale write 顺序。
- 仓储红灯最终为 7 项：三种 stale 普通保存、不同题 stale submit、同题不同答案伪幂等、null create-only、updatedAt 严格推进。额外纳入两种 submit 边界是必要收口：不同题会留下孤立 attempt；同题不同答案虽不覆盖 DB，却会让 Web 把本地候选误报为提交成功。
- 最新命令 `npm exec vitest run packages/storage/src/storage.test.ts` 为 `7 failed / 28 passed`。旧实现对 expected 参数静默忽略，并把同题不同 response 当成成功；红灯均为预期行为缺失，其他 28 项通过。
- 设计边界：null 表示期望 session 不存在，字符串表示期望当前 `updatedAt` 精确相等；更新后的 token 必须严格大于旧 token，Web 统一生成 `max(Date.now(), previous + 1ms)`。same-question submit retry 继续返回既有 progress 且不重写 session；different-question stale submit 必须在同一事务回滚 attempt/progress/session/changeLog。
- 当前尚未修改仓储或 Web 产品代码。下一步实现最小 CAS，再跑同一定向测试转绿并处理类型暴露、所有调用点和冲突恢复语义。

## 2026-08-17 - 普通 StudySession CAS 核心转绿

- `repositories.ts` 新增 `StudySessionConflictError` 和事务内 write guard。`saveSession` 与新 attempt 路径都比较当前 row 与 expected；create collision、missing update、stale update 在写 changeLog 前失败。candidate token 未严格推进则作为无效更新拒绝。
- same-question attempt 只有 mode、content version、response 都一致才算幂等；不同 response 不能再让调用方误以为自己的候选 session 已提交。different-question stale attempt 在创建 progress/attempt 前做 CAS，四张相关表保持原子。
- `StudyContext` 的 create 传 null；saveResponse、submitResponse、moveSession、finishSession 均传输入 session.updatedAt，并使用单调时间 helper。backup v2 与 mock guard 夹具只补显式前置条件，没有改变测试意图或 schema。
- 定向结果：`storage.test.ts` 从最新 `7 failed / 28 passed` 转为 `35/35`；扩大到 `storage.test.ts + backup-v2.test.ts + mock-schema-v3.test.ts` 为 `53/53`。`npm run typecheck -w @408os/storage` 和定向 ESLint 均通过。
- 仍待完成：StudyContext expected-token 接线合同、Practice 冲突专用 UI/测试、独立核心审计和全量门禁；当前结果不能当最终收口。

## 2026-08-17 - Practice 跨标签冲突 UI 红灯

- 页面测试新增 response queue 与 action 两个冲突入口。`npm exec vitest run apps/web/src/pages/PracticePage.test.tsx` 为 `2 failed / 7 passed`：实际分别仍显示“草稿仍保留/重试保存”和“当前内容仍保留/再次执行”，准确证明 typed CAS conflict 未被区分。
- 选定显式恢复而非自动 merge：自动重放本地 draft 可能覆盖另一标签尚未提交的草稿；自动清空则会丢综合题长文本。冲突态先冻结写操作并保留页面输入，用户点击“重新读取最新进度”后加载权威 session，只清除已由远端提交题目的本地 overlay，其余未提交 drafts 留在页面但不会被静默写回。
- 实现不得改变普通 IndexedDB quota/temporary failure 的两项既有重试合同；该类错误仍可在原队列上重试。

## 2026-08-17 - StudySession CAS Web 转绿

- `PracticePage` 新增 typed conflict 状态与显式恢复。response 保存失败和 submit/move/finish action failure 共用同一入口；冲突时不再提供必然失败的 stale retry。冻结范围只覆盖 session 写，来源查看及独立 annotation/progress 写仍可操作。
- 显式读取成功后重建 `persistedSession` 与 response queue，清空 typed failure；远端已提交题的 draft overlay 删除，确保 answer/status 来自权威 session。未提交草稿保留但不静默写回，避免在用户未确认时覆盖另一标签草稿。
- Practice 定向从 `2 failed / 7 passed` 转为 `9/9`。新增 StudyProvider probe 证明四类 update 使用旧 expected token，且 Date.now 落后时统一生成旧 token 后 1ms。
- 相关 `5 files / 65 tests` 全绿；Web typecheck 和定向 ESLint 通过。过程中 typecheck/ESLint 发现并修正测试 mock tuple 类型、Testing Library 参数和 effect reset 位置，未放宽规则。
- 下一步独立 P0/P1 审计后再运行全仓门禁；当前没有 E2E 或视觉证据，不能声称最终完成。

## 2026-08-17 - StudySession CAS 独立审计立案

- 独立核心、测试与 Web 三路审计均为只读，P0 `0`。新发现的范围内产品 P1 为：正确 token 可删除/篡改已提交题证据；`completedAt` 之后仍可 save/submit；同组件 A -> B 路由切换时 response overlay 与 A 的延迟异步回调未隔离。
- 核心复现实证：Q1 已提交后，使用当前正确 token 保存清空 `responses/submittedQuestionIds` 的 session 会成功并增加 change-log；attempt 仍在，导出可生成，但 preflight 因 session 未标记 Q1 submitted 而失败。CAS 与提交证据单调性是两个不同合同，后者必须单独保护。
- completed 复现实证：finish 后以最新 token 保存新 draft 或提交新 attempt 均成功，能形成 `submittedAt > completedAt`；该语义损坏甚至可能通过当前 backup preflight，因此仓储终态屏障不能只依赖备份校验。
- 测试假绿 P1：仓储冲突合同目前主要用 `toThrow(/changed.../)`，未锁定 `StudySessionConflictError` 类型；missing current row + non-null expected 的 save/submit 边界未覆盖。修正测试需同时核对 sessions/attempts/progress/changeLog 没有部分写入，并对仍合法的备份做 preflight。
- Web 修复边界：session id/generation 变化时重置 `responseDrafts`、失败/冲突、队列与会话局部状态；所有 load/save/action 完成回调在写 state/ref 前核对 generation/id。初次加载或 reload 到 completed session 必须保持终态，不得解除为可写练习。
- 只报告的 P2：公开 `recordAttempt` 可重复写同题；session action 缺少统一 busy；冲突 reload 不刷新 attempts/progress/startedAt。不得在本轮修复。
- 接下来严格先红后绿：storage 红灯 -> Practice 红灯 -> 最小实现 -> 定向 Vitest/typecheck/ESLint -> 独立 P0/P1 复审 -> 三视口跨标签 E2E/截图 -> 全量门禁。Q44 与正式内容始终保持 `needs-review`。

## 2026-08-17 - StudySession 提交证据与完成态红灯

- 仓储测试增加 8 个执行项：当前 token 下 3 种提交证据破坏、completed 后 save/new submit 两项必红；missing-row save/submit 原子性一项与 stale save/submit typed error 加固应在当前实现保持绿。
- `npm exec vitest run packages/storage/src/storage.test.ts` 实际为 `5 failed / 36 passed`。三个 evidence case 均错误 resolve `undefined`，completed save 同样错误成功，completed new submit 错误生成 progress；失败位置和预期缺失行为完全一致。
- 每个拒绝合同都核对持久化 row、attempt、versioned progress、changeLog 及 backup preflight，防止只抛错但留下部分写入。未修改 schema/store 或产品实现。

## 2026-08-17 - Practice 会话隔离与完成态红灯

- 页面新增 4 个失败执行项：remote completed conflict reload 仍需终态、initial completed 必须只读、A -> B 同题 draft 不得泄漏、A delayed save 不得在 B load 后回写工作台。
- `npm exec vitest run apps/web/src/pages/PracticePage.test.tsx` 实际为 `4 failed / 8 passed`。失败 DOM 证明 completed session 仍有可用“结束/查看统计”写路径；A -> B 后仍显示 A 选项；延迟 A 结算后 B 的独特题面消失。
- 选定最小隔离模型是外层读取 route param、内层工作台以 `key=sessionId` 挂载。这样 session 变化一次性重置所有 state/ref/queue，旧 callback 只能触及卸载实例；completed 采用明确只读终态而非自动跳转，以免本页未提交长草稿突然消失。

## 2026-08-17 - StudySession CAS 第二轮核心与 Web 转绿

- `repositories.ts` 增加 submitted id 精确序列和 response 深比较迁移合同；save 无权增删提交，submit 只能追加当前题。completed current row 是新写屏障；existing attempt 分支先用数据库 current session 验证其证据，再允许真幂等返回。
- `PracticePage.tsx` 仅做两类结构变化：route id 外层 + keyed 内层隔离全部状态；`writeBlocked = sessionConflict || sessionClosed` 统一阻止 session 写。完成态不自动跳转，保留未提交页面草稿供查看并提供明确导航。
- 新鲜转绿证据：`npm exec vitest run packages/storage/src/storage.test.ts` 为 `41/41`；`npm exec vitest run apps/web/src/pages/PracticePage.test.tsx` 为 `12/12`。尚未运行扩大定向、静态门禁或浏览器验证。

## 2026-08-17 - StudySession CAS 第二轮定向门禁

- 相关五文件 Vitest 为 `74/74`；storage/Web 两个 workspace typecheck 通过；`repositories/storage tests/backup guards/StudyContext/PracticePage` 共 8 个相关文件 ESLint 通过。
- 当前证据只说明定向实现与合同转绿，尚未完成独立 P0/P1 复审、真实浏览器交错或全量门禁，不能提前收口。

## 2026-08-17 - StudySession 不可变身份复审 P1

- 核心 mutation-style 复审证明 current-token guard 不完整：`mode/questionIds/questionContentVersions/startedAt` 仍能漂移。`mode` 实测会造成可持久化且导出后 preflight 拒绝的 attempt/session 不一致。
- 修复边界是在现有事务迁移 helper 冻结四类身份，不改 schema/store/API，也不处理 `recordAttempt` P2。先给现有参数化合同增加四种 mutation 并记录红灯。

## 2026-08-17 - StudySession 不可变身份红灯

- 四种 identity mutation 新鲜结果为 `4 failed / 41 passed`，都错误 resolve `undefined`；现有证据/完成态/missing-row 合同保持绿。红灯证明缺口独立且没有破坏前一轮测试夹具。

## 2026-08-17 - StudySession 不可变身份转绿

- 新 helper 对 mode、startedAt、题目有序序列和版本映射做精确相等比较，并由 save/new submit 两条事务路径共用。定向 storage 从 `4 failed / 41 passed` 转为 `45/45`。
- Web 独立复审对 keyed route scope、completed 初次/冲突恢复、控件与 handler 写阻塞未发现新 P0/P1；保留 `recordAttempt` 重复写与旧 action navigate 为已知 P2，不在本轮修。

## 2026-08-18 - StudySession CAS 测试合同复审 P1

- mutation 推演指出 existing-attempt/different-response 仍可退化成同文案普通 Error 而 78 项假绿；completed save 的多字段 mutation 也不能隔离终态屏障原因。
- 处理方式：existing 分支改断言 exact error class并核对 progress/changeLog/backup；completed save 只改 updatedAt；stale save/submit 增加 progress/changeLog exact snapshot。当前实现预期全绿，因此不把这一步描述为红灯。

## 2026-08-18 - StudySession CAS 测试合同复审转绿

- 三处假绿窗口已按审计建议关闭，相关五文件保持 `78/78`，storage/Web typecheck 和直接修改文件 ESLint 全绿。等待最后独立 P0/P1 复审。

## 2026-08-18 - StudySession CAS 最终独立复审

- 两路最终复审均为本轮 scope P0/P1 `0`。核心手工 new-submit identity mutation 也验证 typed conflict、四表/log 不变和 backup preflight 可恢复。
- 按既定边界不修 `recordAttempt` 与旧 finish Promise navigation P2。开始三视口真实双页浏览器合同。

## 2026-08-18 - StudySession CAS 双页 E2E 首轮（未收口）

- 新增 `tests/e2e/study-flow.spec.ts` 双页合同，真实 IndexedDB 交错覆盖 stale response conflict、显式 authority reload、remote finish、stale finish conflict、completed read-only 与最终 session/attempt exact evidence；截图目标为 `practice-cross-tab-conflict` 和 `practice-completed-readonly`。
- `npm exec playwright test --list` 的参数位置错误，未把 `--list` 传入 Playwright，意外执行默认 `180 tests / 8 workers / 3 projects`。后续收集必须使用 `npm exec -- playwright test --list`。
- 首轮 `4 failed / 176 passed`：chromium-1366/390 新用例的业务状态已到 completed，只因非 exact “结束” locator 同时命中两个按钮而 strict-mode 失败；chromium-1440 新用例在完成动作后的 5 秒统计 heading 断言超时，快照仍是已提交只读答题页；既有 daily-plan chromium-1440 在 Suspense“载入页面”超时。当前证据不足以把两个 1440 超时定性为产品回归。
- `.last-run.json` 为 failed，三张冲突态截图存在，完成态截图缺失，`4173-4400` 无监听。下一步仅收紧新用例 locator、ESLint 并在独立端口精确复跑三项目，不更改 timeout/workers、既有 lazy 用例或 session action P2。

## 2026-08-18 - StudySession CAS 双页 E2E 定向转绿

- 新合同的三个“结束” role locator 均增加 `exact: true`；E2E 文件 ESLint 通过。正确命令 `npm exec -- playwright test --list` 只完成收集，结果为 `180 tests / 24 files`。
- `PLAYWRIGHT_TEST_PORT=4316` 精确三项目运行结果为 `3/3 passed`，chromium-1440/1366/390 分别约 3.9/3.9/3.7 秒；首轮 chromium-1440 的 5 秒统计页超时没有复现，不扩大为产品或 timeout 修改。
- 六张冲突/完成只读截图现已存在。下一步人工与独立复审截图和 E2E 合同；通过后再刷新全部门禁。端口清理和 `.last-run.json` 状态在复审前重新核对。

## 2026-08-18 - StudySession CAS 双页 E2E 与视觉独立复审

- 六张图经主审和独立代理检查，P0/P1/P2 为 `0`。桌面两态无横溢/截字/重叠；390 alert 与按钮换行稳定，sticky actions 和 mobile nav 保持独立，导航完整。移动 fullPage 只覆盖 `.main-area` 当前滚动位置，不能替代 scroll-to-bottom 证明，但没有形成截图 finding。
- 独立 E2E 复审 P0/P1 为 `0`，确认 peer 建立时序、两次 stale token、authority reload、completed 恢复与最终 session/attempt exact evidence 均有效；独立端口 `4317` 精确三视口再次 `3/3 passed`，端口释放。
- P2 仅记录：浏览器合同不直接读 progress/changeLog 或跑 backup preflight；storage `45/45` 已覆盖相同事务原子性，不增加重复 E2E。进入最终全量门禁。

## 2026-08-18 - StudySession CAS 最终源码门禁与产物核对

- `npm run lint`、`npm run typecheck` 通过；默认 `npm test` 为 `82 files / 941 tests passed`，持续 `18.58s`。
- 产物代理核对定向 HTML 报告为新用例三项目 `3 expected / 0 unexpected / 0 flaky / 0 skipped`，六图非空且 mtime 与报告一致，`4316` 无 TCP 残留。
- E2E 代理曾再次误用 `npm exec playwright ... --list`，实际启动 study-flow `33` 项；只观察到 `14/33` 时工具返回，最终结果未知，不能当收集或门禁证据。随后 `4317` 精确 `3/3` 才是有效复审证据。
- P2 只记录：自定义 screenshots 不作为 Playwright report attachments，因此报告不哈希绑定六图；当前文件时间、命名与状态一致，不修改证据基础设施。下一步 release、content validate 和 build。

## 2026-08-18 - StudySession CAS release、内容与 build 门禁

- release 为 `10 tests / 10 passed`；内容校验为 `47 questions (40 objective, 7 comprehensive)`、`needs-review; verified 0/47`。
- production build 通过：Vite `1905 modules`、static-copy `198 items`、PWA `86 entries (2640.08 KiB)`；无新增 chunk warning。
- 下一步端口 `4318` 默认 8-worker 三项目 `180` 项全量 E2E。Q44 保持 `parallel-5 / split-6` 与 `needs-review`，不把门禁结果当人工审核。

## 2026-08-18 - StudySession CAS 全量 E2E 首轮

- 端口 `4318` 默认 `180 tests / 8 workers / 3 projects` 为 `174 passed / 2 failed / 4 did not run`，约 `2.8m`；新 CAS 双页合同三视口全部通过。
- chromium-1440 ContentReview Q41/history 在完整 47 题 DOM 上等待 scroll stability 30 秒超时；chromium-1440 visual practice 在 `/questions` 5 秒内仍是空白应用背景、0 个 `.question-row`，serial 组后 4 项未运行。前者同历史 actionability 波动，后者为 lazy mount/导航候选；均未出现新 CAS 状态失败。
- `.last-run.json` failed，4318 无监听。下一步独立端口精确复跑两项，通过后再完整跑第二轮；不改无关实现、测试、超时或 workers。

## 2026-08-18 - StudySession CAS E2E 首轮失败项精确复跑

- 端口 `4319` 精确运行两个 chromium-1440 失败项，ContentReview Q41/history 与 visual practice 均 `passed`，业务各约 `1.6s`；总进程 `33.2s`。
- 未改文件或配置。该结果只支持首轮并发波动诊断，不能替代完整 `180` 项；下一步端口 `4320` 全量第二轮。

## 2026-08-18 - StudySession CAS 最终收口

- `PLAYWRIGHT_TEST_PORT=4320 npm run test:e2e` 使用默认 `8 workers / 3 projects`，完整第二轮为 `180/180 passed`，持续约 `3.2m`。没有修改 timeout、workers、retry 或业务断言。
- HTML 内嵌报告统计为 `180 total / 180 expected / 0 unexpected / 0 flaky / 0 skipped / ok=true`；`.last-run.json` 为 passed/empty failures。`4316-4320` 无监听。
- 第二轮刷新六张 CAS 图；mtime 00:29-00:30，尺寸为桌面 `1440x900/992`、`1366x792/992` 与 Pixel 7 DPR `1024x2216`。主审及独立视觉复审 P0/P1 为 `0`，无横溢、截字、重叠或底栏遮挡。
- 最终全量证据：lint、workspace typecheck 通过；Vitest `82 files / 941 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2640.08 KiB)`；E2E `180/180`。
- 既定 P2 继续只记录：`recordAttempt`、旧 finish Promise navigation、session action busy、E2E progress/changeLog/preflight 重复证据与截图报告绑定。本轮未改 v1/v2/v3 schema/store、题包、旧图片、旧 `cpu-explorer` 或 Q44 边界，未删除测试/文件、提交、推送或部署。

## 2026-08-18 - ContentReview 跨标签 CAS 红灯

- 范围已立项为不改 schema/store 的 ContentReview exact-token CAS。随机属性生成不适合替代 IndexedDB 的关键副作用交错，本轮用六个固定序列锁定 create-only、missing-row、严格单调 token 与 draft/approve/reject 三类 stale writer 的零部分写入不变量。
- 新鲜 storage 定向结果为 `6 failed / 45 passed`。失败都来自旧实现忽略 expected token；代表 stale draft 已实证把 peer 的 approved row 覆盖成 pending，原 45 项保持通过。
- 产品尚未修改。下一步把 current read、token compare、record/changeLog 写入收进同一 Dexie 事务，并导出 typed conflict；再更新 Web bridge 与显式冲突恢复。

## 2026-08-18 - ContentReview 仓储 CAS 转绿

- `DexieContentReviewRepository` 已把读比写和 changeLog 放进单事务，导出 `ContentReviewConflictError`；accepted update 的 `updatedAt` 必须严格晚于 current，create-only/missing-row/stale decision 均 fail closed。
- storage 定向新鲜结果 `51/51`。未改 schema/store；下一步做 Web bridge 和页面 typed-conflict 恢复。

## 2026-08-18 - ContentReview CAS Web 转绿

- StudyContext 传 exact old token 并在时钟回拨时生成 `previous + 1ms`；页面按题维护 token，typed conflict 后保留本地 overlay 并冻结所有 review 写，显式 authority read 成功才恢复。
- queued operation 执行时读取最新本地 token，防止同标签连续保存自撞；跨标签 current 仍由仓储事务 CAS 判定。
- 三个相关测试文件新鲜 `62/62`，storage/Web typecheck 通过；ESLint 唯一 dependency warning 已按根因补上，等待刷新。

## 2026-08-18 - ContentReview 队列冲突复审修复

- 复审发现前置 in-flight draft 冲突时，排队 decision 虽跳过仓储调用，外层仍可能误报 committed 并清 dirty。现改为 operation 返回显式 committed boolean，只有 true 才进入成功状态。
- deferred 时序合同已覆盖，页面测试 `8/8`；继续检查 recovery failure 与跨层证据。

## 2026-08-18 - ContentReview 冲突状态标签语义红灯

- 独立端口 `4322` 的真实双页 ContentReview 合同已为 1440/1366/390 `3/3 passed`；390 首轮失败只因隐藏结构化 panel 的“下一题” locator 不可见，使用 `includeHidden: true` 后转绿。六张冲突/恢复图均已刷新。
- 视觉复审确认冲突提示与旧 decision 同时出现会造成语义矛盾：页面在显式 authority reload 前不知道权威 decision，却仍显示本标签旧 context 的“当前记录 已通过/待复核/有问题”。
- 测试先行要求冲突时状态卡统一显示“待重新读取”。`npm exec -- vitest run apps/web/src/pages/ContentReviewPage.test.tsx --reporter=dot` 新鲜结果为 `1 failed / 8 passed`，实际收到“当前记录 已通过”。下一步只改展示标签，不改变 CAS、草稿、冻结或 reload 行为。

## 2026-08-18 - ContentReview 冲突状态标签语义转绿

- 冲突状态卡现在使用中性虚线图标/样式并显示“待重新读取”；显式 authority reload 成功后才恢复权威 decision 文案。非冲突状态显示未变。
- 页面定向同一命令从 `1 failed / 8 passed` 转为 `9/9 passed`。没有改 CAS、串行队列、草稿保留、冻结范围或数据库 schema/store。

## 2026-08-18 - ContentReview CAS 扩大定向门禁

- storage、StudyContext 与 ContentReview 页面联合 Vitest 为 `3 files / 65 tests passed`。
- `@408os/storage`、`@408os/web` typecheck 通过；7 个直接相关的仓储/Web/E2E 文件 ESLint 通过。
- 下一步使用独立端口 `4323` 执行三视口双页真实浏览器合同并刷新六张图。

## 2026-08-18 - ContentReview 双页 E2E 与视觉收口

- E2E 直接断言冲突态“待重新读取”、显式 reload 后“已通过”；文件 ESLint 通过。端口 `4323` 与最终 `4324` 均为三项目 `3/3 passed`，`.last-run.json` passed，端口无监听。
- 六张最终图为桌面 `1440x900 / 1366x768`、移动 DPR `1024x2216`。逐张检查无 P0/P1、横溢、截字、重叠或固定底栏遮挡；冲突/恢复状态文案与数据库事实一致。
- 下一步执行完整源码、内容、构建与默认三视口 E2E 门禁；自动验证继续不计作人工审核。

## 2026-08-18 - ContentReview CAS 全量源码门禁

- `npm run lint`、全部 workspace `npm run typecheck` 通过。
- 默认 worker-mode `npm test` 新鲜结果为 `82 files / 954 tests passed`。相对上一最终基线 `82/941` 增加 13 项 ContentReview CAS 与恢复合同，没有删除或跳过旧测试。

## 2026-08-18 - ContentReview CAS release、内容与 build 门禁

- release `10/10`；内容校验 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，仍为 `needs-review; verified 0/47`。
- production build 为 Vite `1905 modules`、static-copy `198`、PWA `86 entries (2642.75 KiB)`；ContentReview chunk `19.22 kB / gzip 6.31 kB`，无 chunk warning。

## 2026-08-18 - ContentReview CAS 全量 E2E 首轮（待复跑）

- `PLAYWRIGHT_TEST_PORT=4325 npm run test:e2e` 按默认 `8 workers / 3 projects` 运行 `183` 项，结果为 `176 passed / 4 failed / 3 did not run`，持续约 `4.3m`；本轮新增 CAS 双页合同三视口全部通过。
- 失败项为 chromium-1440 的 ContentReview Q41/history scroll stability、Q25 deadlock 首屏 lazy mount，以及 chromium-1366 的 mock-exam 跨标签 alert、visual settings schema v3 首屏 lazy mount。现仍只作并发波动候选，不计为产品回归。
- 下一步新端口精确复跑四项；通过后必须再执行完整 `183` 项，不能用定向结果替代全量门禁。保持 Q44 `parallel-5 / split-6` 与 `needs-review`，不改 schema、题包、旧图片或旧 `cpu-explorer`。

## 2026-08-18 - ContentReview CAS 首轮失败项精确复跑

- `4326` 上 chromium-1440 的 ContentReview Q41/history 与 Q25 deadlock 为 `2/2 passed`；`4327` 上 chromium-1366 的 mock-exam cross-tab 与 settings schema v3 visual 为 `2/2 passed`。
- 四项均未改 timeout、workers、retry、断言或业务实现，支持首轮失败为并发冷启动/actionability 波动。定向结果不替代全量，下一步端口 `4328` 重跑默认 `183` 项。

## 2026-08-18 - ContentReview CAS 最终收口

- `PLAYWRIGHT_TEST_PORT=4328 npm run test:e2e` 按默认 `8 workers / 3 projects` 完整第二轮为 `183/183 passed`，约 `3.3m`。首轮四个失败候选在完整并发环境全部通过，确认不需要产品、timeout、worker、retry 或断言修改。
- HTML 报告统计为 `183 total / 183 expected / 0 unexpected / 0 flaky / 0 skipped / ok=true`；`.last-run.json` 为 passed/empty failures，`4325-4328` 无监听。
- 六张 ContentReview conflict/recovered 图已由第二轮刷新，尺寸为桌面 `1440x900 / 1366x768`、移动 DPR `1024x2216`。最终像素复看无 P0/P1、横向页面溢出、截字、重叠或固定导航遮挡。
- 最终证据：lint、workspace typecheck 全绿；Vitest `82 files / 954 tests`；release `10/10`；内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2642.75 KiB)`；E2E `183/183`。
- 自动证据不构成人工审核。Q44 保持 `parallel-5 / split-6` 与 `needs-review`；未改 schema/store、题包、旧图片、旧 `cpu-explorer`，未删除、提交、推送或部署。

## 2026-08-18 - 下一独立候选只读审计：普通练习综合题自评分

- 本轮只读审计 P0 `0`，新增产品 P1 `1`。`PracticePage` 综合题自评分 onChange 使用 `Number(raw)`：空字符串得到 `0`，`-1` 虽使 input validity=false 但值仍进入 handler；完成自评按钮只以 `undefined` 判断是否已评分。
- 确定性内存 IndexedDB 复现证明 `DexieStudyRepository.submitAttempt` 接受并持久化 response/attempt 的 `selfScore=-1`，domain 评分夹为 `0`。同一 `BackupService.exportJson` 成功生成 JSON，但 `preflight` 立即以 `data.attempts.0.response.selfScore` 小于 0 拒绝，形成应用自己写出但不能恢复的学习数据。
- 模考自评已有 raw string 与 finite/0/max 显式校验，不在根因范围。现有 `PracticePage.test + study.test + storage.test + backup-v2.test` 新鲜结果 `4 files / 80 tests passed`，且没有普通 Practice 综合题 UI 用例，确认当前测试假绿窗口。
- 建议下一步红灯固定三类合同：清空恢复 `undefined` 且禁用“完成自评”；负数和超上限不得调用持久化/提交；`0` 与 max 合法边界保持可提交。实现应同时评估 UI raw string 和 domain/repository fail-closed，不能只依赖 HTML min/max，也不需要 schema 变更。
- 既有未修 P1 仍单独保留：普通选择题选中/提交反馈语义、来源 modal 焦点模型、`.main-area` overflow helper、Q43 exact canonical 测试。P2 未修改。property-based-testing 指南仅用于不变量审查，未引入依赖；三个辅助审计均因 429 限流失败，未纳入结论。

## 2026-08-18 - 普通练习综合题自评分红灯

- 新增确定性 UI/domain/storage 边界合同，没有引入随机生成器或新依赖。UI 同时锁定空值、负数、超上限、0 和 max；领域层锁定 `[0,maxScore]`；仓储层锁定其可知边界 finite/nonnegative 与零部分写入。
- 定向 Vitest 命令为 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx packages/domain/src/study.test.ts packages/storage/src/storage.test.ts --reporter=verbose`，新鲜结果 `7 failed / 76 passed`。七个失败都由旧实现行为触发；合法边界与原测试全绿，未发现 fixture 或断言自身错误。
- 产品实现尚未修改。下一步只改 `PracticePage.tsx`、`study.ts`、`repositories.ts`，不改数据库 schema/store、备份格式或模考自评。

## 2026-08-18 - 普通练习综合题自评分转绿

- `PracticePage` 增加按题 raw score string 与显式范围错误态。`''` 写回 `undefined`；负数、超上限和非有限原始值不调用 `saveResponse`，并禁用完成自评；`0` 和 `maxScore` 继续走原有 response queue/submit 链。
- `evaluateResponse` 对区间外值抛错，边界值原样返回。`DexieStudyRepository` 在 save/record/submit 写路径前拒绝 comprehensive selfScore 的非 finite 或负值，测试核对 session、attempt、progress、changeLog 零写入及空备份 preflight。
- 定向命令 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx packages/domain/src/study.test.ts packages/storage/src/storage.test.ts --reporter=verbose` 新鲜结果为 `3 files / 83 tests passed`。下一步独立 P0/P1 复审与静态门禁，随后三视口和全量门禁。

## 2026-08-18 - 自评分旧非法 session 复审 P1

- 核心只读复审发现旧非法行自愈死路：Practice 能读到旧 `-1` 并允许清空，但 `assertStudySessionWrite` 校验 current 后拒绝这次合法修复，备份仍不可 preflight。
- 修复边界不是接受新的 invalid next；应只允许一个全量合法、身份/证据不变、exact-token 且时间推进的 next 替换旧 invalid current。先写 recovery 红灯，再调整 current/next 校验职责。
- 复审另指出 storage 缺 `NaN/+Infinity` 及 `recordAttempt` 的直接合同，作为同一入口守卫的测试加固一并补齐。

## 2026-08-18 - 自评分旧非法 session 自愈红灯扩展

- 参数化后的 save/submit/record invalid 入口合同全绿；旧 unsubmitted exact-token 修复为 storage `1 failed / 60 passed`，失败栈在 `assertGenericStudySession(current)`。
- 已提交旧数据没有 UI 更正入口，且只显示旧夹紧结果 0；决定采用有证据的兼容修复：用已存 `attempt.score` 修正 session/attempt response，保留 id/score/timestamps/progress，推进 session token并写 changeLog。重复修复必须幂等；证明不足的损坏不自动猜测。
- 独立复审进一步限定证明条件为 `attempt.correct === null && attempt.score === 0`，对应已知旧 domain 负分夹紧路径；不把任意合法数值猜成自评分。

## 2026-08-18 - 普通练习自评分旧数据与备份兼容

- 新增确定性合同覆盖旧坏 v3 backup 导入、submitted non-finite 缺证据拒绝、旧上限夹紧修复和 open-session 排序不漂移。初次定向结果为 `5 failed / 70 passed`，失败均命中迁移前严格 parse、漏判 unresolved 或未覆盖上限夹紧。
- live repair 与 backup raw migration 只承认两种可证明旧路径：负值且 attempt score 为 `0`；有限 raw score 大于有限 attempt score。两者都要求 comprehensive response 精确匹配、`correct === null`、session/mode/版本一致。`NaN/+Infinity`、候选缺失/重复或证据不一致继续 fail closed。
- unsubmitted 有限负分只删除 `selfScore`，不猜测新分数；repair token 为原 `updatedAt + 1ms`，排序合同证明旧 session 不会越过真正较新的 open session。
- `exportJson` 新增 self-preflight。保留并收紧原 malformed review setting 合同，现要求导出 Promise 直接拒绝，避免应用下载自身不可恢复的备份。
- 新鲜验证：`npm exec -- vitest run packages/storage/src/storage.test.ts packages/storage/src/backup-v2.test.ts --reporter=verbose` 为 `2 files / 75 tests passed`；storage typecheck 与四个相关文件 ESLint 通过。
- 未完成：独立审计、Practice/domain/storage 扩大定向、Web typecheck、三视口真实浏览器、截图与全量门禁。Q44 仍只支持 `parallel-5 / split-6` 并保持 `needs-review`。

## 2026-08-18 - 自评分兼容复审边界收紧

- 独立反例证明初版迁移仍可把 session `99`、attempt response `5` 与 attempt score `10` 一起洗成 `10`；对应 v3 replace 测试先红后要求 raw score 精确一致。
- live repair 另保留四类红灯：upper clamp 的 attempt score 为 `0/负数`、submitted `-Infinity`、unsubmitted orphan attempt、旧 `updatedAt=10.000` 修成与新 session `10.001` 打平。修复后这些记录均 fail closed 或保持原排序。
- 自动修复的最终证据边界：finite negative draft 且无 attempt；finite negative submitted 且 exact matching comprehensive attempt score 为 `0`；finite upper submitted 且 exact matching comprehensive attempt score 为正数。`correct !== null`、非有限值、raw response 不一致、候选缺失/重复和 orphan 均不自动修复。
- 时间 token 始终变化：没有 `[previous, previous+1ms]` peer 时使用标准 `+1ms`；有碰撞时使用高精度 ISO token 排在阻塞 peer 之前。这样旧 PWA exact-token writer 会冲突，且修复不会改变 latest 排序，不新增 schema/store 字段。
- 额外题目 response/attempt 也纳入 live fail-closed，避免只修 session 留下结构矛盾。
- 新鲜验证：storage + backup-v2 `89/89`；Practice/domain/storage/backup-v2/backup-v3/mock-schema-v3 `134/134`；storage/Web typecheck 和相关 ESLint 全绿。等待三视口真实浏览器合同与最终独立复核。

## 2026-08-18 - 普通综合题真实浏览器与截图检查

- 三项目定向真实 Chrome 合同已跑通：`chromium-1440`、`chromium-1366`、`chromium-390` 共 `3/3 passed`。用例验证 invalid 分数不写 IndexedDB，清空恢复未评分，上界 `10` 可持久化并提交，session/attempt 证据一致。
- 截图：`output/playwright/screenshots/chromium-{1440,1366,390}-practice-comprehensive-{invalid-score,submitted}.png`。桌面 invalid/submitted 与移动 submitted 均无 P0/P1。
- 移动 `390x844` invalid 截图发现 P1：`@media (max-width: 760px)` 下 `.answer-actions { position: sticky; bottom: 62px; }` 在当前内容高度覆盖 `.score-field` 下缘及 `.score-error`。行为测试通过但可见错误反馈被遮挡，不能据此收口。
- 修复纪律：先在现有 E2E 用例增加几何不重叠红灯，只对 390 项生效；再做最小移动 CSS 留白/布局修复。不得改自评分业务、模考路径、schema/store、全局 E2E timeout/workers 或桌面布局。

## 2026-08-18 - 移动操作条遮挡红灯证据

- 命令：`PLAYWRIGHT_TEST_PORT=4329 npm exec -- playwright test tests/e2e/study-flow.spec.ts --project=chromium-390 --grep "validates and persists a comprehensive practice self score"`。
- 结果：`1 failed`，失败值为 content bottom `708.0625`、actions top `659`；约 `49px` 的重叠与截图一致。第二条 actions/mobile-nav 不重叠断言尚未执行。
- CSS 结构核对：`.app-shell` 为 `100dvh` flex column，`.mobile-nav` 是静态 `62px` flex item，`.main-area` 只占剩余高度；因此 `.answer-actions bottom: 62px` 是重复补偿。计划改为 `bottom: 0`，让 sticky 条贴合 main 滚动区底部，仍自然位于导航上方。

## 2026-08-18 - 移动操作条遮挡转绿证据

- 产品改动仅为移动 media query 中 `.answer-actions bottom: 62px -> 0`。
- `PLAYWRIGHT_TEST_PORT=4330` 的同一移动专项为 `1/1 passed`，持续约 `19.2s`（业务约 `2.0s`）。新合同同时证明错误反馈完整位于操作条上方、操作条完整位于导航上方。
- 待验证：三视口完整用例、六图刷新与像素复看、E2E 文件 ESLint、最终独立复审和全量门禁。

## 2026-08-18 - 三视口复验与截图结论

- `PLAYWRIGHT_TEST_PORT=4331 npm exec -- playwright test tests/e2e/study-flow.spec.ts --grep "validates and persists a comprehensive practice self score"`：`3/3 passed`，总计约 `24.5s`。E2E 文件 ESLint 无输出、退出码 0。
- 六图 mtime 已由该轮刷新。390px invalid 图中 score input bottom、error bottom 均在 action top 之前，action bottom 不超过 `.mobile-nav` top；截图与运行时几何断言一致。桌面两视口无布局变化。
- 视觉复看结论：三视口 invalid/submitted 无 P0/P1、横向溢出、截字或控件重叠。下一步等待两路独立只读终审，再决定是否进入 lint/typecheck/Vitest/release/content/build/默认全量 E2E。

## 2026-08-18 - 扩大定向刷新

- Vitest：`6 files / 134 tests passed`，覆盖 Practice UI、domain evaluateResponse、storage live repair、backup v2/v3 与 mock schema v3 兼容。
- 静态检查：storage/Web typecheck 通过；9 个直接相关 TS/TSX 文件 ESLint 通过。
- 这组结果不包含全仓 lint/typecheck、默认 Vitest、release、内容校验、production build 或默认 8-worker E2E；后者仍待终审清零后执行。

## 2026-08-18 - 移动动态视口终审立案

- 独立终审发现 P1：base `.app-shell min-height: 100vh` 与 mobile `height: 100dvh` 并存时，`min-height` 可能按 large viewport 抬高整个 app；practice child 的 `calc(100vh - 62px)` 也绕过了已有 flex 容器高度。
- 现有 390 项只能验证固定 viewport 下元素互不重叠，不能模拟浏览器地址栏展开导致的 `vh/dvh` 差异。修复需先写 computed-style 合同，不用测试浏览器厂商 UI。
- 计划：移动规则显式 `.app-shell { min-height: 0; }`，`.practice-shell { min-height: 100%; }`；这保持 desktop `100vh` 和移动 flex/static-nav 结构不变。

## 2026-08-18 - 动态视口 computed-style 红灯证据

- 同一 390px 专项在端口 `4332` 先红：computed `.app-shell min-height=844px`、`.practice-shell min-height=782px`，期望分别为 `0px` 与 `100%`。
- 该红灯只锁定 CSS 结构，不声称 Playwright 能模拟地址栏展开；它防止未来重新引入 large viewport 最小高度而让几何 E2E 假绿。

## 2026-08-18 - 动态视口修复转绿证据

- 产品 CSS 仅在移动规则新增 `.app-shell min-height: 0`，并把 `.practice-shell min-height` 改为 `100%`。
- `PLAYWRIGHT_TEST_PORT=4333` 390px 专项 `1/1 passed`，耗时约 `17.8s`；computed-style 合同实际得到 `0px/100%`，输入/错误提示/操作条/导航不重叠合同保持通过。
- 这一步仍未声称真实地址栏展开已被自动化覆盖，合同目标是避免源码保留 large-viewport 依赖；需继续三视口刷新和全量门禁。

## 2026-08-18 - 自评分兼容 extra 结构红灯证据

- 独立核心复现两例：可修复 Q44 draft + `responses.q46` choice；可修复 Q44 draft + `attempts.q46`。两者旧实现均 `getSession()` 成功并推进 token/changeLog，之后 export preflight 才失败。
- 新增参数化 storage 合同先红为 `2 failed / 76 passed`，精确要求修复前零写入。没有修改 schema/store 或备份格式。

## 2026-08-18 - 自评分兼容 extra 结构转绿

- `repairLegacyStudySelfScores` 新增 session 闭包检查：questionIds 唯一且覆盖 response/version/submitted，attempt 必须属于 session、唯一、版本/mode/response 一致，submitted 必须有 attempt。只在该 session 已有可修复变更时触发，其他读取边界不扩大。
- storage 定向 `78/78 passed`；两条 extra response/attempt 合同确认异常时 session、attempt、changeLog 均保持原样。

## 2026-08-18 - 最终定向收口

- 六文件定向 Vitest `136/136`；storage/Web typecheck 通过；相关 TS/TSX/E2E ESLint 通过，CSS 文件被配置忽略但无 lint error。
- `PLAYWRIGHT_TEST_PORT=4334` 三项目普通综合题合同 `3/3 passed`，约 `25.9s`。本轮包含动态 viewport computed-style 合同和此前的两组几何不重叠合同。
- 移动独立复审确认 `.app-shell min-height:0` / `.practice-shell min-height:100%` 已清除原 P1，当前移动 P0/P1 为 `0`。核心 extra-structure 复审代理在修复后因 429 未能回读，保留该限制；源码和红转绿测试均已人工检查。
- 下一步运行 `npm run lint`、全 workspace `npm run typecheck`、`npm test`、`npm run test:release`、`npm run content:validate`、`npm run build`，再运行默认 `8 workers / 3 projects` 全量 E2E。

## 2026-08-18 - 全量静态与内容门禁

- `npm run lint`：通过。
- `npm run typecheck`：全部 workspace 通过。
- `npm run test:release`：`10/10 passed`。
- `npm run content:validate`：`47 questions / 19 assets`，`needs-review; verified 0/47`。
- 内容校验和来源自动证据继续不计作人工审核。待运行默认 Vitest、build 与全量 E2E。

## 2026-08-18 - 默认 Vitest 模考回归红灯

- `npm test`：`82 files / 995 tests`，`1 failed / 994 passed`。失败唯一为 `packages/domain/src/mock.test.ts` 的既有“模考综合自评分夹紧”合同。
- 根因是普通 `evaluateResponse` 为修复 Practice 自评分改成区间 fail-closed，`scoreMockExam` 仍直接复用它。模考页面本身已有 raw/finite/range 校验，不能通过放宽普通 evaluator 修复。
- 计划仅在 `packages/domain/src/mock.ts` 恢复模考专属 finite clamp，保持非有限值抛错；不改模考 schema/store、页面路径或普通 study 合同。

## 2026-08-18 - 模考评分语义隔离转绿

- `mock.ts` 不再让模考综合评分复用普通 Practice 的区间 fail-closed 分支；有限值仍按旧模考合同夹紧，非有限值显式拒绝。
- `mock.test.ts + study.test.ts` 定向 `18/18 passed`。这是针对默认全量真实失败的最小修复，不是放宽普通自评分入口。

## 2026-08-18 - 默认 Vitest 最终转绿

- `npm test`：`82 files / 995 tests passed`，耗时约 `35.66s`，无失败/跳过/flaky。
- 覆盖本轮新增的普通自评分 raw/range、兼容 repair 闭包、移动不影响的 domain/mock 语义隔离，以及既有全部回归。
- 待执行 production build 与默认全量三视口 E2E。

## 2026-08-18 - Production build

- `npm run build` 通过：`1905 modules transformed`、static-copy `198 items`、PWA precache `86 entries (2649.44 KiB)`，无 chunk warning。
- 下一步在独立端口运行默认 `8 workers / 3 projects` 全量 E2E。

## 2026-08-18 - 全量 E2E 首轮结果

- `PLAYWRIGHT_TEST_PORT=4335 npm run test:e2e` 默认 `8 workers / 3 projects`：`186 tests` 中 `183 passed / 3 failed`，约 `4.5m`。
- 失败集中在 chromium-1440 的三个既有高并发 actionability/lazy 路径，普通综合题三视口新合同均通过。具体为 option click、Q42 source click、跨标签完成后 stats heading。
- 端口 `4335` 已结束；报告与 `.last-run.json` 记录 failed。先做端口 `4336` 三项精确复跑，再决定第二轮完整门禁。

## 2026-08-18 - 首轮失败项精确复跑

- 端口 `4336` 精确运行三个失败项：`3/3 passed`，约 `26.7s`（含 server/build），业务约 `2.5-4.0s`。
- 结果支持高并发 actionability/lazy 波动，不证明全量已通过；未改 timeout/workers/retry/断言。下一步必须端口 `4337` 完整重跑 `186` 项。

## 2026-08-18 - 全量 E2E 第二轮结果

- `PLAYWRIGHT_TEST_PORT=4337 npm run test:e2e`：`186 tests` 中 `185 passed / 1 failed`，约 `3.9m`。唯一失败为 chromium-1366 跨标签 Practice 在提交按钮 click actionability 超时，其他视口和新综合题合同均通过。
- 未调整 timeout、workers、retry、断言或产品实现。端口 `4337` 已释放；下一步端口 `4338` 精确复跑该测试，再完整重跑。

## 2026-08-18 - 第二轮失败项精确复跑

- `PLAYWRIGHT_TEST_PORT=4338` chromium-1366 跨标签 Practice 合同 `1/1 passed`，业务约 `3.3s`（总进程约 `36s`）。
- 精确通过不替代全量，下一步端口 `4339` 第三轮完整 `186` 项。

## 2026-08-18 - 全量 E2E 与截图最终收口

- 端口 `4339` 的默认 `8 workers / 3 projects` 全量 E2E 最终为 `186/186 passed`，约 `3.6m`；`output/playwright/results/.last-run.json` 为 passed/空失败列表，HTML 报告为 `output/playwright/report/index.html`。
- 端口 `4335-4339` 均已释放。六张 `practice-comprehensive-{invalid-score,submitted}` 截图最新尺寸为桌面 `1440x1458 / 1440x1332`、`1366x1432 / 1366x1306`，移动 DPR `1024x2216` 两张。人工逐张复看无 P0/P1、横向溢出、截字或控件重叠；移动 invalid 的错误提示和操作条/导航层级符合几何合同。
- 全量交付基线现为 lint、typecheck、Vitest `82 files / 995 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries`、E2E `186/186`。
- 来源核对、自动测试和截图不构成人工审核。Q44 只保留 `parallel-5 / split-6` 且继续 `needs-review`；schema v1/v2/v3、旧图片、旧 `cpu-explorer`、现有测试均未删除或改动，未提交/推送/部署。

## 2026-08-18 - 普通单选 pressed 与结果播报

- 新增 `PracticePage` 确定性红灯：初始 4 个选项必须全为 `aria-pressed=false`，选择后必须恰有一个 true；提交错误答案后必须出现可聚焦的 `role=status` 并接收焦点。旧实现结果 `2 failed / 17 passed`。
- 最小实现只改 DOM 语义与提交后焦点交接。第一次转绿运行发现 effect 位于条件返回后导致 Hook 顺序错误，未掩盖；移至稳定 Hook 区域并修正测试 matcher 后，同文件最终 `19/19 passed`。
- 待完成：独立 P0/P1 复审、Web typecheck/ESLint、三视口真实 Chrome 合同，以及按风险扩大的全量门禁。Q44 与 `needs-review` 边界不变。

## 2026-08-18 - 普通单选定向审计与浏览器结果

- Web typecheck、三文件 ESLint 通过；`PLAYWRIGHT_TEST_PORT=4340` 的既有单选完整流程三视口 `3/3 passed`。真实浏览器覆盖 pressed partition、reload 恢复及提交后 status focus，端口无残留监听。
- 独立审计 P0/P1 为 `0`。P2 仅记录：结果区没有专用可见焦点样式；初始已提交/切到已提交/冲突恢复/综合题提交的负向焦点边界没有逐条单测。按纪律不在本案扩大修改。
- 待全仓 lint/typecheck/Vitest/release/content/build 和默认全量 E2E。自动门禁仍不构成人工内容审核。

## 2026-08-18 - 普通单选全量门禁首轮

- lint/typecheck、Vitest `82 files / 997 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905 / 198 / 86` 均通过。
- `4341` 默认全量 E2E 为 `184/186 passed`。两个失败均在既有跨标签路径：1440 Practice 完成后统计标题等待超时，1366 mock 双页首屏等待超时；新增单选合同三视口全部通过。
- 先用 `4342/4343` 精确复跑，未授权也不需要修改全局 timeout/workers/retry 或既有断言；定向通过后仍需完整重跑。

## 2026-08-18 - 首轮失败项复跑

- `4343` 模考双页 `1/1 passed`；`4344` Practice 双页 `1/1 passed`。首次把两个 webServer 并行启动导致共享 `dist` 清理发生 `EPERM`，该命令未进入 Practice 测试，随后已串行纠正；不能把构建竞争计作产品失败或通过。
- 未改任何业务与测试参数。下一步 `4345` 默认完整 `186` 项，定向结果不能替代全量。

## 2026-08-18 - 普通单选反馈语义最终门禁

- `4345` 默认第二轮全量 E2E `186/186 passed`，约 `3.9m`；`.last-run.json` 为 passed/空失败列表，`4340-4345` 无监听。首轮两个既有跨标签失败候选在完整并发环境通过。
- 最终基线：lint/typecheck、Vitest `82 files / 997 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2649.71 KiB)`、E2E `186/186`。
- 本案只改变 DOM pressed/status/focus 语义，没有 CSS 或视觉结构变化，未新增截图分支。独立审计 P0/P1 为 0；结果区可见焦点样式与负向焦点边界覆盖两个 P2 保留不修。
- Q44、题包审核状态、schema v1-v3、旧图片、旧 `cpu-explorer` 均未改；未删除、提交、推送或部署。

## 2026-08-18 - 来源弹窗焦点与背景隔离转绿

- `PracticePage` 现在用 refs 管理来源触发器、弹窗和关闭按钮。打开时将背景四个直接兄弟节点设为 `inert` 并保存/恢复原 `aria-hidden`；焦点进入关闭按钮。弹窗 keydown 处理 Escape 关闭、Tab/Shift+Tab 环绕；清理时恢复属性并把焦点回收至触发器。
- 红灯 `PracticePage` 三条合同转绿：`npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx --reporter=verbose` 为 `1 file / 22 tests passed`。`npm run typecheck -w @408os/web` 和 `npm exec -- eslint apps/web/src/pages/PracticePage.tsx apps/web/src/pages/PracticePage.test.tsx tests/e2e/study-flow.spec.ts` 均通过。
- 新增 E2E 真实合同覆盖三视口：端口 `4346` `chromium-1440/1366/390` 为 `3/3 passed`，验证打开聚焦、背景 inert、Tab 环绕、Escape 关闭及焦点回收；端口已释放。
- 当前限制：本改动只有 DOM/键盘语义，没有视觉结构变化；仍需现有来源 modal 截图复跑和独立 P0/P1 源码复审，再决定全量门禁。

## 2026-08-18 - 来源弹窗焦点与背景隔离 P1 红灯

- 只读复核 `PracticePage` 来源弹窗：当前只有 `role=dialog`/`aria-modal=true`，打开后焦点仍在来源触发器，Escape 无行为，Tab 可落入背景笔记 textarea；这不是纯测试覆盖缺口，而是键盘用户无法可靠完成来源核对的可复现 P1。
- 先修改 `apps/web/src/pages/PracticePage.test.tsx`，新增打开聚焦关闭按钮并背景 inert、Escape 关闭并恢复触发器焦点、Tab/Shift+Tab 循环三条合同。命令 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx --reporter=verbose` 新鲜结果 `1 file / 3 failed / 19 passed`，失败精确对应旧行为。
- 实现边界：只改弹窗焦点进入/回收、Escape、Tab 循环和背景 inert；不改题包、来源图片、CSS 视觉、路由、schema、评分或 Q44 审核状态。

## 2026-08-18 - 来源弹窗焦点管理转绿与浏览器合同

- `PracticePage` 打开来源 dialog 后，将其背景兄弟节点设为 `inert`/`aria-hidden`，初始聚焦关闭按钮；dialog keydown 处理 Escape 与首尾 Tab 环绕，cleanup 恢复背景原属性并把焦点还给仍连接的来源触发器。
- `PracticePage.test.tsx` 最终 `22/22 passed`。实现后首次运行仅剩测试用 `getByRole('main')` 无法找到已正确从可访问树移除的 inert main，改为 DOM 属性断言后全绿。
- `tests/e2e/study-flow.spec.ts` 新增真实浏览器合同。`PLAYWRIGHT_TEST_PORT=4346 npm exec -- playwright test tests/e2e/study-flow.spec.ts --grep "traps focus inside the practice source dialog"` 为 1440/1366/390 `3/3 passed`；端口无残留监听。
- `npm run typecheck -w @408os/web` 通过；`PracticePage.tsx`、其单测与 `study-flow.spec.ts` 定向 ESLint 通过。待独立 P0/P1 终审与全量门禁。

## 2026-08-18 - 来源弹窗独立终审与静态门禁

- 独立只读终审 P0/P1 `0`。确认四个 practice-shell 背景兄弟的 inert/aria-hidden、关闭按钮初始焦点、Escape/Tab 环与 cleanup 成立，现有单测及真实 Chrome 合同非假绿。
- P2 只记录：关闭按钮、弹窗打开时卸载、原背景属性还原、四兄弟逐一断言、未来多 focusable 和脚本强制移焦未单独覆盖；按纪律不扩大修改。
- 全仓 `npm run lint`、workspace `npm run typecheck` 通过；`npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions / 19 assets`、`needs-review; verified 0/47`。内容/来源自动证据不构成人工审核。
- 下一步默认 Vitest、build 与默认 8-worker 三视口全量 E2E。

## 2026-08-18 - 来源弹窗全量 Vitest 与 production build

- `npm test` 新鲜结果 `82 files / 1000 tests passed`，覆盖来源弹窗焦点、Escape、Tab/inert 合同和既有全仓回归。
- `npm run build` 通过：`1905 modules transformed`、`198 static-copy`、PWA `86 entries (2650.93 KiB)`，无 chunk warning。
- 待端口 `4347` 默认 8-worker/3-project 全量 E2E 与来源弹窗截图复看。

## 2026-08-18 - 来源弹窗全量 E2E 首轮结果

- `PLAYWRIGHT_TEST_PORT=4347 npm run test:e2e` 收集 `189` 项，结果 `179 passed / 10 failed`，约 `5.4m`；新增来源弹窗合同三视口全部通过。
- 失败为 chromium-1440 六个首屏 heading 5 秒冷启动、三视口 mock 双页 30 秒、chromium-1366 ContentReview 双页 30 秒；与本轮来源弹窗路径解耦，不能据此判产品回归，也不能忽略。
- `.last-run.json` 为 failed/10 个 id，`4347` 已释放。来源截图 mtime 已刷新为本轮时间。下一步 `4348 --last-failed` 原参数精确复跑，随后按结果决定完整第二轮。

## 2026-08-18 - 首轮失败项复跑仍有 1440 冷启动失败

- `4348` 的 `playwright test --last-failed` 为 `5 passed / 5 failed`。已通过 Q3、ContentReview 双页、mock 1366/390；剩余均为 chromium-1440 的 Q5/Q14/Q37/Q41/mock 首屏 5 秒等待。
- 失败在 8 个候选并发启动时发生，仍需单项串行证据区分环境并发拥塞。计划用 `4349-4353` 逐项精确复跑，不改任何产品、测试或全局参数；定向结果不能替代全量。

## 2026-08-18 - 剩余 1440 失败项串行复跑

- `4349-4353` 分别精确运行 Q5/Q14/Q37/Q41/mock 双页，全部 `1/1 passed`；业务耗时约 `10.6/1.9/6.3/2.1/3.6s`。
- 所有端口已释放，未改产品或测试参数。下一步 `4354` 默认 8-worker/3-project 完整 `189` 项，定向结果不替代全量。

## 2026-08-18 - 全量 E2E 第二轮仍有并发失败

- `4354` 默认完整 `189` 项为 `181 passed / 8 failed`，约 `6.0m`；新增来源弹窗合同三视口仍全绿。
- 五个此前实验/mock 1440 失败项已有单项通过证据；本轮新增 ContentReview 双页 1440/1366 和 Practice 双页 1440 超时，均未命中来源弹窗逻辑。
- `.last-run.json` failed/8 ids，`4354` 已释放。计划 `4355-4357` 精确复跑三项后，再由 `4358` 完整第三轮，不改产品、timeout、workers、retry 或断言。

## 2026-08-18 - 固定 production preview 下复跑

- `4355` 的 Playwright webServer 在 60 秒内未启动，命令未进入测试；端口与测试进程无残留。为隔离重复构建 I/O 抖动，复用已通过 build 的 `dist`，在默认 `4173` 启动本轮 preview。
- Playwright reuseExistingServer 下，ContentReview stale-tab 1440/1366 与 Practice 双页 1440 均 `1/1 passed`，业务约 `3.5/4.0/3.5s`。
- 下一步同一 preview 运行默认 8-worker/3-project 完整 `189` 项；完成后关闭 preview、核对 `.last-run.json` 和端口。

## 2026-08-18 - 来源弹窗最终 E2E 与截图证据

- 固定 production preview 下第三轮默认 `8 workers / 3 projects` 全量结果为 `176 passed / 13 failed`，约 `4.4m`。失败分布为三视口 PWA Service Worker ready、PDF/offline 并发超时，以及 chromium-1440 的 Q5、Q31 与 Practice 跨标签各一项；来源弹窗新增合同在 1440/1366/390 仍全部通过。
- 三轮完整结果依次为 `179/189`、`181/189`、`176/189`，失败集合不稳定。已有串行精确复跑支持并发冷启动/资源拥塞解释，但定向通过不替代默认完整门禁；本轮不继续第四轮无界重跑，也未调整 timeout、workers、retry、断言或产品代码。
- 最终 `output/playwright/results/.last-run.json` 为 `status: failed` 并含 13 个 ids。preview 会话已停止，`Get-NetTCPConnection -LocalPort 4173 -State Listen` 返回无监听。
- 来源截图文件有效且非空：`chromium-1440-source-modal.png` 为 `1440x900 / 373721 B`，`chromium-1366-source-modal.png` 为 `1366x768 / 276274 B`，`chromium-390-source-modal.png` 为高 DPR `1024x2216 / 471476 B`。人工与独立只读终审均确认桌面双栏、移动单列、标题、关闭按钮和来源图像无横向溢出、文字截断、遮挡或异常裁切，视觉 P0/P1/P2 为 `0`。
- 来源弹窗功能证据可独立成立：Practice 红灯 `3 failed / 19 passed`，实现后 `22/22 passed`；Web typecheck/相关 ESLint 通过；真实浏览器定向三视口 `3/3 passed`；独立源码终审 P0/P1 `0`。静态截图不替代焦点/键盘合同。
- 最终必须区分：来源弹窗修复已完成；当前机器上的默认完整 E2E 最新状态仍为 failed。其他全仓门禁保持 lint/typecheck 通过、Vitest `82 files / 1000 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905/198/86 (2650.93 KiB)`。
- Q44 只支持来源审计已确认的 `parallel-5 / split-6`，不声称穷尽合法答案，且继续 `needs-review`。来源核对、测试与截图不等于人工审核；未修改 schema v1/v2/v3、旧图片、旧 `cpu-explorer` 或既有测试，未删除、提交、推送或部署。

## 2026-08-18 - 剩余候选只读审计

- 复核 `apps/web/src/components/NetworkModuleTabs.tsx`：四个网络实验链接均在 active module 上设置 `aria-current="page"`，网络模块选中语义缺口已由现有实现和页面测试覆盖，不立案。
- 复核剩余高频交互：`QuestionsPage.tsx` 科目筛选、`PracticePage.tsx` 掌握度按钮、`StepExplorer.tsx` 播放/暂停、`VirtualMemoryLabPage.tsx` 访问时间线播放均能正常操作；前两者和播放切换缺少更明确的 pressed 语义，StepExplorer 当前 `<li>` 无独立 `aria-current` 且 transport button 未显式 `type="button"`。Cache 时间线当前项主要靠 class，AppShell/Suspense 的全局 loading/fatal 与 SPA 路由播报也只是语义增强缺口；VirtualMemory 时间线当前事件已有 `aria-current`。这些仍是 P2，不是当前确定性 P0/P1。
- 本轮只读审计未修改代码、测试或配置，也未启动服务。按 HANDOFF 边界不把这些 P2 扩成实现任务；下一步只有出现新的明确 P0/P1 才先写红灯，否则维持状态核对。

## 2026-08-19 - 状态核对

- `Get-NetTCPConnection` 核对 `4173`、`4335`、`4354-4358` 均无监听；没有残留 preview 或 E2E 服务。
- `output/playwright/results/.last-run.json` 仍为 `status: failed`、13 个 failed test ids。今日未重跑全量 E2E，未修改产品、测试、配置或审核状态。

## 2026-08-19 - 阶段收尾

- 按用户授权暂时收尾。本阶段冻结为可本地使用的 `2009 工程 Beta`，不把当前机器上的默认 E2E 并发失败写成产品全绿，也不继续扩展已记录 P2。
- README 已纠正旧的 2026-08-17/`171/171` 基线，当前公开说明与 HANDOFF/notes 对齐：静态门禁全绿、Vitest `82/1000`、content `needs-review; verified 0/47`、build `1905/198/86`、默认 E2E 最新 `176/189` failed/13 ids。
- 收尾校验 `npm run content:validate` 通过：`47 questions (40 objective, 7 comprehensive)`，`needs-review; verified 0/47`。相关端口均无监听。
- 未新增代码、测试、schema、题包、图片或配置；未删除、提交、推送、部署。下一对话应直接使用 HANDOFF 最新“下一对话开场 prompt”，先读四份项目文档再决定是否立案新 P0/P1。

## 2026-08-23 - 学习备份恢复确认 P1 红灯

- 新一轮只读审计先复核既有 backup replace/merge：解析、联合语义校验、清空与八类用户数据写入仍在同一 Dexie 事务内，已有失败零写入合同，不重做该已收口范围。
- Web 入口发现独立数据安全 P1：`SettingsPage` 选择备份文件后立即调用 replace 导入，文件选择本身就是最后一步；合法旧备份会直接替换当前作答、进度、笔记、收藏、设置和模考记录，没有恢复确认。
- `SettingsPage.test.tsx` 先增加“取消时零导入、确认后才导入”两条确定性合同。旧实现定向结果为 `1 file / 2 tests / 2 failed`，均因确认函数调用次数为 0；取消分支同时实证仍调用 `importBackup`。产品实现尚未修改。
- 下一步只在 Settings Web 入口加入明确替换范围的确认门，并同步既有真实浏览器备份恢复用例接受该确认；不改 backup schema、replace/merge 事务、题包或既有 P2。

## 2026-08-23 - 学习备份恢复确认定向转绿

- `SettingsPage` 现在在读取文件和调用 `importBackup` 前使用原生确认框，明确列出会被替换的作答、进度、笔记、收藏、设置和模考记录，并说明本地 PDF 不受影响；取消后显示“已取消备份恢复”且零导入。
- 同一 Settings 单测由 `2 failed / 0 passed` 转为 `2/2 passed`。实现后首轮剩余 1 项失败来自原单用例文件没有 Testing Library DOM cleanup，补齐测试隔离后同一命令全绿；没有为通过而削弱产品断言。
- Web typecheck、`SettingsPage.tsx`、其单测和 `study-flow.spec.ts` 定向 ESLint 通过；Playwright 可收集 study-flow `39 tests / 3 projects`。
- 端口 `4359` 的真实 Chrome 定向覆盖当前 V3 roundtrip 与 V1 迁移，1440/1366/390 共 `6/6 passed`。两条流程都核对原生 dialog 类型与替换提示并显式接受，随后恢复数据成功；端口已释放。
- 定向运行把 `.last-run.json` 刷为 passed/空失败，仅代表这 6 项；最新默认完整门禁事实仍是此前 `176/189 passed`、failed/13 ids，不能用定向结果覆盖。分离式源码复核当前范围 P0/P1 为 0；备份内容预览和导出失败提示作为 P2 只记录不修。

## 2026-08-23 - 学习备份恢复确认全量门禁待执行

- 下一步按风险串行运行全仓 lint/typecheck、默认 Vitest、release、content、production build，再只运行一次默认 `8 workers / 3 projects` 全量 E2E；不因机器并发失败无界复跑。

## 2026-08-23 - 学习备份恢复确认全量首轮

- 全仓静态/内容门禁新鲜通过：lint、workspace typecheck、Vitest `82 files / 1001 tests`、release `10/10`、content `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2651.13 KiB)`。
- 端口 `4360` 默认 `8 workers / 3 projects` 全量 `189` 项首轮为 `180 passed / 9 failed`，约 `3.9m`。其中 3 项 `apps/web/e2e/study-flow.spec.ts` 备份合同仍未接受新增确认框，收到“已取消备份恢复”而非旧错误文案；另 6 项为 chromium-1440 实验室首屏 heading 的 lazy/actionability 冷启动失败，未命中本次 Settings 实现。
- 已同步重复 `apps/web/e2e` 合同：损坏与有效备份均核对并接受 `confirm` 后再断言结果；该文件 ESLint 通过，端口 `4361` 三视口定向 `3/3 passed`。
- 由于首轮包含已知测试契约失配，下一步仅做一次修正后的完整 `189` 项复跑以取得最终代码证据；无论结果如何都不再无界重跑。端口 `4360/4361` 已释放。

## 2026-08-23 - 学习备份恢复确认最终收尾

- 修正后的固定 production preview 全量 E2E（默认 `8 workers / 3 projects`，端口 `4362`）收集 `189` 项，最终 `187 passed / 2 failed`，约 `4.0m`。失败为 chromium-1440 CSMA/CD 碰撞域实验和 chromium-1366 完全二叉树实验的 30 秒冷启动/actionability 超时，未命中本次 Settings 备份确认路径；不再继续无界重跑。
- `.last-run.json` 为 `status: failed`，含 2 个 failed test ids；`4360/4361/4362` 均无监听。该结果不能写成全量通过，且失败集合仍受机器并发冷启动影响。
- 学习备份恢复确认 P1 完成后独立 P0/P1 复审为 `0`。确认范围明确覆盖作答、进度、笔记、收藏、设置和模考记录，本地 PDF 不受影响；取消路径在读文件前零调用导入，确认后继续既有原子 replace 事务。
- 全仓新鲜验证保持：lint/typecheck 通过、Vitest `82 files / 1001 tests`、release `10/10`、content `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2651.13 KiB)`。
- 未修改 schema v1/v2/v3、题包审核状态、Q44 边界、旧图片/测试/旧 `cpu-explorer`；未删除、提交、推送或部署。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 仍为 P2，只报告不修。

## 2026-08-24 - Q34 QAM / 奈氏准则实验

### 立项与边界

- 按 Q5 收口后的候选审计结果选择 Q34。题包和 `local-data/sources/2009-crosscheck.md` 对齐到无噪声、`B=3 kHz`、`4` 个相位、`4` 种振幅；本地推导为 `M=16`、`log2(M)=4 bit/符号`、`R=2×3000×4=24000 bit/s`。该来源核对只支持实验参数，不提升题包审核状态，Q34 仍为 `needs-review`。
- 不绘制来源未给出的星座坐标、码字映射、噪声模型或 Shannon 容量；自定义输入只允许有限的带宽、相位数和振幅数，并在非法值时 fail closed。没有引入新持久化字段、schema 变更或任意答案/微操作评分器。

### 红绿与实现

- 先新增 `packages/lab-core/src/qam-nyquist.test.ts`，缺少实现模块时得到预期 `1 failed / 0 tests`；随后实现 `traceQamNyquist`、五步不可变 trace、Q34 预设和导出。核心定向覆盖精确结果、确定性/输入隔离及非法参数。
- 新增 `apps/web/src/pages/QamNyquistLabPage.tsx` 与页面合同，接入 `NetworkLabRouterPage`、`NetworkModuleTabs`、`questionLabLink`；网络模块数量合同同步由 4 改为 5。页面支持 canonical/custom URL、恢复预设、StepExplorer、Q34 练习和知识节点双向深链。
- 页面明确显示参数、状态数、每符号比特、奈氏上限及当前推导步骤；自定义 `8000/8/2` 得到 `64 kbps`，非法相位 `1` 显示错误且不保留旧 trace。

### 验证证据

- 核心/Web/路由/深链定向 Vitest：`5 files / 58 tests passed`。
- `npm run lint` 全仓复核通过；Q34 涉及的 `@408os/web`、`@408os/lab-core` typecheck 通过。
- `npm run build` 通过：`1907 modules transformed`、`198 static-copy`、PWA `86 entries (2665.99 KiB)`。
- 独立端口 `4363` 的 Q34 Playwright 合同在 chromium-1440、chromium-1366、chromium-390 为 `3/3 passed`，覆盖结果、五模块 active 语义、canonical/custom URL 与预设恢复、错误恢复、步进、深链和无横向溢出；端口已释放。
- 独立 P0/P1 复审为 `0`。本轮没有重跑全仓 Vitest/release/content 或默认全量 E2E；最近一次默认全量仍是 `187/189 passed`，两项冷启动/actionability 失败与 Q34 无关。定向运行后 `.last-run.json` 的 `passed/空失败` 仅代表 Q34 三视口集合。

### 保留事项

- 题包人工复核仍为 `0/47`，自动测试和来源交叉核对不等同人工审核。Q44 仍只保留来源支持的 `parallel-5 / split-6`，并继续 `needs-review`。
- Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 仍按既定 P2 只报告不修。
- 未修改 `408-user` schema v1/v2/v3，未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。

## 2026-08-26 - Q27 分段地址字段实验

### 来源审计与边界

- 对剩余未接实验深链的题目做了只读候选审计，选择 Q27 作为下一项薄而确定的操作系统切片。题包 `cn408-2009-q27` 与本地来源交叉核对都只支持 32 位地址长度、8 位段号，因此实验结论限定为 24 位段内位移和最大段长 `2^24 B`，对应选项 C。该证据不提升题包审核状态，题包仍为 `needs-review`。
- 交互只解释地址字段拆分与容量换算；明确不推断段表、基址/限长寄存器、物理地址、保护机制或来源未给出的运行时行为。不新增持久化字段，不改 `408-user` schema v1/v2/v3，不实现任意答案或微操作评分器。

### 红绿与实现

- 先添加 `packages/lab-core/src/segmentation-address.test.ts`，在实现缺失时得到预期红灯 `1 failed / 0 tests`。随后新增 `traceSegmentationAddress`、严格安全整数校验、五步不可变 trace、Q27 预设和公共导出，核心定向为 `3 passed`。
- 新增 `apps/web/src/pages/SegmentationAddressLabPage.tsx` 及页面合同，接入 `OsLabRouterPage`、`OsModuleTabs`、`questionLabLink` 和 Q27 真题/知识节点深链。canonical URL 为 `/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27`；自定义地址总位数/段号位数非法时 fail closed，恢复按钮回到来源预设。
- OS 导航由五个模块扩为六个，并同步受影响的页面合同与真实浏览器合同。页面的字段图和步骤观察在窄视口下保持可读，明确不把 `needs-review` 误写成已审核。

### 验证证据

- 核心、页面、路由和深链定向 Vitest：`4 files / 59 tests passed`。受导航数量影响的既有 OS 页面合同：`3 files / 17 tests passed`。
- `npm run lint` 全仓通过；`npm run typecheck -w @408os/lab-core` 与 `npm run typecheck -w @408os/web` 通过。
- production build 通过：`1909 modules transformed`、`198 static-copy`、PWA `87 entries (2680.89 KiB)`。
- 独立端口 `4364` 的真实 Chrome 合同在 1440、1366、390 三视口为 `3/3 passed`，覆盖预设结果、六模块当前态、逐步推进、自定义/非法/恢复、练习与知识深链和无横向溢出；测试后端口已释放。
- 本轮未重跑全仓 Vitest、release、content 或默认全量 E2E，以避免为薄切片无界扩大门禁。最近一次默认全量仍为 `187/189 passed`，失败为 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树的冷启动/actionability 超时；本轮 `.last-run.json` 的 passed/空失败只来自 Q27 定向三视口运行。
- 独立源码复审未发现新的 P0/P1。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续按约定作为 P2 只报告不修。

### 保留事项

- 正式人工复核仍为 `0/47`，自动测试、来源交叉核对、截图和 fixture 注入不等同逐题人工审核。Q44 仍仅保留来源支持的 `parallel-5 / split-6`，不声称穷尽所有合法答案。
- 未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。

## 2026-08-31 - Q38 TCP 累计确认实验垂直切片

### 立项与来源边界

- Q27 收口后对剩余未接实验深链题目做了只读候选审计，选择 Q38。当前题包和本地来源材料给出已建立 TCP 连接、首段序列号 `200`、两个连续 TCP 段 payload 分别为 `300 B` 和 `500 B`，接收方正确收到两段，题包答案为 D（`1000`）。
- 题包解析把普通累计 ACK 的说明写成“选择确认”，这是待人工复核的内容问题，本轮不改题包。实验采用基础 TCP 累计确认解释：ACK 字段表示下一个期望序列号，因此区间为 `[200,500)`、`[500,1000)`，结果为 `ACK 1000`。RFC 9293 的 ACK 语义见 https://www.rfc-editor.org/rfc/rfc9293.html；RFC 2018 将 SACK 定义为可选的已接收块报告机制，见 https://www.rfc-editor.org/rfc/rfc2018.html。
- 交互边界固定为两个连续、按序、无丢失且不回绕的 payload。自定义参数为首段序列号、两个 payload 长度，采用非回绕 32 位序列空间与 `1,000,000 B` 可视化上限；不模拟 SACK 块、接收窗口、丢包、重传、序列号回绕或任意评分器，不新增持久化字段。

### 红绿与实现

- 先新增 `packages/lab-core/src/tcp-cumulative-ack.test.ts`，缺少实现时预期为 `1 failed / 0 tests`。随后新增 `traceTcpCumulativeAck`、五步不可变 trace、配置快照隔离、严格输入校验和 `cn408-2009-q38` 预设，并从 `packages/lab-core/src/index.ts` 导出。
- 新增 `apps/web/src/pages/TcpCumulativeAckLabPage.tsx` 与 `TcpCumulativeAckLabPage.test.tsx`，接入网络实验路由、导航和 `questionLabLink`。canonical URL 为 `/lab/network?module=tcp-ack&preset=cn408-2009-q38`；自定义 URL 为 `firstSequence`、`firstLength`、`secondLength`。页面包含当前步骤、字节区间、累计 ACK、SACK 边界、错误 fail closed、预设恢复、Q38 练习和知识节点双向深链。
- `NetworkModuleTabs` 由 5 项扩为 6 项，桌面使用六列，移动使用 3×2；同步 Q34/Q37、协议实验和系统实验中的导航数量合同。没有修改其他实验的算法或题包内容。

### 验证

- 核心页面合同先红后绿：缺页面时 `1 failed / 0 tests`；实现后聚焦命令为 `6 files / 67 tests passed`。
- `npm run lint` 与 `npm run typecheck` 全仓通过（Web、content-schema、cpu-core、domain、lab-core、storage）；`npm run build` 通过，产物为 `1911 modules transformed`、`198 static-copy`、PWA `87 entries`。
- Playwright CLI 通过临时预览端口 `4366` 做真实检查：1440、1366、390 三视口均无横向溢出；核对预设 `ACK 1000`、自定义 `ACK 20`、无效 payload 不显示旧 trace、步骤推进、练习入口、知识节点回链和控制台无 error。知识页仅有既有 custom wheel sensitivity warning。截图为 `output/playwright/screenshots/chromium-1440-tcp-ack-q38.png`、`chromium-390-tcp-ack-q38.png`、`chromium-390-tcp-ack-q38-bottom.png`，服务与浏览器会话均已释放。
- 本轮按“减少测试”约束未重跑全仓 Vitest、release、content 或默认全量 E2E。最近一次默认全量事实仍为 `187/189 passed`，失败为已知冷启动/actionability 波动；本轮定向结果不覆盖它。独立 P0/P1 复审为 `0`。

### 保留边界

- 正式人工复核仍为 `0/47`，题包和 Q38 继续 `needs-review`。自动测试、RFC 核对、截图和浏览器检查都不等同逐题人工审核。
- 未修改 `408-user` schema v1/v2/v3、Q44 的 `parallel-5 / split-6` 边界、旧题包或来源图片；未删除旧图片/测试/旧 `cpu-explorer`，未提交、推送或部署。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续只报告不修。

## 2026-08-31 - Q24 高响应比调度实验立项

- 原卷、正式解析、题包和 OCR 交叉核对一致：Q24 答案为 D，高响应比优先以 `R=(等待时间+执行时间)/执行时间` 同时考虑等待时间与执行时间；题干没有进程到达时间、服务时间或可直接重放的调度轨迹。
- 立项边界为“来源概念 + 通用教学示例”，不把补造的进程表写成 2009 真题重放。示例支持编辑进程 ID、到达时刻和执行时长；采用非抢占 HRRN、无就绪进程时显示 CPU 空闲、同响应比按到达顺序和 ID 稳定裁决。限制进程数量和时刻范围，非法输入 fail closed。
- 下一步先写 `packages/lab-core/src/hrrn-scheduling.test.ts` 缺模块红灯，再实现纯逻辑和 Web/路由/深链；按“减少测试”约束只跑核心/页面/受影响导航定向验证与三视口真实浏览器，不重跑默认全量 E2E。

## 2026-08-31 - Q24 高响应比调度实验收口

### 来源审计与边界

- 原卷、正式解析、`local-data/generated/2009.pack.json`、`local-data/work/ocr/answers.json` 和 `local-data/sources/2009-crosscheck.md` 对 Q24 的概念结论一致：高响应比优先（D）综合等待时间与执行时间，公式为 `R=(等待时间+执行时间)/执行时间`。四份材料均没有进程到达/服务数据或可重放调度序列。
- 因而不将补造的进程表宣称为 2009 真实轨迹。实验固定为“来源概念 + 通用教学示例”：用户可编辑 `ID,到达时刻,执行时间`，核心采用非抢占 HRRN；无就绪进程时显式记录 CPU idle，同响应比以到达顺序、输入顺序和 ID 稳定裁决。进程数量、时刻、总时长和对象键均有严格边界。

### 红绿、实现与定向验证

- 先添加 `packages/lab-core/src/hrrn-scheduling.test.ts`，缺实现时得到 `1 failed / 0 tests`；随后实现不可变 `traceHrrnScheduling`、Q24 preset、候选响应比、调度表和输入校验，并从 lab-core 公共入口导出。
- 先添加 `apps/web/src/pages/HrrnSchedulingLabPage.test.tsx`，缺页面时得到 `1 failed / 0 tests`；随后实现 Q24 页面、StepExplorer、预设/自定义 URL、错误 fail closed、Practice/Knowledge 入口和明确的 needs-review/示例边界。
- `OsModuleTabs` 由六项扩为七项，新增 `hrrn` 路由分支、Q24 preset fallback 和 `questionLabLink`。同步 OS 既有页面/E2E 的模块数量合同；没有改其他实验计算语义。
- 聚焦 Vitest 共 `8 files / 85 tests passed`；`npm run lint`、`npm run typecheck` 全仓通过；`npm run build` 通过（`1913 modules transformed`、`198 static-copy`）。按用户“减少测试”约束，本轮没有重跑全仓 Vitest、release、content 或默认全量 E2E。
- Playwright CLI 在临时端口 `4367` 做三视口真实检查：1440/1366/390 均无横向溢出；Q24 预设顺序 `P1 → P3 → P4 → P2`、自定义同到达稳定 tie-break、4 单位 CPU 空闲、非法输入、步进、练习入口和知识节点回链均通过。页面无 console error；Knowledge 页只有既有 Cytoscape custom wheel sensitivity warning。

### 保留事项与下一步

- Q24 和题包保持 `needs-review`，正式人工复核仍为 `0/47`。来源核对、自动测试、截图和浏览器运行都不替代逐题人工审核。
- 默认全量 E2E 最新完整事实仍是 `187/189 passed`，两个冷启动/actionability 失败不改写为全绿；不再为 Q24 启动无界全量重跑。定向运行后的 `.last-run.json` 只在明确记录其测试集合时使用。
- 未修改 `408-user` schema v1/v2/v3、Q44 的 `parallel-5 / split-6`（仅 `parallel-5 / split-6`）边界，未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。既有 P2 继续只报告不修。
- 下一项工作先从剩余来源候选做只读审计；若没有新的明确 P0/P1，不修既有 P2。若授权新的语义增强，仍须先写确定性红灯、最小实现、定向验证和独立 P0/P1 复审。

## 2026-08-31 - Q20 总线带宽实验立项

- 来源审计确认 Q20 的三个数值参数完整且无图形转录歧义：每总线周期 `4 B`、周期占用 `2` 个时钟、总线时钟 `10 MHz`；原卷选项为 `10/20/40/80 MB/s`，解析明确答案 B（`20 MB/s`）。
- 本项只做可验证的公式/单位换算教学切片：`cycleSeconds = clockCycles / (frequencyMHz × 1,000,000)`，`cyclesPerSecond = frequencyMHz × 1,000,000 / clockCycles`，`bandwidthBytesPerSecond = bytesPerCycle × cyclesPerSecond`，并展示十进制 `MB/s` 与 `Mbit/s`。不把示例描述成真实总线时序，不加入题干没有的仲裁、等待、突发、编码开销或评分器。
- 输入采用受限 URL 参数和内存状态，严格校验正整数与有限正频率，错误时不显示旧推导结果；不改题包、审核状态、持久化 schema 或用户数据库。
- 执行顺序固定为：核心缺模块红灯 → 最小 CPU 第 11 模块与深链 → 定向 Vitest/lint/typecheck/build → 1440/1366/390 真实浏览器检查 → 独立 P0/P1 复审。默认全量 E2E 仍以 `187/189 passed` 的历史事实记录，不作无界重跑。

## 2026-08-31 - Q20 总线带宽实验收口

- 核心先以缺模块导入红灯 `1 failed / 0 tests` 锁定合同，随后 `bus-bandwidth.ts` 提供 Q20 预设、十进制单位换算、七步不可变 trace、严格输入校验和算术溢出 fail-closed；聚焦核心、页面、CPU 路由及入口为 `4 files / 71 tests passed`。
- Web 新增 CPU 第 11 个模块和 `BusBandwidthLabPanel`，canonical URL `/lab?module=bus-bandwidth&preset=cn408-2009-q20`，自定义参数为 `bytes`、`clocks`、`frequency`。来源预设 `4 B / 2 clocks / 10 MHz` 得到 `20 MB/s`、`160 Mbit/s`；界面明确这是来源公式的可编辑教学示例，不是总线事务时序重放。
- 全仓 `npm run lint`、`npm run typecheck` 和 production build 通过；build 为 `1915 modules transformed`、`198 static-copy`、PWA `87 entries (2734.82 KiB)`。本轮没有重跑全仓 Vitest、release、content 或默认全量 E2E。
- Playwright CLI 临时端口 `4370` 的真实 Chrome 检查覆盖 1440/1366/390：预设、自定义 `8/4/25`、零值错误恢复、七步推进、预设恢复、Q20 Practice 第 20 题入口、Knowledge 往返和三视口无横向溢出均通过；控制台无 error。截图为 `output/playwright/screenshots/chromium-1440-bus-bandwidth-q20.png`、`chromium-1366-bus-bandwidth-q20.png`、`chromium-390-bus-bandwidth-q20.png` 与移动端底部截图。
- 独立 P0/P1 复审为 `0`。Q20 与题包保持 `needs-review`，正式人工复核仍为 `0/47`；不修改 `408-user` schema v1/v2/v3、Q44 边界、旧图片/测试/旧 `cpu-explorer`，不提交、推送或部署。既有 P2 继续只报告不修。
- 默认全量 E2E 的最新完整事实仍是 `187/189 passed`，已知两项冷启动/actionability 失败不能写成全绿；定向运行生成的 `.last-run.json` 不覆盖该基线。下一项先做剩余候选的只读来源审计，再决定是否立项。

## 2026-08-31 - Q36 以太网交换机转发实验立项

- 来源三方核对（原卷、正式解析、当前题包/crosscheck）一致支持 Q36 答案 A：交换机属于数据链路层，转发决策读取目的物理地址。来源没有提供可重放的拓扑、MAC 表、端口状态或未知单播处理细节。
- 因此只立项一个有限的通用教学示例：目的 MAC + 静态转发表，按“规范化地址 → 查找目的地址 → 报告出口端口/未命中”生成不可变 trace。未命中不扩展为泛洪或学习算法，页面会明确不模拟 VLAN、STP、真实帧时序和 2009 原题拓扑。
- 参数边界：MAC 必须是 6 组十六进制字节，表项数量和端口文本有限且无重复地址；所有状态只在 URL/内存中流转，错误 fail closed，不新增题包、schema 或持久化字段。Q36 保持 `needs-review`。
- 下一步先新增 `packages/lab-core/src/switch-forwarding.test.ts` 形成缺模块红灯，再做最小核心、网络第七模块、双向深链和定向验证；不重跑默认全量 E2E，继续保留 `187/189 passed` 基线。

## 2026-09-01 - Q36 以太网交换机转发实验收口

- Q36 核心先保留缺模块红灯 `1 failed / 0 tests`，再实现 `traceSwitchForwarding` 的五步不可变 trace。预设命中 `00:11:22:33:44:55 → P3`；自定义未命中只报告“本示例没有匹配项”，不推断泛洪或学习。输入限制为最多 8 个唯一 MAC 表项和有限端口标识。
- Web 新增网络第 7 模块、精确 URL `/lab/network?module=switch-forwarding&preset=cn408-2009-q36`、`destination/table` 自定义参数、错误 fail closed、预设恢复、Q36 Practice/Knowledge 双向深链和响应式布局。来源边界始终只声明数据链路层按目的物理地址做转发决策，教学转发表不冒充原题拓扑。
- 聚焦 Vitest `8 files / 89 tests passed`；全仓 lint、workspace typecheck 通过；production build 为 `1917 modules`、`198 static-copy`、PWA `87 entries (2751.85 KiB)`。真实 Chrome CLI 临时端口 `4371` 三视口通过，控制台无 error，三视口无横向溢出；截图为 `output/playwright/screenshots/chromium-1440-switch-forwarding-q36.png`、`chromium-1366-switch-forwarding-q36.png`、`chromium-390-switch-forwarding-q36.png`。
- 独立 P0/P1 复审为 `0`。正式人工复核仍为 `0/47`，Q36 与题包继续 `needs-review`；不修改 schema v1/v2/v3、Q44 边界、旧图片/测试/旧 `cpu-explorer`，不提交、推送或部署。既有 P2 继续只报告不修。
- 本轮没有重跑全仓 Vitest、release、content 或默认全量 E2E；默认全量最新完整事实仍为 `187/189 passed`，两项冷启动/actionability 失败不能写成全绿。下一步先审计剩余候选，不从普通“继续”推断更大范围的语义改造。

## 2026-09-01 - Q40 FTP 控制连接实验立项

- 来源核对（原卷、解析渲染图 `answers-07.png`、当前题包、crosscheck）一致支持 Q40 答案 A：FTP 命令使用建立在 TCP 之上的控制连接；解析给出基础模型端口 21（控制）与 20（数据）。
- 交互边界限定为一个双通道教学示例：选择命令或文件数据事件，观察 TCP 控制/数据连接、用途和端口。不会把基础端口描述扩展成所有 FTP 实现的动态端口规则，也不模拟主动/被动协商、TLS、NAT、重传或真实时序。
- 只用 URL/内存状态保存当前通道，不改题包、审核状态、持久化 schema 或用户数据；Q40 继续 `needs-review`。下一步先写缺模块红灯，再做网络第八模块和双向深链的最小实现。

## 2026-09-01 - Q40 FTP 控制连接实验收口

- 核心和页面均先以缺模块/缺页面导入错误得到 `1 failed / 0 tests` 红灯。随后新增 `ftp-control-connection.ts` 与 Q40 页面：基础模型只有控制/数据两条 TCP 连接，分别映射 `TCP/21 + FTP 命令` 与 `TCP/20 + 文件数据`，五步 trace 与返回快照保持确定性、互相独立，非法通道直接拒绝。
- 网络导航由 7 项扩为 8 项，新增 `/lab/network?module=ftp-control&preset=cn408-2009-q40`、`channel` 自定义 URL、错误 fail closed、预设恢复、StepExplorer、Practice 第 40 题和 Knowledge Q40 双向深链。页面明确不模拟主动/被动协商、动态数据端口、TLS、NAT、重传或真实网络时序。
- 聚焦 Vitest 最终为 `7 files / 87 tests passed`；全仓 lint、workspace typecheck 通过；production build 为 `1919 modules`、`198 static-copy`、PWA `87 entries (2766.47 KiB)`。按“减少测试”约束未重跑默认全仓 Vitest、release 或 content。
- Playwright CLI 临时端口 `4372` 完成 1440/1366/390 三视口真实检查：控制/数据切换、URL 状态、非法 `udp` fail closed 与恢复、五步推进、Practice/Knowledge 往返和三视口横向溢出均通过。截图在 `output/playwright/q40/`；控制台 `0 errors`，两个 warning 为既有 Cytoscape 自定义滚轮敏感度提示。`4360/4361/4362/4370/4371/4372` 均已释放。
- 独立 P0/P1 复审为 `0`。Q40 只使用 URL/内存状态，不改题包、审核状态、用户数据库或 `408-user` schema v1/v2/v3；错误状态不显示旧 trace，Practice 仍走现有事务。Q44 继续只保留 `parallel-5 / split-6`，既有 P2 继续只报告不修。
- 最近一次默认全量 E2E 仍为 `187/189 passed`，两个并发冷启动/actionability 失败不能写成全绿；当前 `.last-run.json` 的 `passed/空失败` 只代表定向集合。正式人工复核仍为 `0/47`，Q40 与题包保持 `needs-review`。下一步先只读审计剩余 13 道未接实验深链题，再决定新的确定性垂直切片。

## 2026-09-01 - 公开仓库封板检查

- 采用独立公开显示名“研径 408”。品牌常量集中到 `apps/web/src/app/brand.ts`，HTML/PWA/AppShell/导出文件名已同步；内部 `@408os/*`、`408-user`、`408-content`、缓存键和目录名保留，避免兼容迁移。
- 公开仓库不附带版权不明的 2009 题包与来源资产。新增 code-only 模式：显式 `/content/2009.json` HTTP 缺失时空内容启动，题库相关流程禁用或空状态，实验室/PDF/设置继续可用；意外 fetch rejection、解析、校验或存储失败仍 fail closed。
- 网络错误边界先红后绿：旧实现把 `TypeError('network unavailable')` 转成题包缺失；修复后保留原错误。相关定向 `5 files / 42 tests passed`。
- 新增 code-only Playwright 合同。首轮 `3 failed` 只因测试写错实际 H1，快照已证明核心流程通过；修正为“CPU 可视化实验室”后 1440/1366/390 为 `3/3 passed`，端口 `4375` 已释放。
- 新鲜封板门禁：lint 与全部 workspace typecheck 通过；Vitest `97 files / 1090 tests passed`；release `10/10`；content `47 questions / 19 assets` 且全部 `needs-review`、verified `0/47`；build `1920 modules / 198 static-copy / 87 PWA entries (2770.12 KiB)`。
- 全仓 Vitest 首轮唯一失败是 Q36 页面仍断言网络导航 7 项，Q40 已把真实合同扩为 8；相邻网络测试均已为 8。更新该过期计数后定向 `5/5`、全仓 `1090/1090`。
- 默认 189 项全量 E2E 未重跑；最新完整事实仍为 `187/189 passed`，已知两个并发冷启动/actionability 失败不能写成全绿，当前定向 `.last-run.json` 不能覆盖该事实。
- 新增 `docs/ARCHITECTURE.md`、`docs/LOCAL_CONTENT.md`、`docs/RELEASE.md`；README、AGENTS、content README、importer README 已同步。`.gitignore` 新增 `.codex/`、`.playwright-cli/`、`graphify-out/` 和整个 `output/`，不删除现有本地文件。
- 排除私有/生成目录后的可提交树未发现密钥模式或异常大文件。当前目录无 Git 元数据；`gh` 登录账号为 `AbyssWhalen`，其仓库中没有 408OS/研径 408。`cpu-explorer` 按既定边界保留原状，不能猜作“替换原项目”的目标。
- 新增 `.gitattributes`：文本默认 LF，Windows shell 脚本 CRLF，图片/字体/PDF/压缩包二进制；根 `package.json` 与 lockfile 同步 Node `^20.19.0 || >=22.12.0`。离线 lockfile 更新通过，npm 审计 584 packages、`0 vulnerabilities`；7 份公开文档相对链接全部有效。
- 只读核对唯一相近旧仓库 `AbyssWhalen/cpu-explorer`：PUBLIC、无 LICENSE、`main` 未保护、无 Releases，active workflow 为 `.github/workflows/deploy.yml`，Pages 地址为 `https://abysswhalen.github.io/cpu-explorer/`。若覆盖将同时替换旧文件、CI 与公开站点，必须由用户明确点名并授权，不能从“原项目”三字推断。
- workflow 当前上传根 `dist`，研径 408 构建输出为 `apps/web/dist`。应用使用无 `basename` 的 `createBrowserRouter`，PWA `id/scope/start_url` 为 `/`，不能直接在 `/cpu-explorer/` 项目子路径部署。仓库替换与 Pages 替换是两个不同红线动作；部署适配需单独红灯、最小实现和真实浏览器/CI 验证。
- 尚未决定 GitHub 目标、可见性、slug、许可证和历史策略；没有执行 `git init`、commit、远端创建、push 或部署。公开写操作前必须获得明确授权。

## 2026-09-01 - BitAtlas 品牌与图标收口

- 最终公开显示名改为 `BitAtlas`。品牌常量、HTML/PWA metadata、应用壳、备份文件名和复核 ledger 文件名同步；内部目录、workspace、数据库 schema 与缓存键不随显示品牌迁移。
- 先更新 `apps/web/src/app/brand.test.ts`，旧实现确定性暴露品牌常量和 HTML 仍为“研径 408”；最小替换后，品牌、Settings、ContentReview 定向 Vitest `3 files / 14 tests passed`。
- 新 atlas-route 图标不含数字或文字，使用深绿、浅色、珊瑚与琥珀四色。SVG 用于 favicon/侧栏，PWA `192/512` PNG 从同一 SVG 生成并改为全幅深色底，避免 `maskable` 裁切白边；两张 PNG 尺寸与实际像素已检查。
- 相关 ESLint 与全 workspace typecheck 通过；production build `1920 modules / 198 static-copy / 87 PWA entries (2779.47 KiB)`。构建产物 title、description 与 manifest 均为 `BitAtlas`。
- code-only 真实 Chrome 1440/1366/390 `3/3 passed`，新增合同确认 `BitAtlas` 文本及 `/favicon.svg` 成功加载。桌面品牌块与整页截图已人工检查，图标小尺寸可辨且无文字挤压或布局重叠。
- GitHub 已有活跃的无关项目 `bitatlas-group/bitatlas`，因此建议显示品牌保持 `BitAtlas`，未来仓库 slug 使用 `bitatlas-study`。未创建 Git、远端、commit、push 或部署。
- 变更范围 P0/P1 复审为 `0`。本轮没有重跑全仓 Vitest、release、content 或 189 项默认全量 E2E；最新完整全量事实继续是 `187/189 passed`，定向 `.last-run.json` 不覆盖它。Q44、人工审核状态、schema v1/v2/v3 和既有 P2 均未改变。

## 2026-09-02 - GitHub Pages 自定义域名接入

- `AbyssWhalen/cpu-explorer` 已改名为公开仓库 `AbyssWhalen/bitatlas`，BitAtlas 代码通过 merge 接入并保留旧仓库历史；远端 `main` 当前为 `f15eea0`。最终 Pages Actions run `33574067291` 成功，日志给出 `1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`。
- Cloudflare 新增 `408.fytjut.com CNAME abysswhalen.github.io`，代理关闭、TTL 自动。Cloudflare 表格、系统解析器和 `1.1.1.1` 均回读同一 CNAME；GitHub Pages 证书状态为 `approved`、有效期至 `2026-11-30`，并已启用 `https_enforced: true`。
- 线上有限验收覆盖根路径、`/lab`、`/knowledge`、Q34 网络深链接与 Q24 OS 深链接。桌面页面和 390x844 首页/Q34 页面正常，无横向溢出或遮挡；manifest、favicon、`registerSW.js`、`sw.js`、192/512 PNG 均返回 HTTP 200。浏览器无 console error，Knowledge 只有既有 Cytoscape wheel sensitivity warning。
- 首次 Actions 的 `npm ci` 在 Node `20.20.2` 下出现三项 `EBADENGINE` warning。当前锁定依赖的最高约束要求 Node `^22.20 || ^24.12 || >=25`，因此根 engine 和公开文档统一为 `^22.20.0 || >=24.12.0`，Pages workflow 改用 Node 22。`npm install --package-lock-only --ignore-scripts --offline` 通过，审计 584 packages、`0 vulnerabilities`；本地 `npm run build` 再次得到 `1920 / 198 / 88 (2780.31 KiB)`。
- Actions run `33531382206` 在 Node 22 下构建和部署成功，三项依赖引擎 warning 已消失。该 run 仍报告旧 action 自身的 Node 20 runtime 弃用；对照官方仓库当前 release 和 `action.yml` 后，将 action 主版本更新为 `checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`，这些版本使用 Node 24 runtime 或组合 `upload-artifact@v7`。
- 最终 run `33574067291` 在 Node `22.23.2` 下再次成功，且未出现 `EBADENGINE` 或旧 action Node 20 runtime 提示；部署动作日志保留一条其依赖触发的 `punycode` 弃用提示，不影响成功结果。
- 本阶段不运行默认 189 项全量 E2E；其最新完整事实保持 `187/189 passed`，不写成全绿。没有修改题包、审核状态、Q44 `parallel-5 / split-6`、`408-user` schema v1/v2/v3 或私有内容，也没有删除旧历史、图片或测试。

## 2026-09-02 - 线上题包私有分发（Worker + R2 + cookie 门禁）方案就绪

### 决策与实现

- 用户目标：让线上 `408.fytjut.com` 可以刷 2009 真题，同时不把版权状态不明确的题包/来源页图提交进公开仓库或公开 URL。
- 架构事实：应用启动只认同源 `/content/2009.json` 与 `/content/cn408-2009/source/*.png`（`apps/web/src/app/storage.ts` 的 `LOCAL_PACK_PATH` 与 `AssetRef.path`）；Verified 导入（`installVerifiedContentPack`）同样按同源路径 staging 资产并校验 SHA-256。因此任何"线上刷题"方案都必须在同源路径提供内容，且必须带访问控制。
- 选型：Cloudflare Worker（路由 `408.fytjut.com/content/*`）+ 私有 R2 桶 + token 派生 cookie 门禁。无 cookie 404 → 应用进入既有"显式 HTTP 缺失"空状态；R2 异常 500 → 应用 fail closed；`/content/auth?token=` 种一年期 HttpOnly+Secure+SameSite=Lax cookie（值为 SHA-256("bitatlas-content-gate:v1:"+token)，换 token 即全网吊销）。应用代码与公开仓库零改动。
- 工具全部在被忽略的 `local-data/deploy/`：worker（含 wrangler.toml）、upload-content.mjs（20 对象上传+逐对象 SHA-256 校验）、local-preview.mjs（内存 R2 + 生产 dist 的同源组合验证服务器）、verify-flow.spec.ts（真实 Chrome 6 项全链路检查）、README.md（含 SSL Full(strict) 警告、curl 三态检查、回滚、吊销、与 47/47 人工复核 release 流程的衔接）。

### 验证结果

- `node --test worker.test.mjs`：10/10 通过。
- `npm run content:validate`：47 题（40 客观 + 7 综合）needs-review；verified 0/47。
- `npm run build`：88 PWA entries，构建通过。
- 真实 Chrome（channel=chrome，serviceWorkers 屏蔽）6/6：无 cookie 空状态；auth 后 47 题安装；Q1 作答/提交/解析/来源页双 PNG 加载；刷新恢复；`/mock` 保持"尚未完成 47 题人工复核"关闭态；无 cookie 新上下文空状态。截图 `output/playwright/verify-content-gate/`。
- IAB 内嵌浏览器丢弃 302 Set-Cookie（含去 Secure shim 后仍丢弃），属内嵌环境限制；curl 与真实 Chrome 均正确。生产 HTTPS 下 worker 保持 Secure。

### 风险与未解问题

- 切换 `408` CNAME 为已代理属区域级流量变更：必须先确认 fytjut.com 区域 SSL/TLS 模式为 Full (strict)，否则会与 GitHub Pages 的 HTTPS 强制形成重定向循环；若区域还有其他被代理子域，需评估或改用 hostname 级 Configuration Rule。
- Worker 路由只接管 `/content/*`；`/content/auth` 端点路径对应用无冲突（应用只请求 `/content/2009.json` 与 pack 内资产路径）。
- 云端对象为私有桶，r2.dev 公开访问必须保持关闭；token 泄露的处置是 `wrangler secret put CONTENT_TOKEN` 换新。
- 未执行任何 Cloudflare/部署动作，等待用户授权（API Token 或按 README 手动操作）；`/mock` verified 门禁与本方案无关，保持不变。

## 2026-09-02 - 用户决定：题包直接进公开仓库

- 面对三选一（公开仓库 / Cloudflare 私有分发 / 暂不动线上），用户选择公开仓库方案，已知悉内容永久公开与版权灰色地带（教育部考试中心真题、可能收到 DMCA 的风险已书面告知）。
- 变更：`.gitignore` 仅忽略 `apps/web/public/content/2009/`（legacy）；提交 `2009.json` + `cn408-2009/source/*.png`（19 张，约 9.7MB）；AGENTS/README/RELEASE/LOCAL_CONTENT 边界说明改写；`needs-review; verified 0/47` 状态不变，`/mock` 门禁不变。
- 同日早前的 Cloudflare Worker + R2 + cookie 门禁方案已完成开发与本地验证（worker 单测 10/10、真实 Chrome 6/6），因用户选择仓库方案而未部署；工具留在被忽略的 `local-data/deploy/`，`local-data/deploy/README.md` 仍可作为未来切换私有分发的操作手册。
- 线上部署与验收结果在后续条目补记。

## 2026-09-02 - 题包上线与线上验收（完成）

- 提交 `66f2324`（27 files：题包 20 个文件 + 7 份边界文档），Actions run `33580225575` 部署成功，`408.fytjut.com` 已可直接刷 2009 真题。
- 本地封板门禁：lint、全部 workspace typecheck、全仓 Vitest `1090/1090`、production build、`content:validate`（47 题 / 19 资产，needs-review）全部通过；推送前完成 `git status --ignored`、`git ls-files local-data output tmp`（空）、staged 密钥扫描（无命中）与 staged diff 人工复核。
- 线上验收（真实 Chrome）：桌面 1440 与移动 390 共 8/8 通过——47 题列表、Q1/Q2 作答与判定、来源解析、原卷扫描图（`/content/cn408-2009/*.png` 全 200）、刷新恢复练习、`/mock` verified 门禁保持关闭、390 无横向溢出。资源级 4xx/5xx 为零。
- 深链接文档级 404（Pages + 404.html SPA 回退）为既有设计，`/lab` 同样如此；应用渲染不受影响，已在 HANDOFF 记录，不算本次回归。
- 风险与既成事实：题库 JSON 与 19 张扫描图自本次提交起永久公开（git 历史），用户在选项中已知情确认；`/mock` 仍需 47/47 人工复核 ledger；后续年份题包首次公开须逐次授权（AGENTS.md 已写入）。

## 2026-09-02 - 2010 题包与多年份支持上线（第一阶段）

- 数据源：neville-studio/408-exam-paper 重构版 PDF（MIT，作者声明不持有试卷内容版权）+ csgraduates 答案键快照交叉。新增 extract-year-pdf.py / build-year.mjs / build-year.node-test.mjs（5/5）。
- 2010 答案键双源 40/40 一致（重构答案表“列块”转置映射 + csgraduates 快照；Q5“分歧”为 pypdf 阅读顺序假象，重构解析原文证实 B）。图示选项题 3 道（Q3 等）以题干内嵌页面图兜底，占位选项标注“见来源页”。
- 应用：installExtraContent（2010-2025 可选安装，404=未安装，失败入 contentIssues 不阻塞）、QuestionsPage 年份筛选（默认 2009）、Dashboard 年度卡片限定 2009、Knowledge 证据图限定 2009 引用、code-only e2e 拦截扩展到 content/2*.json。408-user schema 未动。
- 门禁：全仓 Vitest 97 files / 1090 tests 通过；lint/typecheck/build 通过；content:validate 双题包 PASS（各 47 题，needs-review；verified 0/47）。2011-2025 批量按同管线分批推进（每年需先下载 PDF+快照、跑双源核对门禁）。

## 2026-09-03 全量 E2E + 内容 + PWA 三波修复（实际命令与结果）

- `npm run test:e2e`（默认全量）：修复前 133/201（51 failed、17 did not run）→ 三波修复后 run D 201/201；内容重建后 run E 200/201（content-review:275 一次偶发，隔离通过）；run F（clientsClaim 后）见 HANDOFF 补记。
- 根因链（trace 取证）：installExtraContent 串行重装×16 + installPack 非幂等全量重写 + 78MB 资产无条件 17 路并行预热 → 共享渲染进程主线程饱和 → 5s 断言窗超时；双页面场景互相放大。
- 既有 bug 再发现：① installExtraContent clone-after-json（16 条假安装失败，已修）；② splitExplanations 正则丢反斜杠随 b801132 入库（611 题占位解析的真因，已修，+128 题恢复）；③ SW 无 clientsClaim（线上离线 reload 必败，已修）。
- 内容重建：build-year 增加题干图内嵌（97 题配图）与错字白名单（12 处清零）；contentVersion draft.2；content:validate 17/17。
- 巡检：直连 5/5 200（TTFB≈1s）；JPG CF HIT；JSON CF DYNAMIC；sw.js 被 CF 边缘缓存 ≤10min（部署后更新延迟，建议 CF Cache Rule Bypass，需用户操作）。
- 未解：2011/2016/2020/2022/2023 解析标记形态待逐年扩展；扫描卷年份解析需 OCR；7 题上标丢失；提示词模板化；content-review:275 高负载敏感。详见 docs/content-quality-backlog.md。
