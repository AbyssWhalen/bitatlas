# 2024 年 40 道缺解析单选题补充解析草稿审阅说明（2026-11-25）

- 草稿文件：`content/learning/drafts/supplements-2024-draft-2026-11-25.mjs`
- 设计合同：`docs/learning/question-supplements-design-2026-11-25.md`（学习包 `formatVersion: 2` 的 `QuestionSupplement` 结构）
- 完成进度：**已完成全部 40 题（`cn408-2024-q01` 至 `cn408-2024-q40`，40 / 40）**
- 当前状态：全部条目均为 `authorship: 'ai-assisted'`、`reviewStatus: 'needs-review'`，仅落地为独立草稿模块，**未修改** `content/learning/learning.json`、`apps/web/public/content/2024.json` 或任何既有跟踪文件。

## 1. 答案核对与“答案存疑”结论

- **答案存疑题目：0 题**。
- 40 道单选题（`cn408-2024-q01`～`cn408-2024-q40`）已逐一对照原卷答案扫描页 `apps/web/public/content/cn408-2024/source/answers-1.jpg`（1–40 总表）与 `apps/web/public/content/2024.json` 中的 `answer.optionId`，两处 40/40 完全一致；独立推导与数值验算得到的选项同答案键 40/40 全部吻合，无反向强行凑答案情形。

## 2. 其他存疑与题干勘误线索（`doubts` 共 2 条）

1. **`cn408-2024-q20`（组成原理 · 总线带宽，答案键 `B` = `6.72GB/s`）**
   - 存疑点：题干同时给出了时钟频率 `420MHz`、每周期传 2 次、总线宽 64 位，以及单次突发传输 64B 的具体周期分布（第 1 周期传地址、第 2～3 周期传数据、第 4～7 周期等待，共 7 个周期）。按 408 教材“总线带宽 = 总线最大数据传输率（峰值带宽）”定义（同 `cn408-2014-q19` 口径），计算得 `420×10⁶ × 2 × 8B = 6.72GB/s`（答案键 `B`）；若按单次非重叠突发事务的 7 周期有效数据传输率计算，则为 `6.72 × 4/7 = 3.84GB/s`（干扰项 `A`）。草稿正文按答案键 `B` 讲清峰值带宽口径并说明 `A` 的来源，`doubts` 记录该口径边界供复核。
2. **`cn408-2024-q36`（计算机网络 · 802.11 CSMA/CA 与 NAV，答案键 `B` = `354μs`）**
   - 存疑点（**重构卷题干排版错印**）：目视核查 `apps/web/public/content/cn408-2024/source/paper-4.jpg` 可见，来源重构卷 `2024.pdf` 本身把原题条件“`DIFS=128μs，SIFS=28μs`”错排成了“`DIFS=128s，SIFS≥28μs`”（同时把 CTS 的 `2μs` 排作 `2us`），导致 `2024.json` 继承了该错印。由四个选项的精确算术差（`T_DATA = 1998×8÷54 = 296μs`，`B: 354 = 28 + 296 + 28 + 2`，`354 - 326(A) = 28`，`513(D) - 385(C) = 128`）可严格反推原卷参数为 `DIFS=128μs`、`SIFS=28μs`。草稿已在正文首句提示并在 `doubts` 登记，建议后续作为 `errata` 或复核队列条目处理。

## 3. 已目视核查的原卷扫描图清单

为确保含图题、代码题、上下标题与答案键准确，本轮直接读取并核对了以下扫描页/裁图：

| 文件路径 | 核查内容与结论 |
|---|---|
| `apps/web/public/content/cn408-2024/source/answers-1.jpg` | 核对选择题 1–40 参考答案总表，与 `2024.json` 40/40 一致 |
| `apps/web/public/content/cn408-2024/source/paper-1.jpg` | 核对 Q01–Q07 题干，确认 `题 4 图` 邻接多重表 7 个边结点 `(0,1),(0,3),(1,3),(2,0),(3,2),(4,2),(4,3)`（`deg(b)=2, deg(d)=4`）及 `题 7 图` 二叉排序树结构（`k3 < x < k2`） |
| `apps/web/public/content/cn408-2024/source/paper-2.jpg` | 核对 Q08–Q18 题干，确认 Q12 C 语言变量声明与输出、Q14 指数 `±2²⁰` 与 `±2⁴⁰` 上标未丢字 |
| `apps/web/public/content/cn408-2024/source/paper-4.jpg` | 核对 Q32–Q37：确认 `题 33 图` 两端 `10Mb/s` 接入链路与中间 `1000Mb/s / 1Mb/s / 100Mb/s` 三条支路；确认 `题 35 图` 交换机 VLAN1/2/3 端口范围及 H1–H7 的 IP/MAC（H4 在 VLAN1，D 项 H6 在 VLAN3）；确认 Q36 重构卷排印错字 `DIFS=128s，SIFS≥28μs` |
| `apps/web/public/content/cn408-2024/source/paper-5.jpg` | 核对 `题 37 图` SR 滑动窗口时序：初始发 F0–F3（F1 丢失、ACK3 丢失），ACK0 到达后 `t1` 发新入窗帧 `F4`，`t2`（标注“F1 超时”）选择重传 `F1` |

*注：还顺带留意到 `2024.json` 中两处不影响解题的轻微文本瑕疵：`cn408-2024-q32` 题干含多余中文引号 `400“` / `算法“`，`cn408-2024-q40` 题干将“该页中引用”提取为“该顶中引用”。*

## 4. 自检方式与验算覆盖

通过 Node 校验脚本对导出的 `questionSupplementDrafts2024`（40 条）执行了结构与算例断言：

1. **结构与元数据合同**：
   - 条目数恰为 40，按 `cn408-2024-q01`～`cn408-2024-q40` 升序排列；`id`（`supplement:cn408-2024-qXX`）与 `(questionId, questionContentVersion)` 全部唯一。
   - `questionContentVersion` 全部精确绑定 `2024.0-draft.2`；`sources` 均包含 `answer` 与 `question` 两条记录，其 `documentSha256`、`pages`、`locator` 与 `2024.json` 完全一致。
   - 每条 `body` 首句均为 `答案选 X。` 且 `X` 与 `2024.json` 的 `answer.optionId` 严格相等，均含 `\n其他选项：` 干扰项辨析，无控制字符或乱码。
   - 全部保持 `kind: 'supplement'`、`authorship: 'ai-assisted'`、`reviewStatus: 'needs-review'`。
2. **重点数值与程序验算**：
   - Q04 邻接多重表各顶点频次统计、Q06 KMP `nextval` 失配右滑距离、Q09 小根堆两次删除堆顶比较分析、Q10 二路归并最少 5 次比较、Q12 `short`/`unsigned short` 补码与整型提升、Q14 IEEE 754 阶码位宽与精度、Q17 `38 - 12 - 7 = 19` 位 TLB 标记、Q20 `6.72GB/s` 与 `3.84GB/s`、Q30 时间片轮转 `250ms` 完成时刻、Q32 CSCAN `200 + 399 + 189 = 788`、Q36 `28 + 296 + 28 + 2 = 354μs`、Q38 `4×0.01s + 2×30s = 60.04s`、Q39 UDP 反码求和取反 `1110 0000 1000 0011`、Q40 非持久串行 HTTP/1.0 `(1+7)×2 = 16 RTT`。

## 5. 已知局限与后续交接

- `2024.json` 中 `source.answer.locator` 带历史导入注记 `answer table (page 1 assumed); answer N`（见 `docs/content-answer-verification-2026-11-25.md`），本次按设计合同原样继承，未改动题包源文件。
- 本批全部为 `ai-assisted` / `needs-review` 草稿，待拿铁完成 `formatVersion: 2` 工程支持及独立 AI 复核流程后再决定并入学习包。
