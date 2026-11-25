# BitAtlas 服务器发布计划 · 2026-11-25

**相对 11 月 22 日发布 `20261122-532c8925`，执行候选 `20261125-53fe2515` 不需要数据迁移。** 随包手册脱敏后已在独立目录重新构建、打包并验证。下表和切换命令均指向新归档。此前准备轮的 PWA、慢网络与类型投影证据保留原目录，新旧候选的前端 336 个文件逐字节相同。实际切换与公网结果以发布记录为准。

### 1. 这次发布的字节

| 对象 | 文件 / 字节 | SHA-256 |
|---|---:|---|
| 本机旧发布回执中的归档 | 387 项，展开 9,382,828 B；压缩 4,233,685 B | `532c8925f7406d9ccfee24bb6a227d44184bcbbe25e13902949f002a998af55f` |
| 候选输入清单（含锁文件和随包手册，排除依赖、测试和私有内容） | 240 项，2,572,204 B | `56a73e89de51f1e72372428d291bdb3efdfefc07eae8c366626230392c8902b1` |
| 独立服务器前端构建的文件清单 | 336 项，8,782,550 B | `9e87fb6bd8109e620ad969af49225e524c08ba5acd4972c60b0075064204c370` |
| 候选归档 `package/bitatlas-server.tar.gz` | 395 项，展开 9,560,177 B；压缩 4,268,866 B | `53fe251573b9c2403a3f2d5e6d623ca67f530c320fb3e577f2965949e9987a7e` |

证据根：[output/release-execution-2026-11-25](../../output/release-execution-2026-11-25/)。Node 24.14.0、`npm run build:server -- --outDir <独立目录>`；编译前后输入清单相同。清单摘要按排序的 `{path,bytes,sha256}` 行的 JSON 序列化计算，和 tar 文件摘要是两种不同的值。沿用原打包白名单，仅适配构建读入与打包输出路径；原适配可精确反转。解包检查普通文件/目录、路径、重复项、成员集合、字节数和逐文件 SHA-256；395 是清单条目数，tar 还包含清单文件本身。没有题包、原图、PDF、学习记录、数据库、依赖或凭据文件。

旧版依据 [11 月 22 日部署记录](gcp-domain-2026-11-22.md)、[旧发布清单](../../output/server-implementation-2026-11-20/release-2026-11-22T03-29-06.413Z/bitatlas/release-manifest.json) 和旧 tar 的历史回执。旧 tar 本机已不在；用归档保留的源码及 `apps/web/dist-server/` 旧静态文件重验了 **387/387** 个摘要，不用 Git HEAD 充当线上树。候选 tar 解包后 **395/395**；[逐路径差异](../../output/release-execution-2026-11-25/release-diff.json) 列出相同 323、新增 66、移除 58、同路径变更 6。66/58 都是浏览器构建文件的名称更新或分块变化，不代表删除了 58 个功能。同路径的六项：`apps/web/dist-server/index.html`、`sw.js`、`docs/server/deployment.md`、`packages/domain/src/{learning,review-plan}.ts`、`packages/storage/src/account-sync.ts`。

### 2. 功能差异与原库兼容性

| 上线后能观察到的差异 | 具体实现或核对依据 |
|---|---|
| API 请求和响应正文均有 30 秒截止时间；HTML/空错误体能恢复，当前 401 仍锁账号；迟到的旧会话回复不锁新会话。同一账号重登也隔离。重试保留原操作 ID；未变化的学习包复用已校验正文。 | `apps/web/src/app/{api,account,server-learning}.ts`、`LearningProvider.tsx`；[旧版之后的 14 项浏览器复验](request-sync-2026-11-22.md)。缓存命中时仍查询目录，不宣称公网耗时收益。 |
| 首帧昼夜主题、字号、顶栏键盘导航与手机底栏；服务器顶栏显示待同步数及最近成功同步。首页按剩余任务组织，四科概念登记状态可用键盘浏览，知识图和学习记录改用四态；不改变作答判定。 | `apps/web/index.html`、`apps/web/src/components/{AppShell,ReadingPreferences,ConceptRegister,DailyTasks,KnowledgeGraph}.tsx`、`theme.ts`，`pages/{DashboardPage,KnowledgePage,MorePage}.tsx`，`app/{concept-register,useConceptRegister,useSessionSyncStatus}.ts`，`styles/{tokens,shell-v2}.css`。 |
| 题库筛选、练习、记忆卡、模考与自评共用阅读布局及可放大的图；资料和 PDF 工具条、设置、统计、复核页面按主题整理，窄屏操作/字号/对比度改善。 | `apps/web/src/pages/{QuestionsPage,PracticePage,PracticeSummaryPage,ReviewPage,MockExamPage,MockExamSessionPage,DocumentsPage,ServerDocumentsPage,PdfReaderPage,ContentReviewPage,SettingsPage,StatsPage}.tsx`、`components/{ReadingImageLightbox,SubjectShape}.tsx`、`styles/{reading-layer.css,pages/}`；[页面清单和走查](../ui/opus-handoff.md#stage-6-review)。 |
| 34 个实验（含 CPU 宿主 11 面板）移入展厅外壳，画布仍用夜班色，控制/表格随主题；移除旧岛和失效选择器，修复日间表格悬停、键盘焦点、CIDR 手机滚动及流水线手机等宽切换；GBN 手机画布长属设计复看项。 | `components/LabExhibit.tsx`、各 `apps/web/src/pages/*LabPage.tsx` 及 CPU 面板、`styles/{lab-exhibit-shell,lab-exhibit-rollout,lab,lab-extended,lab-exhibits,lab-tablet,responsive,tokens}.css`；[A/B/C、具体面板和交互记录](../ui/opus-handoff.md#stage-5-states)。 |
| 首访 401 不再显示“账号状态已改变”，已有会话失效/切换仍提醒；服务器普通成员不见两张管理员卡，服务端鉴权不变。账号导出文案与 v5 一致；小 PDF 复用本地体积单位。 | `components/{AccountGate,LearningDataTools}.tsx`、`pages/{SettingsPage,DocumentsPage,ServerDocumentsPage}.tsx`、`app/{account,format-file-size}.ts`；[封板行为证据](../ui/opus-handoff.md#final-gate)。 |
| 带包共享代码另外三处变动。 | `packages/domain/src/learning.ts` 将既有首答证据条件提取复用，并缓存北京时间 formatter；`review-plan.ts` 只导出原 `attemptQuality`；`packages/storage/src/account-sync.ts` 新增 Dexie `liveQuery` 只读待同步数，`status()` 复用原查询。包内 `docs/server/deployment.md` 补记已完成备份/归档和域名运行安排；本次不重跑那些操作。 |

| 数据或协议 | 旧 → 新 | 核对结果 |
|---|---|---|
| SQLite `PRAGMA user_version`、DDL、API、鉴权、同步 epoch、加密备份工具 | 1 → 1 | `apps/server/package.json` + 全部 11 个 `apps/server/src` 交付文件摘要逐一相等；无服务端文件增删。服务端依赖的共享源码三项变动已在上表单列。 |
| 内容库 `408-content` | Dexie v3 → v3 | `packages/storage/src/databases.ts` 全文一致，表和索引未变。 |
| 匿名 `408-user` / `408-user:<accountId>` | v4 / v5 → v4 / v5 | 同一数据定义；账号注册表 v1 的库名、`state` / `cache` 索引在两份入口 JS 中核对。没有“把匿名记录默认归入第一次登录”的迁移。 |
| 本地 / 账号导出、旧格式导入、迁移与同步写入 | v4 / v5 → v4 / v5 | `packages/storage/src/{backup,account-backup,migration,sync-schema}.ts` 和同步数据格式摘要一致。账号写入与 outbox 同事务的代码未变；新增订阅不写库。 |
| 服务器内容、锁文件和原生依赖 | 不重新发布内容 / 锁文件相同 | `package-lock.json`、打包内安装与校验器相同。此次 GCP 包内没有题包或学习包，不执行内容发布、恢复、建用户、重置 epoch、换隧道或备份计划。Git/Pages 中的公开内容变更是另一条分发路径。 |

### 3. 已安装 PWA 与两项 P2

| 项目 | 旧服务器版 | 候选服务器版 |
|---|---:|---:|
| 生成的 `precacheAndRoute` 唯一 URL／资产字节（未压缩） | 87 / 3,012,981 | 95 / 3,188,092 |
| 变化 | | +8 项 / +175,111 B；可复用相同 URL、revision 与摘要 28 项 / 431,377 B；其余 67 项 / 2,756,715 B |

[逐 URL 清单](../../output/release-execution-2026-11-25/precache.json) 来自两份真实 `sw.js` 的语法树，逐条对照发布清单，未把未预缓存的 PDF worker、PDF 字库、题包或所有 dist 文件相加。复用数是内容相同的上限，不等于实测公网流量。

`apps/web/src/app/pwa.ts` 注册 `updateViaCache: 'none'`，页面可见时按一小时间隔检查；`apps/web/vite.config.ts` 为 `prompt`、`skipWaiting: false`、`clientsClaim: true`。已装旧版的成员可继续用旧页；新 worker 下载完成后等待所有同源受控页（含独立应用窗口）关闭。先保存输入，关闭各页，再打开同一域名。离线或下载失败可继续用已装旧壳，不能要求立即激活，也不能让用户清站点数据。保留未确认发送的操作 ID 和账号，恢复网络后正常同步；客户端单份未保存的输入和已落到 IndexedDB 的笔记是不同状态。

- 封板 [2/2](../../output/playwright/opus-ui-2026-11-22/final-gate/pwa-upgrade/receipt.json)：1440/390、前后两份带标记的**本地模式**构建。旧标签能读到服务器已移除的 chunk；未保存草稿不被自动刷新，保存后新壳离线重开仍可读。它没有跑过真实生产账号、GCP、Cloudflare 或旧线上版的待同步队列。
- 本次[真实服务器构建往返](../../output/release-candidate-2026-11-25/transition-1795584151309/receipt.json)：Chrome、隔离 SQLite 和临时成员、同一回环源，旧版登录，在旧界面保存一条笔记；仅对 `sync/push` 暂返 503。旧→新、新→旧两次均观察到 waiting、旧页继续使用自己的入口、新开页面加载指定 hash；笔记及其 `operationId` 两次都相同。恢复推送后旧客户端队列 0、服务端 1 条笔记。只证明此样本；没有模拟浏览器清储存、账户超出离线期限、真实并发冲突或公网故障。
- **P2 · 边缘缓存：原 600 秒实测属于 9 月 Pages 源站，现网未重测。** 实际 Fastify 对无参数与带查询的 `/sw.js` 均返回 `200 public, max-age=0` 且内容相同；`index.html`、JS 也是 `public, max-age=0`，`/api/v1/health` 为 `no-store`，未登录目录 `401 no-store`、公开题包路径 `404 no-store`。静态插件覆盖通用响应钩子。浏览器的 `updateViaCache` 不决定边缘行为。发布者须对回环与公网**无查询** `/sw.js` 记录摘要、`Cache-Control`、`Age`、`CF-Cache-Status`，再重复一次；查询 URL 仅作辅助。正常的旧标签等待不是边缘缓存。如果公网正文仍旧而回环已新，不宣布成功；不擅改 DNS/Cache Rules。现网特定 TTL **未知**。
- **P2 · 慢网络首装：本机可重现。** [候选冷装](../../output/release-candidate-2026-11-25/slow-1795584151309/receipt.json) 用空 Chrome 配置，从注册到激活；本地调速为合计 32,000 B/s，每个响应增加 250 ms，不压缩。**125.793 秒**，95/95 个清单 URL 到达；含脚本等共 98 个请求、3,210,028 B，激活后断网可重开壳。该测试隔离 SW 安装，没有拿输入账户、下载题包或公网网络耗时混入。不是中国大陆用户的延迟预测；部署后在正常网络与实际慢链路另记安装耗时。

### 4. 上线操作与回退

操作依据[部署手册](deployment.md)及[域名与回退记录](gcp-domain-2026-11-22.md)。30 分钟为操作预算，各门禁仍须通过。2026-11-25 组长限定生产测试只能使用本机已有的专用成员凭据。原验收成员已停用，未找到可用凭据，本次执行下表的公开匿名检查；登录后权限与同步列为待维护者本人确认，既有同构建服务器 E2E 为 21/21。生产账号状态保持原值。

| 预算 | 操作与通过条件 | 停止或回退 |
|---|---|---|
| 0–4 分 | 复核分派、当前 SHA、脱敏结果、封板；读回目标主机、`readlink -f /srv/bitatlas/current` 必须为旧版本的 `bitatlas` 目录，`systemctl is-active bitatlas.service bitatlas-tunnel.service` 两者 active。记回环 health、既有备份成功收据和空间；按手册做切换前 SQLite online backup + 不可变文件核验、加密到新目录并验证收据。不得把正在写的 SQLite 文件直接复制冒充快照。 | 基线、快照、空间、运行时或回退目录不符即停止，不切流。备份/传输慢则顺延。 |
| 4–9 分 | 只上传已审核 tar 到**新的**暂存位置；本机与目标 `sha256sum` 均须等于上表 archive 摘要。检查成员为 `bitatlas/` 内普通文件/目录且无链接、绝对路径、`..`、重复项，解到从未存在的 `/srv/bitatlas/releases/20261125-53fe2515/`。 | 摘要、类型或新目录检查失败，保留现场；旧服务继续。不能用 Windows `node_modules`、旧候选或 Git HEAD 临时代替。 |
| 9–17 分 | 在新 `…/bitatlas` 目录，用已有应用专属 Node 24（至少 24.12.0）：`node tools/verification/install-server.mjs`，然后 `node --import tsx tools/verification/verify-server-release.mjs`。检查逐文件摘要、SQLite 原生加载/读写，Linux 4327 临时 smoke 非生产库；缺失 JS/API、私有路径、知识直链须分别返回预期码。若端口已占先鉴别，不抢占。 | 非零退出、原生模块失败、未知安装钩子或 4327 不可用均不切换。不覆盖失败目录，不初始化生产账号，不重装全局依赖。 |
| 17–20 分 | 确认新旧发布均可读、运行用户可遍历。使用下方同文件系统的临时链接原子替换 `current`，只重启 `bitatlas.service`；`BITATLAS_DATA` 不变。检查 `is-active`、回环 200、无连续重启，入口和 SW 摘要对应候选、连接器 ready。 | 链接切换后任一检查失败，立即以同一操作切回旧目录并重启，复核旧入口/SW 摘要。 |
| 20–30 分 | 公网同一正式域名检查 HTTPS、根及知识查询直链 200、health 200、匿名目录与私有 API 401、`/content/2009.json` 404；重复无查询 SW 的摘要与响应头。新浏览器首访无误报，受邀测试成员登录、读资料、同步，成员不见后台管理卡；仅用专用测试账号，不改学习者数据。已安装的测试客户端检查提示、保存后全关重开、待同步回零。记录时点、版本、检查值；不记录密码、Cookie 或授权头。 | 回环错误按代码回退；公网错误先区分隧道、边缘缓存与 worker 等待。成员同步/权限异常或确认送错版本，先回切、复核并报告，旧包也不要重复初始化。 |

执行者从受保护的本机配置取得主机别名、身份和凭据，不把原值放入仓库/命令历史。在目标 shell（有应用发布权限，GNU/Linux）切换；只接受这两个经核验的不可变目标，`EXPECTED` 与 `TARGET` 的指向必须匹配发布步骤：

```sh
set -eu
BASE=/srv/bitatlas
OLD="$BASE/releases/20261122-532c8925/bitatlas"
NEW="$BASE/releases/20261125-53fe2515/bitatlas"
switch_release() {
  EXPECTED=$1; TARGET=$2
  test "$(readlink -f "$BASE/current")" = "$EXPECTED"
  test -r "$TARGET/release-manifest.json"
  STAGE="$BASE/.current-next-$(date +%s)-$$"
  ln -s -- "$TARGET" "$STAGE"
  mv -T -- "$STAGE" "$BASE/current"
  test "$(readlink -f "$BASE/current")" = "$TARGET"
  systemctl restart bitatlas.service
}
# 上线时执行这一行：
switch_release "$OLD" "$NEW"
# 如需代码回退，重新核实 current 指向 NEW，在同一函数定义下执行：
# switch_release "$NEW" "$OLD"
```

Linux 生产环境不可在两个 `release` 间共享可变 `node_modules`。回退后旧 URL / SW 摘要自旧清单核对，回环与公网重验；旧版会带回首访误报等已知缺陷。**正常回退绝不恢复快照**，否则会丢掉快照之后服务端已经确认的记录。确有损坏时停止写入，另立事件，获维护者批准后将已核验密文恢复到**新数据目录**，核对记录与文件摘要，再决定切数据；恢复会更换 sync epoch、撤销会话和旧邀请码。客户端未同步记录不能弥补所有已确认记录。DNS 回 Pages 是最后的入口灾备，不能承接账号 API、服务器资料或服务器队列；需依据独立 DNS 回退记录和批准，不属于上述代码回退。

Linux 安装按上次通过的做法：**专用服务用户**只在全新 release 中安装，使用专属 Node 的 `bin` 和应用 npm 缓存；显式将 `npm_execpath` 指到此运行时的 `npm-cli.js`（可用 `readlink -f "$NODE_BINDIR/npm"` 核对），运行安装器及验证器。接纳 `install-receipt.json` 与 `runtime-smoke-receipt.json` 的前提是两者 `passed=true`、`platform=linux`。然后冻结该 release 的代码属主/写权限，保持服务用户可读；不改数据目录的属主。旧 `install-candidate.py` 写死了当时后端文件差异，**不可直接重放**。

现场无查询正文核对示例：从 `release-manifest.json` 取出 `apps/web/dist-server/index.html` 和 `apps/web/dist-server/sw.js` 的预期 SHA，用 `curl -fsS "$ORIGIN/sw.js" | sha256sum`（启用 `pipefail`）、`curl -fsSI "$ORIGIN/sw.js"`，分别在回环和正式域名做两次。本候选 SW 为 `f89c546ae6023b7a6c82d83c450fa9393bddf9fd93372ef98576c755b4df80f2`，入口为 `77cf8e84578e2e4ceb3dc6d2f9357c311f0c49d27c56c6a4189ec854f76896d7`。记录新发布指针、时间、状态码、摘要和故障处置，不归档私有响应正文或请求授权头。

### 5. 公开仓库：扫描结果与推送阻断

准备轮从 `adceb7a42431999d6ba5312eefb171bea5b2abf8` 起列出 124 项跟踪变动及 226 个新文件，初审 345 项。[初审目录](../../output/release-candidate-2026-11-25/audit-final/paths.json)。执行轮将定稿的 `docs/ui/next-phase-proposal-2026-11-25.md` 与 `docs/learning/coverage-matrix-2026-11-25.{md,tsv}` 加入第 4 组，四组合计 348 项。两个 `.pyc` 已由 `__pycache__/` 规则忽略。逐组暂存清单位于本计划第 6 节。

初审发现的真实凭据、私钥、token 和 age 解密身份均为 0，基础设施标识有命中。[初审分类](../../output/release-candidate-2026-11-25/audit-final/review.json) 仅记录路径、行号和类别。执行轮按下表逐项脱敏并扫描实际暂存字节，范围包括密钥格式和文件名、云平台 token、认证头、含凭据 URL、测试输入、个人路径和实际运维标识。

| 推送前处置 | 确认位置与可读替换 |
|---|---|
| 真实备份机公网地址、SSH 接收用户、身份/known-hosts 具体位置 | `docs/server/{independent-backup-2026-11-22,storage-archive-2026-11-22}.md`；`tools/operations/backup/{run-backup.py,test_run.py,bitatlas-backup.service}`。文档写 `<backup-user>@<backup-host>`、`<identity-path>`、`<known-hosts-file>`；测试用 `.invalid` 或文档专用地址。单元提交为模板，真实 `LoadCredential` 源路径通过已受保护的本机部署配置渲染。 |
| `run-backup.py` 防止投错接收端的检查 | **不能删除检查，也不能把被检查的 `config["host"]` 本身当白名单**。真实批准的目的地与已固定的主机公钥保存在独立的受保护配置；公开版仍精确核对账号、目的地及已固定的 known-hosts 路径，缺失或不符即失败。保留错误主机/错误路径拒绝用例，用假值覆盖成功路径。执行变更后用项目限定 Python 环境跑 `tools/operations/backup` 的 `test_*.py`；不得因此改动线上现有定时器或密钥。 |
| 当前隧道 ID / DNS 目标、token 文件位置、GCP 实例标识、管理员登录名与账号标识 | `docs/server/{gcp-deployment-2026-11-21,gcp-domain-2026-11-22,independent-backup-2026-11-22,deployment}.md`、`docs/server-capacity-2026-11-20.md`、`HANDOFF.md`、`notes.md`。改为 `<tunnel-id>`、`<tunnel-target>`、`<credential-file>`、`<instance>`、`<admin-login>`、`<account-id>`；保留正式入口、公用运行机制、服务名、内网探测约定及“已验证”事实。历史操作员 SSH 别名也替换，原历史提交不改写。 |
| 个人工作目录和机器绝对路径 | 上述两份根交接，`docs/server/{opus-review-response-2026-11-22,parallel-ui-work-2026-11-22,request-sync-2026-11-22,storage-archive-2026-11-22}.md`，`docs/ui/{opus-handoff,stage-1-verification-2026-11-23,stage-2-theme-verification-2026-11-24}.md`，`tools/ui/README.md`、`tools/verification/ui-style-report.mjs`。文档改仓库相对路径/`<workspace>`；生成器从项目根计算路径。通用备份文件名与专用用户可能同名，不机械全局替换。 |

执行轮将实际运维参数存入经 `git check-ignore` 和 ACL 验证的 `local-data/ops/`。目的地策略由 systemd 从独立受限文件传入，精确校验用户、主机、known-hosts 路径及其 SHA-256。项目 Linux 虚拟环境备份测试 18/18。逐组比对 `git diff --cached --name-only -z` 与白名单，扫描 `git show :<path>` 的索引字节，回执只列类别和路径；推送前复核最终树与 Pages 产物。

GCP 使用独立的私有服务器包。脱敏只改变 240 个候选输入中的 `docs/server/deployment.md`，因此准备候选已由独立重新打包的 `20261125-53fe2515` 取代。395 个清单条目均已解包核验。[解包回执](../../output/release-execution-2026-11-25/package/archive-verification.json)。

`.github/workflows/deploy.yml` 未改；推 `main` 触发 Node 22 `npm ci`、`npm run build`、上传 `apps/web/dist` 到公开 Pages（本地模式，正式域名的 DNS 回退目标）。本地 `git ls-tree HEAD apps/web/public/content/` 已追踪 2009–2025 全部 17 年；本次变更既有 17 个 JSON，并增加 `learning.json`（`2026.11.20.2`，80 卡、20 篇讲解）及 `content/learning/` 源，不新增考试年份。现有公开范围见 [公开发布检查](../RELEASE.md)；不得夹带未授权年份/来源材料。Pages 不能做账号服务回退。CI 未在本轮触发，Node 22/Linux 上本轮 `npm ci` 和 Pages 发布结果未知；推送后单独验收这一条流水线。没有修改 CI、重新安装依赖或查询远端。

### 6. 提交顺序与复验

四组是**一次最终推送**的本地提交顺序；不可逐组推送 `main` 触发 Pages。每组链接都是完整的逐文件清单，不是通配符。推送时不得使用不受限制的 `git add .`。组 1 中的 v4/v5 是相对 **Git HEAD** 补录已经上线的演进，不代表本次 GCP 需要从 v4 迁到 v5。

| 顺序与消息草稿 | 范围 | 中间状态 |
|---|---|---|
| `feat: add invited accounts and versioned learning data` | [85 个文件](../../output/release-execution-2026-11-25/commit-1.txt)：server 与共享 domain/storage/schema 的实现和单测、依赖/锁文件、生成器、学习包源、既有年份 JSON 和学习 JSON | 投影 HEAD 加本组后真实 `npm run typecheck`：7/7 workspace、0 错误。此时界面仍是旧 Git 版本，不作为完整产品发布。 |
| `feat: redesign the study interface and interactive labs` | [200 个文件](../../output/release-execution-2026-11-25/commit-2.txt)：网页接入学习/账号、同步和资料；页面组件、主题、实验、UI/E2E 与发布验证工具一并纳入 | 再加本组：7/7、0 错误。账号适配和呈现共享 `app/` 与页面接口，没有把两者拆成不能编译的快照。 |
| `chore: add encrypted backup and archive operations` | [13 个文件](../../output/release-execution-2026-11-25/commit-3.txt)：备份、接收、保留、归档恢复及相应用例/服务模板 | 没有进入 TS 编译的文件，继承组 2 类型结果；脱敏后另外跑 Python 测试，不能用类型检查代替。 |
| `docs: record release gates and operating procedures` | [50 个文件](../../output/release-execution-2026-11-25/commit-4.txt)：项目规则、`.gitignore`、说明、发布/学习/UI/运维证据与本计划 | 文档/忽略规则不改变 TS 结果；四组合齐才能从该树完整打包。逐路径复核公开材料和根交接。 |

中间检查用 [check-splits.mjs](../../output/release-candidate-2026-11-25/check-splits.mjs) 从 **HEAD 的 Git blob** 重建类型检查所需的文件，按组叠加当前内容；投影里的 `@408os/*` 解析到投影自己的源码，三方依赖复用本机已安装版本。未创建提交、未改索引。[组 1 回执](../../output/release-candidate-2026-11-25/split-1.json)、[组 2 回执](../../output/release-candidate-2026-11-25/split-2.json)。这是类型证据，不是每个中间提交单独完成 E2E 或可独立上线的证明。

候选 Web 全部 **336/336** 个静态文件与[封板服务器构建](../../output/playwright/opus-ui-2026-11-22/final-gate/delivery.json)逐字节一致。沿用同一工作树封板：lint 404 文件零错误/警告；7 workspace 类型检查通过；Vitest 130 文件 1407/1407；本地 E2E 243/243（默认 1 worker），服务器三视口 21/21，PWA 2/2；内容 17 套/799 题与学习包确定性通过。固定 8 worker 压力不是本次门禁；不把历史定向结果当作全量。正式 Linux 安装、Cloudflare 边缘和公网成员验收留给实际发布。46 道答案独立复核已后移，本轮未开展。
