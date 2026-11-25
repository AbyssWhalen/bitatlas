# 2024/2025 年缺解析选择题：概念对应与讲解覆盖（2026-11-25）

逐题清单见 [missing-explanations-2026-11-25.tsv](missing-explanations-2026-11-25.tsv)，共 80 行。

- **总题数**：80 题，2024 年 40 题、2025 年 40 题，与参考值一致，无差异；全部为 single-choice，占位解析判定为解析文字含「本题解析暂缺文字版」。
- **按科目分布**：数据结构 22 题（两年各 11）、计算机组成原理 22 题（各 11）、操作系统 20 题（各 10）、计算机网络 16 题（各 8）。
- **短讲解覆盖**：26/80 题的关联概念中至少有一个已有短讲解（判定口径：任一关联概念存在 article；若要求全部关联概念都有讲解则为 23 题），其余 54 题的关联概念均无短讲解。80 题共关联 61 个不同叶概念。
- **关联题数最多的 5 个概念**（各 3 题；其后另有 16 个概念各 2 题、40 个概念各 1 题）：
  1. `co.memory.virtual` 虚拟地址、页表与 TLB
  2. `co.representation.integer` 整数编码、扩展与溢出
  3. `os.files.file-open` 文件打开、读写与权限
  4. `os.memory.paging` 分页、分段与地址转换
  5. `os.process.state` 进程状态与切换

数据来源（只读）：`apps/web/public/content/2024.json`、`apps/web/public/content/2025.json`、`apps/web/public/content/learning.json`（concepts/mappings/cards/articles）。

生成脚本：`output/missing-explanations-2026-11-25/build.mjs`（以上数字均由脚本算出）。

手工抽查 2 题与原始 JSON 一致：`cn408-2024-q01`（答案 D，映射 `ds.foundations.list`，无讲解，1 张记忆卡）；`cn408-2025-q38`（答案 A，映射 `cn.transport.tcp-flow,cn.transport.congestion,cn.transport.tcp-sequence`，均无讲解，共 3 张记忆卡）。
