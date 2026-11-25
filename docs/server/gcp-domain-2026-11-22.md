# 正式域名接入与路由修复验收

2026-11-22（北京时间）：`408.fytjut.com` 已从原 GitHub Pages 接到 GCP 的邀请制 BitAtlas。正式 HTTPS 的页面、账号、学习同步和资料阅读已验证；旧 Pages 与上一服务器发布保留回退。没有修改 GitHub CI、提交或推送代码。

当前证据目录：`output/gcp-domain-resume-2026-11-22/`；机器可读入口：[交付回执](../../output/gcp-domain-resume-2026-11-22/delivery-receipt.json)。暂停前失败证据保留于 `output/gcp-domain-2026-11-22/`，前一阶段的内容发布、备份恢复及历史归档见 [GCP 部署报告](gcp-deployment-2026-11-21.md)。

## 运行状态与入口

| 项目 | 当前实际状态 |
| --- | --- |
| 正式入口 | `https://408.fytjut.com`；应用壳可匿名打开，题包/PDF/学习记录需登录 |
| 发布 | `/srv/bitatlas/releases/20261122-532c8925/bitatlas`，`current` 指向此处 |
| 上一发布 | `/srv/bitatlas/releases/20261121-f0e75c06/bitatlas`，保留 |
| 应用 | `bitatlas.service` enabled/active，`127.0.0.1:4310` |
| 连接器 | `bitatlas-tunnel.service` enabled/active，专用 cloudflared 2026.11.1，HTTP/2 |
| 隧道 | `<tunnel-name>`，`<tunnel-id>`，4 个健康连接 |
| DNS | 原 `408` CNAME 原位改为 `<tunnel-target>`，代理开启、TTL 自动 |
| 路由 | `408.fytjut.com` 的所有路径转到 `http://127.0.0.1:4310` |
| 密钥 | 只在 GCP `<credential-file>`，root:root / 0600；通过 systemd LoadCredential 注入 |
| 正式库 | 18 个内容包、400 个文件对象；1 个活跃管理员、3 个已停用验收成员 |

11:44:30 激活新发布；约 11:56 切 DNS，11:56:58 正式 HTTPS 核验成功。隧道向外连接，不占用现有 443，不修改其他站点和 `huawei` 隧道。没有创建收费资源。连接凭据只经过内存、回环一次性管道和 SSH 标准输入，本机无凭据文件，命令行与日志不含 token。

新包 4,233,685 bytes、387 文件，SHA256 `532c8925f7406d9ccfee24bb6a227d44184bcbbe25e13902949f002a998af55f`。相对上一发布只变更 `apps/server/src/app.ts` 和 `tools/verification/verify-server-release.mjs`；Web 资源、数据库 schema、领域代码和锁文件未变。Linux 独立安装、原生 SQLite 读写、逐文件清单、真实 HTTP smoke 已通过。

最终 [服务核对](../../output/gcp-domain-resume-2026-11-22/final-server-status.json)再次验证 387 文件摘要与数据库完整性，两服务均 enabled/active、自动重启计数 0；独立测试服务 inactive、本机转发已退出。该时点应用/隧道 cgroup 内存分别 94,564,352 / 21,856,256 bytes，为闲时采样，不是容量测试。

## 修复与门禁

知识链接 `/knowledge?subject=computer-organization&node=co.memory.cache` 在没有旧 service worker 接管时曾返回 JSON 404。原因是静态资源后缀正则检查了整个 URL，将查询参数里的 `.cache` 当作文件扩展名。现在仅按 URL pathname 判断，GET/HEAD 知识直链返回真实应用壳，缺失资源、API、私有静态内容仍拒绝。

| 验证 | 结果与证据 |
| --- | --- |
| 新增反例 | 5 项；修改前 4 项失败，修后通过；含 GET/HEAD、带点 query、缺失资源、API/私有内容及写请求 |
| 服务端单测 | 3 文件 / 23 项通过 |
| 全仓 Vitest | 115 文件 / 1310 项，3 workers，62.37 秒，通过 |
| lint / typecheck / server build | 通过 |
| Linux 部署 smoke | 新包独立安装后通过，包含知识直链与缺失资产反例 |
| GCP 原完整浏览器门禁 | 14/14，2 workers，173.367 秒，0 skipped / flaky；原 60 秒用例预算不变 |
| 公网 HTTP | health、首页、知识直链 200；匿名题包/文件 401；旧静态题包 404；API `no-store` |
| 公网桌面学习 | 实际登录、题目/笔记、复盘、知识直链、卡片离线重开、服务器同步、退出锁定通过 |
| 公网手机学习 | 实际页面生成邀请码与注册、练习/笔记、复盘、知识、卡片、同步和退出锁定通过 |
| 公网 PDF | 34 份列表；真实最小 PDF 在线/离线均完成绘制，桌面 111,288 / 手机 60,927 墨色像素；页面异常 0、横溢 0 |
| 原真实旧 PWA | 两个已有隔离配置均保留旧库、更新到新登录页并可离线重开；未清缓存、未强行 skipWaiting |

GCP 完整门禁使用独立库与测试内容副本，不把测试账号写到正式库。公网验收需要真实正式入口，因此创建三个专用成员；均已停用并撤销会话，记录保留。没有将测试笔记或作答记在管理员名下；实际管理员登录生成了当天一条正常每日计划。上线验收时管理员凭据未改。随后依维护者明确要求，原账号已改名为 `<admin-login>` 并更换密码；账号 ID 和业务数据保持，旧会话已撤销，新旧凭据正反例通过。当前凭据仍仅保存在原受限 `<administrator-credentials-file>`，回执见 [管理员维护](../../output/gcp-admin-change-2026-11-22/receipt.json)。

公网桌面结果见 [public-learning.json](../../output/gcp-domain-resume-2026-11-22/public-learning.json)。手机结果见 [public-mobile-browser.json](../../output/gcp-domain-resume-2026-11-22/public-mobile-browser.json)：七个产品流程全部通过，但收尾“已停用”文案的精确匹配失败，整轮文件如实保留 `passed:false`。随后通过独立 [浏览器收尾核对](../../output/gcp-domain-resume-2026-11-22/public-closeout.json)及服务端只读查询证实三个账号均停用；没有把该失败文件改成成功。

## 保留的失败与证据边界

- 暂停前 GCP 完整门禁 12/14，两项知识直链 404；修复后独立重跑为 14/14，旧证据不覆盖。
- 恢复轮初次运行器将打包回执命名为 `package.json`，Playwright 在加载配置时误判模块边界；改回 `release-package-receipt.json` 后执行原完整门禁。第一次尚未启动测试，日志保留。
- 激活脚本初次只读预检用错表名，在修改发布指针前失败；改为实际 `entities` 表后通过。没有恢复/覆盖生产库。
- 公网脚本注册请求一次 30 秒超时，但服务器已建立成员；按用户名核对后停用。独立 APIRequestContext 登录也有一次 30 秒超时，Python 请求收到 Cloudflare 403；尚未证明这些超时的完整根因。真实浏览器表单路径通过，不据此关闭 Cloudflare 防护或断言公网毫无波动。
- 首次桌面 PWA 测试关页后立即新建页面仍加载旧版，仍显示“新版本已准备好”；完整关闭该测试浏览器后原配置重新打开成功。手机同轮通过。两份旧库均为空学习记录，摘要与版本保持一致；非空迁移保真证据来自此前专门迁移测试，不能用本次空库结果替代。
- 旧 PWA 保留其既有缓存，包括曾下载的旧题包；本轮没有清除用户浏览器内容。新服务器没有匿名题包下载路径。
- 本地 234/234、服务器本机 14/14、release/importer/content/learning、固定 8 workers 及 30 分钟容量结果沿用各自历史版本时点。本轮仅后端路由与 smoke 改变，没有宣称重跑全部历史门禁或当前版本 30 分钟容量测试。
- 公网健康接口三个样本为 753–909ms；首次登录并完成学习内容/离线准备的组合步骤约 21–24 秒。这些是当前电脑到 Cloudflare 的有限样本，不代表所有中国网络、实际手机硬件或长期可用性。

## 使用和回退

首次访问会进入登录页。旧 PWA 若还显示学习总览，先保存输入，关闭全部 BitAtlas 标签和独立应用窗口，再打开相同网址，不要清数据。原匿名记录在数据页先“预览旧记录”和“保存迁移前备份”，再明确归入当前账号。

DNS 回退只需将现有 `408` CNAME 目标恢复为 `abysswhalen.github.io`，保留代理、自动 TTL 与其他属性；原参数见 [dns-rollback.json](../../output/gcp-domain-2026-11-22/dns-rollback.json)。无需删除其他记录或隧道。回退后须重新验证根页和 HTTPS。原 Pages 部署及 CNAME 声明未改，但已更新的浏览器 PWA 仍可能短暂显示缓存的新登录页，需要关闭旧页后等候 worker 更新；DNS 回退不等于自动把服务器版学习记录迁回旧应用。

服务器发布回退只切 `/srv/bitatlas/current` 到已保留的上一发布并重启 `bitatlas.service`，不替换 `/var/lib/bitatlas`。本轮无 schema 变更，回退会重新带回知识直链 404，应优先前向修复。凭据和独立备份恢复均不应写进命令行或公开资料。

## 后续

1. 2026-11-22 腾讯云独立加密副本及完整取回核验已完成；自动调度和限定保留策略待批准启用，见 [独立备份接入](independent-backup-2026-11-22.md)。同机历史归档仍不能算独立灾备。
2. 核对新增证据归档和完整恢复后，再做精确本机副本处置；约 1GB 目标尚未完成，本轮没有清理历史/来源/依赖。
3. 开放项继续保留：固定 8 workers 历史 231/234、fast-uri 的 high 告警、80 道缺解析、46 道缺历史答案对照、内容人工审核率 0%。Q44 和正式模考门槛不变。
4. 收集本人日常访问反馈，重点看首次加载、跨网访问和边缘层偶发请求失败；没有创建自动监控或收费资源。
