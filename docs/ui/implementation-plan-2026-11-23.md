# BitAtlas UI 改版执行计划（可交给任意前端执行者）

2026-11-23 · 作者 Opus · 状态：**计划已定，尚未实施**

本计划给接手 UI 实施的模型或开发者使用。设计依据见同目录的 `design-spec-2026-11-23.md`（下称"定稿"），评审背景见 `docs/server/opus-review-response-2026-11-22.md`。两者和本计划冲突时，以定稿为准；定稿和 `AGENTS.md` 冲突时，以 `AGENTS.md` 为准。

---

## 0. 开工前必读（不读不要动手）

1. 依次读 `AGENTS.md`、`docs/server/parallel-ui-work-2026-11-22.md`（分工约定）、`HANDOFF.md` 顶部第一节、本目录的定稿。
2. **工作目录里有大量未提交成果**。不要 `git reset`、`checkout`、`stash` 或丢弃改动，也不要从 HEAD 新建 worktree 来工作。
3. **文件归属**：
   - UI 可以改：`apps/web/src/pages/`、`apps/web/src/components/`、`apps/web/src/styles.css`，以及新增的纯展示组件、样式文件和对应测试。
   - 只读、不能改（归 Codex）：`apps/web/src/app/`、`packages/*`、`apps/server/`、`apps/web/src/main.tsx`、`vite.config.ts`、所有 `package.json` 和 lockfile、`AGENTS.md`、根目录的 `HANDOFF.md` 和 `notes.md`。
   - 需要动 Codex 的文件时，把需求写进 `docs/ui/opus-handoff.md` 等他处理，不要直接改。
4. **不允许**：
   - 改数据库 schema、题包或卡片正文、审核状态、依赖版本。
   - 降低测试断言或删除失败的测试。
   - 把 AI 生成的内容标成已审核。
   - 提交、推送、部署。
5. `AccountGate`、`AccountTools`、`StorageUpgradeGate` 只能改展示，不能改 props、认证、同步和迁移逻辑。
6. 截图放到 `output/playwright/opus-ui-2026-11-22/`。构建用独立的输出路径，不要覆盖 Codex 正在验收的构建。不要和 Codex 同时运行 `npm install`、全量门禁或 git 操作。

## 1. 现有测试依赖的界面契约（改版时必须保持，或同步更新测试并说明原因）

| 契约 | 依赖它的测试 |
|---|---|
| `.mobile-nav` 存在，**5 个链接**；在相关视口下 `position: static` 并且有可测的 boundingBox | `study-flow`、`visual`、`semaphore-lab` 等 10 处 |
| 实验模块的导航有可访问名称：`数据结构实验模块`、`操作系统实验模块` 等 | 35 个 lab spec |
| 首页文案"今日学习""继续学习""开始剩余 N 题""今日任务" | `learning-loop`、`study-flow`、`account-flow`、`DashboardPage.test` |
| 统计页 `.metric-grid article` 依次包含"有效作答""答对题次" | `study-flow` |
| `.task-list` | `learning-reliability` |
| 阅读设置的可访问名称"正文字号" | `learning-loop` |

处理原则：
- 能保留的可访问名称和文案就保留。
- 确实需要改文案（比如定稿第 3 节要求首页标题只陈述真实计划）时，把对应断言改成新文案，断言强度不能降低，并在交接文档里逐条列出。
- 类名可以换，但要同步更新选择器。

## 2. 分阶段任务

每个阶段结束都要能独立验收，验收通过再进入下一阶段。

### 阶段 1 · 设计令牌与样式基础（外观基本不变）

目标：先把地基打好，后续换皮只需要改令牌。

1. 在 `apps/web/src/styles/` 下新建：`tokens.css`、`base.css`、`shell.css`、`reading.css`、`lab.css`、`pages/*.css`。
2. `styles.css` 只保留按顺序排列的 `@import`。这样不用改 `main.tsx`，它仍然只引入 `styles.css`。
3. 把定稿第 2 节的令牌写进 `tokens.css`，同时提供白昼和夜班两套（`:root[data-theme="night"]`）。
   - 这一阶段先把现有深色值映射到令牌上，保证外观不变。
4. 清理：
   - 430 个重复的选择器，按"最后生效的值"合并。
   - 261 种硬编码颜色改成令牌。
   - 所有小于 13px 的字号改成 13px 以上，数量约 410 处，主要在实验页和复核页。
5. 验收：
   - 改动前后各截一组 1440 和 390 截图做对比，除了小字变大以外没有明显变化。
   - 全部 UI 相关的单元测试和 typecheck 通过。

### 阶段 2 · 外壳与今日首页

1. **外壳**：
   - 桌面去掉左侧栏，改成顶部键帽导航：今日、题库、复习、知识、实验、更多。
   - 快捷键 T、Q、R、K、L、M 只在焦点不在 input、textarea、contenteditable 里，并且 `event.isComposing === false` 时才生效。
   - 手机继续用底栏的 5 个链接。
   - 字号收进顶栏的"阅读"菜单，保留"正文字号"这个可访问名称。
2. **主题切换**：
   - 主题记在 `localStorage`，这是 UI 偏好，不是学习数据。
   - 默认跟随 `prefers-color-scheme`。
3. **今日首页**（`DashboardPage`、`DailyTasks`）：
   - 主标题陈述真实计划，比如"今天 11 项"；概念接口到位后再加"涉及 N 个概念"。
   - 只保留一个主按钮。
   - 任务票：桌面横向打孔，手机改成纵向列表。
   - 卡片的显示名不再用 `targetId.replace('card-', '')`。接口到位前先显示"记忆卡 · 概念名"，概念名从卡片的 `conceptIds` 查；查不到就显示"记忆卡"。
4. **寄存器缩略**：
   - 如果 Codex 的概念状态接口还没提供，这一块整块隐藏，不能用假数据。
   - 提供以后，按定稿第 3 节实现。
5. **服务器模式文案**：状态位显示登录和同步状态，接口没到之前只显示现有的已知信息。
6. 验收：第 3 节的全部项目，外加首页相关的 E2E。

### 阶段 3 · 阅读层：练习与记忆卡

1. `PracticePage`：
   - 题干放进阅读容器，宽度 `max-width: 68ch`，字号用 `--reading-font-size`。
   - 选项改成整行按钮，左侧显示键位，支持 A–D 快捷键（规则同上）。
   - 1px 细边，不用硬投影。
2. 判错后增加错因入口，复用现有的 `mistakeReason` 枚举（concept、method、calculation、reading、other）和现有的保存方法，**不新增枚举值**。
3. `CardReviewPage`：
   - 保持"先回忆、再显示背面、再评分"的顺序。
   - 评分用三个键帽，支持数字键 1、2、3。
4. 公式（KaTeX）、来源页图片、长题干都要检查有没有横向溢出。

### 阶段 4 · 知识页寄存器与概念详情（依赖接口 1、2）

1. 102 格，分四行，用 ▲ ■ ● ◆ 区分科目，四种状态的判定以 Codex 的接口为准。
2. 键盘：每行只占一个 Tab 停靠点，行内用方向键移动（roving tabindex）。聚焦和悬停时都更新说明文字。每格不小于 24×24px。
3. 点击格子打开概念详情抽屉，里面列出真题、卡片、讲解和实验链接。实验链接复用现有的 `lab-links`。
4. 手机上折叠成四条科目进度，点开再看格子。

### 阶段 5 · 实验展厅外壳

1. 新建纯展示组件 `LabExhibit`，结构是标题、控制区、画布、逐步说明。34 个实验页逐个套用。
2. **只改外壳，不碰实验逻辑和 `packages/lab-core`、`packages/cpu-core`。** 保留现有导航的可访问名称。
3. 每改一个实验，就跑一次对应的 `tests/e2e/*-lab.spec.ts`。

### 阶段 6 · 可选增强（不阻塞上线）

- 打印版卡片（`@media print`，一页 8 张）。
- 登录页比特阵列动画（要尊重减少动画设置）。
- 草稿笔迹层（不保存，并且要明确提示"不会保存"）。

## 3. 每个阶段都要执行的验收清单

- [ ] UI 相关的 Vitest 和 `npm run typecheck` 通过；先用独立输出路径运行 `npm run build`，再跑定向 Playwright。
- [ ] 用真实 Chrome 检查 1440 和 390 两个视口（390 必须带 viewport meta），白昼和夜班各截一套。
- [ ] 从键盘走完整个流程，焦点始终可见；快捷键不干扰输入框和输入法。
- [ ] 字号调到 24px 后，布局不崩、不出现横向溢出。
- [ ] 文字对比度不低于 4.5:1（大字不低于 3:1），触控目标不小于 24px。
- [ ] 公式和来源图片显示正常。
- [ ] 截图路径、改动文件、验证命令和结果、待合并事项写进 `docs/ui/opus-handoff.md`。
- [ ] 结果按实际数字报告；失败的项目逐条列出，不写成已经完成。

## 4. 依赖 Codex 的只读接口（见定稿第 5 节）

| # | 接口 | 依赖它的阶段 | 没到位时的降级 |
|---|---|---|---|
| 1 | 概念状态（四态加计数） | 2 的寄存器、4 | 隐藏寄存器 |
| 2 | 计划项对应的 `conceptIds` | 2 的"涉及 N 个概念"、4 的红框 | 不显示 |
| 3 | 卡片显示名 | 2 | 用 `conceptIds` 查名称，查不到显示"记忆卡" |
| 4 | 会话和同步状态 | 2 | 只显示现有的已知状态 |
| 5 | 本周学习天数 | 2 | 不显示 |
| 6 | 字体预缓存和服务器模式的资源复制 | 1 引入字体时 | 用系统字体 |

## 5. 字体

- 标题用得意黑（OFL-1.1，保留字体名为 Smiley 和得意黑）。子集化后的文件内部名改为 `BitAtlas Display`，OFL 原文放到 `apps/web/public/fonts/LICENSE-SmileySans.txt`。
- JetBrains Mono（OFL）用于数字和代码。
- 都打包成 woff2 自托管，标题字体子集控制在约 300KB 以内。
- 子集化工具用项目本地的虚拟环境，不要全局安装。
- `vite.config.ts` 和预缓存需要的改动写进交接文档交给 Codex，不要自己改。

## 6. 交接产物

- `docs/ui/opus-handoff.md`：每个阶段追加一节，写明改动文件、验证结果、截图路径、待合并事项，以及更新过的测试断言和原因。
- 截图：`output/playwright/opus-ui-2026-11-22/<阶段>/`。
