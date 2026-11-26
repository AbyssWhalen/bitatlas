# Notes

## 2026-11-25 23:50 生产验收

- 应用 `20261125-77725ddd` 与学习包 `.5` 已按顺序发布。分别使用生产 Chrome 打开旧 v1 和新 v2 的短讲解；管理员回读、17 套题包目录核对和匿名访问均通过。默认 E2E 246/246（1 worker），新服务器构建后 E2E 14/14（2 workers）。[待复核事项和回退](docs/learning/supplements-release-2026-11-25.md)

## 2026-11-25 补充解析兼容及候选

- `aae31894` 实测不接受学习包 v2，已实现兼容表示。候选 `.5` 的 40 条补充与 1 条勘误经实际题源校验；`.3 → .5 → .6` 通过本机管理员 API 与缓存演练。初次 Node 演练在 Dexie 初始化后才安装 IndexedDB 模拟器，改为启动时预载后通过。
- lint、typecheck、Vitest 1508/1508 及定向三视口 3/3 通过。候选、回退顺序和完整门禁结果见[发布记录](docs/learning/supplements-release-2026-11-25.md)。

## 2026-11-25 第一批短讲解发布

- 22:52 管理员发布 `2026.11.25.3`，32 篇、156 卡、799 映射；目录和正文回读、匿名 HTTP、桌面及手机均通过。旧包内容保存在可发布的更高版本 `.4`。
- 运行 `learning:build`、`learning:check`、`content:validate`、lint、typecheck、全仓 Vitest（1507/1507）、本地和服务器构建。桌面及手机验证错题概念卡和知识页；三视口定向 E2E 102/102，服务器 E2E 14/14，各 1 worker。
- 内容提交 `4ec6511`。保留 117 条草稿依据，省略当前客户端白名单以外的 7 个实验直达链接。2022 Q17 已列入质量清单，待独立复核原答案页。[发布记录、摘要及回退步骤](docs/learning/article-release-2026-11-25.md)

## 2026-11-25 156 卡学习包发布完成

- 代码提交 `857af17`。134 文件/1507 单测、lint/typecheck、17 套题包校验、学习包确定性、两个新生产构建通过。三视口指定 E2E 102/102（1 worker）；服务器原双视口14/14与1366隔离夹具7/7；request-sync-browser更新菜单及基线后14/14。
- 真实 Chrome1366点击“更多→数据”正常，无遮挡/横溢0。服务器临时第三项目首轮19/21源于复用桌面账号数据，独立新夹具7/7；默认服务器配置未改。旧助手首跑3项通过后因旧导航定位器超时，修正后完整通过。保留失败，不合并为一次全通过。
- 本机 API 夹具验证发布前后旧评分及日程/当天计划不变、次日默认3新卡；更高版本回退旧80卡后，新卡评分与离线轮次同步保留。
- 生产基线读回原包一致；21:52在线快照400对象/SQLite/外键/对象和密文摘要通过，21:55:14管理员发布2026.11.25.1（摘要b66bab45…1075f）。preview156/20/799、无阻断，目录与正文再次回读一致，题包目录不变；匿名HTTP5项与Chrome1440/390通过。未生产学习、未改成员、未部署应用、未回退。
- 实际命令、版本/完整摘要、快照及回退办法见 docs/learning/card-release-2026-11-25.md；私有脚本/回执在 output/card-release-2026-11-25/。公开索引扫描内容8文件无秘密命中，两个合成夹具软提示已核对；记录另提交。

## 2026-11-25 新卡候选与题包范围裁定

- 按组长授权并入 76 张草稿，156 卡候选 `2026.11.25.1`；旧 80 卡完整对象逐字节不变，仅图模型讲解链接与独立版本变化。生成器支持显式新卡版本与来源，四科配额 39/39/36/42。
- 查看 2023 `answers-11.jpg` 证实 64/2^64 错在来源原页。发现 `validateContentPack` 要求题级版本等于包版本，立即上报；组长裁定只发新卡，2023 题包与版本规则未动。草稿与质量清单已记录。
- `learning:build`、`learning:check`、`content:validate`（17 套）、全仓 lint/typecheck 通过。本机新增 API 发布/回退夹具首跑 deviceId 非 UUID 导致 400，修正为合成 UUID 后 1/1 通过；原日志保留。完整单测与浏览器验收正在执行，尚未发布生产。

## 2026-11-25 第二次发布完成与门禁纠正

- 隔离 `git worktree add --detach output/release-execution-2026-11-25-b/checkout 491e4d0`；`node output/release-execution-2026-11-25-b/prepare.mjs` 构建服务器候选、打包/解包校验及同提交本地构建。第一次逐字节兼容检查命中 `backup.ts` 的 CRLF→LF，规范化后全文相同；保留失败与复核回执。`compare.mjs` 核对真实旧包 395／新包 399 项、数据合同和 SW 清单。候选 tar SHA-256 为 `aae31894b036728049d49b3ddb2b099752f926636c800598a021a9feee02c4e2`。
- 原门禁服务器 14/14 使用旧 dist-server，不能证明本次前端。`node node_modules/playwright/cli.js test -c output/release-execution-2026-11-25-b/playwright.config.ts` 指向新解包候选，完整 14/14（2 workers）通过。首次夹具相对 webRoot 导致启动失败，0 条执行，修正为绝对路径后完整跑一次，原日志保留。原 `test:pwa-upgrade` 现场生成 A/B 新本地构建，不受旧 dist 影响。
- `node --import tsx output/release-execution-2026-11-25-b/pwa-member.mjs`：真实旧→新→旧、合成成员与内存 SQLite；三个阶段离线 SW reload 和同一待同步操作保留，恢复同步后 1 条落库、队列 0。未用生产账号。
- 命令前缀 `node output/release-execution-2026-11-25-b/`：`run-remote.mjs baseline`、`backup`、`upload`、`install`、`activate`、`confirm` 按序通过；20:43:40 切换 `20261125-aae31894`，20:44:38 回环复核通过。400 对象新快照、399 项 Linux 清单、15 项 smoke、回环 9 项均通过；只重启应用，自动重启 0。
- `public-browser.mjs old-http old-http`／`http new-http`／`fresh anonymous` 全部通过。公网新版 9 项 HTTP、无查询 SW 双读匹配；Chrome 1440／390 两视口目标 JS、误报 0、横溢 0，截图目检通过。匿名未注册 SW 按既有设计记录，成员生产登录后权限与同步仍待维护者本人确认。未操作账号、学习包、DNS、隧道或备份配置，无回退。实际摘要、时点、门禁边界与回退见 [本轮记录](docs/server/release-2026-11-25-b.md)。

## 2026-11-25 服务器发布完成与 PWA 验收纠正

- 17:42 切换 `20261125-53fe2515`，17:48 回环复核通过；公网 HTTP 9/9、桌面/手机匿名首访 2/2，无首访账号误报。使用已安装冻结候选，无重传/重装、无生产账号操作。完整摘要、备份、操作时点、有效门禁和回退见 [发布记录](docs/server/release-2026-11-25.md)。两项登录后的正式域名确认保留给维护者。
- 命令前缀 `node output/release-execution-2026-11-25/`：`run-resume.mjs resume-check` 核新旧 395/387 项及独立备份，`backup backup-resume` 在新目录做在线快照，`activate` 原子切换，`confirm confirm-after-diagnosis` 复核；`resume-browser.mjs old-http resume-old-http` / `http resume-http` 分别核旧新公网。快照 400 对象、142,725,848 B、SQLite 正常、外键错误 0。所有原现场文件保留。
- `resume-browser.mjs fresh resume-fresh` 原失败保留；诊断发现匿名未注册 SW，而 `waitForFunction(async …)` 把 Promise 当真值。`offline-diagnose.mjs` 证实无缓存/controller、同步激活等待超时；`public-anonymous-verified.mjs fresh resume-anonymous-verified` 正确记录两视口及 `net::ERR_INTERNET_DISCONNECTED`。组长依据成员离线合同裁定匿名行为按设计保留。14:23 和恢复轮旧匿名 ready 记录无效，不能据此宣称已安装 PWA；恢复轮等待注册的进程已终止。
- `node --import tsx …/pwa-member-diagnose.mjs`：首轮在读取旧归档中已归档的重复静态文件时 ENOENT，尚未启动服务；随后按保留旧 dist 对原 manifest 逐项核验，独立目录 `pwa-member-comparison-1795600068127` 完成旧新匿名对比及成员旧→新→旧。正确 waiting/提示、87/95 项预缓存、三次离线 SW reload、同 operationId 以及最终服务端 1 条/队列 0 均通过。没有生产回退。
- 工具扩查：封板 `test:pwa-upgrade` 2/2、`server-pwa.ts`、`request-sync-browser.mjs` 没有错误谓词。准备轮 `pwa-local.mjs` 的 waiting 证明由本次对比取代；慢网 125.793 秒路径为正确同步激活等待。历史 `verify-live-wave12` 两处仍待复核，按最新范围未改、未跑旧公网验收。`ui-integrated-shell.mjs` 的 outbox/UI 非空采样改用真正 `expect.poll`；历史 shell-1 的 4 条样本存在，不能据原工具证明等待可靠。
- `node …/verify-browser-polling.mjs`：真实 Chrome 重现 async false 17ms 提前完成；修后空队列超时拒绝、450ms 延迟写入在 489ms 才匹配。`node --import tsx …/local-polling-verification.mjs` 使用封板真实候选与隔离成员，原修改后回调匹配队列和顶栏 2 条，旧新离线与最终唯一落库再验通过；回执 `local-polling-verification-1795600339072/receipt.json`。`npx eslint tools/verification/ui-integrated-shell.mjs` 与 `git diff --check` 通过。当前 `tools/verification` AST 扫描无 async waitForFunction，未重跑全仓或固定 8 worker 压测。
- 提交只逐路径纳入上述工具、发布文档、根交接及已验收的 46 题事实清单；源码工具 fix 与文档分别提交。摩卡未提交 UI 工作保留，未重新构建或发布那些在途修改。索引字节扫描结果与最终推送回执留本轮证据目录。

## 2026-11-25 发布执行验证

- 14:23 北京时间按组长重启要求停在旧服务。GCP 上新候选已上传、独立安装、核验并冻结。切换前快照包含 400 个对象，SQLite 完整性通过、外键错误数为 0；安装的 Linux 原生模块与 15 项 HTTP smoke 通过。只读复核旧指针、两服务、隧道 ready、重启计数 0 和回环状态；无生产账号操作。专用浏览器当时被脚本误标为旧 worker 已接管（更正见本文件顶部），在等待切换时依指令关闭，故保留未完成的 PWA 回执。各提交、摘要、进程和恢复入口均在 [HANDOFF 顶部](HANDOFF.md)。
- 四组与两份旧文档的补充提交正常推送；`gh run view 45559383500` 确认两个 Pages 作业均成功。对未清理的本机目录直接构建会额外复制 Git 忽略的 19 张 2009 旧图。从提交树导出的全新检出只生成 724 个文件，逐一匹配本地封板对应文件；额外 19 张不在 Git。最终公开源码树 924 个文件扫描通过。公网旧版 `/sw.js` 双读与旧包匹配，`Cache-Control: public, max-age=14400`，一次 MISS、一次 REVALIDATED，无 `Age`；回环为 `public, max-age=0`。新版公网首访和 SW 仍待切换后验证。

- `npm run typecheck` 七个 workspace 全部通过。`npm run lint` 检查 404 个文件，零错误、零警告。WSL 首次启动测试的包装命令丢失目录变量，未创建环境；改由仓库内独立脚本在项目虚拟环境运行，`unittest discover` 的 18 项用例通过，包含接收用户、主机、路径、固定主机公钥、缺失批准配置五个拒绝情形。生产备份单元仍使用原安装副本。
- 新候选 `20261125-53fe2515` 来自独立构建、打包与解包。240 个源输入仅 `docs/server/deployment.md` 改变；395/395 个清单条目核验通过，前端 336 项的路径、字节数与摘要同封板。凭据、主机与身份路径保存在受限本机目录。公网登录后权限和同步待维护者本人确认。

## 2026-11-25 服务器候选、公开审查与 PWA 回退（仅准备）

- `node output/release-candidate-2026-11-25/prepare.mjs` 复用发布白名单，独立构建、打包和逐项解包；`compare.mjs` 按实际发布清单核实旧 387 / 新 395 项。服务器 SQLite v1、内容缓存 v3、账号 v5、匿名 v4、备份 v5/v4 不变，无数据迁移。服务器候选 tar `a6ec39d945283b236ea323f0f4466b9bca19b504b055ac7d8b1ca15d7db72194`。完整依据见[发布计划](docs/server/release-plan-2026-11-25.md)与[机器回执](output/release-candidate-2026-11-25/delivery.json)。
- `node --import tsx .../pwa-local.mjs transition|slow`：首次测试地址不在应用的 HTTP 回环许可中，两个脚本启动在登录前被拒；更换为原本许可的 `127.0.0.1` 后，4349 验证旧→新→旧及待同步笔记最终一次落库，4351 验证 95 项慢链路冷装 125.793 秒后可离线重开。未放宽产品安全检查。实测源站静态响应 `public, max-age=0`、API `no-store`，无法据此断言 Cloudflare 边缘是否 HIT。
- `public-audit.mjs` / `review-signals.mjs` 审查所有拟纳入的变动与新文件；真实凭据未检出，备份机、身份路径、隧道、账号和运维标识仍待执行者脱敏。本轮不作脱敏。提交建议 85 / 200 / 13 / 47 个文件；`check-splits.mjs` 在 HEAD 投影上分别检查前两组，7/7、7/7、零类型错误；5 个不纳入文件保留原位。
- 收口边界：不重跑已通过的封板；不启动 46 题复核。不连接 GCP、不动 DNS、线上数据和凭据，不提交、推送、部署或安装依赖。公开前按实际索引再扫，若打包输入变动必须换新候选；线上 Linux 烟测、边缘摘要与公网成员流程留到执行时。

## 2026-11-25 UI 封板：行为回归与综合验证

- 权威阶段记录在 [UI 封板](docs/ui/opus-handoff.md#final-gate)，证据前缀 `$out = output/playwright/opus-ui-2026-11-22/final-gate/`。先跑 `AccountGate.restore`、`SettingsPage`、`ServerDocumentsPage`，原实现 3 文件 15 项中 5 项红灯；修改 7 个产品文件后，加上原账号、API、备份测试共 7 文件 41/41。新增 10 个用例，原断言未降低。根据本地发布清单和同摘要主 JS 确认指定旧发布也有首访误报；全程未请求线上。
- 全仓 `npm run lint -- --format json --output-file …` 查 404 文件，`npm run typecheck` 查 7 个 workspace，`npm run test` 限 3 workers 跑全量 130 文件 1407/1407。`npm run content:validate` 校验 17 套 799 题；`npm run learning:check` 校验 799 题、80 卡、20 篇短讲、102 个叶概念。学习包摘要 `f326d8c217dc1a3f14835d69c2251cee7e2e4f7e7a95ad89b2ad030eaa98cdf6`。内容校验通过并不代表已人工审核。
- 本地用 workspace 的生产构建命令直传 `--outDir` 至 `$out/dist-local-complete`；服务端用 `npm run build:server -- --outDir …` 至 `$out/dist-server`。两目录分别 743、336 个文件，预缓存 100、95 项。第一组 `lint.log`、`build-local.log` 缺结束回执，保留原件，使用新日志名和新的本地构建目录取得完整回执。`build-identity.json` 记录浏览器门禁使用的本地预览入口/主 JS/SW 与磁盘的相同摘要和服务端构建标识。
- 默认本地 `local.config.ts` 继承仓库两个 `testMatch`、三个 Chrome 项目、并发公式及原断言，独立构建后在 4349 启动 preview。服务器串行使用 4351，各视口全新数据库，避免 1366 与 1440 固定测试成员串数据。一次性完整 spec 副本只换 3 处端口、1 处夹具导入，反向替换与原文件 SHA-256 完全相同（[回执](output/playwright/opus-ui-2026-11-22/final-gate/server-adapter.json)）。PWA 使用仓库原命令和原断言，只把其动态回环监听绑定到已释放的 4349。
- [本地首轮](output/playwright/opus-ui-2026-11-22/final-gate/local-default/report.json) 33 份、243/243，自动 1 worker，三视口各 81，14.5 分钟。服务器同一份 7 条场景，三视口各 7/7，每批 1 worker，共 21/21；完整批次均无失败、重试、跳过或 flaky。`server-desktop.log` 在 4 项通过后因中断无最终回执，完整结果用新数据库的 `server-desktop-complete/`，其余是 `server-1366/`、`server-mobile/`。默认首轮没有失败，不触发失败项复跑；未跑固定 8 worker 压测。
- [PWA 2/2](output/playwright/opus-ui-2026-11-22/final-gate/pwa-upgrade/receipt.json)：A 的旧脚本在 B 服务器上 404、原浏览器缓存返回 200；两种宽度下换版前草稿、保存后升级及离线刷新均正常。四组身份/视口行为检查实测同一 `/auth/me` 401 的首访与失效效果、管理员 2 张/成员 0 张管理卡、v5 导出内容与 868 B 的小 PDF。初版补查保留；[最终补查](output/playwright/opus-ui-2026-11-22/final-gate/behavior-browser-ready/receipt.json)先等设置页完成加载，再确认成员入口不存在。原始 10 张最终截图与[机器总回执](output/playwright/opus-ui-2026-11-22/final-gate/delivery.json)可核对。所有指定门禁已跑；未访问生产、未提交或发布。

## 2026-11-25 阶段 5 实验交互态：悬停、焦点与手机流水线

- `$out` 为 `output/playwright/opus-ui-2026-11-22/stage-5-states/` 的绝对路径。工作区基线独立构建到 `dist-before`，最终交付到 `dist-delivery`（`npm run build -w @408os/web -- --outDir …`）。生产文件仅改 `lab.css`、`lab-extended.css`、`lab-exhibits.css`、`lab-exhibit-shell.css`。`survey.mjs` 实际播放 34 个实验、采 374 个状态帧；`map-palette.mjs` 按选择器分支核对 253 个引用。仅改可作用在画布外的 64 个，保留画布内 189 个及全部 333 条定义。
- `.table` 悬停背景从固定深色改为 `--paper-2`；C 组三页的同色覆盖保留，防止最短路径/虚存 `.current` 行的高优先级背景盖住悬停。分段键、实验导航和实验路由的手机底栏使用内缩的 `currentColor` 焦点线。`interact.mjs` 实际发送 Tab、指针移动和按下；`ring.mjs` 对照同一焦点线显示/隐藏时的截图像素，检查线和两侧相邻表面。修前稳定状态红灯为 204 条交互文字、575 个焦点，修后为 0/0；另有 10,936 条扩展状态文字，修后最低 4.80:1。原生过渡样本与关闭过渡后用于逐项归因的结果分别保留。[原生采样](output/playwright/opus-ui-2026-11-22/stage-5-states/interaction-summary.json) · [稳定状态归因](output/playwright/opus-ui-2026-11-22/stage-5-states/interaction-endpoint-summary.json)。
- `compare.mjs before after-delivery comparison-verified --fixtures` 对照每边 160 组、240 张图。设置页等待 17 套数据及同一缓存计数，进制页等待题包计数稳定、知识图等待连续绘制一致；初次及全部重采记录保留。最终 50,488,386 对属性、259,838,940 对像素中，22 个属性值、4 处几何、15,032 个像素不同，全部位于 390px 流水线的模式按钮区域；其余静态差异 0。交互差异另有 84 个表格行悬停、3,800 个焦点样本，逐条可查。
- `playwright test -c e2e.config.ts --workers=1` 指向 `dist-delivery`，三视口各 35/35，共 **105/105**，无重试、跳过或 flaky。`npm run lint`、`npm run typecheck`（7 个 workspace）通过。用 Vite 将当前 `apps/web/src/styles.css` 在内存中重新编译，与交付主 CSS 的 **352,053 字节**及 SHA-256 `75c55911a01bfe07d80f85cf622f472b1f6780457e5653bc11e3a41f27a7b224` 一致。原断言未改，默认全量留给组长。本阶段[逐项报告](docs/ui/opus-handoff.md#stage-5-states)与[交付回执](output/playwright/opus-ui-2026-11-22/stage-5-states/delivery.json)为接续入口。

## 2026-11-25 阶段 5 旧实验样式统一清理

- `$out` 为 `output/playwright/opus-ui-2026-11-22/stage-5-cleanup/` 的绝对路径。先保存九份目标原文和 206 份 Web 源码摘要，从当前工作区 `npm run build -w @408os/web -- --outDir "$out/dist-before"`，再用真实 Chrome 跑 `node "$out/preflight.mjs"`。34/34 个实验确有展厅画布，旧整页、临时岛均 0 匹配。按 `prune.mjs --plan` / `--write` 的 PostCSS 分支账本删除旧样式，保留活跃的结构、动态状态和不确定的级联；`tokens.css` 仅改末尾夜班岛段。
- 清理后同命令独立构建至 `dist-after`。`vitest run` 对 `LabExhibit.test.tsx`、`CpuLabPage.test.tsx` 为 18/18；两份 TSX `eslint --max-warnings=0` 为 0 错误/警告；`npm run typecheck` 七个 workspace 通过。从 `$out` 运行 `playwright test -c e2e.config.ts --workers=1`，27 份实验及跨页 spec，1440/1366/390 各 35 项，共 105/105，0 重试、失败、跳过、flaky。根 HANDOFF 已补记组长之前的 A+B 全量 243/243；不将它冒充本轮全量。
- `capture.mjs before-stable 4351` 和 `capture.mjs after-stable 4349` 采同一对冻结构建；`compare.mjs before-stable after-stable comparison` 比较解码 RGBA、所有枚举计算属性（按属性名比较，避免自定义属性枚举顺序影响）、生成伪元素及几何。首轮今日/设置的 `h1` 就绪条件过宽，导航 SVG 也可能在标签切换中取样；原报告保留。最终 160 对、58,338 对可见元素、50,050,078 对属性、240 对截图及 259,480,440 个像素均无差异。手机另有 80 对实际滚动主区的完整拼图。
- `palette.mjs` 计数 253 次引用，并在浏览器内临时追踪令牌，随后恢复。`hover.mjs` 对两份冻结构建进行独立像素采样：流水线寄存器表和磁盘调度的比较表在 1440 白昼悬停均低至 1.07:1，夜班 11.76:1。两次实测完全一致；保留原行为并交由设计侧另修。未提交、推送、部署或安装依赖。[汇总回执](output/playwright/opus-ui-2026-11-22/stage-5-cleanup/delivery.json)由 `delivery.mjs` 核对源文件与构建摘要、删留数字、真实截图、E2E、定义及悬停样本；[逐项说明](docs/ui/opus-handoff.md#stage-5-cleanup)。

## 2026-11-25 阶段 5 展厅 C 组独立页

- 四份页面的五个实验已完成。最短路径把 SVG 从算法控制中拆出，VM 把访问时间线、访问控制、阶段步进和两张表分开；CIDR 将 32 位标尺按整八位组换行，GBN 把发送槽与接收期望位置对齐，并让手机步进器先于双窗口。React 状态、计算和路由保留。详见 [UI 交接](docs/ui/opus-handoff.md#stage-5-c-pages) 与 [旧 CSS 逐条索引](docs/ui/stage-5-c-legacy-selectors.md)。
- `$out` 为 `output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/` 的绝对路径。四文件 `vitest run` 最终 **35/35**，`eslint --max-warnings=0` 检查 6 份改动 TS/TSX 为 0 错、0 警告；`npm run typecheck` 7 个 workspace 通过。`npm run build -w @408os/web -- --outDir "$out/dist-2"` 通过；`dist-1` 为修前构建。`node "$out/verify.mjs"` 复核了断言、CSS 令牌、未变的 DS 路由与 100 张 PNG 摘要。
- 本地 Chrome / Playwright，1440、1366、390 各用 1 worker、0 retries：三个原实验 spec 6+6+9=21/21；Q41 自评和 Q47 题库入口 6/6、Q41 复核视图 3/3。修前加强 Q47 手机断言的定向红灯 **2029px**；最终根滚动 **0**，两张结果表分别局部横滚 272/158px。仅补充原用例内断言，默认发现数无增量。
- `node audit.mjs visual-delivery dist-2 4349` 得到 **40/40**；`node edges.mjs interaction-verified` 验证八个悬停采样、最大安全整数、独立的 GBN 收发状态、四种 CIDR 前缀以及 VM 访问/阶段双控制。初次悬停测量首行类名匹配过窄，下一次在 StepExplorer 更新回调绘制前采过旧状态；两次尝试保留，最终按实际悬停行和已更新事件取样。外部最低对比 5.00:1、画布 5.89:1、悬停 10.39:1，手机最低 SVG 字号 15.77px。报告和截图可由 [delivery.json](output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/delivery.json) 追溯。
- 余项仅供设计复看：手机最大 32 序号的 GBN 双行画布较高，已保留全部序号并前置操作。合并后的默认全套与固定并发压力均未在本任务运行。未提交、推送、部署或安装依赖。

## 2026-11-25 阶段 5 展厅 A 组本地交付

- 11 页迁移只涉及页面呈现。公共 `LabExhibit`、各科模块导航、`StepExplorer` 与实验计算沿用原接口。`apps/web/src/styles/lab-exhibit-rollout.css` 使用语义令牌；页面计算、题目及预设的数据边界沿用原状。逐页测试表及新增三个网络 spec 的覆盖在 [UI 交接](docs/ui/opus-handoff.md#stage-5-a)，[旧选择器逐条清单](docs/ui/stage-5-a-legacy-selectors.md) 供后续统一清理。
- 以下命令的 `$out` 为项目绝对路径下的 `output/playwright/opus-ui-2026-11-22/stage-5-rollout-a`。11 页 Vitest 实际 55/55（`vitest-final.json`），`eslint` 定向检查 16 个改动的 TS/TSX 文件为 0 错误 0 警告（`lint-delivery.json`），`npm run typecheck` 的七个 workspace 通过。`npm run build -w @408os/web -- --outDir "$out/dist-delivery"` 和服务器补验使用的 `--mode server --outDir "$out/server-final"` 均通过。
- `node node_modules/@playwright/test/cli.js test --config "$out/closeout.config.ts" --workers 1` 三视口合跑 33/33（原有 24、新增 9）。手机排序页目检发现隐藏表头产生重复纵向滚动，新断言在修前读到 372px。修复仅在 `max-width:800px` 为排序表格容器设置 `position:relative`。`sort-scroll-green/` 记录同一 spec 三视口 3/3。默认 `playwright test --list` 在新增用例前后分别为 234 项和 243 项；本轮未跑默认全量或固定 8 worker 压测。
- `supplement.config.ts` 下本地 `visual` 全部、`study-flow` 知识三项及 `learning-reliability` 全部，每视口 17/17。服务器 `account-flow` 每视口 7/7，1366 使用独立测试库。原有实验、新增实验、知识与账号定向用例合计 105/105，每批 1 worker，0 跳过、0 flaky。临时交换机用例的两次失败分别为误把 P4 命中当作未命中，以及标签同时匹配输入框和结果表。修正样例与定位后，两种转发路径均在正式 spec 中覆盖。
- 最终 `audit.mjs` 用 Chrome 对 88 组页面采样，画布外 6,099 条、内 2,194 条文字全达阈值，最小触控目标 26px。44 个手机组合均无根文档额外纵向滚动。`proof-1/` 含两路由徽标 16/16 与真实学习操作形成的知识图四态。`node "$out/verify-delivery.mjs"` 重新核对测试分项、断点修复差异、8,293 条压缩的文字记录以及 150 张主 PNG 的摘要与尺寸。回执为 [delivery.json](output/playwright/opus-ui-2026-11-22/stage-5-rollout-a/delivery.json)。
- 交付时 `http://127.0.0.1:4349/` 为最终本地静态预览，服务器账号测试 fixture 和 4351 临时预览已关闭。此次只做本地实施与验收，生产环境和平台状态沿用先前的发布记录。

## 更早的记录

2026-11-24 及更早的决策、验证结果和未解问题已原文移至 [docs/history/notes-before-2026-11-25.md](docs/history/notes-before-2026-11-25.md)。
