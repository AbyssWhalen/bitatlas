# GCP 单机部署与回退

当前应用版本为 `20261125-77725ddd`，成员学习包为 `2026.11.25.5`。本次快照、两种内容表示的回读及内容优先的回退顺序见[补充解析发布记录](../learning/supplements-release-2026-11-25.md)。上一应用版本为 `20261125-aae31894`。域名接入与 DNS 灾备仍按 11 月 22 日记录。

本文件为运行手册。GCP 专用运行时、独立服务、题包/PDF、真实备份与隔离恢复已完成，2026-11-22 正式入口 `408.fytjut.com` 已接通。最新路径、摘要、验收与回退见 `docs/server/gcp-domain-2026-11-22.md`，前一阶段见 `gcp-deployment-2026-11-21.md`。腾讯云独立加密副本、完整取回核验与每日自动调度已完成，见 [独立备份](independent-backup-2026-11-22.md)。以下命令是操作说明，不能重复初始化已有服务或覆盖既有恢复目录。

## 目录与进程

GCP 使用 `/srv/bitatlas/releases/<release-id>` 保存不可变应用版本，`/srv/bitatlas/current` 指向当前版本；`/var/lib/bitatlas` 保存 `bitatlas.sqlite` 和 `files/`。API 由专用非 root 用户运行，仅监听 `127.0.0.1:4310`。`bitatlas-tunnel.service` 把正式 HTTPS 入口同源接到此回环服务；既有 443 服务保留。所有 `/api/` 返回 `no-store`，私有目录不直接暴露。内容发布接口允许16MiB JSON，文件分块4MiB；单份PDF上限128MiB。

Windows 本地执行 `npm run build:server`，随后 `node tools/verification/package-server.mjs`。产物位于日期命名的 `output/server-implementation-2026-11-20/release-*`，含逐文件 SHA256 清单和 tar.gz 摘要；不含题包、PDF、数据库、密钥、历史证据或本机依赖。

授权上传后，先核对 tar.gz SHA256，再解压到一个新的 release 目录。使用 Node 24（至少 24.12.0），在 Linux 上安装 Linux 原生 SQLite 依赖，不复制 Windows `node_modules`：

```sh
node tools/verification/install-server.mjs
node --import tsx tools/verification/verify-server-release.mjs
```

安装器只接受全新解压的部署包。本机 npm 11.9 的 lockfile 安装路径丢失 `better-sqlite3` 的 `gypfile:false`，误触发原生重编译并失败；其证据保留在验收目录。安装器按锁文件安装，单独检查全部依赖的安装钩子，只执行已审核的 esbuild 初始化，再实际加载 SQLite 做写入/读取及 TypeScript 转换。遇到新增安装钩子立即报错，不忽略缺失的初始化。它不会修改全局 npm、Node 头文件缓存或依赖源码。验证器核对逐文件摘要和包内依赖来源，并在本机 4327 端口验证应用壳、路由与未登录访问隔离，产生独立回执；Linux 原生加载仍须在目标环境验证。

服务管理器提供 `BITATLAS_ORIGIN=https://你的学习域名`、`BITATLAS_DATA=/var/lib/bitatlas`、`BITATLAS_WEB_ROOT=/srv/bitatlas/current/apps/web/dist-server` 和 `BITATLAS_PORT=4310`，工作目录设为 `/srv/bitatlas/current/apps/server`，启动 `node --import tsx src/main.ts`。当前 Origin 为 `https://408.fytjut.com`，同名 CNAME 已指向专用隧道。公网必须 HTTPS，Cookie 使用 Secure/HttpOnly/SameSite=Strict。

专用隧道凭据仅保存于 GCP `<credential-file>`（root:root、0600），systemd `LoadCredential` 将它交给非 root 连接器，命令行只含 `--token-file` 路径。不要把 token 写到命令行、日志、仓库或本机文件。`curl -fsS http://127.0.0.1:20241/ready` 检查连接器；`systemctl status bitatlas.service bitatlas-tunnel.service` 检查两服务。连接器固定使用已核验的 2026.11.1、HTTP/2 和 TCP 7844，自动更新关闭。

新数据库启动后，通过标准输入初始化管理员：`npm run admin -w @408os/server -- bootstrap <username>`。密码从标准输入读取，不要将密码写入命令行参数、日志或版本库。首次管理员进入资料库，先上传/发布图片，再预检/发布题包，最后发布匹配题目版本的学习包。成员通过一次性邀请码加入，不能读取其他成员记录。

## 备份、恢复和回退

在受保护目录配置 age 身份文件；加密公钥可以提供给 GCP，解密私钥不要和主服务放在同一台机器。工具不会生成真实凭据。`BITATLAS_AGE_BINARY` 可指定 age 可执行文件。

从项目根目录运行：

```sh
node --import tsx apps/server/src/backup-cli.ts create --data /var/lib/bitatlas --output /受保护目录/新快照目录 --recipient <age-public-key>
node --import tsx apps/server/src/backup-cli.ts restore --archive /快照/snapshot.tar.age --sha256 <receipt-sha256> --destination /新恢复目录 --identity-file /受保护目录/identity
node --import tsx apps/server/src/backup-cli.ts retention --inventory /快照清单.json
```

SQLite online backup 生成一致快照，逐个核对不可变文件的长度和 SHA256，再 tar + age 加密。明文暂存目录列在 receipt 中，工具不自动删除。恢复仅允许新目录，拒绝损坏归档、路径穿越、链接、重复成员和摘要不符；恢复后更换 sync epoch，撤销全部会话和旧邀请码，客户端重新登录并对账。恢复不会覆盖运行数据库。

`tools/operations/backup/` 的运维脚本已部署：每日北京时间03:30生成并传到腾讯云，05:30保留维护。保留最近7个有备份的日期及4个有备份的周；只有该接收目录内明确标记automatic的过期快照属于已授权删除范围，手工快照和历史归档受保护。应用CLI的retention命令仍仅列候选；以下为通用手工传输命令：

```sh
node --import tsx apps/server/src/backup-cli.ts upload --archive /快照/snapshot.tar.age --host <user@backup-host> --directory /私有备份目录
```

只上传加密 `.age`，SSH 严格校验已知主机；写 `.pending`、核对远端 SHA256 后重命名。初始 GCP 实际生产快照已完整下载并在本机隔离恢复；age私钥未上传任何服务器。2026-11-22 新管理员手工及首份自动快照都已保存在腾讯云 `/srv/bitatlas-backup/snapshots/`，完整取回、解密和数据库核验通过。自动任务使用GCP本应用专用SSH身份，接收端仅允许上传/摘要核对；仅独立副本核验成功后清理当次生成暂存，失败时保留暂存和上次成功回执。备份机器不参与应用请求。

切换应用前备份数据库。仅应用代码回退可切回前一 release，保留当前数据；若 schema 不兼容则停止服务，用已核验快照恢复到新数据目录后切换 `BITATLAS_DATA`。恢复旧快照会缺少快照后的服务端记录，需从客户端未同步数据/完整 v5 备份恢复，不能承诺无损回退。

## 历史证据迁出

2026-11-22已完成旧56块和新增16块的完整流式解密校验，GCP与腾讯云各保存一份密文；另按原路径实际恢复20文件成功。维护者批准后，已按精确清单删除37,629文件/8.39 GB本机副本；摘要索引、执行回执和恢复命令见 [归档与本机副本](storage-archive-2026-11-22.md)。历史截图、trace和原PDF需要按索引恢复，不重新运行旧归档或清理脚本。

本机约1GB目标已达成，清理后包括开发依赖的项目约0.85GB，复验构建另增少量空间，最终精确值见`output/automatic-backup-2026-11-22/local-disposition-final.json`。D盘实测空闲增加8.46GB。源码、现用依赖、密钥、回执和关键报告保留；本次授权不扩展到其他文件、远端失败暂存或回收站。清理后构建、类型、内容及相关测试均通过，线上服务和自动备份保持运行。
