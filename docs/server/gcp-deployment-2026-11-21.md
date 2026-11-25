# GCP 部署与资料迁出验收

**后续状态：2026-11-22 已修复知识直链并接通正式域名，GCP 完整 14 场景已通过。当前版本、账号状态和公网验收见 [正式域名验收](gcp-domain-2026-11-22.md)。本报告以下数字保留 2026-11-21 的历史时点，不代表现在仍未上线。**

2026-11-21：**服务器安装、鉴权内容、真实备份恢复、目标机容量测试和加密历史归档已完成；公网入口尚未接通。** 新版只监听 GCP 回环地址，原域名和旧站未切换。不能把本报告当作公开上线或全项无遗留的证明。

机器可读入口：[交付回执](../../output/gcp-deployment-2026-11-21/delivery-receipt.json)。本阶段证据目录为 `output/gcp-deployment-2026-11-21/`；此前[服务器本地验收](acceptance-2026-11-20.md)保留原时点结果。

## 当前运行与版本

| 项目 | 实际状态 |
| --- | --- |
| 目标机 | Debian 12 / x86_64，GCP `小型通用机型`，`<instance-zone>` |
| 服务 | `bitatlas.service` enabled/active；`127.0.0.1:4310` |
| 运行身份与限额 | 专用用户 `bitatlas`；代码 root 所有，数据目录可写；MemoryMax 384 MiB |
| 当前版本 | `/srv/bitatlas/releases/20261121-f0e75c06/bitatlas`，`/srv/bitatlas/current` 指向此处 |
| 回退版本 | `/srv/bitatlas/releases/20261121-da9d8b63/bitatlas`，保留 |
| 数据 | `/var/lib/bitatlas`；1 个管理员、18 个内容包、400 个对象，0 条学习实体 |
| 专用工具 | Node v24.14.0、age 1.3.2；官方归档摘要已核对 |
| 公网 | Origin 配置为 `https://408.fytjut.com`，尚未创建新隧道或更改 DNS；没有安装 cloudflared |

当前[发布包](../../output/server-implementation-2026-11-20/release-2026-11-20T18-18-58.215Z/bitatlas-server.tar.gz)为 4,233,608 bytes，包含 387 文件、解包 9,382,570 bytes。SHA256：`f0e75c06e1e097b63be5b24738e5ca6b4dfc7980142fb4d7beab46bd9fbbf5fe`。Linux 独立安装了 95 个生产依赖，原生 SQLite、TypeScript、HTTP 隔离及清单校验通过。包内不含题包、PDF、账号数据或密钥。

2026-11-21 12:31（北京时间）[终态核对](../../output/gcp-deployment-2026-11-21/final-server-status.json)：387 文件摘要一致，数据库完整性为 `ok`，正式库无测试账号，服务 0 重启，cgroup 内存采样 60,493,824 bytes。此为闲时采样，负载数据见下文。[临时服务与转发收尾](../../output/gcp-deployment-2026-11-21/helper-closeout.json)确认测试服务停止、四个验证端口释放，正式服务仍运行。

Windows 默认 SSH 配置因 ACL 拒绝读取；本次用显式 `-F NUL`、已有 SSH 身份、`IdentitiesOnly=yes`、`BatchMode=yes` 和 `StrictHostKeyChecking=yes` 连接，没有改共享配置或主机校验。既有 443 服务和其他站点保留；没有新建收费资源、改变网络计费档位、修改 CI 或提交/推送代码。

## 内容与学习体验

现有闭环包含：固定每日任务、跨年概念、练习首答与提示证据、错因、关联重练、80 张记忆卡及有上限重试、20 篇短讲解、账号同步、冲突原文保留、备份 v5 和兼容迁移。

- 17 年题包覆盖 2009–2025 年，共 799 题、102 个叶概念、80 卡；加上学习包共 18 包，完整回读与输入一致。
- 366 张唯一图片及 34 份 PDF，共 400 对象。通过 GCP 实际鉴权 HTTP 完整读取 138,354,373 bytes，全部 SHA256 一致。
- 34 份 PDF 共 70,605,800 bytes；HEAD、Range 与匿名拒绝通过。重构来源按实际类型标注。
- 80 道缺文字解析、46 道缺历史答案对照仍保留局部缺损状态。人工审核率为 0%，完整映射与自动化验收不提升正式审核状态。正式模考门槛和 Q44 边界保持。

证据：[题包回读](../../output/gcp-deployment-2026-11-21/content-publish-receipt.json)、[PDF 发布](../../output/gcp-deployment-2026-11-21/pdf-publish-receipt.json)、[全部对象回读](../../output/gcp-deployment-2026-11-21/objects-readback-receipt.json)。

远程首次验收发现登录后等待全部题包串行下载，首页长期停在载入状态。已改为先恢复本地学习记录并显示页面，再以最多 3 路补齐内容；只读取一次安装清单，请求与安装绑定起始账号，切换账号后停止旧写入。添加 6 个反例并通过下列回归。

## 测试结果与限制

| 验证 | 实际结果 |
| --- | --- |
| lint / typecheck | 当前启动修复版本通过 |
| Vitest | 115 文件 / 1305 测试，3 workers，47.85 秒 |
| production build | 本地模式和服务器模式均通过 |
| 本地完整 E2E | 234/234，2 workers，377.77 秒，0 skipped / flaky |
| 服务器版本机完整 E2E | 14/14，2 workers，97.44 秒；含补强后的 PDF 实际渲染断言 |
| GCP 浏览器定向验收 | 1440×900 / 390×844，通过练习、笔记、卡片离线重开、同步和退出锁定 |
| GCP PDF 补验 | 两视口在线/离线均等待渲染结束并检查非白像素；0 页面错误、0 横向溢出 |
| GCP 30 分钟负载 | 20 用户、5 路 PDF；1803.33 秒、35,951 请求、0 失败 |
| 固定 8 workers 压力 | 最近历史结果 231/234，3 个超时；本次未重复该压力门禁 |
| GCP 原 14 场景完整门禁 | **未通过**；定向成功不替代完整结果 |

GCP 负载在独立测试数据库运行，API p95 为 41.76 ms、PDF p95 为 110.58 ms，后端 RSS 峰值 158.14 MiB，正式库无测试账号。新旧包的后端/领域/锁文件摘要一致，负载证据适用于当前服务代码。测试不包含公网 TLS、中国网络时延、真实浏览器 PDF 绘制或同时密码哈希的峰值。

GCP 定向浏览器验收通过 SSH 转发访问隔离测试服务。首页首次出现耗时为桌面 3.439 秒、手机 1.370 秒；首次离线准备分别 53.232 秒和 48.018 秒。PDF 最初只有 canvas 可见断言，目检发现仍在渲染，随后补验渲染结束及实际墨色像素：桌面在线/离线各 111,288，手机各 19,552。已目检手机离线页；不宣称所有页面逐张检查。

完整远程 14 场景首轮 0/14，均阻塞在首页；修复后首轮又有测试服务尚未 ready 的连接失败及离线预缓存尚未完成。再一轮错误地在登录前等待仅登录后注册的 service worker，已终止并记录原因。没有放宽原超时或删用例宣称远程门禁通过。最初 PDF 跨境完整下载超时，单次分段样本约 40 KiB/s，不能泛化成公网访问速度。

证据：[单测日志](../../output/gcp-deployment-2026-11-21/vitest-full-startup.log)、[本地 E2E](../../output/gcp-deployment-2026-11-21/local-e2e-report.json)、[服务器本机 E2E](../../output/gcp-deployment-2026-11-21/server-local-report-rendered.json)、[GCP 浏览器](../../output/gcp-deployment-2026-11-21/gcp-browser-smoke-receipt.json)、[PDF 渲染](../../output/gcp-deployment-2026-11-21/pdf-render-receipt.json)、[GCP 负载](../../output/gcp-deployment-2026-11-21/gcp-load-report.json)。此前 release 10/10、importer 36/36、content 17/17、learning 确定性及双构建 PWA 证据仍在原验收中；这次启动修复未改变这些输入，没有重复重建它们。

## 备份与历史归档

正式生产一致快照：`/var/lib/bitatlas-backups/initial-20261121/snapshot.tar.age`，142,549,672 bytes，SHA256 `bf4666f44af8af03da50ac7184289810dc9c06b116fd2e6c7fa396665c00dc00`。已用 SFTP 完整下载、校验、实际解密并在本机受限目录隔离恢复：

- 1 账号、18 包、400 对象和 0 学习实体均保真，400 个对象摘要全部一致。
- 34 份 PDF Range、恢复后管理员登录、epoch 轮换、旧会话清除、匿名拒绝及损坏备份拒绝通过。
- 没有覆盖生产库，解密私钥未上传主服务器。最初两次 `dd` 下载长度不符均拒绝使用，失败记录保留。

历史来源清单为 20,585 文件 / 5,622,133,360 bytes；按 SHA256 去重后 13,652 对象 / 3,103,410,275 bytes，加密为 56 块 / 2,852,454,904 bytes。全部上传至 `/srv/bitatlas/archives/history-20261121`，最终再次核对全部加密摘要，目录 0700、文件 0600，无 pending 或意外文件。取回 2 块进行解密恢复，879 对象 / 1,047,859 bytes 核验成功，12 文件恢复到原相对路径。**这只是抽样恢复，未做整个历史全集的完整落盘恢复，本机历史原文未删除。**

管理员凭据、有效快照和解密身份保存在经 Git 忽略并限制 ACL 的本机运维目录。管理员凭据用于账号交接，解密身份仅用于可信机器上的恢复。该阶段尚未配置独立备份机器和自动调度。

证据：[生产恢复](../../output/gcp-deployment-2026-11-21/production-restore-receipt.json)、[历史上传](../../output/gcp-deployment-2026-11-21/history-transfer-receipt.json)、[最终远端校验](../../output/gcp-deployment-2026-11-21/history-final-verification.json)、[历史抽样恢复](../../output/gcp-deployment-2026-11-21/history-recovery-sample-receipt.json)。

## 清理与本机空间

2026-11-21 13:17（北京时间）完成新的精确回收：6 项、740 文件、232,245,532 bytes。范围仅为 `apps/web/dist`、根 `.vite/.vite-temp`、Web `.vite-temp`、失败下载 `snapshot.tar.age.pending` 及 `corrupt-test.age`。原路径不存在，回收站载荷/元数据核对成功，源码、来源、有效备份、历史证据和既有回收记录保持。没有永久删除、清空回收站或声明物理空间释放；不要重跑本轮或旧清理脚本。

清理后项目逻辑占用 9,048,646,764 bytes（9.05 GB / 8.43 GiB），其中 `output` 7,491,162,763 bytes、`local-data` 1,020,393,436 bytes。跳过 16 个链接，0 读取失败；不含浏览器用户目录、全局工具及回收站，之后少量交付文档不包含在此时点统计中。**约 1GB 目标尚未达成。** 历史归档清单不涵盖本次新增的全部验收证据。

证据：[清理回执](../../output/gcp-deployment-2026-11-21/cleanup-receipt.json)、[恢复与保护核验](../../output/gcp-deployment-2026-11-21/cleanup-verification.json)、[空间盘点](../../output/gcp-deployment-2026-11-21/storage-scan.json)、[只读空间报告](../../output/gcp-deployment-2026-11-21/storage-report.html)。

## 未完成项与接续

1. **公网接入。** 原 443 被其他服务占用，不能覆盖。拟为 BitAtlas 单独建立 Cloudflare Tunnel，把 `408.fytjut.com` 同源转到 `http://127.0.0.1:4310`，再做 HTTPS、桌面/手机、离线、账号与资料验收。此前只读检查仅发现其他机器的 `huawei` 隧道。Computer Use 的 `confirmations.md` 要求创建 “API/OAuth keys or other persistent access” 时进行操作时确认；用户休息期间按其“受阻先跳过”要求保留此步骤，没有创建隧道或 DNS。
2. **远程完整门禁。** 先按实际生命周期修正夹具 readiness 和离线准备顺序，保留原失败证据；不能只扩大超时或以定向 smoke 代替 14 场景结果。公网路由接通后再验证最终用户路径。
3. **独立备份与本机体积。** 确定独立备份目的地和访问授权，配置加密调度与恢复；补齐本轮新证据的归档清单，完成整批恢复后另列本机副本处置清单。归档不是永久删除授权。
4. **既有质量债。** 固定 8 workers 的 3 个超时、[fast-uri 3.1.5 的 1 个 high 依赖节点](dependency-assessment.md)、内容缺损与人工审核仍开放；没有强制批量升级或默认接受风险。

下一会话先读本报告、交付回执和 HANDOFF 顶部。无需再初始化管理员、安装运行时、重传 56 块历史、重跑常规已过门禁或回收脚本。Git HEAD 仍为 `adceb7a42431999d6ba5312eefb171bea5b2abf8`，改动尚未暂存、提交或推送；保持已有未提交成果。
