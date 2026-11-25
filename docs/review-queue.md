# 人工复核队列（review queue）

更新日期：2026-11-25。基线数据：17 套题包、799 道题（2009–2025），学习包 `2026.11.25.5`（156 张记忆卡、47 篇短讲解、799 条概念映射、40 条补充解析、1 条勘误）。

## 用途与规则

本队列汇总目前所有"待人工复核"事项，供维护者安排 AI 逐项复核使用。规则如下：

- **维护者决定（2026-11-25）：独立 AI 复核通过即视同人工复核**，可以把对应内容的 `reviewStatus` 提升为已审核，也可以据此打开依赖人工复核的门槛（例如 2009 正式模考）。不能自审：写内容的 AI 或会话不能复核自己写的内容。
- 本队列只汇总已有文档写明的事实，不新增对错判断；各条目的"当前状态"均引自下列证据文件。
- 复核时先记录结论，再按项目流程修改：题包与学习包的改动走正常的升版与发布，不在复核过程中直接改线上文件。
- 发现疑似错误，把结论、证据位置和修订建议写进复核结论，由团队按流程修订。

## 一、题目与原卷

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R1-1 | cn408-2009 全部 47 题 | 逐题核对题干、选项、解析与原卷扫描件，正式确认审核状态 | 线上 `/review/2009` 复核工作台；`docs/2009-source-audit-2026-10-04.md` | 正式人工复核 0/47；AI 来源核对已完成（47/47，17 题修正、3 处跨页解析索引），包版本 2009.0-draft.3 | docs/server/content-review.md、README.md |
| R1-2 | cn408-2022-q17 | DRAM 地址引脚数解析：来源解析把内存条总字节地址位数（512MB=2^29B → 29 位）当成单片 DRAM 地址引脚数，单片 8192×8192×8（行列复用 13+13）应为 13 根；两种口径均不含答案选项 C(26)，需对原答案页人工确认 | docs/content-quality-backlog.md（P2 未解项）；docs/learning/article-drafts-2026-11-25.md | 题包保留原文；第一批讲解草稿已在 doubts 标出来源异常并排除该题，讲解与卡片均不引用 | docs/content-quality-backlog.md、docs/learning/article-drafts-2026-11-25.md |
| R1-3 | cn408-2023-q40 | 解析称 IPv6 与 IPv4 地址空间"相差 64 位/2^64"是否为原资料错误；正确口径应为 128−32=96 位、2^96；核对勘误的地址位数之差、理论地址空间之比、原段引文和答案卷定位 | `cn408-2023/source/answers-11.jpg`（PDF page 11; answer 40）；docs/content-quality-backlog.md（P2）；勘误 `erratum:cn408-2023-q40`（私有输入 `output/supplements-release/input.json`；题版 2023.0-draft.2，段 q40-analysis，答案卷第 11 页） | 已发布勘误，待复核勘误内容；题包原文未改，答案键 D 与审核状态不变 | docs/content-quality-backlog.md、docs/learning/supplements-release-2026-11-25.md、提交 6b497ef |
| R1-4 | 2024/2025 年 80 道选择题（各 40） | 逐题补写解析；2024 年 40 条补充解析已上线（批次见 R1-15），2025 年 40 条在写 | docs/learning/missing-explanations-2026-11-25.tsv（逐题概念对应）；docs/learning/question-supplements-design-2026-11-25.md（补充方案）；docs/learning/supplements-release-2026-11-25.md | 2024 年 40 条已上线（学习包 2026.11.25.5，待复核）；2025 年 40 条在写 | docs/content-quality-backlog.md、README.md、docs/learning/supplements-release-2026-11-25.md |
| R1-5 | cn408-2023-q05 | 来源解析文字错误：后序序列 `f, d, b, e, c, a` 中结点 `e` 左子树 2 结点（f, d）、右子树 1 结点（b），解析第 4 句误写"`fdb` 属于左子树，`e` 属于右子树" | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 草稿已规避；供评估记入内容质量清单 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-6 | cn408-2016-q27 | 来源解析概念错误：TSL 自旋锁退出临界区执行 `lock=FALSE` 时，解析写"会负责唤醒处于就绪状态的进程"；唤醒只针对阻塞态进程，解锁只是普通写内存 | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 同上 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-7 | cn408-2013-q42 | 题干漏小数点：4 元素折半查找成功 ASL 应为 `2.2`，题包题干误作"平均查找长度为 22" | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 同上 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-8 | cn408-2017-q40 | 来源解析漏判关键错点：TCP 20 是服务器端数据端口而非客户端端口，原解析仅讨论主动/被动模式，漏指端口所属端写反 | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 同上 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-9 | cn408-2020-q25 与 cn408-2022-q31 | 跨题解析口径冲突："保存 PSW"的职责归属（中断服务程序 vs CPU）两题解析说法不一致 | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 同上 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-10 | cn408-2013-q44 | 解析将无符号数减法借位口语化写成"相减结果为负数" | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 同上 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-11 | cn408-2013-q41 | 开头串行噪声（已知） | docs/learning/article-drafts-2026-11-25-b.md"本轮新发现的题包题干与解析错误汇总" | 已知，未处理 | docs/learning/article-drafts-2026-11-25-b.md |
| R1-12 | cn408-2016-q20 | 解析末句"控制信号即指 PC 中的内容"疑为明显笔误 | docs/learning/article-drafts-2026-11-25.md | 草稿已排除该题、不引用该表述；待人工复核 | docs/learning/article-drafts-2026-11-25.md |
| R1-13 | 2019/2021/2024/2025 年 OCR 恢复解析 | I/O 误作 VO、帧误作顿、页码碎片、全半角标点等 OCR 噪声逐处核对 | docs/content-quality-backlog.md（P3） | 未处理 | docs/content-quality-backlog.md |
| R1-14 | 全部题干配图 | 配图为整页扫描原图、未裁切定位，是否影响判读 | docs/content-quality-backlog.md（P3） | 未处理 | docs/content-quality-backlog.md |
| R1-15（批次） | 2024 年 40 条补充解析（Q01–Q40，摩卡编写） | 逐条核对答案、逐题推导、干扰项及页码；Q20 核带宽计算口径，Q36 核来源卷时间单位错印；组长已抽查 Q05、Q12 | 私有输入 `output/supplements-release/input.json` 的 40 条 supplement（各自绑定题页和答案总表第 1 页）；草稿 `content/learning/drafts/supplements-2024-draft-2026-11-25.mjs`；草稿说明 `docs/learning/supplements-2024-draft-2026-11-25.md` | 已上线（学习包 2026.11.25.5），needs-review，待独立 AI 复核 | docs/learning/supplements-release-2026-11-25.md、提交 6b497ef |

## 二、答案键

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R2-1 | 46 道未标记 verifiedAgainstRebuild 的选择题（2013–2019、2022–2024 年） | 与答案页扫描图逐题比对（2026-11-25 已独立复核 46/46 一致，但不等于人工审核） | docs/content-answer-verification-2026-11-25.md；名单 docs/content-unverified-answers-2026-11-25.md | 46 题全部一致；标记与 locator 修订待维护者批准后统一处理 | docs/content-quality-backlog.md |
| R2-2 | 答案来源 locator 精度 | 原质量报告 40/40 表述与实际 46 的修订；13 个包 locator 为"answer table (page 1 assumed)"；2024/2025 答案表实际在 answers-1.jpg（印刷页 84/85） | docs/content-quality-backlog.md；docs/content-answer-verification-2026-11-25.md | 表述与 locator 修订未处理 | docs/content-quality-backlog.md |
| R2-3 | cn408-2025-q6 | 图示关键词扫描误报：选项含"带权图中"被命中，实际无需配图；确认生成器按题干判定、未嵌图的处理正确 | docs/content-quality-backlog.md | 已知扫描误报，生成器处理正确 | docs/content-quality-backlog.md |

## 三、记忆卡

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R3-1（批次） | 156 张卡（80 旧卡 + 76 新卡），humanReviewedCards: 0 | 逐卡核对 front/back 与依据题、概念一致；76 张新卡中 22 张含存疑说明需优先确认 | content/learning/cards.tsv；docs/learning/card-review-2026-11-20.md（旧 80 张：正文约 85% 逐字摘自题包解析，11 张精简率 ≥40%，5 个流程存疑）；docs/learning/card-drafts-2026-11-25.md 与 card-release-2026-11-25.md（新 76 张：版本 2026.11.25.1，正文全部逐字摘自题包解析） | 全部 needs-review；科目分布：数据结构 39、计算机组成原理 39、操作系统 36、计算机网络 42。建议复核方法：按科目分层抽样逐卡验证概念映射与依据题，含存疑说明的卡全量复核 | card-review-2026-11-20.md、card-drafts-2026-11-25.md、card-release-2026-11-25.md |

## 四、短讲解

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R4-1 | 原 20 篇 | 正文、workedExample、commonMistake 与依据题、题包解析的一致性 | content/learning/articles.mjs | agent 已对照题包逐项核对，人工审核率 0 | docs/server/content-review.md |
| R4-2 | 第一批 12 篇（已并入，学习包 2026.11.25.3，共 32 篇） | 逐篇核对正文、示例与依据题；10 条存疑逐项确认；7 个 labPath 已随学习包 2026.11.25.5 恢复实验链接并升版 | docs/learning/article-drafts-2026-11-25.md；发布记录 docs/learning/article-release-2026-11-25.md、docs/learning/supplements-release-2026-11-25.md | 已发布，needs-review | docs/learning/article-release-2026-11-25.md |
| R4-3 | 第二批 15 篇（已随学习包 2026.11.25.5 上线） | 逐篇核对例题、推导、引用题面和实验链接；逐条处理草稿 doubts（10 篇含存疑说明共 12 条） | docs/learning/article-drafts-2026-11-25-b.md；草稿 content/learning/drafts/articles-draft-2026-11-25-b.mjs；发布记录 docs/learning/supplements-release-2026-11-25.md | 已发布，待复核；组长已验收草稿 | docs/learning/article-drafts-2026-11-25-b.md、docs/learning/supplements-release-2026-11-25.md、提交 6b497ef |

## 五、概念映射

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R5-1（批次） | 799 条映射，humanReviewedMappings: 0，mappedCoverage: 1 | 逐条核对 questionId→conceptIds 与题干、解析内容一致，多概念映射题重点核对 | content/learning/mappings.json；逐题证据 docs/learning/question-mapping-2026-11-20.tsv；数字 docs/learning/coverage.json（version 2026.11.25.3） | 全部 needs-review。建议复核方法：按年分层抽样（如每年每科抽 2–3 题），多概念映射题全量核对 | question-mapping-2026-11-20.tsv、coverage.json |

## 六、实验预设

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R6-1 | cn408-2009-q44（微操作实验） | 只保留来源支持的 parallel-5 / split-6 两方案；保持 needs-review；不宣称穷尽所有合法答案，不实现任意微操作评分器 | AGENTS.md"不允许的做法"；docs/2009-source-audit-2026-10-04.md（Q44 逐题行及复核工作台建议）；docs/ARCHITECTURE.md | needs-review；若未来整包 verified 须先由维护者调整规范 | AGENTS.md、docs/2009-source-audit-2026-10-04.md |
| R6-2 | cn408-2009-q42、q44–q47（本地自评分规则） | 是否接受 Q42、Q44–Q47 明确标注的本地自评分规则；Q44–Q47 来源无逐点分值，不能把应用拆分宣称为命题机构标准；Q43"只有结果时每问 2 分"需人工综合判断 | docs/2009-source-audit-2026-10-04.md（复核工作台建议节） | 待人工决定；未实现自动评分器 | docs/2009-source-audit-2026-10-04.md |
| R6-3 | 各实验页预设徽标 | 预设徽标继承题包 needs-review 状态（如 Q46 虚拟内存"本地练习预设"注明"参数来自待人工复核题包，仅用于过程演练"） | apps/web/src/pages/VirtualMemoryLabPage.tsx 等实验页源码 | needs-review | 应用源代码 |

## 七、其他

| 编号 | 对象 | 要核什么 | 证据位置 | 当前状态 | 引入来源 |
| --- | --- | --- | --- | --- | --- |
| R7-1 | 题包与学习包整体状态 | 17 套题包（799 题）整体 reviewStatus；学习包 reviewStatus | docs/server/content-review.md；docs/learning/coverage.json | 均为 needs-review，人工审核率 0 | docs/server/content-review.md、docs/learning/coverage.json |
| R7-2 | README 口径 | README"内容复核与学习分析"节写"799 道题、156 张记忆卡和 20 篇原创短讲解"，与 article-release-2026-11-25.md/coverage.json 记录的 32 篇不一致 | README.md；docs/learning/article-release-2026-11-25.md；docs/learning/coverage.json | README 数字早于第一批讲解发布，待更新；拿铁处理中 | 本清单对比 |

## 如何复核

复核 AI 应读的文件（按类别）：

- 规则与总览：`AGENTS.md`、`docs/server/content-review.md`、`docs/content-quality-backlog.md`
- 题目：`apps/web/public/content/<年份>.json`（大文件，先确认字段再用脚本取数，勿整篇打印）；线上 `/review/2009` 工作台；`docs/2009-source-audit-2026-10-04.md`
- 答案键：`docs/content-answer-verification-2026-11-25.md`、`docs/content-unverified-answers-2026-11-25.md`
- 记忆卡：`content/learning/cards.tsv` 及上表引用的卡片文档
- 短讲解：`content/learning/articles.mjs`、`content/learning/drafts/articles-draft-2026-11-25*.mjs` 及上表引用的讲解文档
- 概念映射：`content/learning/mappings.json`、`docs/learning/question-mapping-2026-11-20.tsv`、`docs/learning/coverage.json`

结论写到哪里：建议在 `docs/review-results/` 目录下按日期命名新建文件（如 `docs/review-results/2026-11-25-<主题>.md`），逐条写明：编号（对应本队列）、对象、结论（一致 / 不一致 / 无法判定）、证据（文件路径与来源页/locator）。此为建议，本清单不创建该目录。

必须遵守的规则：

1. 复核结论写入 `docs/review-results/`，写明复核者（模型或会话）、时间和结论。复核通过视同人工复核；提升 `reviewStatus`、修订题包或学习包时，按项目流程发版（学习包与题包都有独立版本，修改须升版）。不能自审。
2. 不修改题包（`apps/web/public/content/*.json`）与学习包源文件（`content/learning/`）。
3. 改答案键必须有两份独立证据，例如原卷答案页加上独立推导，并写进复核结论；其余疑似错误写清修订建议。
4. 引用证据必须给出文件路径与来源页/locator。
5. 大 JSON 不整篇打印，数字用脚本计算。
