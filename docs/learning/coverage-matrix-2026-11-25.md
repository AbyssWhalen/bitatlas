# 概念覆盖矩阵（2026-11-25）

每个叶概念一行的题目、解析缺失、记忆卡、短讲解、实验覆盖情况。逐行明细见同目录 `coverage-matrix-2026-11-25.tsv`。

## 总数

- 叶概念数：102（数据结构 28、计算机组成原理 22、操作系统 22、计算机网络 30）
- 有记忆卡的概念：67
- 有短讲解的概念：20
- 有实验链接的概念：38（口径：关联题目在 lab-links.ts 中的实验 destination 去重，短讲解的 labPath 一并计入）
- 解析缺失题目：80 题（2024 年 40 题、2025 年 40 题）

## 最需要补内容的 20 个概念

按关联题目数从多到少排列，只列出没有短讲解或没有记忆卡的概念。

| 概念 | 科目 | 所属章节 | 关联题目数 | 年份范围 | 缺少项 |
|---|---|---|---|---|---|
| 内核、特权级与系统调用（`os.process.kernel`） | 操作系统 | 进程与处理机 | 17 | 2009-2023 | 短讲解、实验链接 |
| 主存芯片与地址译码（`co.memory.ram`） | 计算机组成原理 | 存储系统 | 16 | 2009-2023 | 短讲解 |
| 流水线与相关冲突（`co.processor.pipeline`） | 计算机组成原理 | 指令系统与处理器 | 16 | 2009-2024 | 短讲解 |
| 浮点表示与运算（`co.representation.float`） | 计算机组成原理 | 数据表示与运算 | 16 | 2009-2025 | 短讲解 |
| 数据通路与微操作（`co.processor.datapath`） | 计算机组成原理 | 指令系统与处理器 | 15 | 2009-2025 | 记忆卡、短讲解 |
| CPU 性能与加速比（`co.processor.performance`） | 计算机组成原理 | 指令系统与处理器 | 14 | 2010-2025 | 短讲解、实验链接 |
| 时间与空间复杂度（`ds.foundations.complexity`） | 数据结构 | 算法与线性结构 | 14 | 2010-2025 | 短讲解、实验链接 |
| 虚拟地址、页表与 TLB（`co.memory.virtual`） | 计算机组成原理 | 存储系统 | 13 | 2011-2024 | 短讲解、实验链接 |
| 死锁条件与安全状态（`os.process.deadlock`） | 操作系统 | 进程与处理机 | 13 | 2009-2022 | 短讲解 |
| 目录、链接与文件控制块（`os.files.directory`） | 操作系统 | 文件系统 | 12 | 2009-2025 | 短讲解 |
| 进程状态与切换（`os.process.state`） | 操作系统 | 进程与处理机 | 12 | 2010-2025 | 短讲解、实验链接 |
| 交换机、网桥与 VLAN（`cn.link.switch`） | 计算机网络 | 数据链路层 | 11 | 2009-2024 | 短讲解 |
| 图的存储、度与连通性（`ds.graphs.graph-model`） | 数据结构 | 图与图算法 | 11 | 2009-2025 | 记忆卡 |
| 树的遍历与重建（`ds.trees.traversal`） | 数据结构 | 树与查找 | 11 | 2009-2024 | 短讲解 |
| 文件打开、读写与权限（`os.files.file-open`） | 操作系统 | 文件系统 | 11 | 2009-2025 | 短讲解、实验链接 |
| 并发、并行与临界区（`os.process.concurrency`） | 操作系统 | 进程与处理机 | 11 | 2009-2023 | 短讲解、实验链接 |
| TCP 拥塞控制（`cn.transport.congestion`） | 计算机网络 | 传输层 | 10 | 2009-2025 | 短讲解 |
| 链表与指针操作（`ds.foundations.list`） | 数据结构 | 算法与线性结构 | 10 | 2009-2024 | 短讲解 |
| 拓扑排序与有向无环图（`ds.graphs.topological`） | 数据结构 | 图与图算法 | 10 | 2010-2024 | 短讲解、实验链接 |
| 路由算法与路由协议（`cn.network.routing`） | 计算机网络 | 网络层 | 9 | 2009-2024 | 短讲解 |

## 各科三者皆无的概念

本节列出同时没有记忆卡、没有短讲解、也没有实验链接的概念。

### 数据结构（7/28）

- 顺序表与数组算法（`ds.foundations.array`，9 题，2010-2025）
- 快速排序与划分（`ds.sorting.quick`，7 题，2010-2024）
- 二叉搜索树（`ds.trees.bst`，6 题，2011-2024）
- 最小生成树（`ds.graphs.mst`，5 题，2012-2020）
- 归并排序与有序合并（`ds.sorting.merge`，4 题，2012-2024）
- 外部排序与多路归并（`ds.sorting.external`，4 题，2016-2024）
- 线索二叉树（`ds.trees.thread`，3 题，2010-2014）

### 计算机组成原理（8/22）

- 数据通路与微操作（`co.processor.datapath`，15 题，2009-2025）
- ALU 与加减乘除（`co.representation.arithmetic`，9 题，2011-2025）
- 程序查询与 I/O 接口（`co.io.polling`，7 题，2011-2023）
- 磁盘容量与访问时间（`co.memory.disk`，5 题，2013-2022）
- 计算机层次与冯诺依曼结构（`co.processor.architecture`，5 题，2009-2022）
- RISC 与 CISC（`co.processor.risc`，2 题，2009-2025）
- 校验码与数据编码（`co.representation.coding`，1 题，2013）
- 并行体系结构（`co.processor.parallel`，1 题，2022）

### 操作系统（7/22）

- 设备分配与独立性（`os.io.device`，9 题，2009-2023）
- 中断、异常与保护（`os.io.interrupt`，9 题，2010-2024）
- 空闲空间与位示图（`os.files.free-space`，6 题，2010-2025）
- 系统引导与虚拟机（`os.io.boot`，5 题，2013-2025）
- 管程与条件变量（`os.process.monitor`，2 题，2016-2018）
- 页面分配与局部性（`os.memory.allocation-page`，2 题，2015-2025）
- 进程通信与管道（`os.process.ipc`，1 题，2014）

### 计算机网络（12/30）

- FTP 与电子邮件（`cn.application.ftp-mail`，8 题，2009-2025）
- UDP 与端口复用（`cn.transport.udp`，6 题，2014-2025）
- HTTP 与 Web 连接（`cn.application.http`，6 题，2011-2024）
- NAT 与私有地址（`cn.network.nat`，5 题，2011-2025）
- ICMP 与网络诊断（`cn.network.icmp`，3 题，2010-2024）
- 物理层接口特性（`cn.foundations.interface`，2 题，2012-2018）
- 多路复用与码分多址（`cn.foundations.multiplex`，1 题，2014）
- IPv6 编址（`cn.network.ipv6`，1 题，2023）
- SDN 控制与数据平面（`cn.network.sdn`，1 题，2022）
- 网络安全与认证（`cn.application.security`，1 题，2025）
- 客户服务器与对等应用模型（`cn.application.models`，1 题，2019）
- PPP 与点到点链路（`cn.link.ppp`，0 题，-）

## 数据来源与核对方法

- 数据来源：
  - `apps/web/public/content/learning.json`：`concepts`（概念树，取 `level === "concept"` 的 102 个叶概念）、`cards`（记忆卡，按 `conceptIds` 计数）、`articles`（短讲解，按 `conceptId` 对应，其 `labPath` 计入实验链接）、`mappings`（题目→概念映射，统计每个概念的关联题目）。
  - `apps/web/public/content/2009.json` ~ `2025.json`：题包，提供题目 `year`；解析缺失判定为 `explanation` 中出现占位文字“本题解析暂缺文字版”。
  - `apps/web/src/app/lab-links.ts`：`QUESTION_LAB_LINKS`（题目→实验 destination），脚本用正则提取（共 35 条）。
  - `docs/learning/coverage.json`：交叉核对每个概念的题目数。
- 实验链接口径：与产品逻辑一致（`apps/web/src/app/concept-register.ts` 第 36–47 行 `buildConceptCatalog`）——概念的实验链接 = 该概念关联题目经 `questionLabLink(questionId)` 得到的 destination 去重，加上短讲解 `article.labPath`；TSV 中多个路径用逗号分隔。
- 脚本：`output/coverage-matrix-2026-11-25/build.mjs`，用 `node` 直接运行，只读数据文件，写出本 TSV 与 MD。
  - 题目→概念按 `mappings.conceptIds` 全量计入（一道题可关联多个概念），与 `coverage.json` 的题目数逐概念核对，全部一致。
  - 汇总：题包总题数 799、映射条目 799、映射中不在题包的题目 0 道、概念-题目配对 901、卡片-概念配对 80（记忆卡共 80 张）、落在 102 个概念上的解析缺失题 87 道。
- 实验链接抽查（独立于生成脚本、按行解析 `lab-links.ts` 重新查询，与 TSV 逐项一致）：
  - 流水线与相关冲突（`co.processor.pipeline`）：16 题中 cn408-2009-q18 有实验，`/lab?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock`。
  - 数据通路与微操作（`co.processor.datapath`）：15 题中 cn408-2009-q44 有实验，`/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5`。
  - TCP 拥塞控制（`cn.transport.congestion`）：10 题中 cn408-2009-q39 有实验，`/lab/network?module=tcp-congestion&preset=cn408-2009-q39`。
- 手工抽查（独立于生成脚本重新查询原始 JSON，与 TSV 逐项核对一致）：
  - `ds.foundations.stack`：15 题（2009-2025），解析缺失 2（cn408-2024-q02、cn408-2025-q02），记忆卡 1（card-ds-03），短讲解有；实验链接 2 条：题目 cn408-2009-q02 的 `/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02` 与短讲解 labPath `/lab/data-structures?module=stack-capacity`。
  - `ds.trees.btree`：12 题（2009-2025），解析缺失 1（cn408-2025-q08），记忆卡 1（card-ds-11），短讲解有、无实验链接。
  - `co.representation.float`：16 题（2009-2025），解析缺失 2（cn408-2024-q14、cn408-2025-q13），记忆卡 2（card-co-03、card-co-04），无短讲解；实验链接来自题目 cn408-2009-q13，`/lab?module=float32`。
  - `os.process.kernel`：17 题（2009-2023），解析缺失 0，记忆卡 1（card-os-01），无短讲解、无实验链接。
  - `cn.link.ppp`：0 题，无记忆卡、无短讲解、无实验链接（唯一零题概念）。

