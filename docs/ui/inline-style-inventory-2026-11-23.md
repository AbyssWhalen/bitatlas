# 组件内联样式清单（TSX 中的小字号、硬编码颜色、旧措辞与外露 ID）— 2026-11-23

> 任务背景：样式表中的小字号与硬编码颜色已由另一位成员迁移；本清单盘点写在组件代码（TSX）里的同类问题及旧措辞、外露 ID，供后续阶段使用。
>
> 约定：**只读盘点**，未修改任何源码/测试/配置。范围＝`apps/web/src/pages/` 与 `apps/web/src/components/` 下所有非测试 `.tsx`/`.ts` 文件（排除 `*.test.tsx`、`*.test.ts`）。行号与片段均为实际读取核实（Grep 工具在本机有漏报，全程改用 PowerShell `Select-String` + 逐行读取；每条记录前已用实际打开该文件行确认）。
>
> 四类总数：**① 小于 13px 的字号：5 条，涉及 2 个文件；② 硬编码颜色：19 条，涉及 3 个文件；③ 旧措辞：13 条，涉及 6 个文件；④ 外露 ID：8 条，涉及 6 个文件。**

---

## 1. 小于 13px 的字号

搜索方式：`fontSize`、`font-size`、`ctx.font` 全量 `Select-String`，再逐行读取判断具体数值。

| 文件 | 行号 | 代码片段 | 备注 |
|---|---|---|---|
| apps/web/src/components/KnowledgeGraph.tsx | 96 | `'font-size': 9,` | Cytoscape node 样式（普通节点 label） |
| apps/web/src/components/KnowledgeGraph.tsx | 111 | `'font-size': 10,` | Cytoscape node[root = 1] 样式（根节点 label） |
| apps/web/src/pages/DiskSchedulingLabPage.tsx | 221 | `<text fontSize="11" …>` | SVG 磁道条带左端刻度文字（fill="var(--muted)"） |
| apps/web/src/pages/DiskSchedulingLabPage.tsx | 222 | `<text fontSize="11" …>` | SVG 磁道条带右端刻度文字（fill="var(--muted)"） |
| apps/web/src/pages/DiskSchedulingLabPage.tsx | 235 | `<text fontSize="11" …>` | SVG 磁头位置标注文字（fill="var(--ink)"） |

本节小计：**5 条，涉及 2 个文件**（KnowledgeGraph.tsx 2 条、DiskSchedulingLabPage.tsx 3 条）。

未发现项与核对记录：
- 范围内**未发现** `ctx.font` 字符串（全仓 pages/components 无 `<canvas>` 2d context 用法，`getContext` 搜索 0 命中）。
- 内联 `style={{ … }}` 全量核对（14 处）：无 <13px 的 fontSize 命中（均为布局属性或 ≥13px 值）。
- 早期疑似命中（QamNyquistLabPage:43、StatsPage:55、ContentRenderer.tsx:83）经逐行读取确认为**误报**（分别是上下文误配、`0.8em` 相对字号而非 px 字面量、无该属性），未计入。
- KnowledgeGraph.tsx 其余 font-size 无（Cytoscape style 中仅 96/111 两处字号定义，均 <13px 且已全部列入）。

---

## 2. 硬编码颜色

搜索方式：`#hex`（3/4/6/8 位）、`rgb(`、`rgba(`、`hsl(`、`fill=`、`stroke=`、`fillStyle`、`strokeStyle`、内联 `color:`/`background:`/`border` 全量 `Select-String`，逐行读取判断是否颜色字面量。

| 文件 | 行号 | 代码片段 | 备注 |
|---|---|---|---|
| apps/web/src/components/KnowledgeGraph.tsx | 14 | `'data-structures': '#3ecf8e',` | subjectColors map 定义（科目分类色 1/4） |
| apps/web/src/components/KnowledgeGraph.tsx | 15 | `'computer-organization': '#f26d54',` | subjectColors map（2/4） |
| apps/web/src/components/KnowledgeGraph.tsx | 16 | `'operating-systems': '#e5b04a',` | subjectColors map（3/4） |
| apps/web/src/components/KnowledgeGraph.tsx | 17 | `'computer-networks': '#7aa5f0',` | subjectColors map（4/4） |
| apps/web/src/components/KnowledgeGraph.tsx | 21 | `if (value?.performance === null || value?.performance === undefined) return '#39443d';` | evidenceColor 函数（无数据节点底色） |
| apps/web/src/components/KnowledgeGraph.tsx | 22 | `if (value.performance < 0.5) return '#e8573f';` | evidenceColor 函数（<0.5 弱表现节点色） |
| apps/web/src/components/KnowledgeGraph.tsx | 23 | `if (value.performance < 0.8) return '#e5b04a';` | evidenceColor 函数（<0.8 中表现节点色） |
| apps/web/src/components/KnowledgeGraph.tsx | 91 | `'border-color': '#0a0e0c',` | Cytoscape node 边框色 |
| apps/web/src/components/KnowledgeGraph.tsx | 93 | `color: '#0c110e',` | Cytoscape node 文字色 |
| apps/web/src/components/KnowledgeGraph.tsx | 109 | `color: '#0c110e',` | Cytoscape 根节点文字色 |
| apps/web/src/components/KnowledgeGraph.tsx | 119 | `'border-color': '#edf3ee',` | Cytoscape node:selected 选中框色 |
| apps/web/src/components/KnowledgeGraph.tsx | 130 | `'line-color': '#46524b',` | Cytoscape edge 线色 |
| apps/web/src/components/KnowledgeGraph.tsx | 131 | `'target-arrow-color': '#46524b',` | Cytoscape edge 箭头色 |
| apps/web/src/components/ContentRenderer.tsx | 80 | `border: '1px solid #2e3a33',` | 内联 style（来源裁图卡边框色） |
| apps/web/src/components/ContentRenderer.tsx | 81 | `background: '#fff',` | 内联 style（来源裁图卡底色） |
| apps/web/src/pages/StatsPage.tsx | 16 | `['data-structures', '数据结构', '#3ecf8e'],` | subjects 数组（科目图例色 1/4） |
| apps/web/src/pages/StatsPage.tsx | 17 | `['computer-organization', '组成原理', '#f26d54'],` | subjects 数组（2/4） |
| apps/web/src/pages/StatsPage.tsx | 18 | `['operating-systems', '操作系统', '#e5b04a'],` | subjects 数组（3/4） |
| apps/web/src/pages/StatsPage.tsx | 19 | `['computer-networks', '计算机网络', '#7aa5f0'],` | subjects 数组（4/4） |

本节小计：**19 条，涉及 3 个文件**（KnowledgeGraph.tsx 13 条、ContentRenderer.tsx 2 条、StatsPage.tsx 4 条）。

边界说明（核对记录）：
- 范围内**未发现** `rgb()`/`rgba()`/`hsl()` 字面量（全量搜索 0 命中）。
- 范围内**未发现** canvas `fillStyle`/`strokeStyle`（无 canvas 2d context，`getContext` 0 命中）。
- StatsPage.tsx:95 的 `style={{ width: \`${percent}%\`, background: color }}` 引用 subjects 数组色，但该行本身无字面量，色值计入上方 16-19 行定义处，不重复计。
- SVG `fill=`/`stroke=` 全量核对（DiskSchedulingLabPage:220/222/235、BinaryTreeTraversalLabPage、DataStructuresLabPage、ForestBinaryRelationLabPage、MinHeapInsertLabPage、TcpCongestionLabPage、AppShell.tsx logo 等）：属性值全部为 `currentColor` 或 `var(--token)` CSS 变量（如 DiskSchedulingLabPage.tsx:220/222 的 `fill="var(--muted)"`、235 的 `fill="var(--ink)"`），**均不计入硬编码**。
- KnowledgeGraph.tsx:56 的 `color: evidenceColor(metric, subject)` 为函数调用（引用 21-24 源定义处），不重复计。
- 范围外 sanity check：apps/web/src/app/（App.tsx、main.tsx 等）无 hex/rgb 命中。

---

## 3. 展示给用户的旧措辞

搜索方式：`本地题包|本地可用|本地学习数据|本地资料` 全量 `Select-String`（范围 pages/components 非 .test），全部 13 处命中逐行读取确认，原样代码如下。

| 文件 | 行号 | 代码片段 | 备注 |
|---|---|---|---|
| apps/web/src/components/AppShell.tsx | 45 | `<div><span>本地题包 · {packs.length} 套</span><strong>{loading ? '载入中' : error ? '异常' : packs.length ? '本地可用' : '未安装'}</strong></div>` | 状态区题包状态（一行含"本地题包""本地可用"两个关键词；用户可见） |
| apps/web/src/components/AppShell.tsx | 56 | `<section className="loading-state"><span className="loader" /><p>载入本地学习数据</p></section>` | 加载态文案（用户可见） |
| apps/web/src/components/AppShell.tsx | 63 | `<div><strong>本地 2009 题包未安装</strong><span>{packs.length ? '可继续使用其他年份题库；2009 模考与人工复核入口暂不可用。' : '实验与本地资料仍可使用；安装题包后可开始练习。'}</span></div>` | 题包未安装横幅（"实验与本地资料仍可使用"分支文案；用户可见） |
| apps/web/src/pages/MorePage.tsx | 5 | `[['/documents', '本地资料'], ['/lab', '组成原理实验'], …]` 形式的 Link label 数组首项 | 更多页入口列表（"本地资料"入口文案；用户可见） |
| apps/web/src/pages/DashboardPage.tsx | 35 | `<Link to="/documents">本地资料</Link>`（command-row 快捷入口之一） | 今日首页快捷入口文案（用户可见） |
| apps/web/src/pages/DocumentLibraryPage.tsx | 20 | `return reason instanceof Error ? reason.message : '本地资料库操作失败';` | 错误提示兜底文案（用户可见） |
| apps/web/src/pages/DocumentLibraryPage.tsx | 52 | `setStatus(existingIds.has(imported.id) ? '该 PDF 已在资料库中' : 'PDF 已导入本地资料库');` | 导入结果状态文案（用户可见） |
| apps/web/src/pages/DocumentLibraryPage.tsx | 91 | `setStatus('PDF 已从本地资料库移除');` | 移除结果状态文案（用户可见） |
| apps/web/src/pages/DocumentLibraryPage.tsx | 102 | `<span className="eyebrow">LOCAL DOCUMENTS</span><h1>本地资料库</h1>`（页头） | 页面主标题（用户可见） |
| apps/web/src/pages/DocumentLibraryPage.tsx | 122 | `{loading ? <section className="loading-state"><span className="loader" /><p>载入本地资料</p></section> : …}` | 加载态文案（用户可见） |
| apps/web/src/pages/QuestionsPage.tsx | 139 | `<h2>本地题包未安装</h2>` | 空状态标题（用户可见） |
| apps/web/src/pages/SettingsPage.tsx | 91 | `<h2>{SERVER_MODE ? '共享资料库' : '本地资料库'}</h2>`（同函数内 eyebrow 与说明分支） | 设置页资料库区块标题（本地模式分支文案；用户可见） |
| apps/web/src/pages/SettingsPage.tsx | 92 | `<button className="secondary-command" onClick={…}>{SERVER_MODE ? '打开共享资料库' : '打开本地资料库'}</button>` | 设置页按钮文案（本地模式分支；用户可见） |

本节小计：**13 条，涉及 6 个文件**（AppShell.tsx 3、MorePage.tsx 1、DashboardPage.tsx 1、DocumentLibraryPage.tsx 6、QuestionsPage.tsx 1、SettingsPage.tsx 2）。

核对说明：
- SettingsPage.tsx:91/92 的文案为 `SERVER_MODE` 三元分支，服务器版下实际显示"共享"分支；"本地"字面量仅本地模式可见——按任务记录代码中存在的字符串，分支条件在备注中说明。
- AppShell.tsx:63 的"本地资料"出现在 `packs.length` 为 0 时的横幅分支文案中。
- DocumentLibraryPage.tsx:20 的 `'本地资料库操作失败'` 是 catch 兜底，正常流程不出 现，但用户异常时可见。

---

## 4. 把内部 ID 直接显示给用户的地方

搜索方式：`\.replace\(`、`\.slice\(`、`\.split\(`、`\.substring\(`、`\.padStart\(`、`\.join\(` 与 id/targetId/questionId 组合宽搜 + `\{xxx.id\}` 渲染形式全搜，逐行读取判断是否渲染给用户。

| 文件 | 行号 | 代码片段 | 备注 |
|---|---|---|---|
| apps/web/src/pages/CardReviewPage.tsx | 38 | `<li key={item.id}>{item.id}：首次 {ratings[0]?.rating === 1 ? '记得' : ratings[0]?.rating === 0.5 ? '模糊' : '忘记'}；共 {ratings.length} 次；下次 {due ?? '等待保存记录'}</li>` | 复习总结列表直接渲染卡片内部 ID（用户可见） |
| apps/web/src/pages/ReviewPage.tsx | 102 | `<Link to={`/questions?question=${source.questionId}`}>{source.questionId} · {source.locator}</Link>` | 来源与解释区：链接文本直接渲染完整内部 questionId（用户可见） |
| apps/web/src/pages/ReviewPage.tsx | 104 | `<p key={card.id}>已暂停：{card.id} <button …>恢复复习</button></p>` | 已暂停卡片区直接渲染内部 card.id（用户可见） |
| apps/web/src/pages/ContentReviewPage.tsx | 114 | `<dt>题目 ID</dt><dd>{question.id}</dd>` | 结构化元数据区直接渲染题目 ID（用户可见；管理页语境） |
| apps/web/src/pages/ContentReviewPage.tsx | 116-117 | `<dd>{question.assetIds.length ? question.assetIds.join('、') : '无独立资源'}</dd>` 与 `<dd>{question.knowledgePointIds.length ? question.knowledgePointIds.join('、') : '未标注'}</dd>` | 内部 ID 数组 join('、') 后展示（用户可见；管理页语境） |
| apps/web/src/components/DailyTasks.tsx | 56 | `<span>{question ? `${question.year} · 第 ${question.number} 题` : item.kind === 'question' ? item.targetId : `记忆卡 · ${item.targetId.replace('card-', '')}`}</span>` | 记忆卡任务 replace('card-','') 后渲染内部 ID（题目任务 targetId 无处理直接渲染）（用户可见） |
| apps/web/src/components/KnowledgeGraph.tsx | 50 | `label: node.questionIds[0] ? `Q${node.questionIds[0].slice(-2)}` : `${node.questionIds.length} 题`` | Cytoscape 节点 label：截取内部 questionId 末 2 位显示 |
| apps/web/src/pages/KnowledgePage.tsx | 209 | `<Link key={questionId} to={`/questions?question=${questionId}`}>{question?.year} Q{String(question?.number ?? questionId.slice(-2)).padStart(2, '0')}</Link>` | 知识页题目链接：questionId 末 2 位 + padStart 显示（fallback 时外露） |

本节小计：**8 条，涉及 6 个文件**（CardReviewPage.tsx 1、ReviewPage.tsx 2、ContentReviewPage.tsx 2、DailyTasks.tsx 1、KnowledgeGraph.tsx 1、KnowledgePage.tsx 1；ContentReviewPage 的 116-117 按两行合并 1 条计）。

补充事实（紧邻同类行为，未计入总数）：
- KnowledgePage.tsx:239 渲染 `<Link to={`/questions?question=${source.questionId}`}>{source.questionId}</Link>`——链接文本是完整内部 ID 且**无任何处理**，同样外露；因任务类 4 聚焦"replace/slice/split 后渲染"形态，此行以直接渲染记录在此。
- ContentReviewPage.tsx:114 的 `{question.id}` 亦是无加工直接渲染（已按行列入表中）。

---

## 复查方法论记录

- 所有命中行号均经 `Select-String` 搜索 + 打开文件读取该行确认后记录；未凭印象写任何行号。
- Grep 工具在本仓历史任务中出现过漏报（见 contract-inventory 任务记录），本清单全程使用 PowerShell `Select-String`。
- 文件路径存在性经 `Test-Path`/`Get-ChildItem` 逐一确认。
- 早期搜到的疑似命中（QamNyquistLabPage.tsx:43 fontSize、StatsPage.tsx:55、ContentRenderer.tsx:83）经逐行读取确认为**误报**（上下文误配或无该属性），未计入。另外 KnowledgeGraph / StatsPage 曾以粗略行段记录（如"137-140"、"15-20"），最终以逐行读取的当前实际行号（14-17、16-19 等）重核重写。
- ContentRenderer.tsx 的内联样式块（74-99 区间）经完整阅读，仅 80/81 两行属硬编码颜色；该文件无 <13px 字号。
