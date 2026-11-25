# 独立备份与每日自动化（2026-11-22 已启用）

管理员已原位改名为 `<admin-login>`，新密码已由真实应用路由和重启后 HTTP 正反例验证。账号 ID、资料归属及业务表摘要保持；旧登录会话撤销。密码仅保存在原受限凭据文件，不在本文中记录。

腾讯云连接使用维护者提供的 `<operator-user>@<backup-host>` 和本机已有身份；严格匹配已保存主机密钥。实测 Ubuntu 24.04.4 LTS、约 53.5 GB 可用空间。只用于加密备份，不参与站点请求。

## 本轮快照

GCP `/var/lib/bitatlas-backups/manual-20261122-admin/snapshot.tar.age`：

- 142,725,848 bytes，SHA256 `f7a4d5c07524d8fe8218a4ea5adbb89653196817e4210da27414c21219e59734`。
- 400 个对象、18 个内容包、4 个账号、17 个学习实体、0 个会话。
- 全部密文传输摘要、解密后逐对象摘要、SQLite 完整性/外键和新管理员密码验证通过。本机只留下约 4 MB 数据库核验副本，没有下载常驻完整归档。
- 首次核验在 `sqlite3.deserialize` 打开 WAL 格式数据库时失败；后改为在原受保护 verification 目录实际打开快照，完整复验通过。原失败回执保留。
- 腾讯云副本上传后独立重新计算摘要一致；从腾讯云实际取回全部密文，流式解密并验证400对象、SQLite 完整性/外键与当前管理员密码通过，用时239.35秒。回执为 `output/backup-storage-2026-11-22/independent-copy-receipt.json`、`independent-backup-verification.json`。这次做的是完整内容与数据库复验，没有在腾讯云启动恢复后的应用服务。

解密身份不上传任何服务器。现有个人 SSH 私钥不复制到另一台机器。手工快照和改密码前快照保留；旧快照恢复会恢复旧凭据及旧学习状态，不能代替当前库。

## 已启用的自动化配置

2026-11-25 公开的 `bitatlas-backup.service` 是模板。当前生产单元继续使用 11 月 22 日安装的版本。以后单独更新备份工具时，使用本机受限的 `local-data/ops/destination-policy.json`，其中 `host` 为批准的 SSH 用户和主机，`knownHostsFile` 为目标机器上的绝对路径，`knownHostsSha256` 为独立确认过的固定主机公钥文件的 SHA-256。管理员从已有可信主机记录确认公钥及文件末尾的换行，然后独立比对这三个字段。不要从待校验的 `client.json` 推导批准值。

部署该模板时，先在受保护的暂存目录渲染 `LoadCredential` 的 `<identity-path>` 和 `<destination-policy-path>`，分别指向既有专用 SSH 身份与只允许 root 写入的策略文件。固定主机文件须由 root 管理，备份服务用户只读。确认模板中没有剩余占位符，使用 `systemd-analyze verify` 检查渲染后的单元，先在隔离环境运行备份测试，再依独立维护安排安装。此应用发布只更新公开模板。

脚本与 systemd 单元位于 `tools/operations/backup/`。维护者已明确批准专用身份、限定暂存与过期自动快照清理；两端单元已安装，首轮实际任务及独立取回恢复验证通过，两个定时器均 enabled/active。

1. 每日北京时间 03:30–03:35，GCP 通过现有应用的 SQLite 一致快照与 age 加密实现生成备份。
2. 使用新建的本应用专用 SSH 身份，只允许向腾讯云专用用户的 `/srv/bitatlas-backup/snapshots` 上传密文及核对摘要。强制命令只接受 `put`/`check`，不提供交互 shell、端口转发、读取任意文件或删除命令；主机公钥固定。
3. 腾讯云独立核对长度与 SHA256，完成后才原子落盘。GCP 再读回摘要后，仅清理本次新建且不含链接的 `run-<uuid>` 暂存目录。失败暂存保留，剩余不足 2 GiB 时停止生成新快照。
4. 腾讯云每日 05:30 维护最近 7 个有备份的北京时间日期及最近 4 个周的快照。删除默认只列候选；只有明确批准启用 `--apply` 后才删除该目录中收据标记为 `automatic: true` 的过期密文和配套收据，保留删除审计。手工快照没有该标记，受到保护；旧 GCP 快照与历史归档也不在清理范围。
5. 私钥通过 GCP `systemd LoadCredential` 提供，root:0600；保留现有个人身份和共享 SSH 配置。备份会产生约 143 MB/日的 GCP 外发流量（按当前内容估算），不创建收费资源。

首份自动快照为142,725,848 bytes，SHA256 `2c7c40ab75358fae225d4202ddbb8fb0a0851ea79f295cbc42c8fbe30233ccf6`，14:29（北京时间）完成。腾讯云重新计算摘要一致；随后从该副本完整取回解密，400对象、SQLite完整性/外键、4账号/18包/17学习实体和当前管理员密码通过，耗时267.82秒。本机仅保留受限数据库验证副本。GCP本轮已核验暂存自动清理，手工快照仍在。此次没有启动第二套恢复后的应用服务；应用恢复/epoch轮换沿用此前独立验收记录。

Linux实测17项测试通过，包括生成失败、上传失败和远端摘要错误时保留暂存/上次成功回执。真实专用SSH检查确认普通命令、读取任意文件、删除、路径穿越和远程端口转发被拒绝。初次安装发现umask屏蔽目录遍历权限，导致接收账号拒绝登录及首轮服务退出2；仅修复本应用3个目录权限，失败日志保留。systemd四单元检查通过，既有腾讯云tat_agent的旧PIDFile提示没有修改。

首轮保留维护实际执行后为1自动快照保留、1手工快照保护、0候选/0删除。下次触发实测为 **2026-11-23 03:30:36**（备份）及 **05:30:00**（保留维护），均换算为北京时间；之后备份有0–5分钟随机延迟。验收证据位于 `output/automatic-backup-2026-11-22/`，正式应用与隧道仍active，回环health 200。

运维检查：

```sh
# GCP
systemctl status bitatlas-backup.timer bitatlas-backup.service
sudo cat /var/lib/bitatlas-backups/automatic/last-success.json
sudo journalctl -u bitatlas-backup.service
# 腾讯云
systemctl status bitatlas-backup-retention.timer
sudo python3 /srv/bitatlas-backup/bin/retention.py
```

最后一条仅预演。任务失败保留journal和暂存，不覆盖last-success；先排查错误和空间，再手动启动该service。失败暂存不自动删除。解密恢复继续在可信本机/隔离恢复环境操作，不将age私钥放到两台服务器。

## 本机空间

2026-11-22 盘点为 9,177,850,546 逻辑 bytes；output 7,535,417,367，local-data 1,105,297,571。16 个链接跳过、0 读取错误。旧历史清单中 20,585 文件/5,622,133,360 bytes 全部与当前本机原文 SHA256 一致；没有重传旧历史。

随后已完成旧历史56块和新增16块的全部对象流式解密核验及腾讯云独立副本，成功恢复20个原路径文件。维护者批准精确清单后，17:08完成37,629文件/8,390,946,988 bytes本机副本删除，包含上述数据库验证副本；它们可从归档恢复，校验回执继续保留。D盘实测空闲增加8,458,674,176 bytes，项目已低于1GB。该历史目录不属于自动保留清理范围，腾讯云6份失败pending未删除。最新证据与恢复命令见 [归档与本机副本](storage-archive-2026-11-22.md)，原只读盘点保留在 `output/backup-storage-2026-11-22/storage-report.html`。
