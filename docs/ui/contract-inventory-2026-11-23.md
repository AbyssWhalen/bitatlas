# 界面契约清单（测试依赖盘点）— 2026-11-23

> 任务背景：BitAtlas 前端外壳即将改版（左侧栏改顶部导航、今日首页、练习页、记忆卡页、知识页改版）。本文件盘点**现有测试**实际依赖的界面契约（CSS 类名/选择器、可访问名称与角色、界面文案），避免改版导致大面积挂测试。
>
> 约定：**只读盘点**，未修改任何源码/测试/配置。行号与文件路径均为实际搜索核实（`Select-String`、逐行读取；Grep 工具在本环境出现假阴性已弃用）。
>
> 覆盖范围：
> - `tests/e2e/*.spec.ts`（29 个）
> - `tests/server-e2e/account-flow.spec.ts`（该目录仅此 1 个）
> - `apps/web/src/**/*.test.ts(x)`（14 个单测：DashboardPage、PracticePage、MockExamPage、MockExamSessionPage、KnowledgePage、SettingsPage、ContentReviewPage、StudyContext、brand、BinaryTreeTraversalLabPage、CompleteBinaryTreeLabPage、review-question、lab 包早期两文件等）
> - `tools/verification/` 中含 UI 契约的脚本：`pwa-upgrade.mjs`、`request-sync-browser.mjs`、`ui-style-regression.mjs`、`server-pwa.ts`、`windows-dev.mjs`；其余（server-browser.ts、server-content-audit.ts、server-load.ts、server-fixture.ts、project-storage.mjs、backup-smoke.ts、archive-manifest.mjs、install-server.mjs、package-server.mjs、unpack-server-release.mjs、verify-server-release.mjs）经核实**无 UI 选择器/名称/文案依赖**。
>
> 表列说明：**契约内容**为测试代码中出现的字符串（原样照抄）；**类别**＝CSS 类名或选择器 / 可访问名称与角色 / 界面文案 / 路由；**依赖它的测试文件及行号**；**出现次数**＝该契约在全部盘点测试代码中的总行数。

---

## 1. AppShell（侧栏、主导航、移动端导航、状态区、题包未安装横幅）

> 源码核实：`apps/web/src/components/AppShell.tsx`（388 行）。侧栏容器 `<aside class="sidebar-primary">`，**无 `.sidebar` 类**；品牌区 `.brand-block > .brand-mark > img`；桌面 `<nav class="primary-nav" aria-label="主导航">`；移动端 `<nav class="mobile-nav" aria-label="移动端导航">`（5 项：今日/题库/复习/知识/更多）；内容区 `.app-shell > .main-area`；题包未安装横幅 `.content-unavailable-banner`；ReportError 组件渲染 `.fatal-state`。

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| `.app-shell`（`getComputedStyle` 高度契约：`appMinHeight:'0px'` / `.practice-shell` `'100%'`） | CSS 类名 | study-flow.spec.ts:451 | 1 |
| `.main-area`（scroll/viewport 契约：`--viewport-960` 布局断言、`getBoundingClientRect`/`boundingBox`） | CSS 类名 | binary-tree-traversal-lab:9,27; bus-bandwidth-lab:5; complete-binary-tree-lab:9,27; cpu-extended-labs:5,18; csma-cd-collision-lab:9,27; data-structures-lab:13; deadlock-lab:9,27; filesystem-links-lab:9,27; forest-binary-relation-lab:9,28(io-overhead-lab 同模式 9,27); memory-expansion-lab:9,27; micro-operations-lab:11,29; min-heap-insert-lab:9,33; mock-exam:98; pipeline-lab:5,105; protocol-labs:9,18; qam-nyquist-lab:5; segmentation-address-lab:5; semaphore-lab:9,27,108; sort-pass-analysis-lab:9,27; stack-capacity-lab:9,27; system-labs:30; visual:158 | 40 行（23 个 spec 文件） |
| `.mobile-nav` | CSS 类名 | complete-binary-tree-lab:95; deadlock-lab:87; filesystem-links-lab:105; learning-loop:197; min-heap-insert-lab:104; mock-exam:117; semaphore-lab:106,109; study-flow:162,466; stack-capacity-lab:95; visual:156,159 | 13 |
| `.mobile-nav a` count**=5** | CSS 类名+数量契约 | learning-loop:197; mock-exam:117; study-flow:162,466; ui-style-regression.mjs:158,81（`assert.equal(state.mobileNavLinks, 5)` 遍历全部 12 路由） | 6 |
| `.mobile-nav` `position: static` | CSS 布局契约 | complete-binary-tree-lab:95; deadlock-lab:87; filesystem-links-lab:105; min-heap-insert-lab:104; semaphore-lab:106; stack-capacity-lab:95; visual:156（`toHaveCSS('position','static')`） | 7 |
| `.brand-block strong` 文本=`'BitAtlas'` | CSS 类名+界面文案 | code-only-mode.spec.ts:18（`toHaveText('BitAtlas')`） | 1 |
| `.brand-mark img` naturalWidth>0（图标加载成功） | CSS 类名 | code-only-mode.spec.ts:19; account-flow.spec.ts:64; server-pwa.ts:60 | 3 |
| `.content-unavailable-banner` `toContainText('本地 2009 题包未安装')` | CSS 类名+界面文案 | code-only-mode.spec.ts:24 | 1 |
| heading `'本地 2009 题包未安装'`（empty-state 标题，/review/2009 页） | 界面文案 | code-only-mode.spec.ts:32; ContentReviewPage.test.tsx:159 | 2 |
| link `'进入实验'`（题包缺失时的降级入口） | 可访问名称与角色 | code-only-mode.spec.ts:35 | 1 |
| button `'继续学习'` disabled（题包缺失态） | 界面文案 | code-only-mode.spec.ts:29 | 1 |
| `.fatal-state` count=0（codename fail-closed） | CSS 类名 | code-only-mode.spec.ts:28,33; ContentReviewPage.test.tsx:163（`.warning-text` selector+not.toBeInTheDocument） | 3 |
| `getByRole('link', { name: '更多', exact: true })` | 可访问名称与角色 | study-flow.spec.ts:85（followNav 辅助函数：当 `a[href]` 不可见时点击“更多”展开） | 1 |
| `a[href="…"]:visible` 导航模式（href 值不限定具体页面） | 选择器模式 | study-flow.spec.ts:85,86（followNav）；request-sync-browser.mjs:61,63（navigate helper）；pwa-upgrade.mjs:92（`a[href="/questions"]:visible`） | 5 |
| `getByRole('navigation', { name: '主导航' | '移动端导航' })`；aria-label`"主导航"`/`"移动端导航"` | 可访问名称与角色 | **未发现** | 0 |
| `.sidebar`、`.primary-nav`（作为测试定位选择器） | CSS 类名 | **未发现**（源码侧栏类名是 `sidebar-primary`，也无测试使用 `sidebar` / `primary-nav` 定位；改版去掉/重命名侧签不直接冲突，但注意 study-flow:85 的 “更多” 链接在不同的布局下的 visible 状态） | 0 |
| `.task-list`（今日任务列表）、`.metric-grid`、`page-header`、`nav-item`、`sidebar-status`、`app-bar`、`reading-preferences` | CSS 类名 | **未发现**（无测试直接定位这些类；`.task-list` 仅在 ui-style-regression.mjs:18 作为 ready 选择器出现（见 §13） | 0（task-list 1 处 ready 选择器） |

---

## 2. ReadingPreferences（正文字号控件）

> 源码核实：`apps/web/src/components/ReadingPreferences.tsx`（100 行）。结构 = 触发按钮（`${fontSize}px` 文本 + `aria-label="正文字号"`）由 label 关联 `<select aria-label="正文字号">`；字号类型为 number select（选项值 12–32），落 CSS 变量 `--reading-font-size`。**控件明文暴露在页面上（不在弹出菜单里）。**

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| `getByLabel('正文字号')` + `selectOption('24')` / `selectOption('18')` | 可访问名称与角色 | learning-loop.spec.ts:198（`selectOption('24')`）; ui-style-regression.mjs:157,164 | 3 |
| `--reading-font-size` CSS 变量=24px/18px 断言 | CSS 契约（变量） | ui-style-regression.mjs:170,177（`getComputedStyle(document.documentElement).getPropertyValue('--reading-font-size')`） | 2 |
| `.memory-preview .content-blocks` font-size=24px | CSS 类名+样式契约 | learning-loop.spec.ts:201 | 1 |
| `.reading-preferences`（类名/选择器形式） | CSS 类名 | **未发现** | 0 |
| `getByRole('button', { name: '正文字号' })` | 可访问名称与角色 | **未发现**（当前控件是 select+l abel 结构，非按钮） | 0 |

> 改版提示：字号控件若移入顶栏菜单（select 打开方式变化），learning-loop:198 与 ui-style-regression:157,164 的 `getByLabel('正文字号')` 直达操作会失败，除非保留 `<select aria-label="正文字号">` 可达。CSS 变量 `--reading-font-size` 是 ui-style-regression 的截图对比基准，必须保留。

---

## 3. DashboardPage（今日首页）

e2e：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'今日学习'` | 界面文案 | visual.spec.ts:39; learning-loop.spec.ts:173; account-flow.spec.ts:10,210; request-sync-browser.mjs:56; ui-style-regression.mjs:131 | 6 行（5 个文件） |
| button `/开始剩余 [1-9]/`（regex）与 `'开始剩余 8 题'`（精确文本） | 界面文案 | learning-loop.spec.ts:21,27; learning-reliability.spec.ts:40,57,84; study-flow.spec.ts:147,150; account-flow.spec.ts:11,68,211; request-sync-browser.mjs:57; server-pwa.ts:30; windows-dev.mjs:33; ui-style-regression.mjs:132 | 16（8 个文件） |
| button `'开始剩余 0 题'` disabled（学完态） | 界面文案 | learning-reliability.spec.ts:40（`'开始剩余 0 题'` toBeDisabled） | 1 |
| button `'复习 3 张卡片'` | 界面文案 | learning-loop.spec.ts:22; learning-reliability.spec.ts:24; pwa-upgrade.mjs:58 | 3 |
| heading `'今日任务'` | 界面文案 | study-flow.spec.ts:144 | 1 |
| link `'实验室'` href`/lab`（首页尾部链接） | 可访问名称与角色+路由 | DashboardPage.test.tsx:76 | 1 |
| button `'继续学习'`（e2e 未直接断言，单测为主） | 界面文案 | DashboardPage.test.tsx:67,77（见下表） | — |

单测（`apps/web/src/pages/DashboardPage.test.tsx`，170 行）：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| `getByRole('region', { name: '今日任务' })` | 可访问名称与角色 | DashboardPage.test.tsx:94,112,137,141 | 4 |
| region 今日任务 内 `已完成`、`不可用：内容缺失、暂停或版本变化` | 界面文案 | DashboardPage.test.tsx:95,113 | 2 |
| `region '学习概况'` + `已练题目 0 / 2` 等 metric 文本 | 可访问名称与角色+文案 | DashboardPage.test.tsx:156,160 | 2 |
| button `'继续学习'`（enabled→disabled） | 界面文案 | DashboardPage.test.tsx:67,77 | 2 |
| button `'开始剩余 2 题'` / `'开始剩余 1 题'` / `'开始剩余 0 题'`(disabled) | 界面文案 | DashboardPage.test.tsx:68,102,115,128,132 | 5 |
| `DAILY PLAN` 日期文案（`2026-10-04 · DAILY PLAN`） | 界面文案 | DashboardPage.test.tsx:127,131,146 | 3 |
| `学习包或题包不可用` 警告文本 | 界面文案 | DashboardPage.test.tsx:75 | 1 |

---

## 4. DailyTasks（今日任务条）

并入 §3 DashboardPage 表（region '今日任务' 契约主承载者是单测）。e2e 侧辅助契约：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'今日任务'` | 界面文案 | study-flow.spec.ts:144 | 1 |
| `.daily-plan-section li` filter `/第 \d+ 题/` count=8、first 包含 `第 1 题` | CSS 类名+文案 | study-flow.spec.ts:145,146 | 2 |
| `.task-list`（作为 ui-style-regression 的页面 ready 选择器，即 DashboardPage 的主要列表容器） | CSS 类名 | ui-style-regression.mjs:18 | 1 |

---

## 5. PracticePage（练习页）

e2e（study-flow.spec.ts 主体 + document-reader/learning 系列）：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'真题浏览'` | 界面文案 | study-flow.spec.ts:92; pwa-upgrade.mjs:30 处源码替换、93,104（`真题浏览（验收 A/B）`） | 4 e2e/脚本行 |
| heading `'无法恢复练习'` | 界面文案 | study-flow.spec.ts:670,680 | 2 |
| `.question-list .question-row` count=47（首题 `'01'`、末题 `'47'`） | CSS 类名+数量+文案 | study-flow.spec.ts:94,95,96,107 | 4 |
| `.wrong-list .question-row`（`错误 1 次`、`打印机` 文案） | CSS 类名+文案 | study-flow.spec.ts:376,377,378 | 3 |
| `.result-summary strong` 文本=`'47'` | CSS 类名+文案 | study-flow.spec.ts:93 | 1 |
| `.practice-topbar`（`strong` 题号计数） | CSS 类名 | study-flow.spec.ts:113,114,120,128,129,151; ui-style-regression.mjs:19（ready 选择器） | 7 |
| `.palette-grid button` count=8 | CSS 类名+数量 | study-flow.spec.ts:152 | 1 |
| `.question-workspace` inert 属性契约 | CSS 类名 | study-flow.spec.ts:129 | 1 |
| `.answer-status`（`自评 10 分`、`回答错误` 文案） | CSS 类名+文案 | study-flow.spec.ts:497,531,542 | 3 |
| `.option-list button`（nth 点击、`selected` class、disabled；数量断言） | CSS 类名 | study-flow.spec.ts:329,529,533,535,536,541 | 6 |
| button `'开始第 1 题'`（题目列表中） | 界面文案 | study-flow.spec.ts:119; request-sync-browser.mjs:164; server-pwa.ts:34; ui-style-regression.mjs:135 | 4 |
| button `'开始第 41 题'` | 界面文案 | pwa-upgrade.mjs:63 | 1 |
| button regex `/原卷第/`（来源页触发器） | 界面文案 | study-flow.spec.ts:122; PracticePage.test.tsx:330,345,360 | 4 |
| dialog `'来源页'`、button `'关闭'`、`焦点圈套（inert）`、`PDF 画布` | 可访问名称与角色 | study-flow.spec.ts:124,125,127; PracticePage.test.tsx:333,335,347,361 | 7 |
| button `'提交答案'` / `'查看统计'` / `'结束'` / `'重试保存'` / `'重新读取'` / `'返回真题'` / `'重新读取最新进度'` | 界面文案 | PracticePage.test.tsx:317,318,376（返回真题）,386（重新读取）,436,438（重试保存）,484（重新读取最新进度）,499（结束）,520,521,523,547（提交答案）——study-flow.spec.ts 无这些按钮 | ≥14 |
| `getByPlaceholder('记录易错点')` | 可访问名称与角色 | pwa-upgrade.mjs:67,82,102,107,110; server-pwa.ts:38,47,59,62 | 9 |
| heading `'笔记'`（点击保存笔记） + `toHaveText('已保存')` | 可访问名称与角色+文案 | pwa-upgrade.mjs:95; server-pwa.ts:48; request-sync-browser.mjs:168 | 3 |
| button `'更多'`（followNav 折叠导航入口，非练习页按钮） | 可访问名称与角色 | study-flow.spec.ts:85 | 1 |
| heading `'练习已结束'` 状态区 | 界面文案 | PracticePage.test.tsx:490 | 1 |

单测（PracticePage.test.tsx，603 行）补充契约（行号全部经 Select-String 核实）：
- `'作答草稿'` label（textarea 关联）——PracticePage.test.tsx:206
- button `'查看参考答案'`——PracticePage.test.tsx:207,208
- button `'完成自评'`——PracticePage.test.tsx:232,252,272
- `getByRole('alert')` 文案系列（行号↔文案精确对应）：`请输入 0 到 10 之间的分数`（250）、`回答错误`（321）、`未找到练习会话`（374）、`IndexedDB 读取失败`（381 声明 mock,385 断言）、`cn408-2009-q99`（394 mock,398 断言）、`/题面版本未知|legacy version/`（409）、`/题面版本不一致|mismatch/`（421）、`quota exceeded`（427 mock,434 断言）、`temporary failure`（445 mock,452 断言）、`另一标签页已更新此练习`（479,501）、`回答正确`（489, getByText）、`练习已结束`（490,517）
- button `'打开第二个会话'`（多标签页测试）——PracticePage.test.tsx:544,561
- 交叉标签同步文本 `'第二个会话题干'`——PracticePage.test.tsx:100,562,573

---

## 6. CardReviewPage（记忆卡页）

> e2e 中 `/review/cards/*` 的交互按流程分散在 learning-loop、account-flow、request-sync-browser、pwa-upgrade：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'笔记'`（点击保存笔记，exact:true） | 界面文案 | account-flow.spec.ts:38,137; learning-loop.spec.ts:103,105; pwa-upgrade.mjs:95; request-sync-browser.mjs:168; server-pwa.ts:48 | 7 |
| heading `'本轮总结'` | 界面文案 | learning-loop.spec.ts:34 | 1 |
| heading `'本轮复习总结'` | 界面文案 | learning-loop.spec.ts:54,69 | 2 |
| region `'本轮证据'` 且包含 `'1 次有效客观首答'` | 可访问名称与角色+文案 | learning-loop.spec.ts:35 | 1 |
| `getByLabel('错因 cn408-2009-q01', { exact: true })` + selectOption `'concept'` | 可访问名称与角色 | learning-loop.spec.ts:36 | 1 |
| heading `/本轮/`、`/短讲解/` | 界面文案 | account-flow.spec.ts:74,76 | 2 |
| `.flashcard` | CSS 类名 | request-sync-browser.mjs:138（离线重开可见断言） | 1 |
| button `'记得'`（exact） | 界面文案 | learning-loop.spec.ts:208; account-flow.spec.ts:44,141; request-sync-browser.mjs:131 | 5 |
| button `'忘记'`（exact） | 界面文案 | learning-loop.spec.ts:46,52 | 2 |
| button `'查看解释'` | 界面文案 | learning-loop.spec.ts:45,49,51,205,206; account-flow.spec.ts:43,140; request-sync-browser.mjs:130 | 10 |
| button `'加练本组 1 张'` | 界面文案 | learning-loop.spec.ts:42,90 | 2 |
| button `'加练本组 2 张'` | 界面文案 | learning-loop.spec.ts:203 | 1 |
| 文案 `完成 N / 10 张` | 界面文案 | request-sync-browser.mjs:132,139 | 2 |
| `.memory-preview`（count、toContainText '我自己的循环队列'） | CSS 类名 | learning-loop.spec.ts:41,76,83,88,200,201; ui-style-regression.mjs:21（ready 选择器） | 7 |

---

## 7. ReviewPage（复核页 = /review 复习中心）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'复习中心'` | 界面文案 | account-flow.spec.ts:90 | 1 |
| button `'加练本组 2 张'`（进入卡片） | 界面文案 | learning-loop.spec.ts:203 | 1 |
| `/review` 路由 + `?concept=` 查询参数 | 路由 | learning-loop:199; account-flow:89; request-sync-browser:127; [server 验证脚本详表 §13] | 3+ |

---

## 7a. ReviewPage 系列：ContentReviewPage（2009 内容复核页 /review/content）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'2009 内容复核'` | 界面文案 | content-review.spec.ts:54; visual.spec.ts:215 | 2 |
| ContentReviewPage.test.tsx 契约群（单测 195 行内 40+ 处 getByRole/getByText） | 可访问名称与角色/文案 | ContentReviewPage.test.tsx:159,160,161,172,181,199,202,204-207,216,224,227,260,262,263,282,285,287,295,297,303,304,309,311,313,321,324,328,332,335,342,350,351,354,355,356,365,367,368,370,371,373,376 | 41 处 |

> ContentReviewPage.test.tsx 中典型契约：tab（`'全部 3'` 等 tab 名）、button（`'第 1 题'`、`'下一道待复核'`、`'通过复核'`、`'保存草稿'`、`'上一题'`、`'下一题'`）、alert（`'复核记录冲突'`）、`.warning-text`、`.fatal-state`。

---

## 8. KnowledgePage（知识页）

e2e：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'知识证据图'` | 界面文案 | study-flow.spec.ts:158,177; visual.spec.ts:55; [单测 KnowledgePage.test.tsx:19 heading] | 4 |
| heading `'操作系统'`（detail 面板科目名） | 界面文案 | study-flow.spec.ts:187,212,252,271 | 4 |
| heading `'磁盘调度与访问时间'`（记忆卡面板） | 界面文案 | study-flow.spec.ts:195,203,220,235,263; visual.spec.ts:78 | 6 |
| heading `'主存芯片与地址译码'` | 界面文案 | study-flow.spec.ts:178 | 1 |
| `.knowledge-topic-list`（button count=28；`已检测 0 / 28`） | CSS 类名+数量 | study-flow.spec.ts:160,164; visual.spec.ts:78 | 4 |
| `.knowledge-coverage` `已检测 N / 28` 文案 | CSS 类名+文案 | study-flow.spec.ts:161 | 1 |
| `.knowledge-detail-panel h2` 文本 | CSS 类名 | study-flow.spec.ts:165 | 1 |
| `/knowledge?subject=…` 路由 | 路由 | study-flow:156,180,189,197,205,214,222,250,260,269; visual:54,80 | 12 |
| button `'操作系统科目总览'`（exact；aria-pressed 契约 241,254,264,272）+ `expectPressedPartition` 辅助（subject topic 按钮组选中态） | 可访问名称与角色 | study-flow.spec.ts:237-272（overview 定义 237-240、断言 241-272） | 15+ |
| `.knowledge-graph-canvas canvas` | CSS 类名 | ui-style-regression.mjs:22 | 1 |

单测（`apps/web/src/pages/KnowledgePage.test.tsx`，330 行）：

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'知识证据图'` | 界面文案 | KnowledgePage.test.tsx:19 | 1 |
| `科目选择`（改变 subject 的操作契约） | 可访问名称与角色 | KnowledgePage.test.tsx:127-135（科目切换多轮测试）、186-215 | — |
| `getByRole('region')` 科目分组 | 可访问名称与角色 | KnowledgePage.test.tsx:127,187 | 2 |
| 卡片文案（`总览`、`第一卡片`、`磁盘调度`等 topic 名） | 界面文案 | KnowledgePage.test.tsx:19,20,120-135 间各断言 | — |

---

## 9. StatsPage（统计页）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'学习统计'` | 界面文案 | study-flow.spec.ts:381; visual.spec.ts:47 | 2 |
| `/stats` 路由 | 路由 | study-flow:380(followNav); learning-reliability:61; visual:46; ui-style-regression.mjs:23 | 4 |
| `.heatmap span` count=84 | CSS 类名+数量 | visual.spec.ts:48; ui-style-regression.mjs:23（ready 选择器 `.heatmap span`） | 2 |
| `.heatmap span[data-level="1"]` count=1 | CSS 类名+属性选择器 | study-flow.spec.ts:385 | 1 |
| `.heatmap-meta` 包含日期文案（`2026-11-21`/`2026-11-24`） | CSS 类名+文案 | learning-reliability.spec.ts:62,65 | 2 |

---

## 9a. 错题页（/wrong）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'错题重练'` | 界面文案 | study-flow.spec.ts:375 | 1 |
| `/wrong` 路由 + `a[href="/wrong"]:visible` | 路由/选择器 | study-flow.spec.ts:374,386 | 2 |

---

## 10. MorePage（更多页）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| heading `'数据管理'` | 界面文案 | study-flow.spec.ts:388; visual.spec.ts:170 | 2 |
| button `'打开本地资料库'` + heading `'本地资料库'` + button `'导入 PDF'` enabled | 界面文案 | document-reader.spec.ts:23,24,25,74,91 | 5 |
| `.document-row`（count 1/0、`computer-architecture.pdf`/`408 组成原理.pdf` 文案） | CSS 类名+文案 | document-reader.spec.ts:33,34,59,68,98 | 5 |
| button `'阅读 <文件名>.pdf'` / `'重命名 <文件名>.pdf'` / `'移除 <文件名>.pdf'`（动态名称契约） | 界面文案 | document-reader.spec.ts:36,56,61,67,80,115 | 6 |
| heading `'<文件名>.pdf'`（阅读器标题） | 界面文案 | document-reader.spec.ts:37,86,129 | 3 |
| button `'下一页'` / `'上一页'` | 界面文案 | document-reader.spec.ts:41,46,52 | 3 |
| `getByLabel('文档名称')` + button `'保存名称'` | 可访问名称与角色+文案 | document-reader.spec.ts:57,58 | 2 |
| `.pdf-page-canvas canvas`（渲染契约） | CSS 类名 | document-reader.spec.ts:7; account-flow.spec.ts:47,49（count=0 断言） | 3 |
| heading `'共享资料库'` | 界面文案 | account-flow.spec.ts:254 | 1 |
| heading `'账号与同步'`（section 过滤） | 界面文案 | request-sync-browser.mjs:67（`section.filter({ has: heading '账号与同步' })`） | 1 |
| heading `'2009 来源核对'`（SettingsPage 地区） | 界面文案 | SettingsPage.test.tsx:51,61 | 2 |
| status `'待同步 0 条'`、`'请求超时'`、`'HTTP 502'`文案 | 可访问名称与角色 | request-sync-browser.mjs:70,177,201 | 3 |
| button `'同步并查看状态'`（exact） | 界面文案 | request-sync-browser.mjs:66,69,173,175,178,200,203,265 | 8 |
| button `'退出并锁定本地记录'`（exact） | 界面文案 | request-sync-browser.mjs:246 | 1 |
| button `'登录'`（exact，登录流核心按钮；另有 account-flow:97 的`/登录/` heading count=0 反向断言） | 界面文案 | request-sync-browser.mjs:52,53,204,247,266; server-pwa.ts:29; ui-style-regression.mjs:130; account-flow.spec.ts:9,209,227,229,238,243,245,268,271（`'登录'`/`'创建账号'` 流）; account-flow.spec.ts:97（count=0 断言） | 18 |
| link `'更多'`（followNav 辅助） | 可访问名称与角色 | study-flow.spec.ts:85 | 1 |
| `a[href="/more"]:visible` | 选择器 | request-sync-browser.mjs:61; pwa-upgrade.mjs:99 | 2 |
| `.more-grid` | CSS 类名 | ui-style-regression.mjs:25 | 1 |
| `'本地 2009 题包未安装'`（题包警示横幅文案） | 界面文案 | code-only-mode.spec.ts:24; ContentReviewPage.test.tsx:159 | 2 |
| `/mock` 路由: heading `'2009 整卷模考'`（mock-exam.spec.ts:113）、alert `'尚未完成 47 题人工复核'` 且 button `/开始.*模考/` count=0（mock-exam.spec.ts:114,115）、`.mobile-nav a` count=5 与 `.app-shell` minHeight 契约（mock-exam.spec.ts:117,118） | 界面文案+CSS 类名 | mock-exam.spec.ts | 5 |
| `heading '整卷模考'`（MockExamPage 单测主标题） | 界面文案 | MockExamPage.test.tsx:32（详见 §14） | 1 |

---

## 11. 实验页（仅导航可访问名称统计）

实验 spec 均以 `getByRole('navigation', { name: '<模块>实验模块' })` 定位模块导航，并断言 `getByRole('link')` 数量。各模块导航可访问名称的使用统计（一张表，不逐页展开内部断言）：

| 可访问名称 | 使用它的测试文件（次数为该文件内 appearing 总次数） | 总次数 |
|---|---|---|
| `数据结构实验模块` | binary-tree-traversal-lab(2), complete-binary-tree-lab(3), data-structures-lab(2), deadlock-lab(2), filesystem-links-lab(2), forest-binary-relation-lab(2), min-heap-insert-lab(2), sort-pass-analysis-lab(2), stack-capacity-lab(2) | 19 |
| `计算机网络实验模块` | bus-bandwidth-lab(1), csma-cd-collision-lab(2), protocol-labs(2), qam-nyquist-lab(1) | 6 |
| `操作系统实验模块` | io-overhead-lab(2), memory-expansion-lab(2), micro-operations-lab(2), segmentation-address-lab(1), semaphore-lab(3), system-labs(1) 另 pipeline-lab(2, os-scheduling 相关) | >11 |
| `实验类型`（导航内的实验类型 tab） | pipeline-lab:5,105 两处 `getByRole('navigation', { name: '实验类型' })` | 2 |
| `CPU 实验模块` / CPU 实验 nav 名称 | cpu-extended-labs:5,18; radix-output-list ready 选择器 ui-style-regression.mjs:29 | 2+1 |

> 注：实验导航 getByRole('navigation') 计数已在上节 AppShell 表内合并统计（其 name 是实验模块名而非 AppShell 主导航），在此不重复计数。实验页真正的导航契约量级（all-lab 29 个 spec 中约 20 个使用 getByRole('navigation') 定位）见 §1 AppShell 表相应行。

---

## 12. ServerE2E（tests/server-e2e/account-flow.spec.ts，273 行）

| 契约内容 | 类别 | 依赖它的测试文件及行号 | 出现次数 |
|---|---|---|---|
| `getByLabel('用户名', { exact: true })` | 可访问名称与角色 | account-flow.spec.ts:7,206,241 | 3 |
| `getByLabel('密码', { exact: true })` | 可访问名称与角色 | account-flow.spec.ts:8,207,242 | 3 |
| `getByLabel('邀请码', { exact: true })` | 可访问名称与角色 | account-flow.spec.ts:208 | 1 |
| `getByLabel('邀请码（仅使用一次）')` | 可访问名称与角色 | account-flow.spec.ts:201 | 1 |
| button `'登录'`（exact） | 界面文案 | account-flow.spec.ts:9,227,229,238,243,245,268,271 | 8 |
| button `'创建账号'` | 界面文案 | account-flow.spec.ts:209 | 1 |
| heading `'今日学习'`（exact） | 界面文案 | account-flow.spec.ts:10,210 | 2 |
| button `/开始剩余 [1-9]/` | 界面文案 | account-flow.spec.ts:11,68,211 | 3 |
| button `'开始第 1 题'`（exact） | 界面文案 | account-flow.spec.ts:33,85 | 2 |
| `.question-body`、`.option-list button`、`.answer-panel`、`.result-summary strong`（'799'/'47'） | CSS 类名+文案 | account-flow.spec.ts:69,70,72,82,84 | 5 |
| button `/提交答案/`、`'结束'`（exact） | 界面文案 | account-flow.spec.ts:71,73,87 | 3 |
| heading `/本轮/`、`/短讲解/` | 界面文案 | account-flow.spec.ts:74,76 | 2 |
| button `'同步并查看状态'` | 界面文案 | account-flow.spec.ts:43,79,190 | 3 |
| `.pdf-page-canvas canvas`、`.pdf-canvas-status` count=0 | CSS 类名 | account-flow.spec.ts:47,49 | 2 |
| `.brand-mark img` naturalWidth>0 | CSS 类名 | account-flow.spec.ts:64 | 1 |
| button `'2025'`（年份切换） | 界面文案 | account-flow.spec.ts:83 | 1 |
| heading `'复习中心'` | 界面文案 | account-flow.spec.ts:90 | 1 |
| button `/加练本组/` | 界面文案 | account-flow.spec.ts:91 | 1 |
| button `/显示\|查看.*解释\|翻/` | 界面文案 | account-flow.spec.ts:92 | 1 |
| heading `/登录/` count=0（已登录断言） | 界面文案 | account-flow.spec.ts:97 | 1 |
| `.flashcard` visible | CSS 类名 | account-flow.spec.ts:98 | 1 |
| heading `'笔记'`（exact） | 界面文案 | account-flow.spec.ts:38,137 | 2 |
| button `'导出备份'`、`'退出并锁定本地记录'` | 界面文案 | account-flow.spec.ts:109,116,122,237,267 | 5 |
| `.backup-band input[type="file"]` | CSS 类名 | account-flow.spec.ts:114,120 | 2 |
| `details summary '并发修改：notes'` + `getByLabel('合并后的正文')` + button `'保存合并稿'` | 可访问名称与角色+文案 | account-flow.spec.ts:148,149,152,153 | 4 |
| button `'预览旧记录'`、`'将这些记录归入当前账号'`、`'保存迁移前备份'` | 界面文案 | account-flow.spec.ts:181,183,185,187 | 4 |
| button `'生成 7 天成员邀请码'`、`'使用邀请码注册'` | 界面文案 | account-flow.spec.ts:200,205 | 2 |
| `.source-button`、`.source-pages img`、button `'关闭'`（exact） | CSS 类名+文案 | account-flow.spec.ts:215,216,218,221,222 | 5 |
| button `'查看成员'`、`'停用 joined-… 并撤销会话'` | 界面文案 | account-flow.spec.ts:224,225 | 2 |
| heading `'共享资料库'`、link `'阅读'`（exact）、button `'保存供离线阅读'` | 界面文案 | account-flow.spec.ts:254,255,258,260 | 4 |
| `locator('canvas')` count=0（共享 PDF 不留 canvas） | CSS 类名 | account-flow.spec.ts:272 | 1 |

---

## 13. Verification 脚本契约（tools/verification/）

此前零散列于各节，此处汇总 5 个含 UI 契约脚本的完整清单：

### 13a. pwa-upgrade.mjs（113 行）

| 契约内容 | 类别 | 行号 |
|---|---|---|
| heading `'真题浏览（验收 A/B）'`（源码替换 + A/B 断言） | 界面文案 | 30（源码字符串替换）; 93,104（断言） |
| button `'复习 3 张卡片'` enabled | 界面文案 | 58 |
| button `'开始第 41 题'`（exact） | 界面文案 | 63 |
| `a[href="/questions"]:visible` / `a[href="/more"]:visible` 点击导航 | 选择器 | 92,99 |
| `getByPlaceholder('记录易错点')`（PWA 笔记全文） | 可访问名称与角色 | 67,82,102,107,110 |
| heading `'笔记'`（exact，保存触发） | 界面文案 | 95 |

### 13b. request-sync-browser.mjs（273 行）

| 契约内容 | 类别 | 行号 |
|---|---|---|
| `getByLabel('用户名'/'密码', exact)` + button `'登录'`（exact）/count=0 | 可访问名称与角色+文案 | 50,51,52,53,204,247,266 |
| heading `'今日学习'` + button `/开始剩余 [1-9]/` enabled | 界面文案 | 56,57 |
| `section` + heading `'账号与同步'`（accountPanel helper）、button `'同步并查看状态'`（exact）、status `'待同步 0 条'/请求超时/HTTP 502`、`not.toContainText(/SyntaxError|upstream|JSON/)` | 可访问名称与角色+文案 | 66,67,70,177,201,202 |
| button `'退出并锁定本地记录'`（exact） | 界面文案 | 246 |
| button `/加练本组/`、`'查看解释'`、`'记得'`、`getByText(/完成 1 \/ 10 张/)` | 界面文案 | 128,130,131,132,139 |
| button `'2009'`、`'开始第 1 题'`、`getByPlaceholder('记录易错点')`、heading `'笔记'` | 界面文案 | 162,164,167,168 |
| `a[href]:visible` 导航 helper | 选择器 | 61,63 |
| `.flashcard` toBeVisible | CSS 类名 | 138 |
| `.result-summary strong` 文本 | CSS 类名 | 163 |

### 13c. ui-style-regression.mjs（233 行，布局回归脚本）

| 契约内容 | 类别 | 行号 |
|---|---|---|
| 路由→ready 选择器映射表：`/`→`.task-list`、`/questions?year=2009`→`.question-row`+`.practice-topbar`、`/review`→`.memory-preview`、`/knowledge`→`.knowledge-graph-canvas canvas`、`/stats`→`.heatmap span`、`/settings`→`.backup-band`、`/more`→`.more-grid`、`/lab/data-structures`→`.ds-lab-page`、`/lab/os-memory`→`.vm-lab-page`、`/lab/network`→`.network-lab-page`、`/lab`→`.radix-output-list` | CSS 类名（页面 ready 判定，12 路由全表） | 18-30 |
| button `'登录'`（exact/false 分支）、heading `'今日学习'`（exact）、button `/开始剩余 [1-9]/`、`'开始第 1 题'`（exact） | 界面文案 | 130,131,132,136 |
| `document.querySelectorAll('.mobile-nav a').length` 采样 | CSS 类名 | 81 |
| `assert.equal(state.mobileNavLinks, 5)` 硬断言（12 路由×2 视口遍历） | CSS 类名+数量 | 158 |
| `getByLabel('正文字号', exact)` selectOption `'24'`/`'18'` + `--reading-font-size`===`24px`/`18px` CSS 变量断言 | 可访问名称与角色+CSS 变量 | 169,170,176,177 |
| `#root`、`.app-shell *` bounding style 采样（布局快照） | CSS 类名 | 42,79,92,113 |

### 13d. server-pwa.ts（66 行）

| 契约内容 | 类别 | 行号 |
|---|---|---|
| `getByLabel('用户名'/'密码')`、button `'登录'`（exact） | 可访问名称与角色 | 27,28,29 |
| button `/开始剩余 8 题/`、`'开始第 1 题'`（exact） | 界面文案 | 30,34 |
| `getByPlaceholder('记录易错点')`、heading `'笔记'`（exact） | 界面文案 | 38,47,48,59,62 |
| `meta[name="server-build"]` content A/B | 选择器 | 46,58 |
| `.brand-mark img` naturalWidth>0 | CSS 类名 | 60 |

### 13e. windows-dev.mjs

| 契约内容 | 类别 | 行号 |
|---|---|---|
| `getByLabel('用户名')`、`getByLabel('密码')`、button `'登录'`、`/开始剩余 [1-9]/` | 可访问名称与角色+文案 | 32,33 |

---

## 14. UI 单测契约补充（apps/web/src）

零散契约汇总（精确行号已核实）：

- **brand.test.ts:16,28-36**：`<title>` 文本与 `PRODUCT_NAME`/`PRODUCT_DESCRIPTION` 一致性、PWA manifest name、favicon `aria-label="BitAtlas logo"` 与 `data-mark="atlas-route"` 属性（HTML 头部与品牌契约）。
- **StudyContext.test.tsx:277,278,295,296,316,331,332,356,369**：`getByLabelText('installed packs'/'loaded questions'/'commit outcome'/'stored decision'/'reloaded review'/'reloaded stored decision'/'mock list'/'session updates')`——测试专用 harness label，非产品 UI。
- **MockExamPage.test.tsx（180 行）**：heading `'整卷模考'`(:32) 等 heading 断言(:33,51 行 alert 相关)；`getByLabelText('location')`(:44)；alert 文案 `'尚未完成 47 题人工复核'`(:89) 与 `'未满足固定整卷的 47 题契约'`(:103)；button /`开始.*模考/` 相关(:105,107)。
- **MockExamSessionPage.test.tsx（199 行）**：`'选择 A'`/`'选择 B'` aria-pressed(:127,138,142,148,159,174,218)、`'保存当前草稿'`(:143,160)、`'提交整卷'`(:162)、`'重新读取'`(:190)、`'综合题自评分'`(:173)、`'加载最新记录'`(:146)、status `'已同步另一标签页的最新记录'`(:128)、alert `'另一标签页已更新此模考'`(:141)。
- **SettingsPage.test.tsx（195 行）**：heading `'2009 来源核对'`(:51,61)；题包状态文案 `'当前已通过 0 / 47，题包状态为 needs-review。'`(:53,61)、`'AI 已完成 47 / 47 题的来源核对与校订'`(:52)；`getByText('needs-review', { selector: '.warning-text' })`(:69)；`'BACKUP V4'`(:70)；status `'Verified 题包已校验并激活'`(:77)、`'已取消备份恢复'`(:97)。
- **ContentReviewPage.test.tsx（195 行）**：41 处 getByRole/getByText 契约（tab 全部/待复核、button 通过复核/保存草稿/下一道待复核/第 N 题/上一题/下一题、alert 复核记录冲突、heading 本地 2009 题包未安装:159、`.fatal-state`:163、`.review-save-status`:191）。
- **KnowledgePage.test.tsx（330 行）**：heading `'知识证据图'`(:19)；科目 region 切换(:127-135,186-215)；topic 卡片文本断言(:20 等)。
- **DashboardPage.test.tsx（170 行）**：region `'今日任务'`(:94,112,137,141) 与 `'学习概况'`(:156,160)；按钮 `'继续学习'`(:67,77)、`'开始剩余 N 题'`(:68,102,115,128,132)；`DAILY PLAN` 日期文案(:127,131,146)。
- **PracticePage.test.tsx（603 行）**：见 §5。

---

---

## 15. 改版高风险项

### A. 被 5 个以上测试文件依赖的契约

| 契约 | 依赖文件数 | 涉及文件（行号） |
|---|---|---|
| `.main-area`（viewport/scroll 容器） | **23 个 spec 文件**（40 行） | 见 §1 表 |
| `getByRole('navigation')` 模块导航模式（实验模块 nav） | >20 个 spec | 见 §1 & §11 |
| heading `'今日学习'`（首页主标题） | **5 个文件**（6 行） | visual:39; learning-loop:173; account-flow:10,210; request-sync-browser.mjs:56; ui-style-regression.mjs:131 |
| button `/开始剩余 [1-9]/` 与 `'开始剩余 8 题'` | **8 个文件**（16 行） | learning-loop:21,27; learning-reliability:40,57,84; study-flow:147,150; account-flow:11,68,211; request-sync-browser.mjs:57; server-pwa.ts:30; windows-dev.mjs:33; ui-style-regression.mjs:132 |
| button `'/复习 3 张卡片'` | 3 个文件 | learning-loop:22; learning-reliability:24; pwa-upgrade.mjs:58 |
| heading `'笔记'`（点击保存笔记） | **6 个文件**（7 行） | account-flow:38,137; learning-loop:103,105; pwa-upgrade.mjs:95; request-sync-browser.mjs:168; server-pwa.ts:48 |
| `.mobile-nav a` count=5 | **4 个文件**（6 行） | learning-loop:197; mock-exam:117; study-flow:162,466; ui-style-regression.mjs:81,158（遍历 12 路由×2 视口） |
| 路由 `/questions` + button `'开始第 1 题'` | 5 个文件 | study-flow:119; account-flow:33,85; request-sync-browser.mjs:164; server-pwa.ts:34; ui-style-regression.mjs:135 |
| heading `'真题浏览'` | 2 个文件 | study-flow:92; pwa-upgrade.mjs（30 行源码替换 + 93,104 断言） |
| `getByPlaceholder('记录易错点')` | 2 个文件（9 行） | pwa-upgrade.mjs:67,82,102,107,110; server-pwa.ts:38,47,59,62 |
| `getByLabel('用户名'/'密码', exact)` + button `'登录'` | **7 个文件** | account-flow:7,8,9; request-sync-browser.mjs:50-53; server-pwa.ts:27-29; ui-style-regression.mjs:130; windows-dev.mjs:32,33; study-flow 无 |

### B. 与改版动作直接冲突的契约

1. **去掉 `.sidebar` 左侧栏**：`sidebar` 类名**在源码与测试中都不存在**（源码侧栏是 `aside.sidebar-primary`），无测试直连 `.sidebar`。真正的冲突面是 **`.main-area`——被 23 个 spec 文件 40 行依赖**，作为视口/滚动容器（scroll 断言 boundingBox）与 `--viewport-960` 布局断言的核心。改版若把 `.main-area` 从内容根移除或不再承担滚动容器（如顶栏下新内容容器），需要同步迁移这 40 行到新选择器，或保留 `.main-area` 类名及滚动语义。另有 `study-flow:85` 的 followNav 依赖“更多页面时链接不可见”的当前布局逻辑与 `a[href]:visible` 模式。
2. **桌面导航 10→6 项**：无测试按名称定位主导航（`主导航`/`移动端导航` 名称**未发现任何使用**）。但 **`.mobile-nav a` count=5** 是硬断言（learning-loop:197、mock-exam:117、study-flow:162,466、ui-style-regression.mjs:81,158——最后一处遍历全部 12 路由和 2 视口，退出即失败）。如果顶栏化后移动端导航数量改变，这些断言失败。桌面 10→6 项本身无直接断言，但 request-sync-browser.mjs:61 与 study-flow:85 均依赖 `a[href="…"]:visible` 可见性导航——**顶栏化后"更多"入口折叠的页面集合变化会改变哪些 href 需要先点"更多"**，该 helper 逻辑需同步调整。
3. **首页主标题文案改变**：heading `'今日学习'` 被 **5 个文件 6 行**直接断言（visual:39、learning-loop:173、account-flow:10,210、request-sync-browser.mjs:56、ui-style-regression.mjs:131），是全仓被依赖最重的单条界面文案。改标题会同时砸掉这 5 个文件的流程入口。同类高危：`'开始剩余 N 题'` 按钮（8 文件 16 行）。
4. **字号控件移入顶栏菜单**：`getByLabel('正文字号')` 直达操作在 learning-loop:198（selectOption 24）和 ui-style-regression.mjs:169,176（selectOption 24/18 + `--reading-font-size` CSS 变量断言 170,177）。若改成需要先点开的菜单结构，getByLabel 直达会失败；必须保留 `<select aria-label="正文字号">` 可直达角色或同步修改这 3 处。另有 learning-loop:201 依赖 `.memory-preview .content-blocks` 应用 24px 字号。`--reading-font-size` 变量名是 ui 回归快照的基准，必须保留。
5. **构成“登录成功/同步状态”断言集**：`'登录'` button（request-sync-browser.mjs:52,53,204,247,266、server-pwa.ts:29、ui-style-regression.mjs:130、account-flow.spec.ts:9,209,227,229,238,243,245,268,271）、`'同步并查看状态'`（request-sync-browser.mjs 8 处）、`'退出并锁定本地记录'`（:246）——这些是登录态转移的哨兵断言。顶栏若增加登录相关入口/菜单名，会误触 `account-flow:97` 的 count=0 断言。
6. **AppShell 高度与横幅契约**：`.app-shell` minHeight 0px（study-flow:451）、`.brand-block strong`='BitAtlas'（code-only-mode:18）、`.brand-mark img`（3 文件）、`.content-unavailable-banner`→`本地 2009 题包未安装`（code-only-mode:24）、`.fatal-state` count=0（code-only-mode:28,33 + ContentReviewPage.test.tsx:163）——shell 改版需保横幅组件类名或同步修改这些失败态断言。

——完——
