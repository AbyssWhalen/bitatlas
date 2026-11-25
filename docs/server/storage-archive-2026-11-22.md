# 历史证据归档与本机副本处置清单

2026-11-22：自动备份已启用；历史和新增证据完成全量流式解密校验，并保存GCP、腾讯云两份密文。维护者批准后，17:08（北京时间）完成精确本机副本删除，D盘实测空闲空间增加8,458,674,176 bytes。项目连现用开发依赖低于1GB，恢复索引、源码和文字证据保留。

## 已核验归档

| 归档 | 块数 | 去重对象 | 加密后字节数 | 完整解密核验 |
|---|---:|---:|---:|---|
| 旧历史 `history-20261121` | 56 | 13,652 | 2,852,454,904 | 全部通过 |
| 新增 `evidence-20261122` | 16 | 5,677 | 621,353,275 | 全部通过 |

旧归档对应20,585个原路径/5,622,133,360逻辑bytes；新增目录索引覆盖44,716路径/8,603,357,509逻辑bytes，复用旧对象，仅新增992,335,543去重明文bytes。两批原路径范围重叠，不能把两行的原文总量相加。

两台服务器位置：

- GCP：`/srv/bitatlas/archives/history-20261121`、`/srv/bitatlas/archives/evidence-20261122`
- 腾讯云：`/srv/bitatlas-backup/history-20261121`、`/srv/bitatlas-backup/evidence-20261122`

归档不属于每日自动快照淘汰范围。age解密身份只在本机受限凭据目录；个人SSH私钥、管理员凭据及3份测试age私钥没有进入新增归档。

完整验证逐一读取远端密文，验证age认证结束、归档结构、全部对象长度与SHA256，再核对腾讯云独立副本摘要。未在本机重新落下整个归档或重建完整44,716文件树。另从腾讯云实际恢复20个原路径文件、45,428 bytes到独立目录，完整校验相关2块，证明原路径恢复工具可用。

最终证据目录：`output/automatic-backup-2026-11-22/`。完整结果为 `history-complete-verification.json`、`incremental-complete-verification.json`；两端最终摘要复查为 `archive-copy-final-gcp.json`、`archive-copy-final-tencent.json`。原首轮失败与续跑收据全部保留，不用成功结果覆盖它们。

## 已完成的精确处置

精确清单：`output/automatic-backup-2026-11-22/local-disposition-plan.json`。

- 本机逐文件SHA256复核通过：**37,629文件，8,390,946,988 bytes**。
- 清单聚合SHA256：`6467e2ebeb62bc4456398ec9ae7090a297ea2db0ce53b7a54b796015fe2800e8`。
- 原提案盘点为9,224,701,252逻辑bytes、预计余833,754,264 bytes；执行时包括新增索引与回执为9,233,847,076 bytes。删除后即时845,475,021 bytes；随后仅增加复验构建和少量文档，最终精确体积见`local-disposition-final.json`，仍低于1,000,000,000 bytes。
- 源码及Git跟踪文件、现用依赖、密钥、管理员凭据、本轮回执保留。清单涉及的历史目录内保留约212 MB文字报告、脚本、索引及小日志。
- 清单主要是历史trace/截图、隔离运行与恢复副本、34份原PDF、OCR中间文件；它们属于已归档资产，不标为垃圾。原PDF也已由鉴权服务器提供。
- 已逐个删除清单内37,629个普通文件，0目录删除、0远端删除、未清回收站。执行前完整预检，再对每个文件独占打开、校验并使用同一句柄删除；35,225个保留文件及16个链接的前后聚合完全一致。
- 删除后的完整恢复依赖服务器密文、保留的恢复索引及本机age身份。删除本机副本不可由回收站撤销，恢复需要下载相应归档块。

原清单的`permanentDeletionAuthorized: false`和旧`delivery-receipt.json`保留生成时状态。维护者随后回复“可以，继续吧”明确批准本清单，新增`local-disposition-authorization.json`记录授权。执行证据在`local-disposition-execution/`：`preflight.json`、`execution.jsonl`、`before.json`、`after.json`、`receipt.json`；最新总回执为`local-disposition-final.json`。一次性执行器已完成，禁止重跑或重新生成候选文件来再执行。

D盘空闲空间在删除前后为114,852,700,160→123,311,374,336 bytes，净增加8.46 GB；这是整盘同期实测值，可能包含其他进程的少量读写影响，不能与8.39 GB逐文件逻辑大小混为一谈。执行期间保留文件共842,898,131 bytes，聚合SHA256为`2440906aac5e3595611f12cfaca068752357462f71558055461dc3d76107a524`；后续文档修改和复验产物另行记录。

清理后9项检查全部通过：lint、typecheck、release 10/10、importer 36/36、服务端定向Vitest 12/12、恢复工具3/3、17年799题内容校验、799映射/80卡/20讲解确定性校验、隔离目录中的服务器生产构建。任务并发上限2，Vitest指定`--maxWorkers=2`且仅1个测试文件；没有重跑完整Vitest或E2E。执行器另有5组安全检查（包含8种路径反例）。日志与命令见`local-disposition-execution/validation/summary.json`。

## 恢复单个文件

恢复索引：`output/automatic-backup-2026-11-22/recovery-index.json`。索引包含两批目录、各块摘要和位置，旧对象通过旧目录查询，不依赖被迁出的本机原文。

在项目根目录运行；`--destination`必须是不存在的新目录：

```powershell
python tools/operations/archive/restore-evidence.py --index output/automatic-backup-2026-11-22/recovery-index.json --destination local-data/recovered-2009-answers --host <operator-user>@<backup-host> --ssh-key <identity-path> --age-binary local-data/tools/age-1.3.2/bin/age/age.exe --identity-file <age-identity-path> --path local-data/sources/2009-answers.pdf
```

可重复提供`--path`一次恢复多个文件。工具验证整块后写`restore-receipt.json`；没有成功收据的恢复目录不应视为完整。Windows长路径已支持。恢复预检3/3测试通过：拒绝损坏索引、路径穿越和覆盖已有目录。

## 失败与剩余事项

- 最初两端专用目录受umask影响不可遍历，已限定修复；自动备份及恢复随后通过。
- 历史跨境传输出现中断和接收端等待EOF占锁；只终止精确核对的本轮进程，改为长度限定、截止时间和非阻塞锁后续传成功。腾讯云6份不完整历史pending仍保留，不在自动清理范围。
- 恢复演练先遇到未复制块，再遇到Windows长路径；原失败日志保留，最后20文件恢复成功。
- 处置清单首次读取中文路径时遇到Windows默认GBK解码错误，改为显式UTF-8后完整核验通过。
- 本机处置及空间目标已经完成；历史HTML中指向已归档截图/trace的链接不再直接打开本机副本，按保留索引恢复相应原路径即可。原始PDF通过服务器资料页使用，本机重建题包时仅恢复所需文件。
- 运维读回首次误用`/api/health`得到404，查实际路由后使用`/api/v1/health`返回200；失败探测单独保留，不代表应用服务曾停止。GCP应用、隧道、备份timer及腾讯云保留timer均enabled/active，应用与隧道NRestarts均为0。
- 此轮仅备份/归档工具和文档，产品功能未改；17项Linux备份测试、3项Windows恢复预检及真实恢复均通过。未重跑无关全量E2E，固定8workers和产品内容质量开放项仍见HANDOFF。
