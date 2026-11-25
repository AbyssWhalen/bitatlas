# BitAtlas UI 改版交接（滚动）

UI 侧的交接文档。根目录 `HANDOFF.md` / `notes.md` 仍由 Codex 维护。

## 2026-11-23 · 维护者恢复实施，团队分工

维护者于 2026-11-23 明确要求评估 `implementation-plan-2026-11-23.md` 并在可行时实施，此前"实施暂停"的状态解除。授权范围是本地 UI 改版与验证；提交、推送、部署、schema、题包正文、依赖版本仍不在范围内。

### 评估结论

计划可行，按定稿 `design-spec-2026-11-23.md` 实施，以下四处修订优先于原计划：

1. **阶段 1 验收改为自动对比。** `styles.css` 为 2891 行 / 约 273KB，重复选择器合并不能靠目测。迁移用脚本完成，改动前后对同一批路由在 1440 和 390 视口做像素差和关键元素计算样式快照对比；除小于 13px 的字号放大外，差异逐条解释。
2. **导航快捷键在会话页禁用。** T/Q/R/K/L/M 只在非会话页生效；练习、记忆卡复习、模考会话页只保留 A–D 和 1/2/3，避免误触跳页丢失未提交作答。可编辑区域与输入法组字状态的排除规则不变。
3. **桌面导航的去向写明。** 顶栏六项：今日、题库、复习、知识、实验、更多。错题并入"复习"页内入口；模考、统计、资料、数据进"更多"。手机底栏五项不变。原有路由全部保留，不删地址。
4. **实验展厅先试点。** 阶段 5 先改 3 个实验（数据结构、操作系统、网络各一）定型 `LabExhibit`，对应 lab spec 通过后再批量铺开。

字体（得意黑、JetBrains Mono 自托管）依赖 `vite.config.ts` 与预缓存，不阻塞主线，先用系统字体栈。

### 分工

| 成员 | 负责 | 文件范围 |
|---|---|---|
| Claude Code（组长） | 设计决策；阶段 2 外壳与今日首页、阶段 3 阅读层的实现 | `pages/`、`components/`、`styles/` 中对应文件 |
| Codex CLI | 阶段 1 样式地基；定稿第 5 节只读接口；根交接 | `styles.css` 拆分（阶段 1 期间独占）；`apps/web/src/app/`、`packages/*` |
| Antigravity | 设计评审与截图评判（额度有限，只做评审） | 只读 |
| Aion CLI | 界面契约清单、机械性铺开与核对 | 只读，或组长逐次指定的文件 |

同一文件同一时间只有一位成员编辑。阶段 1 完成前，其他成员不改 `styles.css` 及 `styles/` 目录。

### 设计评审后的定稿修订（2026-11-23，Antigravity 评审，组长裁定）

以下修订优先于 `design-spec-2026-11-23.md` 的对应条目。

**视觉强度收敛**
- 外壳层去掉 3px 粗边。键帽保留 2px 底边和 60ms 下沉；其余边框一律 1px。硬投影只给主按钮，偏移 2px。
- 展厅层只有画布是深色（`#161817`），画布外的标题、控制区和说明随主题走，避免白昼模式下整页切黑。
- 顶栏导航字号固定 14px，不随 `--reading-font-size` 放大，防止 24px 时导航折行。

**令牌调整**

| 令牌 | 白昼 | 夜班 |
|---|---|---|
| `--ink` | `#222220` | `#D6D6D0` |
| `--bone` | `#ECECE7` | `#161615` |
| `--paper` | `#F7F7F3` | `#1E1E1C` |
| `--lit` | `#C8F03C` | `#9EC22E` |
| `--ok-text`（新增，判对文字） | `#2A6B34` | `#68C778` |

其余令牌按定稿。实现时逐对实测对比度，不达 4.5:1 的再调，并把实测值记在阶段记录里。

**信息架构**
- 顶栏六项不变（保留"知识"，不换成"资料"：手机底栏契约含"知识"，寄存器也在该页）。
- "复习"页首屏固定"复习 | 错题"切换，错题不降级。
- 桌面"更多"为下拉菜单，`/more` 路由保留给手机和直链。
- 原侧栏的题包和同步状态改为顶栏紧凑徽标，不能随侧栏一起消失。

**今日首页**
- 改为上下分层，不做左右分栏：上方是标题（`clamp(28px, 3.2vw, 44px)`）、一个主按钮和纵向任务列表，桌面与手机都不横向滚动；`.task-list` 类名保留。
- 首页不放完整的 102 格。下方只放四科概要行，点击进入知识页；概念状态接口到位前整块隐藏。
- 无题包或当日计划为空时，首页给出直达题库或实验的入口。

**寄存器（知识页）**
- 科目形状移到行首标题（如"▲ 数据结构 12/28"），格内不再叠形状。每行 12 格折行，间距 6px，每格不小于 24×24px。
- 四态只用几何区分：灰格、中心 6px 圆点、下半点亮、全格点亮。
- 今日涉及的概念用右上角 6px 红色三角标记，不用整圈红框。

**阅读层补充（并入阶段 3）**
- 公式和代码块在 68ch 与 390px 下局部横向滚动，页面本身不横溢；配图可点击放大。
- 提交后锁定选项，解析和错因在原地展开；Enter 不得连续触发"提交"和"下一题"。

### 契约清单后的实现约束（2026-11-23）

清单见 `contract-inventory-2026-11-23.md`（Aion CLI 盘点）。组长抽查发现一处错误：清单称源码中不存在 `.sidebar`、侧栏是 `aside.sidebar-primary`，实际 `AppShell.tsx:31` 就是 `aside.sidebar`，全仓没有 `sidebar-primary`；"测试不依赖 `.sidebar`"这一半属实。清单里的行号在据以改测试前需逐条复核。

阶段 2 按以下方式实现，目标是不改现有测试断言：

- `.main-area` 保留为主内容与滚动容器（23 个 spec 依赖）。
- 首页 `h1` 仍是"今日学习"，缩为小标题；"今天 N 项"作为其下的大号陈述句呈现，不占用标题语义。
- "开始剩余 N 题"保留为首页唯一主按钮；"继续学习"保留文案，降为次要按钮。
- "正文字号"保持为页面上直接可操作的 `select`（顶栏紧凑控件，手机在内容区顶部），不收进需要先展开的菜单。
- `.mobile-nav` 保持 5 个链接；`.task-list`、`.more-grid` 类名保留。
- 顶栏不出现含"登录"的标题（`account-flow:97` 有反向断言）。
- 外壳改完后跑 `tools/verification/ui-style-regression.mjs`，它覆盖 12 路由 × 双视口，对外壳最敏感。

### 阶段 2/3 并行约定（2026-11-23，组长）

阶段 1 留下 333 个按旧色值命名的桥接令牌（`--palette-hex-*`），它们没有语义，无法直接切换主题。因此主题分两步走：新界面只用语义令牌；旧样式由 Codex CLI 收敛到语义令牌。

**语义令牌（新写的 CSS 只能用这些，不得写色值，不得引用 `--palette-*`）**

| 令牌 | 白昼 | 夜班 | 用途 |
|---|---|---|---|
| `--bone` | `#ECECE7` | `#161615` | 页面底色 |
| `--paper` | `#F7F7F3` | `#1E1E1C` | 内容面 |
| `--paper-2` | `#E4E4DD` | `#262624` | 凹陷面、悬停面 |
| `--ink` | `#222220` | `#D6D6D0` | 正文 |
| `--ink-strong` | `#141414` | `#ECECE7` | 标题、键帽边 |
| `--muted` | `#55554F` | `#A3A39C` | 次要文字 |
| `--line` | `#CFCFC7` | `#33332F` | 1px 分隔线与边框 |
| `--signal` | `#C8381A` | `#FF6A4A` | 主按钮底色 |
| `--signal-ink` | `#FFFFFF` | `#141414` | 主按钮上的文字 |
| `--signal-text` | `#B8321A` | `#FF6A4A` | 红色文字、判错 |
| `--ok-text` | `#2A6B34` | `#68C778` | 判对文字 |
| `--warn-text` | `#8A5A00` | `#E5B04A` | 提醒文字 |
| `--lit` | `#C8F03C` | `#9EC22E` | 点亮状态底色 |
| `--lit-ink` | `#141414` | `#141414` | 点亮底色上的文字 |
| `--off` | `#D6D6CF` | `#2C2C2A` | 未开始状态 |
| `--canvas` | `#161817` | `#161817` | 实验画布 |
| `--canvas-ink` | `#D6D6D0` | `#D6D6D0` | 画布上的文字 |

半透明色用 `color-mix(in srgb, var(--token) N%, transparent)` 派生。

**主题机制**：`<html data-theme="day|night">`。用户选择存 `localStorage['bitatlas.ui.theme']`，取值 `day`、`night`，缺省表示跟随系统 `prefers-color-scheme`。首帧前由 `index.html` 内联脚本设置属性（Codex CLI）；切换按钮在顶栏（组长），读写同一个键。

**文件归属（同一文件同一时间只有一位编辑者）**

| 成员 | 独占文件 |
|---|---|
| 组长 | `components/AppShell.tsx`、`components/ReadingPreferences.tsx`、`components/DailyTasks.tsx`、`pages/DashboardPage.tsx`、`pages/MorePage.tsx`、`pages/ReviewPage.tsx`、`styles/shell-v2.css`、`styles/pages/today.css`，以及这些组件的新增子组件和测试 |
| Antigravity | `pages/PracticePage.tsx`、`pages/CardReviewPage.tsx`、`styles/reading-layer.css`，以及它们的新增子组件和测试 |
| Codex CLI | `styles/tokens.css` 及阶段 1 产出的全部旧样式文件、`apps/web/index.html`、`app/`、`packages/*` |

新界面使用新类名并写在各自的新样式文件里；旧样式文件中随之失效的规则由 Codex CLI 统一清理，其他成员不直接改旧样式文件，需要时提给 Codex CLI。三个新样式文件的 `@import` 已加在 `styles.css` 末尾。

**实验页过渡方案**：实验样式约 170KB 且按深色手调。本轮先把实验页整体作为"夜班岛"（页面容器内固定夜班令牌与深色底），保证白昼主题下可用；"只有画布深色、外围随主题"留到阶段 5 随展厅外壳一起做。

### 阶段 2 更新过的测试（组长，2026-11-23）

| 文件 | 改动 | 原因 |
|---|---|---|
| `tests/e2e/study-flow.spec.ts:85`、`apps/web/e2e/study-flow.spec.ts:7` | 导航辅助函数 `followNav` 点击"更多"时，由只接受 `link` 改为接受 `link` 或 `button`（名称仍精确匹配"更多"） | 桌面"更多"由跳转链接改为展开下拉菜单的按钮（带 `aria-expanded`），语义上是按钮；手机底栏仍是链接。改的是到达目标页的路径，其后对目标页的断言一条未动 |

### 阶段记录

（各阶段完成后在此追加：改动文件、验证命令与实际结果、截图路径、更新过的测试断言及原因、待合并事项。）

#### 阶段 1 · 样式地基交付（2026-11-23，Codex CLI）

- 结论（高信心，限下述验收范围）：样式拆分、令牌与同条件规则合并通过自动对比；旧字号控制组 24/24 零像素差、24/24 零计算样式差。正式 13px 版本的变化均来自字号、行高/字距和文字排版带来的几何变化，未解释差异 0。完整报告、逐路由数字、失败历史与文件清单见 `docs/ui/stage-1-verification-2026-11-23.md`。
- 修改 `apps/web/src/styles.css`，新增 `styles/{tokens,base,shell,reading,lab}.css`、按原层叠位置保留的 responsive / lab / shell 附加分段及 `styles/pages/*.css`，共 22 份 CSS；入口仅 21 个 import。main.tsx、页面/组件 TSX、题包、schema、依赖均未改。
- 迁移工具 `tools/ui/migrate-styles.mjs`，用法及覆盖保护见 `tools/ui/README.md`；验收工具 `tools/verification/ui-style-{regression,evidence,report}.mjs`。原文件实际 2,964 行 / 272,873 bytes；按完整选择器列表及媒体条件合并 28 条重复规则、移除 10 条覆盖声明，不能沿用原计划“430”统计。共享逗号选择器与不同媒体条件保留语义。
- 572 处正字号声明提升至 13px，残留正的 <13px CSS 声明 0；4 处零字号视觉隐藏仍保留（三个手机图标按钮和栈底装饰）。tokens.css 外硬编码颜色 0，tokens.css 内 363 个颜色字面量声明（含 root/night），333 个精确旧色桥接令牌，后续主题阶段再做语义收敛。备用白昼/夜班值已按本文件修订，含 `--ok-text`；当前两选择器实际均为原深色。
- 实际验证：`npm run test -- apps/web/src/pages apps/web/src/components --maxWorkers=2 --reporter=json --outputFile=output/playwright/opus-ui-2026-11-22/stage-1/vitest-ui.json`，44 文件 281/281、0 failed/skipped；`npm run typecheck` 通过；`npm run build -w @408os/web -- --mode=server --outDir "../../output/playwright/opus-ui-2026-11-22/stage-1/build-after-2"` 通过；4 份工具 ESLint 和迁移 `--check` 通过。未改测试断言。
- Chrome 1 worker：12 路由 × 1440/390，390 使用 mobile + viewport meta；11,940 个可见 DOM 记录及伪元素。显式 night 24/24 零像素/样式差；18px/24px 共 48/48 无页面横溢；两视口共 14 次键盘 focus-visible 激活、作答/卡片和真实来源图通过；各视口题库 18 公式，无 katex-error。
- 产物 `output/playwright/opus-ui-2026-11-22/stage-1/`：有效对比 `before-4` → `control-3` / `after-2`，汇总 `delivery.json`，CSS 清单 `migration.json`。所有首轮失败日志、差分和不稳定截图保留；大 JSON 快照采用无损编码并逐文件核验，解码函数及摘要回执随工具提供。没有提交、推送、部署或删除历史。
- 后续门禁必须保留：既有 24px 触控尺寸未全部达标（例如知识链接 221、复习桌面 397 / 手机 84）；canvas/TSX 内 9px/10px 字体未改；完整对比度、主动白昼主题、全默认 E2E/全部实验状态未验收。本阶段不能写为全站可访问性或全站 UI 通过。
- 阶段 1 文件锁交还组长；后续手工编辑会使迁移 `--check` 失配，这是预期保护，禁止用 `--write` 覆盖阶段 2。新一阶段使用新的构建/截图目录和采集标签，旧标签复用会拒绝覆盖证据数据库。

#### 阶段 3 · 阅读层：练习页与记忆卡交付（2026-11-24，Antigravity）

- **改动与新增文件（均在独占范围内）**：
  - 修改：`apps/web/src/pages/PracticePage.tsx`、`apps/web/src/pages/CardReviewPage.tsx`、`apps/web/src/styles/reading-layer.css`、`apps/web/src/pages/PracticePage.test.tsx`。
  - 新增：`apps/web/src/components/readingKeyboard.ts`（统一快捷键过滤：排除可编辑元素、IME 组字与 Ctrl/Alt/Meta）、`apps/web/src/components/PracticeMistakePanel.tsx`（原地错因选择器，复用 `MISTAKE_REASONS` 五项枚举与 `savePracticeEvidence`）、`apps/web/src/components/ReadingImageLightbox.tsx`（题图与来源页图片点击放大弹窗，支持 100%/150%/200% 缩放与焦点回退）、`apps/web/src/pages/CardReviewPage.test.tsx`。
  - 未触碰 `tokens.css`、旧样式文件、`AppShell`、`app/`、`packages/*`、`main.tsx` 及构建配置。
- **样式与设计取舍**：
  - `reading-layer.css` 全部采用 `rl-` 类名与语义令牌（正则复核字面量颜色及 `--palette-*` 引用数为 **0**）；对 Codex 尚未落地的次级语义令牌使用纯语义 `color-mix` 回退，兼容过渡态与完整昼夜主题。
  - 阅读容器 `max-width: min(68ch, 100%)`、正文 `--reading-font-size`、`line-height: 1.8`、1px 细边无硬投影；阅读层禁用态按钮根据 Codex 对比度实测反馈将 `opacity` 设为 `1`，通过 `--off` 底色、`--line` 边框与 `not-allowed` 表达禁用，保持 `--muted` 在 `--off` 上昼夜对比度均 > 5.1:1。
  - 选项为整行按钮（左侧 A–D 键位标记，右侧非颜色状态标：`✓ 已选`、`✓ 正确`/`✓ 已选 · 正确`、`✕ 所选有误`，分别使用 `--ok-text` 与 `--signal-text`）；将状态标从 `<span>` 改为 `<div>` 并条件渲染，避免命中旧 `practice.css` 的 `.option-list > button > span` 规则且让 390px 视口首屏完整容纳 4 个选项。
  - 判错（及综合题自评未满分）后解析与错因原地展开；`saveMistakeReason` 先读取最新持久化 `PracticeEvidence`（保留 `attemptId` 与 `revision`）再保存，避免提交后立即标错因触发并发冲突；保存反馈用 `aria-live="polite"` 而非新增 `role="status"`，避免与既有单测唯一 `role="status"` 断言冲突。
  - 练习页快捷键支持 A–D 选答与 Enter 提交/下一题：通过 `enterLockedUntilKeyUpRef` + `event.repeat` 拦截防止一次按键或长按连触"提交+下一题"；并允许在草稿写入尚未落盘时直接响应键盘 Enter（复用 `submit()` 内既有 `flushResponses()`）。
  - 记忆卡保持"回忆 → 显示背面（Space/Enter/点击）→ 3 枚 1/2/3 键帽评分"顺序，背面未显示时 1/2/3 不响应；键帽内 `<kbd aria-hidden="true">` 配合 `aria-label="忘记|模糊|记得"` + `aria-keyshortcuts`，100% 保持既有精确可访问名称契约。
  - 来源页弹窗内点击 `<SourcePageImage>` 通过容器事件委托打开 `ReadingImageLightbox`（不在 `.source-modal` 内新增可 Tab 聚焦按钮，保持 Tab 焦点圈套测试不破）；按 Escape 先关放大图再关来源弹窗。内联公式保持原生基线对齐，`<p>`、`.katex-display`、`pre`、`.table-wrap` 各自局部横向滚动。
- **测试断言变动**：既有测试断言 **0 修改、0 削弱**；在 `PracticePage.test.tsx` 新增 4 条用例，在 `CardReviewPage.test.tsx` 新增 4 条用例。
- **实际验证结果**：
  - Vitest：`npx vitest run apps/web/src/pages/PracticePage.test.tsx apps/web/src/pages/CardReviewPage.test.tsx` → **2 文件，30/30 passed，0 failed**。
  - 类型检查：`npm run typecheck` → **全部 6 个 workspace 通过，0 errors**。
  - 独立生产构建：`npm run build -w @408os/web -- --outDir "../../output/playwright/opus-ui-2026-11-22/stage-3/dist"` → **成功**。
  - 真实 Chrome（1440×900 & 390×844 含 viewport meta，昼夜双主题，18px 与 24px 字号，结果见 `output/playwright/opus-ui-2026-11-22/stage-3/verification-report.json`）：
    - 页面横向溢出：`docOverflow = 0`（全部检查点，含 24px 字号与 KaTeX 公式题，katex-error = 0）。
    - 触控目标：两页所有可见按钮与链接最小尺寸 `30×30px`（练习页）/ `28px` 高（卡片页来源链接），均 ≥ 24×24px；390px 选项高度 `57px`（18px 字号）/ `67px`（24px 字号），记忆卡评分键帽 `66px`，均 ≥ 44px。
    - 键盘全流程：练习页 `A` → `Enter` 提交 → 长按/重复 `Enter` 停留当前题 → 标错因 `概念` 保存 → 松开后新按 `Enter` 进第 2 题通过；记忆卡未翻面按 `3` 无效 → `Space` 翻面 → `3` 评分进下一张通过。
    - 来源页图加载 `naturalWidth: 992`，点击放大弹窗 → 放大 150% → `Escape` 仅关大图 → 二次 `Escape` 关来源弹窗通过。
- **截图目录**：`output/playwright/opus-ui-2026-11-22/stage-3/`（共 16 张 PNG：`practice-{1440,390}-{day,night}.png`、`practice-submitted-{1440-{day,night},390-day}.png`、`practice-formula-1440-day.png`、`practice-24px-390-day.png`、`source-lightbox-1440-day.png`、`card-front-1440-day.png`、`card-back-{1440,390}-{day,night}.png`、`card-24px-390-day.png`，均已逐张审图）。
- **待跟进与已知边界**：
  - 独立构建产物位于 `output/playwright/opus-ui-2026-11-22/stage-3/dist/`，全站昼夜主题切换及 E2E 回归待与组长阶段 2、Codex `tokens.css` 主题启用合并后统一验收。
  - `ContentRenderer.tsx` 内联裁剪图容器（`.source-inline-crop`）仍含行内样式 `border: 1px solid #2e3a33; background: #fff;`（归属不在本阶段范围，留待后续清理）。

#### 阶段 2 · 主题当前批次验收与暂停停点（2026-11-24，拿铁）

- **状态**：维护者今晚要求暂停，任务 `01a20905-3d13-7b11-adb2-fe0b3394d41e` 保持 `in_progress`。接到暂停时仅390 E2E与attempt-5仍在跑，二者已自然结束；没有再开新批次。等待组长明确恢复，不自行开始数据接口任务。
- **交付范围**：17语义令牌、首帧day/night/system/存储容错、theme-color同步、实验夜班岛；545原声明变化，401引用/164旧令牌映射，422 palette引用消除，余408仅lab280/lab-extended44/lab-exhibits84，4份lab原文件摘要未变。蓝17处归中性、黄37处归warn-text；非实验旧别名与palette引用0。原CSS改变14份，加index.html共15份；迁移规格/复跑脚本 `tools/ui/{theme-mapping.json,migrate-theme.mjs}`，准确文件与命令见 `stage-2-theme-verification-2026-11-24.md`。
- **浏览器实际结果**：独立 `build-3` 的 `attempt-5` 100/100截图完成（12路由×1440/390×昼夜×18/24px+1024首页），10,758可见文字，0对比度失败，文档/main-area横溢0，首帧/回退17/17，运行错误0，截图抖动豁免0。最小实测昼4.558/夜4.565，4实验白昼夜班岛生效。Canvas/来源图片内部文字和全部交互状态不在采样覆盖内。
- **最终本轮验证**：UI Vitest 45文件289/289；`npm run typecheck`、server build-3、本地build-local-2、迁移复算通过。7文件E2E按1440/1366/390分别40/40，合计120/120，实际每批1 worker、0 skipped/flaky，汇总 `stage-2-theme/e2e-3-summary.json`。两份study-flow已包含组长裁定的link/button导航辅助函数，目标页断言未改；不冒充全默认E2E。
- **失败历史**：首轮E2E中断，81通过/6旧“更多”link失败/33无结果；无最终JSON，记录在`e2e-1-interruption.json`。输出目录保护初版在worker重载误触发，7启动失败/33未执行，已修复、保留。attempt-3的21文字失败（禁用透明度12、同步按钮9）修复后attempt-5归零。attempt-4跨午夜浏览器11/23/server11/24导致空计划超时，只改工具给server既有now注入口传固定时刻；未改产品。
- **暂停时未完成项**：全仓`npm run lint` **16 errors**，均在摩卡的ReadingImageLightbox/CardReviewPage/PracticePage（render refs、effect同步setState、4个unused参数）；`lint-2.log`、`lint-2-errors.json`逐条记录，已通知owner，未改TSX/加豁免。构建后`styles.css`新增`pages/secondary.css`导入，本批证据不覆盖该新层；旧侧栏规则清理未做。不能把本批通过写成当前工作目录全面封板。
- **截图路径**：`output/playwright/opus-ui-2026-11-22/stage-2-theme/attempt-5/` 下 `day-1440-today-18px.png`、`night-1440-today-18px.png`、`day-390-today-18px.png`、`night-390-today-18px.png`、`day-1440-questions-18px.png`；1024/24px及四实验同目录同命名规则。
- **安全停点**：00:28本任务Node/Chrome树全部退出，4349/4351无监听，回执`pause-process-check.json`。根HANDOFF/notes已同步，无提交/推送/部署。明天第一步：等恢复通知，读本段和根HANDOFF，owner修lint并核对secondary层增量后确定新构建/复验范围；不要覆盖旧证据或重跑已完成清理。

#### 阶段 2b 停点（2026-11-24，摩卡）

- **状态**：响应维护者今晚暂停要求，任务 `01a20935-53fb-7442-b52a-5ac2d9446dcb` 保持 `in_progress`，无残留 dev server / preview / Chrome 进程。已完成第 1、2 项（题库与复习中心）并收尾至可编译可验证状态；未开始后续页面，也未触碰阶段 3 的 lint 修复。
- **已改动 / 新增文件（阶段 2b 第 1 批，均在独占范围）**：
  - `apps/web/src/styles/pages/secondary.css`：建立 `.sec-*` 二级页面共享样式基础（统一页头、1px 细边、单主按钮约束、零字面量色值、零 `--palette-*`、禁用态 `opacity: 1`）并完成题库与复习中心样式。
  - `apps/web/src/pages/QuestionsPage.tsx`：重构为统一页头（`<h1>真题浏览</h1>` 保留原契约，去掉英文 eyebrow 与闪烁光标）、3 行结构化筛选面板（搜索 + 章节/概念/状态 + 年份分段 + 科目分段 + 重置）、统一 1px 账本式 799 题列表（42×42px 题号按钮、可见快速开始键、tabular-nums 数字），并按 `SERVER_MODE` 区分空题包文案（服务器版"题库尚未就绪" / 本地版保留"本地题包未安装"）。
  - `apps/web/src/pages/ReviewPage.tsx`：统一页头并在首屏固定"复习 | 错题（含实时错题数）"切换条；复用 `DailyTasks` 不改其源码；卡片区保留 `.memory-preview .content-blocks` 的 `--reading-font-size` 契约、按 12 张分页（搜索/概念筛选时全显）、`加练本组` 改用深色键帽按钮以保持全页唯一红色主按钮；`每日额度` 与 `历史记录` 收拢为底部两栏并支持顶部锚点直达；消除原题来源与已暂停卡片两处外露内部 ID（改用 `YYYY 年第 N 题 · locator` 与 `概念名 · 卡片前文摘要`，查不到用通用称呼）。
  - 新增单测：`apps/web/src/pages/QuestionsPage.test.tsx`（2 条）、`apps/web/src/pages/ReviewPage.test.tsx`（2 条）；既有测试断言未改动。
- **当前批次已跑验证（仅第 1、2 项，尚未跑 ESLint 与全仓 E2E）**：
  - Vitest：`npx vitest run apps/web/src/pages/QuestionsPage.test.tsx apps/web/src/pages/ReviewPage.test.tsx` → **2 文件 4/4 passed，0 failed**。
  - `npm run typecheck` → **全部 6 个 workspace 通过，0 errors**；`secondary.css` 正则审计硬编码色值与 `--palette-*` 命中 **0**。
  - 独立生产构建（`output/playwright/opus-ui-2026-11-22/stage-2b/dist`）通过；真实 Chrome 1440×900 / 390×844（含 viewport meta）昼夜 + 24px 验收通过（见 `output/playwright/opus-ui-2026-11-22/stage-2b/batch1-report.json`）：全部 12 检查点 `docOverflow = 0`、`lowTargetCount = 0`（最小触控 28–34px）、`lowContrastCount = 0`（实测最小对比度昼 5.14 / 夜 5.51），截图 11 张位于 `output/playwright/opus-ui-2026-11-22/stage-2b/`。
- **尚未开始的页面**：`WrongPage`、`PracticeSummaryPage`、`StatsPage`、`MorePage`、`SettingsPage`、`DocumentLibraryPage`、`AccountGate`。
- **明天接续的第一步（等组长通知恢复后按序执行）**：
  1. **优先修复阶段 3 的 16 条 ESLint 错误**（`ReadingImageLightbox.tsx`、`CardReviewPage.tsx`、`PracticePage.tsx`，对照 `output/playwright/opus-ui-2026-11-22/stage-2-theme/lint-2.log`，不加忽略注释），修完重跑 `PracticePage.test.tsx`、`CardReviewPage.test.tsx` 并对已改文件（含阶段 2b 第 1 批）补跑 ESLint；
  2. 结合组长对第 1、2 项截图的评审意见微调（如有），再继续实施阶段 2b 第 3–6 项。

#### 阶段 2b · 其余业务页、登录页与阶段 3 ESLint 清理交付（2026-11-24，摩卡）

- **阶段 3 16 条 ESLint 错误清理（零豁免注释）**：
  - `apps/web/src/components/ReadingImageLightbox.tsx`：消除 `useEffect` 内同步 `setState`（改为按 `src` 关联状态派生缩放索引）；`restoreFocusTo` prop 改为 `getRestoreFocusTarget?: () => HTMLElement | null` 在清理副作用内读取，消除渲染期读写 ref。
  - `apps/web/src/pages/CardReviewPage.tsx`：`shortcutRef.current` 移入 `useEffect` 更新；移除未使用 `_rating` 参数；传入 `getLightboxRestoreTarget`。
  - `apps/web/src/pages/PracticePage.tsx`：抽离零 DOM 子组件 `<PracticeKeyboardShortcuts />` 避免渲染期读写 ref，移除 3 处未使用桩参数；传入 `getLightboxRestoreTarget`。
- **阶段 2b 完整改动与新增文件（均在独占范围）**：
  - 样式：`apps/web/src/styles/pages/secondary.css`（全语义令牌；`reading-layer.css` 与 `secondary.css` 正则审计原始色值及 `--palette-*` 命中数为 **0**；禁用态保持 `opacity: 1`）。
  - 页面与组件（9 处）：`QuestionsPage.tsx`、`ReviewPage.tsx`、`WrongPage.tsx`、`PracticeSummaryPage.tsx`、`StatsPage.tsx`、`MorePage.tsx`、`SettingsPage.tsx`、`DocumentLibraryPage.tsx`、`AccountGate.tsx`。
  - 新增单测（4 文件共 9 条用例）：`QuestionsPage.test.tsx`（2）、`ReviewPage.test.tsx`（2）、`SecondaryPages.test.tsx`（4）、`AccountGate.test.tsx`（1）。
  - 未触碰 `tokens.css`、旧样式文件、`AppShell*`、`DashboardPage`、`DailyTasks`、`ReadingPreferences`、`AccountTools`、`LearningDataTools`、`app/`、`packages/*` 及根交接文件。
- **核心视觉与契约落实**：
  - 统一采用克制 1px 纸卡 + 静默小 `h1` + 事实陈述句 + 单红主按钮（键帽底边）体系；全中文保持无衬线，仅数字与代码徽标使用 `--mono` + `tabular-nums`。
  - `ReviewPage` 与 `WrongPage` 首屏固定“复习 | 错题（含实时计数）”切换条；复用 `DailyTasks` 未改其源码；保留 `.memory-preview .content-blocks` 继承 `--reading-font-size`（24px 测试契约）；消除原题来源、已暂停卡片及 `PracticeSummaryPage` 缺失回退中的原始内部 ID。
  - `StatsPage` 保留 `.metric-grid article` 依次为“有效作答”“答对题次”的契约，移除原 4 处科目硬编码十六进制色值，改用语义进度条类（`.sec-bar-ds/co/os/cn`）与几何标识（`▲ ■ ● ◆`）。
  - `MorePage` 保留 `<nav className="more-grid" aria-label="更多工具">`；`SettingsPage` 保持两处 `input[type="file"]` 顺序（`激活正式题包` 在 `备份与恢复` 之前，满足 `SettingsPage.test.tsx`）及 `BACKUP V4`/`BACKUP V5`、`needs-review` `.warning-text` 契约，唯一红主按钮给 `导出备份`。
  - `AccountGate` 仅改展示层（保留全部 props、鉴权、同步与迁移逻辑，以及精确 `用户名`/`密码`/`邀请码` 标签与按钮名称），提供 440px 居中纸卡、品牌标与昼夜适配。
  - `SERVER_MODE` 文案对齐：`QuestionsPage` 空题包改为“题库尚未就绪”，`MorePage` 改为“共享资料”，`SettingsPage` 改为“可用题目”与“账号同步已启用 / 仅本机保存”。**待组长裁定**：`DocumentLibraryPage` 的 `<h1>本地资料库</h1>` 与 `SettingsPage` 本地分支的 `打开本地资料库` 被 `document-reader.spec.ts:23-24` 直接断言，且服务器版路由已独立挂载 `ServerDocumentsPage`（“共享资料库”），故保留未改。
- **测试断言变动**：既有测试断言 **0 修改、0 削弱**。
- **实际验证结果**：
  - ESLint（阶段 3 + 阶段 2b 全部 21 个改动/新增文件）：**0 errors, 0 warnings**，0 忽略注释。
  - Vitest：`npx vitest run` 覆盖 7 个测试文件（`PracticePage`、`CardReviewPage`、`QuestionsPage`、`ReviewPage`、`SettingsPage`、`SecondaryPages`、`AccountGate`）→ **7 文件 44/44 passed，0 failed**。
  - `npm run typecheck`：7 个 workspace 中 6 个（`server`、`content-schema`、`cpu-core`、`domain`、`lab-core`、`storage`）全部通过；`@408os/web` 仅在非己方文件 `apps/web/src/components/AppShell.test.tsx(47,25)` 报 `TS2345`，己方所有文件 **0 errors**（按分工未修改队友文件）。
  - 独立生产构建（未覆盖 `apps/web/dist`）：本地版 `output/playwright/opus-ui-2026-11-22/stage-2b/dist` 与服务端版（`--mode server`）`output/playwright/opus-ui-2026-11-22/stage-2b/dist-server` 均通过。
  - 真实 Chrome 实测（1440×900 & 390×844 含 viewport meta，昼夜双主题，18px 与 24px 字号，共 9 页 54 个检查点）：
    - 第 1 批（`/questions`、`/review`，见 `batch1-report.json`）：12/12 检查点 `docOverflow = 0`、`lowTargetCount = 0`（最小 28–34px）、`lowContrastCount = 0`（最小对比度昼 5.14 / 夜 5.51），11 张截图。
    - 第 2 批（`/practice/:id/summary`、`/wrong`、`/stats`、`/more`、`/settings`、`/documents`、服务器模式登录页，见 `batch2-report.json`）：42/42 检查点 `docOverflow = 0`、`lowTargetCount = 0`（最小 26–76px）、`lowContrastCount = 0`（最小对比度昼 5.20–6.33 / 夜 5.89–6.58），运行时错误 `0`，28 张截图。
    - 审图发现并当场修复 4 处细节（3 处旧 `dashboard.css` 优先级覆盖指标数字/图标与证据数值字号，1 处旧 `responsive.css` `flex-direction: column` 与 `.sec-band-copy` `flex-basis: 360px` 冲突导致 390px 设置卡片纵向撑高），修复后重构建并复审确认。
- **截图与报告路径**：`output/playwright/opus-ui-2026-11-22/stage-2b/`（共 39 张 PNG，`batch1-report.json`、`batch2-report.json`）。
- **未覆盖边界**：未运行全仓默认 E2E 或覆盖 `apps/web/dist`；全站合并验收待队友解决 `AppShell.test.tsx:47` 类型错误后统一执行。

#### 阶段 4 · 寄存器数据与旧外壳清理（2026-11-24，拿铁）

- UI 入口为 `apps/web/src/app/useConceptRegister.ts`：返回 10 字段的 `concepts` 行、四科四态 `subjects`、逐项及去重 `todayPlan`、区分未检测与错答的 `objectiveByConcept` 和北京周一开始的 `weeklyStudyDays`；使用已有学习/题库/日历，不生成新计划。四个纯函数在 `app/concept-register.ts`。另有 `app/useSessionSyncStatus.ts`（`mode/loggedIn/pendingCount/offlineUntil/lastSuccessfulSyncAt`）；成功时间仅认本次登录的实际成功同步，空 outbox 不产生时间。
- 精确口径见 `docs/ui/concept-state-contract.md`。只用当前题面映射和当前卡片/来源版本，手工掌握度不入证。未检测与差表现独立标注；同日最低质量分别重放题目、卡片，稳定要求无提示首答覆盖和当前启用卡两边都有间隔、均未到期。暂停卡保留实际发生过的同版活动，但不进入排期。实包检查：799 题、80 卡、102 叶（28/22/22/30）；35 叶有真实题目实验链接，35 叶无初始可用卡。
- A：用 `tools/ui/prune-legacy-shell.mjs --write` 在 `base/shell/shell-tablet/shell-narrow/reading/responsive/pages/dashboard.css` 中删 76 个选择器分支、2 个旧主栏定位声明、2 个无调用动画。移除 `.sidebar/.sidebar-status/.primary-nav/.reading-preferences` 及旧清单 `heading/actions/list/number/state`、旧首页年份/科目进度、桌面 `.app-shell` 双栏和标题光标。`.daily-plan-section` 有真实 TSX、E2E 引用；`.app-shell` 的手机高度/滚动、`.brand-block/.mobile-nav/.main-area/.task-list/.more-grid/.metric-grid` 和统计/设置共用分支均保留。`--check` 复跑变更 0。没有修改页面、组件、新样式层或测试断言。
- 证据目录 `output/verification/stage-4-data-2026-11-24/`。A 后 UI Vitest：47 文件 **293/293**；B 定向 Vitest：7 文件 **54/54**（新用例 24，其中概念 19、记忆化 1、会话状态 4；原有合同 30），均 0 失败/跳过。改动的 11 个 TS/MJS 文件 ESLint **0 错误、0 警告**。整仓 `npm run typecheck` 首次 6/7 workspace 通过，唯一失败为组长范围 `apps/web/src/components/AppShell.test.tsx:47` 的 `press` 不接受 `Document`（TS2345），已报组长，未替改。浏览器/E2E 合并复验另行安排。

#### 阶段 2 外壳与今日首页 · 阶段 4 寄存器界面（2026-11-24，组长）

状态：已实现，单测、web 的 tsc、改动文件的 ESLint 通过。阶段 2 部分经过截图目检和 120/120 外壳 E2E（对应 build-3）；阶段 4 界面和下列"外壳补充"**尚未经过浏览器验证**，已交拿铁做合并复验，结果以其记录为准。

- 外壳（阶段 2）：`components/AppShell.tsx` 左侧栏改为顶栏，五个键帽导航加"更多"下拉、题包状态、字号下拉、主题切换；手机底栏 5 项不变。快捷键 T/Q/R/K/L/M 在练习、记忆卡、模考会话页停用，并排除可编辑元素、输入法组字、修饰键和打开的弹窗。`components/theme.ts` 读写 `bitatlas.ui.theme`。`components/ReadingPreferences.tsx` 改为顶栏紧凑下拉，可访问名称"正文字号"不变。
- 今日首页（阶段 2）：`pages/DashboardPage.tsx`、`components/DailyTasks.tsx`、`styles/pages/today.css`。`h1`"今日学习"保留为小标题，"今天 N 项"为大号陈述句；"开始剩余 N 题"是唯一主按钮，"继续学习"降为次要按钮；任务为带序号的票据，记忆卡按概念名显示，查不到显示"记忆卡"。
- 外壳补充（2026-11-24）：主题按钮改为用 `useSyncExternalStore` 订阅 `data-theme` 属性和系统配色变化，修正属性被首帧脚本或其他标签页改动后图标不同步；顶栏新增服务器模式同步徽标（`useSessionSyncStatus`）：有待同步显示"待同步 N 条"，队列为空且观察到成功同步显示"已同步 HH:mm"（北京时间），队列为空但没有观察到成功同步显示"无待同步记录"，本地模式和待同步数未知时不显示。加载文案改为"载入学习数据"。
- 寄存器（阶段 4）：新增 `components/ConceptRegister.tsx`、`components/concept-labels.ts`、`styles/pages/register.css`。知识页顶部按科目分行显示全部叶概念，四态只用几何区分（灰格、中心圆点、下半点亮、全格点亮），今日任务涉及的概念右上角有红色三角。每个科目一个 Tab 停靠点，左右方向键、Home、End 在行内移动；聚焦和悬停都更新说明文字。点击格子经 URL 选中该概念并滚动到详情面板，格子本身不改状态。手机上折叠为四条科目进度，逐科展开。不显示百分比。
- 知识页其余部分：`pages/KnowledgePage.tsx` 页头改为小标题加陈述句（`h1`"知识证据图"不变），详情面板在概念名下增加状态文字和学习记录（已练题目、记忆卡与到期数、最近学习日期）。原有知识图、科目选择、知识点列表、URL 规范化逻辑和类名均未改。面板里原有的"最近三次练习表现加权"百分比和图例仍在，未在本轮移除。
- 首页概要：`DashboardPage` 增加"四科概念"概要（四态计数与分段条，点击进入对应科目），陈述句下增加"涉及 N 个概念""本周已学 N 天"。概念数据为空时整块不渲染。
- 数据来源：全部来自拿铁的 `useConceptRegister`，界面不自行推导状态。
- 测试：新增 `components/AppShell.test.tsx` 13 条、`components/ConceptRegister.test.tsx` 6 条；`DashboardPage.test.tsx`、`KnowledgePage.test.tsx` 各加一个 `useConceptRegister` 的空数据 mock，原有断言未改。实际结果：6 个文件 61/61（含拿铁的 concept-register 两份），AppShell 单独 13/13；web `tsc --noEmit` 退出码 0；`components/` 目录及两页的 ESLint 0 错误 0 警告。
- 未做：知识图 Canvas 内的 9px/10px 文字和硬编码颜色（`KnowledgeGraph.tsx`）；知识页概念详情改为抽屉；知识点列表里的百分比。

#### 阶段 2b、4 与外壳合并复验（2026-11-24，拿铁）

- 验证结束，**一处产品对比度待修**。全仓 ESLint 396 文件 0 错误/0 警告；7 个 workspace 类型检查通过；全量 Vitest 127 文件 1393/1393；独立本地和服务器构建均通过。
- 112/112 个组合覆盖 14 个页面状态、1440/390、昼夜、18/24px；18,646 条可见文字样本，文档及主区横溢 0。`ReviewPage.tsx:235` 的错题数 `.sec-tab-badge`（`styles/pages/secondary.css:231`）白昼 `rgb(184,50,26)` 对 `rgb(229,210,202)` 为 4.104:1，两个视口和两个字号共 4 条低于 4.5；夜班 5.264:1。归摩卡，已向组长报告。前端源码与测试断言未改。
- 首帧/系统回退 34/34，逐页面主题 56/56；寄存器专项 17/17。102 格桌面 26×26、间距 6，手机 30×30、间距 8。6 次答题、3 次评卡跨两个北京日显示 99 未开始、1 练习中、1 待巩固、1 稳定；10 个红角与计划完全匹配。真实断网/恢复时同步徽标与 outbox 及成功事件一致。
- 本地 E2E 三视口各 47/47，加服务器两视口各 7/7，共 155/155，每批 1 worker、0 失败/跳过/flaky。全默认本地 234 条中的 93 条实验专用检查不在本轮。五张优先首屏已先发；完整报告 `docs/ui/stage-4-integrated-verification-2026-11-24.md`，证据 `output/playwright/opus-ui-2026-11-22/stage-4-integrated/delivery.json`。首轮采集/专项的工具中断、逐视口补采均有原始回执；4349/4351 已释放。

#### 阶段 4 补充 · 知识图与知识页去百分比（2026-11-24，组长）

状态：已实现。单测、web 的 tsc、改动文件 ESLint 通过；用独立构建在真实 Chrome 中做过截图目检。**尚未跑 E2E**，下一轮合并复验需包含 `visual`、`study-flow` 知识相关用例、`learning-reliability`、`tests/server-e2e/account-flow`。

- `components/KnowledgeGraph.tsx`：
  - 节点颜色不再按"表现百分比"区间着色，改用寄存器的四态几何：灰格、虚线框、下半点亮、全格点亮；章节节点为中性灰框。props 由 `performance` 改为 `states: Map<conceptId, ConceptState>`，唯一调用方是 KnowledgePage。
  - 画布固定为深色，图中颜色取夜班令牌值；Cytoscape 画在 canvas 上，读不到 CSS 变量。
  - 标签移到节点下方，不再压在填充色上。字号按缩放反向补偿，屏幕上不小于 13px（原为 9 和 10px）。
  - 布局由 `concentric` 改为自算的径向树（`preset`）：叶节点按树序等角分布，章节位于子节点的角度中心。原布局整圈 2π 分布，会把同一环的首尾节点放在同一位置，截图中可见标签重叠。
  - 选中节点只在超出可视区时才平移。
- `pages/KnowledgePage.tsx`：
  - 去掉"最近三次练习表现加权"百分比块、覆盖率百分比，以及按百分比分段的图例。图例改为四态加章节；叶概念的学习记录增加"作答证据 N 条"。
  - 章节和科目根节点没有自身状态，改为显示其下各叶概念的四态计数，以及已检测题目数和作答证据数。
  - 知识点列表右侧的百分比改为四态标记加文字。
  - 关联题目在叶概念最多列 24 个，超出显示"另有 N 题"；章节和根节点只显示总题数，不再把几十个题号全部铺开。
  - 题号由 `year`/`number` 生成；查不到当前版本时显示"题目（当前版本不可用）"，不再从 ID 截取。讲解来源列表同样不再显示原始 questionId。
  - 去掉两处英文 eyebrow 口号。
- 保留不变：`.knowledge-coverage`"已检测 N / M"、"专项练习 N 题"按钮、`.knowledge-status`、科目选择和 URL 行为、`knowledge-topic-list` 结构。这些都有 E2E 依赖。
- 实测（独立构建，1440/390 × 昼夜，操作系统和数据结构两科）：页面横溢 0，知识页文本中百分号 0，运行时错误 0。截图在 `output/playwright/opus-ui-2026-11-22/lead-knowledge-graph/`。本机无学习记录，截图里全部为"未开始"；四态实际显示依赖拿铁在合并复验中用真实记录做的检查。
- 单测：KnowledgePage 13/13，另外 3 份相关单测合计 45/45。
- 测试断言：四份 lab spec 中阶段 1 遗留的 `font-size: '10px'` 改为 `'13px'`（deadlock、filesystem-links、semaphore、stack-capacity）。阶段 1 已把全部小于 13px 的 CSS 字号提到 13px，这四条断言与真实样式不符；断言强度不变。

#### 阶段 2c · 共享资料库、PDF 阅读器、模考入口（2026-11-24，组长）

状态：已实现，改动文件 ESLint 0 错误；MockExamPage 单测 3/3。模考入口页在独立构建上做了 1440/390 × 昼夜截图检查。**共享资料库只在服务器模式出现，本地构建看不到，尚未做浏览器验证；三项都没有跑 E2E**，下一轮合并复验需包含 `tests/e2e/document-reader.spec.ts`、`tests/e2e/mock-exam.spec.ts`、`tests/server-e2e/account-flow.spec.ts`。

- `pages/ServerDocumentsPage.tsx`（服务器模式下的 `/documents`）：改用阶段 2b 资料库的页头和列表结构（`sec-header`、`sec-doc-list`），文件行增加图标和等宽数字，已离线的资料用"✓ 已保存离线副本"标出；上传改成一个"选择文件"按钮加进度条，空状态改为与本地资料库一致的空状态卡。保留了全部文案和可访问名称：`共享资料库`、`上传资料文件`、`发布这份资料`、`阅读`、`保存供离线阅读`、`移除离线副本`、`已保存离线副本`、`.document-row`、`共享 PDF`。根节点由 `<main>` 改为 `<div>`，避免和外壳的 `main.main-area` 嵌套。
- `pages/PdfReaderPage.tsx`：英文口号 `SHARED PDF`/`LOCAL PDF` 改为"共享资料"/"本地资料"；阅读区由 `<main>` 改为 `<div>`，理由同上；服务器模式的加载文案改为"载入资料"。桌面端阅读器工具条吸附在顶栏下方（`top: 57px`），之前会钻到顶栏下面。PDF 页面本身始终是白底，因此阅读区底色用 `--bone`，页面加 1px 描边。
- `pages/MockExamPage.tsx`：页头改成与首页一致的小标题加陈述句（`h1`"整卷模考"不变）；去掉两处英文口号；"本地模考记录"改为"模考记录"；四个规则图标统一为次要色，不再是四种颜色。服务器模式下只有管理员能看到"进入内容复核"链接，因为服务端会拒绝成员的复核请求；本地模式不变。警告说明文字改为正文色，原来是红色。手机上"进入内容复核"按钮原先是 `width: 100%` 再加 29px 缩进，伸出了警告框，已修正，实测按钮位于框内。
- 新样式文件 `styles/pages/library.css`，在层叠最后引入；`register.css` 中暂放的资料库规则已移到这里。
- 实测（模考入口，独立构建）：四种组合页面横溢 0、运行时错误 0，按钮在框内，说明文字白昼 `rgb(34,34,32)`、夜班 `rgb(214,214,208)`。截图在 `output/playwright/opus-ui-2026-11-22/lead-library-mock/`。
- 注意：web 的 tsc 目前报 4 个错误，都在摩卡正在迁移的 `DiskScheduling`、`HrrnScheduling`、`Semaphore`、`TcpCongestion` 四个实验页（给 `ReactNode` 槽位传了带 `label` 的对象），属于其 B 组进行中的状态，不是本节改动造成的。

#### 阶段 5 试点 · LabExhibit 展厅外壳与 3 个试点实验页（2026-11-24，摩卡）

- **3 个试点实验与选择理由**：
  1. **数据结构 — `MinHeapInsertLabPage`（2009 Q9，小根堆插入）**：含真实交互式 `<svg className="min-heap-tree">` + 数组与根结点状态，可直接验证暗色画布内 SVG 可读性；其 E2E（`min-heap-insert-lab.spec.ts`，166 行）还覆盖手机 390px 布局顺序契约（`event <= step-explorer <= state-panel`、`step-explorer.height < 430`、`.mobile-nav` `position: static`），能一次性校验后续约 10 个同构实验的移动端堆叠合同。
  2. **操作系统 — `SegmentationAddressLabPage`（2009 Q27，分段地址字段）**：典型 OS 独立实验页（225 行），对应 E2E 简洁（39 行），覆盖双输入、推导公式、位段标尺画布与无效输入空态，代表位段标尺类画布。
  3. **计算机网络 — `QamNyquistLabPage`（2009 Q34，QAM / 奈氏准则）**：典型网络独立实验页（214 行），对应 E2E 简洁（40 行），覆盖 3 栏数值输入、公式条、4 格指标、3 阶段流程画布与无效输入空态，代表公式+指标+流程类画布。
- **`LabExhibit` 组件接口**（`apps/web/src/components/LabExhibit.tsx`）：
  - 纯展示外壳 `LabExhibit(LabExhibitProps)`，始终在根节点挂 `page lab-exhibit-page`（加可选 `pageClassName`），退出整页夜班岛；内部 4 个主槽位加 2 个可选辅助槽位：
    - 标题区：`subjectLabel`（中文小标）、`title`（`<h1>`）、`description`、`headerAction?`、`navigation?`（原样承载未改动的 `LabSectionNav` 与 `*ModuleTabs`）、`alert?`、`notice?`（配套纯展示 `LabExhibitNotice`）、`subheading?`。
    - 控制区：`controls`（`.lab-exhibit-controls`，随主题走，1px 边框与键帽控件，无硬投影）。
    - 实时状态带（可选）：`status?`（`.lab-exhibit-status`，随主题走；桌面位于控制区与画布之间，≤960px 位于控制区与步骤区之间，自然满足全部移动端 `event <= explorer <= state` 契约）。
    - 画布：`canvas?`（`.lab-exhibit-canvas`，`data-exhibit-canvas="dark"`，仅此槽位内部固定 `--canvas` 与夜班令牌；无内容时不渲染空黑框）。
    - 逐步说明：`steps?`（`.lab-exhibit-steps`，承载未改动的 `StepExplorer` 或空态卡，随主题走，桌面 `sticky top: 72px`，≤960px `.step-list` 限高 `220px` 局部滚动）。
    - 底部结论（可选）：`footer?`（预留给 `CompleteBinaryTree` / `SortPass` 等带结论卡的实验）。
- **改动与新增文件（均在独占范围）**：
  - 新增：`apps/web/src/components/LabExhibit.tsx`、`apps/web/src/components/LabExhibit.test.tsx`。
  - 修改：`apps/web/src/styles/lab-exhibit-shell.css`（纯语义令牌，正则审计原始色值及 `--palette-*` 命中 **0**；禁用键帽保持 `opacity: 1`；修复 `.lab-exhibit-canvas .min-heap-tree text` 在白底圆点上的深字 `--lit-ink` 对比度 18.42:1；修复桌面 `.os-module-tabs` 为 7 列避免孤儿折行）、`apps/web/src/styles/tokens.css`（**仅修改第 425–478 行夜班岛段落选择器**，改为 `.page[class*="-lab-page"]:not(.lab-exhibit-page), .lab-exhibit-canvas`，三条对比度修正规则同步覆盖未迁移页与 `.lab-exhibit-canvas`）、`apps/web/src/pages/MinHeapInsertLabPage.tsx`、`apps/web/src/pages/SegmentationAddressLabPage.tsx`、`apps/web/src/pages/QamNyquistLabPage.tsx`。
  - 未触碰 `lab*.css`、`LabSectionNav`、`*ModuleTabs`、`StepExplorer`、`packages/lab-core`、`packages/cpu-core` 及任何非试点实验页。
- **测试断言变动**：既有单测与 E2E 断言 **0 修改、0 削弱**；新增 `LabExhibit.test.tsx`（2 条用例）。
- **实际验证结果**：
  - **Vitest**：`LabExhibit.test.tsx` + 3 个试点单测 → **4 文件 13/13 passed，0 failed**。
  - **ESLint**（全部 8 个新增/改动及对应测试文件）：**0 errors, 0 warnings**，0 忽略注释。
  - **CSS 语义令牌审计**（`lab-exhibit-shell.css`）：原始色值与 `--palette-*` 命中 **0**。
  - **`npm run typecheck`**：**全部 7 个 workspace 通过，0 errors**。
  - **独立生产构建**：`output/playwright/opus-ui-2026-11-22/stage-5-pilot/dist`（未触碰 `apps/web/dist`）。
  - **Playwright E2E**（隔离构建，端口 `4361`，1 worker，覆盖 `chromium-1440` / `chromium-1366` / `chromium-390`）：
    - 3 试点（`min-heap-insert-lab`、`segmentation-address-lab`、`qam-nyquist-lab`）+ 2 未改对照组（`data-structures-lab` 含 `.ds-graph/.ds-node/.ds-edge`、`protocol-labs` 含磁盘/GBN/TCP）→ **24/24 passed，0 failed**；`.os-module-tabs` 7 列微调后重跑 `segmentation-address-lab.spec.ts` **3/3 passed**。
  - **真实 Chrome 验收**（端口 `4362`，1440×900 & 390×844 含 viewport meta，昼夜双主题，18px & 24px 字号，结果见 `output/playwright/opus-ui-2026-11-22/stage-5-pilot/pilot-report.json`）：
    - 主题隔离实测：3 个试点页白昼外围底色为 `--bone`（`rgb(236, 236, 231)`），夜班为 `rgb(22, 22, 21)`，画布 `.lab-exhibit-canvas` 恒为 `--canvas`（`rgb(22, 24, 23)`）；2 个未改对照组（`shortest-path`、`cidr`）白昼页面根仍保持整页夜班岛 `rgb(22, 24, 23)`，`.ds-node/.ds-edge` 文字对比度 `13.72–18.42`。
    - 溢出与触控：全部检查点（含 24px 字号）`docOverflow = 0`、`mainOverflow = 0`、`lowTargetCount = 0`（试点最小触控目标 `34px`）。
    - 对比度：画布外文字最小对比度白昼 `5.45–5.52` / 夜班 `6.58`（`lowOutsideContrastCount = 0`）；画布内文字最小对比度 `6.58`（`lowCanvasContrastCount = 0`）；小根堆 SVG 节点文字对比度 `18.42`；运行时错误 `0`。
    - 键盘流程：3 个试点页聚焦“下一步”可见实线焦点框，`Enter` 步进（`1/6→2/6`、`1/5→2/5`），聚焦“复位步骤”按 `Space` 归位均通过。
- **截图与报告路径**：`output/playwright/opus-ui-2026-11-22/stage-5-pilot/`（20 张 PNG，含 1440 全页昼夜、390 顶部与画布昼夜及 2 张未改对照组截图 + `pilot-report.json`）。
- **试点后在旧 `lab*.css` 中失效的规则（待 31 页铺完再统一删）**：
  - `lab-exhibits.css:164–190, 209–230`（`.min-heap-lab-grid/.min-heap-workbench/.min-heap-control-panel/.min-heap-current-event/.min-heap-input-grid/.min-heap-metrics/.min-heap-step-explorer` 等外围规则已替代；画布内 `.min-heap-tree*/.min-heap-array*/.min-heap-root*` 仍复用）。
  - `lab-extended.css:124–147, 159, 187–202`（`.segmentation-review-band/.segmentation-address-lab-grid/.segmentation-address-control/.segmentation-current-event/.segmentation-address-equation` 等已替代；画布内 `.segmentation-field-ruler*/.segmentation-field-facts*` 仍复用）。
  - `lab.css:779–806, 814` 与 `responsive.css:247–258, 262–264, 267`（`.qam-review-band/.qam-nyquist-lab-grid/.qam-nyquist-control-panel/.qam-nyquist-current-event/.qam-nyquist-equation/.qam-nyquist-metrics` 等已替代；画布内 `.qam-nyquist-timeline*/.qam-nyquist-boundary` 仍复用）。
- **其余 31 个实验页铺开评估（总计 3 试点 + 31 待迁移 = 34 实验）**：
  - **A 组 · 可直接套用 `LabExhibit`（11 个独立页，预估 15–25 分钟/页，合计 3–4 小时）**：
    - DS（5）：`CompleteBinaryTreeLabPage`、`ForestBinaryRelationLabPage`、`StackCapacityLabPage`、`SortPassAnalysisLabPage`、`BinaryTreeTraversalLabPage`。
    - OS（2）：`SingleResourceDeadlockLabPage`、`FilesystemLinksLabPage`。
    - Network（4）：`CsmaCdCollisionLabPage`、`FtpControlConnectionLabPage`、`TcpCumulativeAckLabPage`、`SwitchForwardingLabPage`。
    - 提示：`StackCapacity`、`Deadlock`、`FilesystemLinks`（及 B 组 `Semaphore`）的 E2E 含阶段 1 遗留的 `font-size: 10px` 断言，铺开前需组长裁定同步改至 `13px`。
  - **B 组 · 需重写较复杂控制区 / 多表单面板（11 个：4 独立页 + 7 个 CPU 子面板，预估合计 7–8 小时）**：
    - 独立页（4）：`HrrnSchedulingLabPage`（5 面板需拆表与甘特画布）、`SemaphoreLabPage`（多队列状态）、`TcpCongestionLabPage`（多控件+SVG 折线）、`DiskSchedulingLabPage`（5 输入+策略切换+SVG 轨迹；且当前根节点为 `<div className="page">` 缺 `*-lab-page`，迁移时补齐类名）。
    - CPU 宿主内标准子面板（7，需先给 `LabExhibit` 增加内嵌工作区模式由 `CpuLabPage` 统一包壳）：`RadixPanel`、`MachinePanel`、`Float32Panel`、`RiscvPanel`、`BusBandwidthLabPanel`、`IoOverheadLabPanel`、`MemoryExpansionLabPanel`。
  - **C 组 · 结构特殊需单独设计（9 个，预估 1–1.5 小时/个，合计 10–13 小时）**：
    - DS（2，合在 `DataStructuresLabPage.tsx`）：`ShortestPathLabPage`（控制与 `.ds-graph` 同卡需拆槽）、`LinkedListLabPage`。
    - OS（1）：`VirtualMemoryLabPage`（468 行多表+自定义步进）。
    - Network（2）：`NetworkLabPage`（541 行 CIDR/LPM 四面板混排）、`GbnLabPage`（468 行双窗口状态机）。
    - CPU 复杂子面板（4）：`CacheLabPanel`、`DatapathLabPanel`、`MicroOperationsLabPanel`、`PipelineLabPanel`（595 行、唯一不用 `StepExplorer` 自带时钟步进与三张时空/冒险表）。
  - **分工建议（机械 vs 设计判断）**：
    - **可交能力较弱成员机械执行**：A 组 11 页的绝大部分及 B 组 CPU 简单面板——按试点样板套 `<LabExhibit>`、搬运 `LabSectionNav/*ModuleTabs`、换 `.lab-exhibit-control-card/.lab-exhibit-field/.lab-exhibit-equation/.lab-exhibit-metrics/.lab-exhibit-status-card/.lab-exhibit-stage`、保留 E2E 依赖类名、跑单测/lint/E2E。
    - **需强设计/架构成员把关**：(1) B/C 组多面板页的“亮色控制阅读区 vs 暗色画布”切分；(2) 带 SVG 实验（`ForestBinaryRelation`、`BinaryTreeTraversal`、`DiskScheduling`、`TcpCongestion`、`ShortestPath`）的画布内节点/连线对比度核查；(3) `CpuLabPage` 内嵌壳接口设计；(4) `PipelineLabPanel` 自定义步进器适配；(5) 4 份旧 `10px` E2E 断言同步裁定。

#### 阶段 5 铺开 B 组 · 错题徽标修复、LabExhibit 内嵌模式、CPU 7 面板与 4 复杂页（2026-11-24，摩卡）

- **一、错题计数徽标 `.sec-tab-badge` 对比度修复**（`apps/web/src/styles/pages/secondary.css:231–253`）：
  - 改动：改用纯语义混合底 `color-mix(in srgb, var(--signal-text) 5%, var(--paper))` 与边框 `color-mix(in srgb, var(--signal-text) 35%, var(--line))`（激活态 `.sec-mode-tab.is-active .sec-tab-badge` 去框透明），0 原始色值。
  - 真实 Chrome 像素合成实测（`/review`，canvas-2d 逐像素还原 `color-mix` sRGB）：白昼 `rgb(184,50,26)` / `rgb(244,237,232)` = **5.17:1**（原 4.10:1），夜班 `rgb(255,106,74)` / `rgb(41,34,30)` = **5.52:1**，已第一时间向组长短报。
- **二、`LabExhibit` 内嵌工作区模式与受限夜班岛 API**（`apps/web/src/components/LabExhibit.tsx`、`apps/web/src/styles/tokens.css:425–484`）：
  - **向后兼容**：既有独立页继续传 `controls / status? / canvas? / steps? / footer?`，DOM 与样式 100% 不变（不破坏试点 3 页及拿铁并行迁移的 A 组 11 页）。
  - **新增宿主与内嵌导出**：
    - `LabExhibit`：`controls` 改为可选；省略 `controls` 时进入宿主模式，将 `children` 渲染进 `.lab-exhibit-host-body`（供 `CpuLabPage` 统一承载标题、相关真题按钮、`LabSectionNav`、11-tab 导航栏与子标题）。
    - `LabExhibitWorkspace`：子面板直接复用四槽网格（`controls / status? / canvas? / steps? / footer?`）与 `mobileOrder?: 'steps-first' | 'canvas-first'`（默认 `'steps-first'` 满足 `SemaphoreLabPage` 390px 顺序；`'canvas-first'` 满足 `MemoryExpansionLabPanel` 390px `event <= chip-regions <= explorer` 顺序）。
    - `LabExhibitLegacyIsland`：渲染 `<div className="lab-exhibit-legacy-island" data-exhibit-legacy-island="dark">`，并在 `tokens.css:425–484` 夜班岛选择器中增补 `.lab-exhibit-legacy-island`，将暂未迁移的 C 组 4 个 CPU 面板（`Datapath`、`Pipeline`、`Cache`、`MicroOperations`）在白昼模式下安全隔离为局部深色岛，不污染外围白昼宿主。
- **三、B 组逐页/逐面板完成清单（合计 1 宿主 + 7 CPU 面板 + 4 复杂独立页）**：
  - `CpuLabPage.tsx`（宿主 + 4 内联面板）：宿主套 `<LabExhibit pageClassName="cpu-lab-page">` 与 11-tab 语义导航（桌面 11 列、≤1280px 6 列、≤760px 2 列且末项通栏）；`RadixPanel`、`MachinePanel`、`Float32Panel`、`RiscvPanel` 全部迁入 `LabExhibitWorkspace`，亮色控制区与暗色位串/位段/标尺画布分离；C 组 4 面板用 `LabExhibitLegacyIsland` 包裹。
  - `BusBandwidthLabPanel.tsx`：`LabExhibitWorkspace` 亮色参数/来源边界/单位约定 + 实时状态条 + 暗色公式与 5 项吞吐画布 + 步进（保持单一 `aria-live="polite"`）。
  - `IoOverheadLabPanel.tsx`：`LabExhibitWorkspace` 3×3 参数与边界条 + 实时状态条 + 暗色中断/DMA 占比条形图与 3 项指标画布 + 步进（保持单一 `aria-live="polite"`）。
  - `MemoryExpansionLabPanel.tsx`：`LabExhibitWorkspace mobileOrder="canvas-first"`，亮色 6 参数控制 + 实时状态条 + 暗色容量分区/汇总/ROM·RAM 芯片矩阵画布 + 步进（保持单一 `aria-live="polite"`；画布标题定为“主存划分与芯片矩阵”避免与 `aria-label="容量分区"` 碰撞）。
  - `HrrnSchedulingLabPage.tsx`：`LabExhibit` 拆出题目结论卡（`D` 徽章+公式）与教学示例卡+指标、实时事件条、暗色非抢占甘特时间线画布（带横向滚动容器）、步进器，以及底部亮色就绪队列/调度结果双表与空闲提示。
  - `SemaphoreLabPage.tsx`：`LabExhibit`（默认 `steps-first`）亮色容量与操作脚本+状态条、实时原子操作条（阻塞/唤醒语义色左边框）、暗色画布内依次垂直堆叠缓冲区/四个信号量/三进程状态块（重置旧 `grid-area` 避免重叠；`FIFO` 标签保持 `13px`；单一 `aria-live="polite"`）。
  - `TcpCongestionLabPage.tsx`：`LabExhibit` 亮色预设与参数/脚本控制、暗色 `TcpWindowChart` SVG（`--lit` cwnd 折线、`--warn-text` ssthresh 虚线、`--signal-text` 当前点）+ 状态汇总、步进器及底部亮色“模型边界”说明卡。
  - `DiskSchedulingLabPage.tsx`：补齐页面根类名 `disk-scheduling-lab-page` + `lab-exhibit-page`；亮色 5 策略分段切换（390px 完整显示不裁切）与参数/物理边界勾选、暗色指标汇总（保留 `.vm-address-breakdown`）+ `DiskTrackFigure` SVG（文字升至 `13px` 并改用语义令牌）、步进器、底部亮色 `TraceComparison`（保留 `.ds-comparison`）及未知端点 `role="status"` 提示。
- **四、测试断言变动与实际验证**：
  - **测试断言变动**：既有单测与 E2E 断言 **0 修改、0 削弱**；`LabExhibit.test.tsx` 新增 1 条宿主/内嵌模式与 `LabExhibitLegacyIsland` 单测（共 3 条）。
  - **CSS 语义令牌审计**（`lab-exhibit-shell.css` + `secondary.css`）：原始色值及 `--palette-*` 命中 **0**，禁用态均保持 `opacity: 1`。
  - **ESLint**（全部 18 个改动及测试文件，`--max-warnings=0`）：**0 errors, 0 warnings**，0 忽略注释。
  - **Vitest**（9 份测试文件：`LabExhibit`、`CpuLabPage`、`BusBandwidthLabPanel`、`IoOverheadLabPanel`、`MemoryExpansionLabPanel`、`HrrnSchedulingLabPage`、`SemaphoreLabPage`、`TcpCongestionLabPage`、`DiskSchedulingLabPage`）：**9/9 文件，53/53 passed**。
  - **`npm run typecheck`**：**全部 7 个 workspace 通过，0 errors**。
  - **独立生产构建**：`output/playwright/opus-ui-2026-11-22/stage-5-rollout-b/dist`（未触碰 `apps/web/dist`）。
  - **Playwright E2E**（隔离构建，端口 `4361`，1 worker，覆盖 `chromium-1440` / `chromium-1366` / `chromium-390`）：`bus-bandwidth-lab`、`io-overhead-lab`、`memory-expansion-lab`、`cpu-extended-labs`（含 C 组 `Cache`/`Datapath`）、`micro-operations-lab`（C 组）、`pipeline-lab`（C 组）、`semaphore-lab`、`protocol-labs`（含 `DiskScheduling`/`TcpCongestion`/未改 `GbnLabPage`）→ **8 份 spec 合计 36/36 passed，0 failed**。
  - **真实 Chrome 视觉与对比度验收**（端口 `4362`，`output/playwright/opus-ui-2026-11-22/stage-5-rollout-b/rollout-b-report.json`，覆盖 12 路由 × 昼夜 × 1440/390 × 18px/24px 共 **74 项检查**）：
    - 运行时错误 `0`，水平溢出 `0`，低触控目标（<24px）`0`（最小交互目标 `32px`）。
    - 对比度：画布外最小对比度白昼 **4.85–6.33:1** / 夜班 **5.22–6.58:1**（违例 `0`）；暗色画布内最小文字对比度 **4.82:1**（违例 `0`）；SVG 文字最小对比度 **7.03:1**、最小字号 **13px**。
    - `cpu-cache-legacy`（白昼 1440）：宿主外围 `--bone`（`rgb(236, 236, 231)`），`.lab-exhibit-legacy-island` 内部恒暗（`rgb(22, 24, 23)`），宿主对比度最小 `6.33:1`。
- **五、截图与报告路径**：`output/playwright/opus-ui-2026-11-22/stage-5-rollout-b/`（30 张 PNG + `rollout-b-report.json` + 徽标复测隔离构建 `dist-badge/`）。
- **六、B 组完成后在旧 `lab*.css` / `responsive.css` 中失效的规则（待 C 组收尾后统一删除）**：
  - `lab.css:15` 与 `responsive.css:62–67`（`.cpu-lab-tabs` 桌面/移动布局已由 `lab-exhibit-shell.css` 接管）。
  - `lab.css:125–169, 254–296`、`lab-exhibits.css:480–498`、`responsive.css:70–96`（`.io-overhead-lab-layout/.io-overhead-config-grid/.io-overhead-boundary/.io-overhead-current-event`、`.bus-bandwidth-lab-layout/.bus-bandwidth-review-band/.bus-bandwidth-heading-actions/.bus-bandwidth-config-grid/.bus-bandwidth-boundary/.bus-bandwidth-current-event`、`.memory-expansion-lab-layout/.memory-expansion-heading-actions/.memory-expansion-config-grid/.memory-expansion-current-event` 外围布局已替代；画布内公式/指标/分区/芯片矩阵结构类仍复用并在 `lab-exhibit-shell.css` 中完成语义令牌覆写）。
  - `lab.css:868–917` 与 `lab-exhibits.css:462–479`（`.hrrn-review-band/.hrrn-lab-grid/.hrrn-workbench/.hrrn-step-explorer/.hrrn-source-panel/.hrrn-config-panel/.hrrn-formula/.hrrn-input-help/.hrrn-current-event/.hrrn-metrics/.hrrn-idle-note/.hrrn-empty-trace` 已替代；画布内 `.hrrn-timeline*` 与表格类已在 `lab-exhibit-shell.css` 中覆写为语义令牌）。
  - `lab-exhibits.css:2–27, 65–78`（`.semaphore-lab-grid/.semaphore-workbench/.semaphore-control-panel/.semaphore-current-event/.semaphore-step-explorer/.semaphore-script-status` 及旧 `grid-area` 定位已替代；画布内 `.semaphore-buffer-*/.semaphore-value-grid/.semaphore-queue/.semaphore-process-list` 布局结构复用并完成语义令牌覆写）。
  - `lab.css:698–709, 726–729` 与 `responsive.css:208–218`（`.tcp-review-band/.tcp-lab-grid/.tcp-control-heading/.tcp-input-grid/.tcp-event-script/.tcp-empty-trace/.tcp-model-note` 已替代；画布内 `.tcp-chart-viewport/.tcp-window-chart*/.tcp-state-summary` 复用并完成语义令牌覆写）。
  - `lab.css:537–538, 562–575` 与 `responsive.css:206–207`（`.disk-policy-switch` 与 `.ds-comparison` 旧渐变卡片已由 `lab-exhibit-shell.css` 覆写；`.ds-comparison` 与 `.vm-address-breakdown` 类名保留以兼容 E2E 选择器）。

<a id="stage-5-a"></a>

#### 阶段 5 铺开 A 组与知识页、错题徽标复验（2026-11-25，拿铁）

11/11 个独立页完成，跳过 0。页头、参数、当前事件、画布、步骤与结论迁入 `LabExhibit`。画布保留深色；控制区、状态、步骤和结论跟随主题。表中的 E2E 每页在 1440×900、1366×768、390×844 的真实 Chrome 各执行一次，1 worker。

**原有 8 份专属 spec**

| 页面 | `tests/e2e/` 下的 spec | 页单测 | E2E |
|---|---|---:|---:|
| 完全二叉树最大结点 | `complete-binary-tree-lab.spec.ts` | 8/8 | 3/3 |
| 森林与二叉树转换 | `forest-binary-relation-lab.spec.ts` | 3/3 | 3/3 |
| 栈最小容量 | `stack-capacity-lab.spec.ts` | 6/6 | 3/3 |
| 排序趟次判别 | `sort-pass-analysis-lab.spec.ts` | 6/6 | 3/3 |
| 二叉树遍历 | `binary-tree-traversal-lab.spec.ts` | 5/5 | 3/3 |
| 单类资源死锁 | `deadlock-lab.spec.ts` | 5/5 | 3/3 |
| 文件系统链接 | `filesystem-links-lab.spec.ts` | 5/5 | 3/3 |
| CSMA/CD 碰撞域 | `csma-cd-collision-lab.spec.ts` | 4/4 | 3/3 |

**新增 3 份正式 spec**

| 页面 | `tests/e2e/` 下的 spec | 页单测 | E2E | 专项交互 |
|---|---|---:|---:|---|
| FTP 控制与数据连接 | `ftp-control-connection-lab.spec.ts` | 5/5 | 3/3 | 切换 TCP/21、TCP/20，刷新保留选择，非法通道可恢复 |
| TCP 累计确认 | `tcp-cumulative-ack-lab.spec.ts` | 3/3 | 3/3 | 修改起始序列号和两段长度，检查字节区间、ACK、零长度报错与恢复 |
| 交换机转发 | `switch-forwarding-lab.spec.ts` | 5/5 | 3/3 | 命中 P3/P4、未命中、修改转发表后刷新、非法表及恢复 |

- 三份新 spec 共用 `network-exhibit-flow.ts` 验证模块导航、下一步与复位、手机位置与步骤区高度，以及知识节点→实验→原题。原实验 24/24，加新增 9/9。默认本地 `--list` 从 30 文件 234 项升至 33 文件 243 项，增加 9 项。`dist-closeout` 合跑 33/33；最终构建只新增排序表格的手机定位规则，排序专属三视口又通过 3/3。
- **断言变动**：在原 `sort-pass-analysis-lab.spec.ts` 加一条手机根文档纵向滚动高度应为 0 的断言。旧构建实际多出 372px，原因是移动布局中隐藏的表头相对整页定位。为 `.sort-pass-table-scroll` 建立定位上下文后，主区可继续滚动，页面底栏以下的空白消失。其余原断言原样保留，组长此前的 `13px` 修正仍在。新增交换机用例试跑时，先修正其实命中 P4 的样例，又将有重名的“静态转发表”准确定位为文本框，保留命中、未命中两条验证。
- **样式**：外围复用 `lab-exhibit-shell.css`，A 组增量集中在 `lab-exhibit-rollout.css`。首轮发现 TCP 未展开段的字色仅 3.33:1、森林 SVG 手机标签约 8px，均已修正。[旧 CSS 逐条清单](stage-5-a-legacy-selectors.md) 含 201 个已失去页面类名的选择器分支、36 个退出 A 组页面的共享分支，以及 48 个保留类名但已改由槽位布局的分支，逐项含文件、行号与媒体条件。
- **最终视觉**：真实 Chrome 158.0.8127.37，11 页 × 1440/390 × 18/24px × 昼夜 = 88 组。画布外 6,099 条可见文字采样，白昼最低 5.45:1、夜班 5.79:1。画布内 2,194 条文字采样，最低 4.83:1。SVG 节点文字最低 16.52:1、节点连线最低 6.58:1、节点文字最低 13px。最小触控目标 26px；页面、主区及画布横溢 0，手机根文档额外纵向滚动 0，运行时错误 0。11 页单测 55/55，16 个改动的 TS/TSX 文件 ESLint 0 错误 0 警告，7 个 workspace 类型检查通过。
- **错题徽标**：`/review` 的未激活错题标签白昼 5.17:1、夜班 5.52:1。`/wrong` 的激活标签白昼 17.15:1、夜班 14.09:1。两路由 × 1440/390 × 18/24px × 昼夜，共 16/16 达到 4.5:1。
- **知识与账号**：每视口 `visual.spec.ts` 全部 10/10、`study-flow.spec.ts` 知识 3/3、`learning-reliability.spec.ts` 全部 4/4，本地共 51/51。`account-flow.spec.ts` 七条在三个视口全部通过，共 21/21。测试副本只适配 4323→4349 与 fixture 相对导入路径，反向还原后与正式 spec 字节一致。1366 使用空白测试库隔离固定测试账号。知识图截图中的账号通过 6 次作答、3 次评卡跨两个北京日形成学习记录，寄存器四态为未开始 99、练习中 1、待巩固 1、稳定 1。数据结构的根节点为 25/1/1/1；图内灰格、虚线、半亮、全亮在同一截图均可辨认，实测叶标签不小于 13px，知识页可见文字无百分号。

最终证据根为 `output/playwright/opus-ui-2026-11-22/stage-5-rollout-a/`。`delivery-visual/{1440,390}-{day,night}/` 有 132 张实验 PNG，每个组合有页面图，每个 24px 组合另有画布图。`proof-1/` 有 16 张徽标截图、知识页整屏及画布原图；`closeout-e2e/screenshots/` 归档了既有实验 spec 的 40 张附加截图。`sort-scroll-red/`、`sort-scroll-green/` 保留排序回归前后记录。[知识页整屏](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-a/proof-1/knowledge-1440-day-with-history.png) · [验收回执与 150 张主截图摘要](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-a/delivery.json)

#### 阶段 5 铺开 C 组（CPU）· Cache、Datapath、MicroOperations 与 Pipeline（2026-11-25，摩卡）

- **一、完成状态（4/4 个 CPU 复杂面板全部完成，0 跳过）**：
  - `CacheLabPanel.tsx`：迁入 `LabExhibitWorkspace`——亮色 4 参配置/访存序列与策略标签、亮色实时命中/未命中状态条（保留 `.cache-outcome-row`）、暗色地址切分（Tag/Set/Offset 语义色卡）与当前组状态表画布、步进器（保留 `.cache-lab-layout > .step-explorer` 兼容 E2E 手机截图选择器）、底部亮色交互访存时间线与 4 项统计（保留 `.cache-trace-section` / `.cache-summary-grid`）。
  - `DatapathLabPanel.tsx`：迁入 `LabExhibitWorkspace`——亮色汇编与 4 字值配置+指令汇总（保留 `.datapath-lab-panel > .lab-control-panel`）、亮色实时写回/跳转状态条（保留 `.datapath-result-line`）、暗色可横向滚动五阶段数据路径卡片画布（活动阶段 `--lit` 徽章与 `--signal-text` 左侧条）、步进器（保留 `.datapath-lab-panel > .step-explorer`）、底部亮色 11 项控制信号网格（保留 `.datapath-control-panel` / `.datapath-control-grid`）。
  - `MicroOperationsLabPanel.tsx`：迁入 `LabExhibitWorkspace`（默认 `steps-first`，390 视口严格满足 `.micro-operations-current-event <= .micro-operations-step-explorer <= .micro-operations-state-panel`）——亮色 5 拍/6 拍分段切换、3 参输入与架构可见结果、单一 `aria-live="polite"` 当前微操作状态条、暗色寄存器/三总线/有效控制信号画布（已知值 `--ok-text`、未知值 `--warn-text`、活动总线 `--lit` 顶栏）、步进器（`announceChanges={false}`）。
  - `PipelineLabPanel.tsx`（动态五级流水 + 功能段时延双模式）：外层 `.pipeline-mode-shell` 承载随主题的 `.pipeline-mode-row` 模式切换条，两个子模式各自使用无 `steps` 的全宽 `LabExhibitWorkspace`（复用 `.lab-exhibit-body.no-steps`）：
    - 动态流水模式：`controls` 为程序/寄存器/内存配置与前递开关（保留 `.pipeline-control-panel`）；`status` 为亮色 4 列周期统计（`.pipeline-summary-grid`）；`canvas` 为暗色流水线时空图与自带时钟步进控制（`.pipeline-timing-section`，7 枚阶段/冒险徽标 `IF/ID/EX/MEM/WB/ST/FL` 全用纯语义令牌重调，实测均 ≥4.75:1；`.pipeline-chart-scroll` 在 390 视口局部横滚、页面 0 横溢）；`footer` 为亮色并列“当前周期事件”与“已提交寄存器/内存表”（`.pipeline-result-grid`，宽表局部横滚）。
    - 功能段时延模式：`controls` 为 Q18 边界条、3 输入与最小时钟周期公式；`status` 为亮色 4 列时序统计；`canvas` 为暗色功能段条形对比与自带步进器（瓶颈段 `--signal-text`，活动段 `--lit`）。
  - `CpuLabPage.tsx`：移除全部 4 处 `LabExhibitLegacyIsland` 包裹，并将 `PipelineLabPanel` 的 Suspense fallback 同步为 `.lab-exhibit-control-card`。至此 `CpuLabPage` 全部 11 个子面板均已完成 `LabExhibitWorkspace` 迁移。
- **二、`LabExhibit` 接口与 `LabExhibitLegacyIsland` 清理说明**：
  - `LabExhibit.tsx` **无任何新增或改动 prop**（`LabExhibitWorkspace` 既有 `controls / status / canvas / steps / footer` 与 `no-steps` 全宽模式直接满足全部 4 个面板，对 A/B 组 26 个页面零影响）。
  - `LabExhibitLegacyIsland` 在产品代码中已 **0 调用方**；按任务要求暂保留 `LabExhibit.tsx` 中的导出、`LabExhibit.test.tsx` 单测与 `tokens.css:425–484` 中的 `.lab-exhibit-legacy-island` 选择器，待拿铁 C 组独立页交付后统一清理。
- **三、断言改动与实际验证**：
  - **测试断言改动**：既有单测与 E2E 断言 **0 修改、0 削弱**。
  - **CSS 语义令牌审计**（`lab-exhibit-shell.css`）：原始色值及 `--palette-*` 命中 **0**，禁用步进键保持 `opacity: 1`。
  - **ESLint**（12 个相关源码与测试文件，`--max-warnings=0`）：**0 errors, 0 warnings**。
  - **Vitest**（6 份测试：`LabExhibit`、`CpuLabPage`、`CacheLabPanel`、`DatapathLabPanel`、`MicroOperationsLabPanel`、`PipelineLabPanel`）：**6/6 文件，31/31 passed**。
  - **`npm run typecheck`**：**全部 7 个 workspace 通过，0 errors**。
  - **独立生产构建**：`output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-cpu/dist`（未触碰 `apps/web/dist` 与 `stage-5-merged/full-1/`）。
  - **Playwright E2E**（隔离构建，端口 `4361`，1 worker，覆盖 `chromium-1440 / chromium-1366 / chromium-390`）：
    - `tests/e2e/cpu-extended-labs.spec.ts`（Cache + Datapath）：**6/6 passed**
    - `tests/e2e/micro-operations-lab.spec.ts`：**3/3 passed**
    - `tests/e2e/pipeline-lab.spec.ts`（动态五级流水 + Q18 功能段时延）：**6/6 passed**
    - B 组 CPU 回归：`bus-bandwidth-lab.spec.ts` **3/3**、`io-overhead-lab.spec.ts` **3/3**、`memory-expansion-lab.spec.ts` **3/3**
    - `/lab` 跨页用例：`study-flow.spec.ts`（2 条 × 3 视口）**6/6**、`visual.spec.ts`（2 条 × 3 视口）**6/6**
    - 规范 `tests/e2e/` 合计 **36/36 passed，0 failed**。
  - **真实 Chrome 视觉与对比度验收**（端口 `4362`，`output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-cpu/rollout-c-cpu-report.json`，覆盖 5 路由视图 × 昼夜 × 1440/390 × 18px/24px + `pipeline-stall` / `pipeline-flush` / `cache-lru` 预设共 **46 项检查**）：
    - 运行时错误 `0`，残留 `.lab-exhibit-legacy-island` 数量 `0`，横向溢出 `0`，低触控目标（<24px）`0`（最小交互目标 `30px`，为时空图表头周期按钮）。
    - 对比度：画布外最小对比度白昼 **4.80–6.33:1** / 夜班 **5.64–6.58:1**（违例 `0`）；暗色画布内最小对比度 **4.75:1**（违例 `0`）。
- **四、截图与报告路径**：`output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-cpu/`（31 张 PNG，含 1440 昼夜全页、390 顶部与画布昼夜及 `cpu-pipeline-flush-1440-day.png` + `rollout-c-cpu-report.json`）。
- **五、C 组（CPU）完成后在旧 `lab.css` / `responsive.css` 中失效的规则（待全部 C 组收尾后统一删除）**：
  - Cache：`lab.css:80–88, 94–119` 与 `responsive.css:68–69, 112–121`（`.cache-lab-layout` 外围网格、`.cache-policy-bar`、`.cache-config-grid`、`.cache-control-panel textarea`、`.cache-trace-section` 旧暗渐变与卡片色已替代；画布内 `.cache-address-fields` / `.cache-state-table` 及底部 `.cache-access-timeline` 结构复用并在 `lab-exhibit-shell.css` 中覆写为语义令牌）。
  - MicroOperations：`lab.css:298–319, 323–325, 332–334` 与 `responsive.css:97–111`（`.micro-operations-lab-layout` / `.micro-operations-control` / `.micro-operations-current-event` / `.micro-operations-step-explorer` / `.micro-operations-heading-actions` / `.micro-operations-input-grid` / `.micro-operations-result` 及旧 `grid-area` 定位已替代；画布内寄存器/总线/信号色已语义令牌覆写）。
  - Datapath：`lab.css:336–350, 352–355, 361–363` 与 `responsive.css:122–131`（`.datapath-lab-panel`、`.datapath-input-grid`、`.datapath-control-panel`、`.datapath-control-grid`、`.datapath-result-line` 及 `.datapath-stage` 旧暗底色已替代；`.datapath-stage-strip` 横滚结构复用）。
  - Pipeline：`lab.css:365–395, 398–432, 436–465` 与 `responsive.css:132–163`（`.pipeline-mode-row`、`.pipeline-policy-bar`、`.pipeline-forwarding-toggle`、`.pipeline-program-grid textarea`、`.pipeline-timing-section` / `.pipeline-event-panel` / `.pipeline-state-panel` / `.pipeline-stage-analysis` 旧渐变卡、7 阶段旧 `--palette-*` / 白字黄底色值、`.pipeline-q18-band`、`.pipeline-clock-result`、`.pipeline-stage-bars` 旧配色均已由 `lab-exhibit-shell.css` 替代或覆写；时空图表格与条形图骨架布局复用）。
- **六、遗留与备注**：无未完成项；390 视口下 `PipelineLabPanel` 模式切换条两按钮略偏左对齐（功能与触控正常、0 溢出），若最终统合视觉评审希望其 50/50 撑满可单行微调。

<a id="stage-5-c-pages"></a>

#### 阶段 5 铺开 C 组：五个独立实验（2026-11-25，拿铁）

五个实验均已完成，跳过 0。四份页面复用 `LabExhibit` 和原导航、步进器及计算；数据结构模块的路由分发与迁移前逐字相同。完成最初两份文件时已向组长报告 3/5 实验、原单测 20/20。

| 实验 | 控制、状态与步骤 | 固定深色的画布 | 随主题的结果 |
|---|---|---|---|
| 单链表倒数第 k 个 | 预设、链表和 k；状态区显示当前指针间隔，原步骤重放 | 可单独横滚的链表，标出 p、q、HEAD、NULL；节点能容纳完整安全整数 | 查找结果及时间、空间复杂度 |
| 最短路径 | 反例、算法与原步骤重放 | 带权图，保留 `.ds-graph/.ds-node/.ds-edge`、目标虚线、活动边和当前顶点 | 当前距离/前驱表、两种策略的最终路径和距离 |
| 虚拟内存 | 地址与时间参数；当前访问结果、访问播放/前后控制；独立的单次访问阶段步进 | 可选择访问的时间线 | TLB 表、页表与 LRU 表 |
| CIDR / 最长前缀匹配 | 父 CIDR、子网数、目的地址、网络事实；状态区给出所选路由 | 父网络与聚合网络的 32 位标尺，窄屏按八位组换行 | 子网分割表、聚合式、R1 路由表和逐路比较；两张宽表分别横滚 |
| Go-Back-N | 序号空间、发送窗口、动作脚本；当前事件保留 ACK 和本步收发信息 | 发送与接收分两行，共用同一状态快照；`base` 与 `receiverExpected` 可分别前移 | 累计确认语义和脚本结果 |

**回归。** 原有四份单测共 34 条全部保留，追加 1 条 GBN 测试，验证接收方收到 frame 0 先移到 1，发送方等 ACK 0 才移到 1。最终 DS 19/19（含两个实验及分发），虚拟内存 1/1，CIDR 6/6，GBN 9/9，合计 **35/35**。改动的 6 份 TS/TSX 运行 ESLint 为 0 错误、0 警告；新增 CSS 经 PostCSS 解析，原始色值和 `--palette-*` 引用均为 0。`npm run typecheck` 七个 workspace 和独立生产构建 `dist-2` 通过。

| `tests/e2e/` | 每个视口（1440 / 1366 / 390） | 通过 | 验证范围 |
|---|---:|---:|---|
| `data-structures-lab.spec.ts` | 各 2 | 6/6 | 最短路径与链表 |
| `system-labs.spec.ts` | 各 2 | 6/6 | 虚拟内存与 CIDR |
| `protocol-labs.spec.ts` | 各 3 | 9/9 | GBN、磁盘调度、TCP 拥塞 |
| `study-flow.spec.ts` 定向 | 各 2 | 6/6 | Q47 题库入口、Q41 自评持久化 |
| `visual.spec.ts` 定向 | 各 1 | 3/3 | Q41 来源、结构化和复核视图 |

每批 1 worker、0 重试；正式构建 30/30，失败、跳过及 flaky 均 0。后两份选中的是题目周边流程，本身不直接进入这五个实验；实验往返由前三份覆盖。**既有断言无删除、无放宽**。已提前和组长同步，仅在 `system-labs.spec.ts` 原 Q47 用例追加手机根文档余量为 0，以及子网表和路由表均可实际局部横滚的断言。默认 E2E 用例数增量为 0，本轮未执行全量。

**浏览器实测。** 真实 Chrome `158.0.8127.37`，5 页 × 1440/390 × 白昼/夜班 × 18/24px ＝ **40/40**。文档、主区、画布横溢均为 0；20 个手机组合均只在主区纵向滚动。触控目标最小 **26px**。3,694 条画布外和 1,736 条画布内文字采样均达到 4.5:1：外围白昼/夜班最低 **5.00/5.79:1**，画布最低 **5.89:1**。最短路径的 4 个节点和 4 个边权标签均使用实际缩放矩阵核验，最小 **15.77px**，文字对圆底至少 **5.89:1**；连线、节点轮廓对图底至少 **6.30:1**。无运行时错误。

- **CIDR 根滚动**：首轮 390px 昼夜和两个字号均多出 **2029px**。三处读屏比较符以 `BODY` 定位；在位串自身建立定位上下文后变为 **0**。旧构建配新增断言先红，最终构建同用例三视口通过。手机两表可实际分别横滚 **272/158px**；保留读屏“等于/不等于”。
- **表格行悬停**：白昼旧固定深色悬停底实测 **1.07:1**。最短路径、虚拟内存和 CIDR 的结果表改用主题色。以实际悬停行文字重新采样，四类表 × 昼夜 **8/8**，至少 **10.39:1**。
- **边界与设计取舍**：`±9007199254740991` 在各自链表节点里完整可见；CIDR `/0`、`/1`、`/31`、`/32` 均保留 32 格且无根滚动。GBN 在 32 个序号时手机双行视图约 1,273px 高，保留所有序号，手机将事件和步进器放在窗口前；这是最值得后续设计复看的一处。其他四页手机先看画布再看步骤。虚拟内存实测时间线能播放、暂停，单次访问阶段步进不会偷偷换到另一个地址。

**交接证据。** [逐条旧选择器](stage-5-c-legacy-selectors.md) 含 78 个专属分支（同文件重复断点合成 75 行）、29 行共享选择器及保留结构的声明说明。旧 `lab*.css`、`responsive.css` 均未改动。证据根 `output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/`：[汇总回执与截图摘要](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/delivery.json)、[最终浏览器矩阵](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/visual-delivery/report.json)、[互动补验](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/interaction-verified/report.json)。`visual-delivery/{1440,390}-{day,night}/` 有 100 张正式 PNG；[手机最短路径](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/visual-delivery/390-day/shortest-path-24px-canvas.png)、[手机 CIDR](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/visual-delivery/390-night/cidr-24px-canvas.png)、[桌面 GBN](../../output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/visual-delivery/1440-day/gbn-24px-canvas.png)。`cidr-scroll-red/`、`cidr-scroll-red.json` 与 `table-hover-red.json` 保留修前证据；`interaction-delivery/` 与 `interaction-final/` 是采样脚本两次未通过的尝试，最终以 `interaction-verified/` 为准。

#### 阶段 5 A、B 组合并后的默认全量 E2E 与 C 组验收（2026-11-25，组长）

- **范围**：这次全量只覆盖 A、B 两组合并后的工作目录（01:02 冻结），**不含 C 组**。C 组两份交付后的全量门禁另行安排，不能用本次结果代替。
- **做法**：证据目录 `output/playwright/opus-ui-2026-11-22/stage-5-merged/full-1/`。冻结时对 `apps/web`、`packages`、`tests/e2e` 等 789 个文件记录 SHA256（`source-manifest.sha256`），独立构建到 `dist-local`；`tests/e2e`、`apps/web/e2e` 和题包 JSON 共 53 个文件复制到同目录并逐个核对摘要。`full.config.ts` 以该目录为工作目录运行，spec 中相对路径的截图和题包读取都落在副本内，不写共享的 `output/playwright/screenshots`，也不受之后的源码改动影响。
- **结果**：`playwright test -c full.config.ts`，端口 4371，1 worker，0 重试。发现 33 个文件 243 条（1440、1366、390 各 81 条），**243/243 通过**，失败、跳过、flaky 均为 0，用时 13.1 分钟（`run-1.log`、`run-1/report.json`）。固定 8 worker 压力检查和服务器 E2E 未在本次运行。
- **此前的抽查**：`stage-5-merged/`（00:01 冻结）上 `study-flow` 的 CPU 数值实验 2 条和 `visual` 的数值实验 2 条，三视口各 6/6。
- **C 组验收**：摩卡的 4 个 CPU 面板和拿铁的 5 个独立实验均已交付，看板完成。组长目检了流水线（1440、390 白昼）、最短路径（1440 白昼）、GBN（1440、390 白昼）截图：外围随主题、画布保持深色，与 A、B 组一致。至此 34 个实验全部迁入 `LabExhibit`，`LabExhibitLegacyIsland` 在产品代码中没有调用方。
- **待办**：统一删除失效的旧实验样式并收紧夜班岛选择器（拿铁）；非实验页面的整体视觉走查（摩卡）；两项完成后做包含 C 组的全量门禁。两处记录在案的设计复看点：GBN 在 32 个序号时手机画布约 1,273px 高；流水线模式切换条在 390 视口没有撑满。

<a id="stage-5-cleanup"></a>

#### 阶段 5 收尾：旧实验样式和临时夜班岛清理（2026-11-25，拿铁）

34 个实验全部使用展厅。清理前从未提交工作区独立构建，真实 Chrome 在 34 个实验中逐一核对，包含实际点击 CPU 的 11 个标签；每个实验恰有一个深色画布，旧整页岛与临时组件岛均为 **0 命中**。静态检查也未找到产品调用方。移除 `LabExhibitLegacyIsland` 导出、唯一对应的测试片段和专属样式；宿主、工作区、四槽与 `mobileOrder` 接口及测试保留。夜班令牌只绑定 `.lab-exhibit-canvas`。两次构建对照的 206 份 `apps/web/src` 文件中仅下列九份改变。

| 文件 | 删除选择器分支 | 源文件减少（字节） |
|---|---:|---:|
| `lab.css` | 392 | 42,487 |
| `lab-extended.css` | 130 | 11,484 |
| `lab-exhibits.css` | 213 | 18,546 |
| `lab-tablet.css` | 1 | 70 |
| `responsive.css`（仅实验段） | 154 | 9,825 |
| **五份旧 CSS** | **890** | **82,412** |
| `tokens.css`（仅夜班岛段） | 10 | 768 |
| `lab-exhibit-shell.css` | 2 | 200 |
| `LabExhibit.tsx` | 不适用 | 239 |
| `LabExhibit.test.tsx` | 不适用 | 353 |
| **合计** | **902** | **83,972** |

**删留依据。** 逗号两侧、同选择器在不同媒体条件下的出现分别计数。五份旧 CSS 涉及 2,118 个分支；排除 `responsive.css` 的 96 个非实验分支，检查 2,022 个。524 个缺失必要类（产品、测试、验证工具及运行时 DOM 核对）、34 个依赖实验页中已经不存在的 `.page-header` 祖孙关系、332 个由同一适用断点的后续选择器完整覆盖。对 55 个仍生效的分支另去掉 137 个已覆盖的「分支×声明」，不计入分支删除数。检查包含动态类前缀、特殊状态、后续规则的选择器、断点和具体声明。每项原行号、分支、实测命中的路由、引用或覆盖它的源码位置见[逐分支账本](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/selector-audit.json)；[清理前 DOM 预检](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/baseline-dom.json)可独立核对。

保留了 1,132 个范围内分支。例如：

- 最短路径的 `.ds-graph/.ds-node/.ds-edge`，树及堆图、信号量队列、GBN 收发窗口、CIDR 位格、流水线时空表的网格、滚动、字号或状态样式仍有用途。纯旧配色只有在每个声明都能找到接管者时才删。延迟模式、条件空态和未触发的交互样式都不能仅凭默认预设没命中就删除。
- `.cache-lab-layout > .step-explorer`、`.datapath-lab-panel` 等仍有 DOM / E2E 调用，且旧声明并非全部覆盖；`.micro-operations-step-explorer` 的 `top: 16px`、`.min-heap-state-panel` 的 `grid-area: state` 等虽不主导现在的排版，仍参与计算样式。无同等覆盖依据，保留。
- `.network-module-tabs` 在 801–1180px 的四列断点仍有效；`lab-tablet.css` 仅删被覆盖的 CPU 分支。共享 `.table`、`.table-responsive`、`.step-list`、导航结构与非实验页面使用的 `.page-header` 均按分支保留。

**真实 Chrome 比较。** 固定题包、应用时间、18px 字号、DPR 1 及页面选中状态；运行在 1440×900 / 390×844 与昼 / 夜。每个渲染元素按 DOM 位置、类型和类名配对，逐名比较 Chrome 枚举的全部标准与自定义计算属性、几何及实际生成的伪元素。PNG 解码后按 RGBA 逐像素比较，无蒙版或容差。手机页面内部主区独立滚动，另拍完整拼图。

| 范围 | 完全相同的组合 | 可见元素对 | 计算属性值对 | 整页及滚动拼图对 | 差异像素 |
|---|---:|---:|---:|---:|---:|
| 34 个实验（CPU 11 面板） | 136/136 | 48,446 | 41,469,776 | 204/204 | 0 |
| 今日、题库、实际第 1 题练习、知识、统计、设置 | 24/24 | 9,892 | 8,580,302 | 36/36 | 0 |
| **合计** | **160/160** | **58,338** | **50,050,078** | **240/240** | **0 / 259,480,440** |

前后均计 130 个生成的伪元素，计算样式、几何、DOM 差异各 0，无运行时错误。[最终对照报告](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/comparison/report.json) · [清理前截图](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/before-stable/) · [清理后截图](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/after-stable/)（每边 160 张原生整页 + 80 张主区拼图）。[首次比对](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/comparison-initial/report.json)也保留：147/160 完全一致。其余 13 组中，2 组今日/设置采到加载壳、9 组 CPU/练习采到导航切换中的 SVG 继承颜色、2 组仅有 2/1 个绘制像素不同。复测等待真实数据和实际题目、在当前标签地址重新载入、使用真实 Chrome 软件渲染并要求同一画面连续两次截图相同。两份生产构建保持冻结，未为重采修改产品。

**定向 E2E，三视口各 35 项、1 worker、无重试。** 下表按 `tests/e2e/` 的文件名列出，省略 `.spec.ts`；多文件同行表示每份各自的通过数。所有 27 份共 **105/105**，失败、跳过、flaky 各 0，耗时 6.4 分钟。[逐项结果](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/e2e/report.json)

| 实际通过数（每份） | spec |
|---|---|
| 3/3 | `binary-tree-traversal-lab`、`complete-binary-tree-lab`、`forest-binary-relation-lab`、`min-heap-insert-lab`、`sort-pass-analysis-lab`、`stack-capacity-lab` |
| 3/3 | `bus-bandwidth-lab`、`io-overhead-lab`、`memory-expansion-lab`、`micro-operations-lab` |
| 3/3 | `deadlock-lab`、`filesystem-links-lab`、`segmentation-address-lab`、`semaphore-lab` |
| 3/3 | `csma-cd-collision-lab`、`ftp-control-connection-lab`、`qam-nyquist-lab`、`switch-forwarding-lab`、`tcp-cumulative-ack-lab`、`code-only-mode` |
| 6/6 | `cpu-extended-labs`、`data-structures-lab`、`pipeline-lab`、`system-labs`、`study-flow`（CPU/RV32I）、`visual`（数值实验/RV32I） |
| 9/9 | `protocol-labs` |

单测 `LabExhibit` **3/3**、`CpuLabPage` **15/15**；修改的两份 TSX 经 ESLint 检查 **0 错误、0 警告**，全部七个 workspace 类型检查通过，独立生产构建前后均通过。本轮没有运行默认全量。

**调色板及既有问题。** Web 源码中还有 **253 次 `var(--palette-*)`，117 个不同令牌**：`tokens.css` 7 次（6 种，均在画布阴影/焦点环），`lab.css` 150 次（69 种）、`lab-extended.css` 39 次（26 种）、`lab-exhibits.css` 57 次（36 种），其余文件 0。333 条定义的名称和值与基线相同。仅在隔离浏览器临时替换令牌，确认画布外也有真实依赖：流水线寄存器表、磁盘调度比较表的悬停行仍使用 `.table tbody tr:hover` 的 `--palette-hex-161d19`。取实际行文本与背景像素，白昼两表最低均 **1.07:1**，夜班均 **11.76:1**，清理前后逐单元格一致。此可读性问题交设计侧单独修，不改变本次外观。[统计和作用范围](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/palette.json) · [前后悬停证据](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/hover.json) · [交付回执与构建摘要](../../output/playwright/opus-ui-2026-11-22/stage-5-cleanup/delivery.json)

<a id="stage-6-review"></a>

#### 阶段 6：全站非实验页面视觉走查与一致性收口（2026-11-25，摩卡）

从整体产品视角完整走查全部非实验页面（本地与服务器双模式、白昼/夜班主题、18px/24px 阅读字号、1440×900/390×844 视口，含空态、无题包态、模考提交态与复核多视图），重点重做 `MockExamSessionPage` 阅读层、视觉协调 `ContentReviewPage`，并修净跨页一致性与四项已知零散问题。本阶段全程未触碰任何实验页、`LabExhibit.tsx`、`lab-exhibit-*.css`、旧 `lab*.css`、`responsive.css`、`tokens.css`、旧页面 CSS（`mock.css`/`content-review.css`/`reading.css`/`base.css`/`shell.css`/`questions.css`）、`apps/web/src/app/`、`packages/`、`apps/web/dist` 与 `stage-5-merged/`。

**1. 全站走查发现与处理清单**

| 页面 / 组件 | 基线发现的问题 | 处理方式 |
|---|---|---|
| 今日页 `DashboardPage` | ① 已知问题：底部“继续探索”在服务器模式仍写“本地资料”；② 底部探索链接与卡片跳转链接（`打开概念寄存器 →`、`查看错题 →`、`进入复习 →`）高度仅 19–21px（`< 24px`）；③ 错误/冲突横幅未采用统一提示样式 | ① 引入 `SERVER_MODE`，服务器模式切换为“共享资料”（本地仍为“本地资料”）；② 在 `today.css` 为探索与卡片跳转链接补充 `min-height: 28px`；③ 错误/冲突提示统一 `.sec-inline-alert` / `.sec-inline-status` |
| 知识页 `KnowledgePage` | ① 已知问题：右侧详情 `.subject-tag` 沿用旧绿底无框标签，缺少几何标记；② 顶栏工具条科目切换仍为浅色激活态且缺几何标记；③ 页头“练当前节点”与右侧“专项练习 N 题”同为红底 `.primary-command`（双主按钮）；④ 26 处链接/折叠项 `< 24px`，短讲解链接沿用旧绿色 | ① 替换为统一单色 1px 描边 `.sec-subject-chip` + `<SubjectShape>`；② 工具条补 `<SubjectShape>` 并统一 `--ink-strong`/`--paper` 激活态；③ 页头“练当前节点”降为 `.secondary-command`，保留右侧“专项练习”为唯一主按钮；④ `register.css` 将相关链接与 `<summary>` 高度提至 `>= 28px` 并去绿字泄漏 |
| 统计页 `StatsPage` | ① 已知问题复核：“101 个知识点尚未检测”（`.weakness-summary`）经实测 DOM 与截图已为中性色（白昼 `rgb(85,85,79)` / 夜班 `rgb(163,163,156)`），无蓝字残留；② 薄弱知识点 `.subject-tag` 仍为旧绿底；③ 科目正确率行用 Unicode 符号且进度条带旧彩条 | ① 确认无蓝字残留，留存 DOM 探针证据；② 薄弱项标签改用 `<SubjectShape>` + `.sec-subject-chip`；③ 科目行统一 `<SubjectShape>` 与克制 `--ink-strong` 进度条 |
| 来源图组件 `ContentRenderer` | 已知问题：`.source-inline-crop` 行内写死 `border: '1px solid #2e3a33'` | 边框改为 `1px solid var(--line)` 并加 `6px` 圆角；保留扫描件白底 `background: '#fff'`（有意设计）并加注释说明 |
| 题库 / 错题 / 练习 `QuestionsPage`、`WrongPage`、`PracticePage` | ① 题库与错题页使用 Unicode 几何字符且受旧 `questions.css` `.question-meta svg` 影响使三角形染红；② 练习页题头科目标签缺 `<SubjectShape>`，且在最后一题/单题未提交时同时渲染“提交答案”与“本轮总结”两个红底主按钮 | ① 全站统一 `<SubjectShape>` + 单色 `.sec-subject-chip`，并在 `secondary.css` 覆写 `.subject-shape` 颜色防红字泄漏、消除 `.rl-subject-badge > span` 嵌套双框；② 练习页“本轮总结”仅在 `submitted` 后升级为 `.primary-command` |
| 模考答题页 `MockExamSessionPage` | 此前仅换色，未接入阅读层：① 顶栏“提交整卷”与正文“保存当前草稿”构成双红底主按钮，390 视口下“提交整卷”缩成无字旗帜方块；② 缺少 68ch 阅读栏、A–D 键帽选项与点击放大灯箱；③ 答题卡 `.done` 对比度仅 4.25:1 且覆盖 `.current` 当前态；④ 自评勾选框 `< 24px`；⑤ 顶栏与 `AppShell` 粘性顶栏重叠，390 视口下题号 `41 / 47` 换行 | 按 `PracticePage` 同套阅读层重做呈现（零改动计时/组卷/写入队列/冲突保护逻辑）：接入 `rl-*` 布局、68ch 正文、键帽选项（含 `✓ 已选`）、`<SubjectShape>`、`<ReadingImageLightbox>`；顶栏停靠 `57px` 下方，“提交整卷”降为克制次按钮并在 390 保留完整文案，正文唯一红底主按钮为“保存当前草稿”/“保存本题自评”；答题卡 `.done` 提至 `>= 5.3:1` 且 `.current.done` 保持深底高亮；自评勾选框提至 `24×24`；`.mock-question-position` 固定单行 |
| 内容复核页 `ContentReviewPage` | 管理员大页，保留全部结构与交互逻辑，仅在 `secondary.css` 做视觉收口：① 160px 题号栏导致 `待复核 47` 换行；② 激活筛选/题号/模式切换对比弱；③ 禁用按钮 `opacity: 0.42/0.45` 难读；④ 24px 字号下底部半透明导航遮盖元信息；⑤ `资料页` 链接 17px、8 个核对勾选框 16px（`< 24px`）；⑥ 无题包空态缺卡片框与垂直键帽阴影 | 桌面题号栏拓至 188px 使 `待复核 47` 单行显示；激活态统一 `--ink-strong`/`--paper`；禁用态改实色中性表面（`opacity: 1`）；桌面底部翻页栏改为实体静置分隔消除 24px 叠字；`资料页` 链接提至 `>= 28px`、勾选框提至 `24×24`；无题包空态与独立报错壳统一 1px 描边卡片及垂直主按钮键帽阴影 |
| 练习总结 / 模考入口 / PDF 阅读器 / 无题包横幅 | ① 练习总结 `复习记忆卡 →` 泄漏旧绿字（`reading.css:15`）；② 模考入口 `.review-warning`（4.49:1）与 `AppShell` 无题包横幅（4.21:1）在浅黄骨底上低于 4.5:1，模考历史缺卡片框；③ PDF 阅读器工具条圆角/激活态与全站不一 | ① `secondary.css` 修正 `.study-panel a.sec-action-link` 颜色；② 两处告警改为 `--paper` 底 + 3px 左告警竖条 + `--warn-text` 标题 + `--ink` 正文（对比度 `>= 5.5:1`），模考历史与空态统一 1px 卡片；③ `library.css` 统一 6px 键帽与 `--ink-strong` 激活态“适宽”按钮 |
| 服务器模式设置与登录 `AccountTools`、`AccountGate` | ① `AccountTools` 管理员区按钮无间距、`<input type="file">` 高度 23px（`< 24px`）、状态与成员列表缺少卡片层次；② `AccountGate` 等 `.shell-v2` 外页面继承旧对角 `2px 2px 0` 黑色主按钮阴影；③ `shell-v2.css` 主按钮阴影含裸 `black` | ① 为 `AccountTools` 增加角色徽标头、`.command-row` 间距、成员列表与邀请码容器、`.sec-file-picker`（`min-height: 28px`）与统一状态/告警提示；② `secondary.css` 统一独立壳垂直主按钮阴影；③ `shell-v2.css` 将 `black` 改为纯语义 `color-mix(in srgb, var(--signal) 62%, var(--canvas))` |

**2. 超出“只改呈现”边界、留给维护者决定的事项（均未改动）**

- **服务器未登录首屏红框告警**：未登录访问 `/` 时，初始 `/api/v1/auth/me` 返回 `401`，登录页立即展示“账号状态已改变，请联网登录。未同步记录仍保存在原账号中。”（位于 `apps/web/src/app/api.ts` / `account.ts` 鉴权状态机）。建议区分“首次未登录”与“登录态失效”。
- **服务器设置页权限展示与备份版本文案**：非管理员成员的设置页目前仍显示“2009 人工复核”和“激活正式题包”入口卡片；`LearningDataTools` 在服务器模式（备份 v5）下文案仍写“当前 v4 备份”。需产品/后端权限策略确认后统一调整。
- **共享资料库小文件体积格式**：`ServerDocumentsPage` 固定使用 `(byteLength / 1024 / 1024).toFixed(1)MiB`，小于约 50 KiB 的 PDF 会显示 `0.0MiB`（本地 `DocumentLibraryPage` 已按 B/KB/MB 自适应）。建议统一复用体积格式化函数。

**3. 改动文件（共 14 份；旧 CSS 与实验相关文件 0 改动）**

- **TSX（9 份）**：`apps/web/src/components/ContentRenderer.tsx`、`apps/web/src/components/AccountTools.tsx`、`apps/web/src/pages/DashboardPage.tsx`、`apps/web/src/pages/KnowledgePage.tsx`、`apps/web/src/pages/StatsPage.tsx`、`apps/web/src/pages/QuestionsPage.tsx`、`apps/web/src/pages/WrongPage.tsx`、`apps/web/src/pages/PracticePage.tsx`、`apps/web/src/pages/MockExamSessionPage.tsx`
- **CSS（5 份）**：`apps/web/src/styles/shell-v2.css`、`apps/web/src/styles/pages/today.css`、`apps/web/src/styles/pages/register.css`、`apps/web/src/styles/pages/library.css`、`apps/web/src/styles/pages/secondary.css`
- **测试文件与断言改动**：**0 条**。

**4. 验证结果与证据路径**

- **语义令牌审查**（5 份改动 CSS）：**0 违规**（无 hex/rgb/hsl、无 `--palette-*`、无裸命名色）。
- **ESLint**（9 份改动 TSX，`--max-warnings=0`）：**0 错误、0 警告**。
- **Vitest 定向单测**（14 份测试文件：`DashboardPage`、`KnowledgePage`、`QuestionsPage`、`ReviewPage`、`SecondaryPages`、`SettingsPage`、`MockExamPage`、`MockExamSessionPage`、`ContentReviewPage`、`PracticePage`、`CardReviewPage`、`ContentRenderer`、`AppShell`、`AccountGate`）：**14/14 文件、108/108 通过**。
- **类型检查**（`npm run typecheck`）：全部 **7/7 workspace 通过，0 错误**。
- **独立双模式生产构建**：`output/playwright/opus-ui-2026-11-22/stage-6-review/dist-local/`、`dist-server/` 均构建通过。
- **真实 Chrome 全站走查**（修前基线与修后终验各 **59 个视图**，覆盖本地/服务器、昼/夜、18px/24px、1440/390）：修后终验横向溢出 **0/59**、对比度 `< 4.5:1` **0/59**、触控目标 `< 24px` **0/59**、单页多主按钮 **0/59**；本地运行时错误 **0**（服务器仅上述未登录 `/api/v1/auth/me` 401）。
- **本地模式 E2E**（`visual`、`study-flow`、`mock-exam`、`content-review`、`document-reader`、`learning-loop`、`learning-reliability`、`code-only-mode`，端口 4361，`workers=1`，0 重试，三视口 `chromium-1440`/`chromium-1366`/`chromium-390` 各 46 条）：**138/138 通过**（6.2 分钟）。
- **服务器模式 E2E**（`tests/server-e2e/account-flow.spec.ts`，端口 4323——只读 spec 固定地址，`workers=1`，0 重试，两视口 `server-desktop`/`server-mobile` 各 7 条）：**14/14 通过**（2.0 分钟）。
- **证据目录**：`output/playwright/opus-ui-2026-11-22/stage-6-review/` · [修前报告](../../output/playwright/opus-ui-2026-11-22/stage-6-review/screenshots-baseline/audit-report.json) · [修后报告](../../output/playwright/opus-ui-2026-11-22/stage-6-review/screenshots-after/audit-report.json) · [修后 59 张截图](../../output/playwright/opus-ui-2026-11-22/stage-6-review/screenshots-after/)（重点：`local-day-1440-mock-session.png`、`local-night-1440-mock-session.png`、`local-day-390-mock-session.png`、`local-day-1440-mock-submitted.png`、`local-day-390-mock-submitted.png`、`local-day-1440-content-review.png`、`local-day-1440-content-review-24px.png`、`local-night-1440-content-review.png`、`local-day-390-content-review-source.png`、`local-day-1440-knowledge.png`、`local-day-1440-stats.png`、`local-day-1440-questions.png`、`local-day-1440-practice-q4.png`、`local-day-1440-code-only-today.png`、`server-day-1440-today.png`、`server-day-1440-settings.png`）。

<a id="stage-5-states"></a>

#### 阶段 5 补验：实验画布外的表格悬停与键盘焦点（2026-11-25，拿铁）

**表格根因与影响。** `lab.css:305` 的 `.table tbody tr:hover` 固定取深色，白昼悬停时流水线寄存器表与磁盘比较表均降至 **1.07:1**。背景现取 `var(--paper-2)`：画布外跟随主题，画布内继承固定夜班令牌。Web 源码共 11 处带 `.table` 的表格，分属七个实验；非实验页 **0** 处，题目正文的 `.table-wrap > table` 不匹配。

| 使用 `.table` 的实验 | 实际影响 |
|---|---|
| 流水线、磁盘调度、HRRN | 寄存器表、出现访存后的数据内存表、磁盘比较表及 HRRN 候选/结果表的普通行随主题悬停。桌面白昼两张原红灯表均为 **12.48:1**；390 白昼流水线 **12.48:1**、磁盘 **14.42:1**。HRRN 的 `.selected` 行保留选中标识。 |
| 最短路径、虚拟内存、CIDR/路由 | 保留 C 组取同一 `--paper-2` 的覆盖。其优先级让最短路径和虚存 `.current` 行也显出悬停；三页修前修后均可读。 |
| Cache | 表格在画布内，仍由画布规则控制表行；昼夜和两个视口的取样均为 **10.31:1**，没有外观变化。 |

[修前表格逐单元格采样](../../output/playwright/opus-ui-2026-11-22/stage-5-states/table-before.json) · [修后逐单元格采样](../../output/playwright/opus-ui-2026-11-22/stage-5-states/table-after-delivery.json) · [白昼流水线红灯截图](../../output/playwright/opus-ui-2026-11-22/stage-5-states/before-1440-day-cpu-pipeline-hover.png) · [同一行修后截图](../../output/playwright/opus-ui-2026-11-22/stage-5-states/after-delivery-1440-day-cpu-pipeline-hover.png)

**调色板逐条分类。** 真实操作 34 个实验（含逐个切换的 11 个 CPU 面板），登记 374 个状态帧，175 个选择器分支全部命中，操作报错 0。按某条声明能否命中画布外元素分类，跨内外的归入“画布外已改”。覆盖实际使用的悬停、键盘焦点、按下/禁用、`aria-pressed`、`aria-current`、`aria-checked`，以及命中、缺页、阻塞、唤醒、完成、失效链接、输入错误等状态。当前实验不使用 `aria-selected`；使用该属性的是非实验的内容复核页。

| 文件 | 修前引用 | 画布外已改 | 仅在画布内保留 | 未判定 |
|---|---:|---:|---:|---:|
| `lab.css` | 150 | 49 | 101 | 0 |
| `lab-extended.css` | 39 | 10 | 29 | 0 |
| `lab-exhibits.css` | 57 | 5 | 52 | 0 |
| `tokens.css` | 7 | 0 | 7 | 0 |
| 合计 | **253** | **64** | **189** | **0** |

333 条调色板定义未改。每个引用的选择器、属性、原令牌、替代值和真实命中位置见[分类账本](../../output/playwright/opus-ui-2026-11-22/stage-5-states/palette-classification.json)，路由、步序和状态见[浏览器记录](../../output/playwright/opus-ui-2026-11-22/stage-5-states/selector-survey.json)。

**交互验收。** Chrome 158，1440/390 × 昼夜。34 个实验的默认状态加流水线第二种模式共 140 组，另有 25 种操作后的状态共 100 组。同一逻辑元素在不同主题、视口、状态分别计数。每份构建实际采 **8,330** 个目标实例，指针悬停 **8,276** 次（含 804 次表行、212 次禁用控件），键盘 Tab 焦点 **7,314** 个，指针按下 **6,356** 次；普通表行不人为添加 Tab 停靠点。

| 检查 | 样本数（每份构建） | 修前失败 | 修后失败 | 修后最低 |
|---|---:|---:|---:|---:|
| 悬停、焦点及按下时的文字 | 26,600 | 204（流水线 80、磁盘 16、HRRN 108） | **0** | **4.64:1**（桌面白昼 Cache 的 `MISS`） |
| 操作后的画布外说明、步骤和结果文字，状态稳定时 | 10,936 | 0 | **0** | **4.80:1** |
| 焦点线实际绘出且与相邻背景 ≥3:1 | 7,314 | 575，其中 90 个未采到可见实线 | **0** | **3.82:1**（与线两侧相邻像素）；线与其覆盖的底色 **5.05:1** |

实验导航和分段键原来的外置焦点框会被容器裁切，或和隔壁选中键颜色接近。`lab-exhibit-shell.css` 将这些键及实验路由手机底栏的 `:focus-visible` 改为 2px `currentColor` 实线、`outline-offset: -6px`，在键自身的表面绘制。焦点测量逐个按 Tab，对照同处显示/隐藏焦点线的截图；取实线和两侧紧邻背景像素。普通控件沿用原焦点样式。

交互稳定后的 **3,884** 个变化样本全部可归因：表格行悬停 **84**（流水线 40、HRRN 36、磁盘 8，共影响 408 条文字颜色记录）；实验导航或分段键焦点 **3,200**；仅实验路由的手机底栏焦点 **600**。原生过渡也保留独立采样：修前微操作切换“6 拍分步方案”时另采到一帧 **1.16:1**，修后这一批未再采到。原生过渡前后未锁定同一帧，有 367 条颜色采样不能直接归因；同构建关闭过渡、仍用真实输入复核稳定状态后，未归因差异为 **0**。这些是已采样状态的结果，不是对每个动画帧的保证。[原生过渡及红灯](../../output/playwright/opus-ui-2026-11-22/stage-5-states/interaction-summary.json) · [稳定状态汇总](../../output/playwright/opus-ui-2026-11-22/stage-5-states/interaction-endpoint-summary.json) · [逐元素差异与对应规则](../../output/playwright/opus-ui-2026-11-22/stage-5-states/attributed-interactions.json)

**静态差异。** 两份冻结生产构建共 **160** 对视图（实验 136、今日/题库/练习/知识/统计/设置 24）、58,854 对可见元素、50,488,386 对计算属性值、240 对整页/主区截图及 259,838,940 对像素。**158/160** 视图、**236/240** 截图完全一致，DOM 差异 0；非实验 **24/24** 完全一致。昼夜唯一静态例外都是 390px 流水线的 `.pipeline-mode-row .segmented-control`：

- 可用宽 326px，布局从 flex 改为两列 grid，两按钮从 103/89px 改为 **163/163px**。每种主题仅有 11 个计算属性差异：容器的 `display`、`grid-template-columns`、`grid-template-rows`；每个按钮各有 `width`、`inline-size`、`perspective-origin`、`transform-origin`。合计 22 个属性差异、4 处几何差异。
- 白昼与夜班各有 3,758 个变化像素，在整页和手机滚动主区拼图各出现一次，合计 **15,032**。像素均在按钮区域（x=43–308、y=661–696）。静态颜色无变化。最初设置缓存计数、进制页题包计数及知识图首绘时刻未对齐；已在同一对构建按相同数据和稳定画面复核，原记录保留。[最终对照及每组数字](../../output/playwright/opus-ui-2026-11-22/stage-5-states/comparison-verified/report.json) · [手机白昼差异图](../../output/playwright/opus-ui-2026-11-22/stage-5-states/comparison-verified/390-day-cpu-pipeline.png) · [手机夜班差异图](../../output/playwright/opus-ui-2026-11-22/stage-5-states/comparison-verified/390-night-cpu-pipeline.png)

**工程验证。** 独立生产构建 `dist-before`、`dist-delivery` 成功。交接时将当前源码在内存中重新编译，主 CSS 与 `dist-delivery` 的 352,053 字节摘要相同（SHA-256 `75c55911a01bfe07d80f85cf622f472b1f6780457e5653bc11e3a41f27a7b224`）。全仓 ESLint、七个 workspace 类型检查通过。实验定向 E2E **105/105**：27 份 spec，1440、1366、390 各 **35/35**，**1 worker**、8.3 分钟，无重试、失败、跳过或 flaky。产品只改四份 CSS，未改 TSX、实验逻辑或测试断言。本轮未跑默认全量。[E2E 逐项结果](../../output/playwright/opus-ui-2026-11-22/stage-5-states/e2e-delivery/report.json) · [交付回执和构建摘要](../../output/playwright/opus-ui-2026-11-22/stage-5-states/delivery.json)

<a id="final-gate"></a>

#### 走查遗留的三处行为修复与 UI 封板门禁（2026-11-25，拿铁）

本轮基于含 A/B/C、旧样式清理、交互态修复和全站走查的工作区。此前冻结的 A+B 单次 243/243 不作为本轮结果。

| 问题 | 根因、修复与回归 |
|---|---|
| 首次访问出现“账号状态已改变” | `restoreAccount` 请求 `/api/v1/auth/me`；401 使 `api.ts` 派发 `bitatlas-auth-required`。原 `AccountGate` 把它和账号切换事件接到同一个无条件告警函数。现在 `app/account.ts` 仍执行锁定，只有原本有活动账号，或恢复时有已校验的 `last-session` 且被 401 拒绝／离线资格已到期，才发会话变更通知；`components/AccountGate.tsx` 只监听这个通知。`AccountGate.restore.test.tsx` 新增 4 项：真实请求路径首次 401、已保存会话遭拒、离线资格过期、另一标签切号。没有新增存储字段，没有更改离线资格、学习数据或 outbox 的写入事务。 |
| 成员看到两张管理卡，恢复提示引用错误版本 | `pages/SettingsPage.tsx` 原先无条件渲染两张卡；现与模考页使用同一判定：本地模式或服务器管理员可以看到“2009 人工复核”和“激活正式题包”。成员仍可导出自己的备份；服务端权限未改。`components/LearningDataTools.tsx` 分清升级前快照与当前备份：本地 `BackupService` 默认 v4；服务器 `AccountBackupService` 实际导出带账号归属、`sync.outbox` 和 `sync.conflicts` 的 v5。`SettingsPage.test.tsx` 新增身份/模式 3 项、恢复文案 2 项。 |
| 小 PDF 显示 `0.0MiB` | `pages/ServerDocumentsPage.tsx` 原先所有文件统一除以 1024² 并保留一位。将 `pages/DocumentLibraryPage.tsx` 原有的 B、KB、MB 换算移入 `app/format-file-size.ts`，两页共用。`ServerDocumentsPage.test.tsx` 新增 1 项，用真实列表组件检查 512 B、1.0 KB、12.0 KB、1.0 MB。 |

三份页面测试共新增 **10** 项；[修前 3 文件 15 项](../../output/playwright/opus-ui-2026-11-22/final-gate/behavior-red.json)中 **5 项失败**（首访、离线过期提示、成员入口、v5 文案、小 PDF），其余 10 项通过。修后含原账号与 API、备份回归的[定向测试 7 文件 41/41](../../output/playwright/opus-ui-2026-11-22/final-gate/behavior-green.json)。原断言、标签与按钮可访问名称保留。

**旧发布判断：受影响，信心高。** [2026-11-22 部署记录](../server/gcp-domain-2026-11-22.md)对应发布 `20261122-532c8925`；本机保留的 `index-CjB-PwBK.js` 为 191,042 字节、SHA-256 `0b1c6a6f656c5140e01a3d778c8ec4ec276c57657ebec5662a91c159c6facb2a`，与这份发布清单逐字节摘要一致。该程序包含 `/auth/me` 的恢复调用、401 派发事件、两个事件共用同一无条件告警函数三段代码。[只读核对回执](../../output/playwright/opus-ui-2026-11-22/final-gate/deployed-code.json)。这是对指定发布的静态判定；本轮未访问线上，未部署修复。

**当轮门禁全部通过。** [机器总回执](../../output/playwright/opus-ui-2026-11-22/final-gate/delivery.json)保留逐条运行结果、命令、时长、构建摘要及原始报告路径。

| 项目 | 实际结果 |
|---|---|
| ESLint、TypeScript | 全仓 404 文件，0 错误、0 警告；7/7 个有类型检查脚本的 workspace 通过。 |
| 全量 Vitest | 130/130 文件、1407/1407 用例，3 workers，失败、跳过和待实现均 0。 |
| 内容与学习包 | `content:validate`：2009–2025 的 17/17 套，每套 47 题，共 799 题；`learning:check`：1/1 包确定性一致，799 题、80 卡、20 篇短讲、102 个叶概念。人工审核仍为 0/799。 |
| 生产构建 | 本地 `dist-local-complete/` 743 文件，服务器 `dist-server/` 336 文件；PWA 预缓存分别 100/95 项。[入口、主程序及 SW 摘要](../../output/playwright/opus-ui-2026-11-22/final-gate/build-identity.json)。两份均退出 0；Rollup 提示移除第三方 zod 两处 PURE 注释，Vite 提示不会清空独立输出目录。 |
| [默认本地 E2E](../../output/playwright/opus-ui-2026-11-22/final-gate/local-default/report.json) | 33 份 spec，1440/1366/390 各 81/81，首轮 **243/243**，14.5 分钟。启动时配置采得约 2.81 GiB 可用内存，自动分配、实际使用 **1 worker**；0 失败、0 跳过、0 重试、0 flaky。没有失败项需要单独重跑。 |
| 服务器 E2E | `tests/server-e2e/` 的全部 1 份 spec，[1440](../../output/playwright/opus-ui-2026-11-22/final-gate/server-desktop-complete/report.json)、[1366](../../output/playwright/opus-ui-2026-11-22/final-gate/server-1366/report.json)、[390](../../output/playwright/opus-ui-2026-11-22/final-gate/server-mobile/report.json) 各 7/7，共 **21/21**，每批 1 worker，0 失败、跳过、重试或 flaky。覆盖账号隔离、v5 往返、双端笔记合并、显式匿名迁移及离线 PDF。 |
| [PWA 跨版本升级](../../output/playwright/opus-ui-2026-11-22/final-gate/pwa-upgrade/receipt.json) | 1 份脚本、2 份独立标记的生产构建、1 个 Chrome 顺序验证，1440/390 各 1/1，**2/2**。新版等待期间未保存草稿保留；服务器对旧脚本返回 404、旧标签缓存返回 200；关闭旧标签后激活 B，离线重开/刷新仍显示已保存笔记。两个视口横溢均为 0。 |
| [三处行为的浏览器补验](../../output/playwright/opus-ui-2026-11-22/final-gate/behavior-browser-ready/receipt.json) | 1440/390 × 成员/管理员共 **4/4**，单个 Chrome 顺序运行；每组都实测首次 401 无告警、会话失效后 401 有告警。设置页加载完成后成员 0/2、管理员 2/2 张管理卡；真实下载的 v5 含 outbox 和 conflicts，868 字节 PDF 显示 `868 B`。[最终 10 张截图](../../output/playwright/opus-ui-2026-11-22/final-gate/behavior-browser-ready/)。 |

历史尝试保留：初次全仓 lint、本地构建及服务器 1440 批次均因运行中断而没有结束回执；服务器原日志止于 4 项通过，没有记录断言失败。分别使用新日志名、新输出或新数据库完成，不把中断结果计入通过数。补验最初的四组记录也保留在 `behavior-browser/`，最终采用显式等待恢复区可见的 `behavior-browser-ready/`。固定 8 worker 压力检查按要求未跑。本轮没有提交、推送、部署或安装依赖。

<a id="next-phase-batch-1"></a>

#### 下一阶段体验改进第一批：P1、P2、P5 与 P4 第 2 点实现（2026-11-25，摩卡）

基于[《下一阶段学习体验改进方案》](./next-phase-proposal-2026-11-25.md)及组长裁定分工，仅修改呈现与交互层，不动 `apps/web/src/app/`、`packages/`、数据库 schema、首答证据与计时规则，既有单测与 E2E 断言零删改。

| 模块 | 关键实现与设计取舍 |
|---|---|
| **P1 判错当下闭环** | 新增 `PracticeConceptBridge.tsx` 挂载于 `PracticePage` 答案面板底部（桌面与手机同一主阅读栏位置）：展示叶概念几何标记与名称、四态徽标（严格零百分比）、`已练 m / n 题 · 记忆卡 k 张`；有短讲解时支持 `<details>` 原地展开并完整保留 `版本 ... · AI 辅助原创讲解 · 待审核`；实验入口按 `questionLabLink(question.id) -> concept.labIds[0] -> article.labPath` 三级回退，并提供关联记忆卡与跨年同概念真题入口；一题关联多概念时渲染顶部概念切换签。缺文字解析题（`availability.explanationMissing`）提示语旁新增“查看来源扫描页”按钮直接唤起原卷弹窗。`LabExhibit.tsx` 顶部向后兼容接入 `PracticeLabReturnBanner.tsx`（纯函数抽至 `practiceLabReturn.ts`）：从练习跳实验时通过 `sessionStorage`（`bitatlas:practice-lab-return`）记录来源会话而保持实验 URL 零附参（兼容全部既有实验深链断言，且实验内改写查询参数不丢失来源），仅在会话存在、非模考且未完成时展示 `← 返回刚才的练习（第 X / N 题）`。 |
| **P2 图形题防误触、错因笔记合一与总结页折叠** | `PracticePage` 与 `MockExamSessionPage`（仅改此呈现）在提交/交卷前拦截选项按钮内图片的灯箱委托（点击图片只选中该选项），对含图选项（`cn408-2009-q04`）通过同格 Grid 叠层渲染右上角独立 `放大` 按钮（保持 `.option-list > button` 恒为 4 个直接子按钮），提交后点击选项图区亦可放大；`.rl-reading .source-inline-crop` 设 `overflow: clip` 防止聚焦或脚本触发内部整页大图滚动偏移。`ReadingImageLightbox.tsx`（辅助函数抽至 `readingImageLightboxUtils.ts`）对裁剪题图默认展示局部裁剪框并提供 `查看整页原卷` / `仅看局部题图` 切换。`PracticeMistakePanel.tsx` 新增可选单行“错因补充笔记”，经 `PracticePage` 既有 `persistEvidence` 串行锁写入同一条 `PracticeEvidence.mistakeNote`（失焦/回车保存，切题或结束前自动等待在途写入，不动 `firstResponse`、`evidenceFromStart` 与计时检查点），与 `PracticeSummaryPage` 双向互通。`PracticeSummaryPage` 默认仅展开答错、综合题未满分或已记录错因/笔记的题目；客观答对与未提交无记录题目默认折叠为带题干首句摘要的单行卡，支持手动展开/收起。 |
| **P5 手机单手** | `question.hints` 为空时不渲染提示按钮，主操作“提交答案”占满整行；有提示题目保持原样。保留练习页 390px 静态 `.mobile-nav` 布局契约不变；`<=760px` 在题头收藏按钮旁新增紧凑 `原卷`（打开来源弹窗）与 `笔记`（平滑滚动并聚焦笔记输入框）入口。 |
| **P4 第 2 点：总结页接今日卡片** | 将 `DailyTasks.tsx` 中剩余卡片过滤与 `startCards` 抽为共享 hook `components/useDailyCardRound.ts`（`DailyTasks` 行为与结构零变化）。当总结页会话上下文绑定当前 `dailyPlanId` 且仍有未完成今日卡片时，“接下来”直接提供 `继续今日剩余 N 张记忆卡 →`；本轮无待重练错题（`retryIds.length === 0`）时，自动将 `继续今日剩余 N 张记忆卡 →` 或 `返回今日任务 →` / `继续题库练习 →` 升为主按钮并展示 `✓ 本轮无待重练错题`，消除唯一主按钮置灰 `重练本轮错题（0）` 的死胡同。 |

**验证结果（全部独立输出至 `output/playwright/opus-ui-2026-11-22/next-phase-impl-1/`）：**
- **静态与单测门禁**：改动与新增的 17 份 TS/TSX 文件 `eslint --max-warnings=0` **0 错误、0 警告**；新增/改动 CSS 原始色值与 `--palette-*` 扫描 **0 命中**；全仓 `npm run typecheck` **7/7 workspace 通过**；定向 Vitest **7 文件 60/60 通过**（含新增 `PracticeConceptBridge.test.tsx`、`PracticeSummaryPage.test.tsx` 及 `PracticePage`、`MockExamSessionPage`、`LabExhibit`、`SecondaryPages`、`DashboardPage`）。
- **三视口 E2E（1 worker，端口 4361 独立预览 `dist-local`）**：`study-flow`、`visual`、`learning-loop`、`learning-reliability`、`mock-exam`、`cpu-extended-labs`、`protocol-labs` 共 7 份 spec，1440 / 1366 / 390 各 41/41，合计 **123/123 通过**（6.0 分钟，0 失败、0 跳过、0 flaky，既有测试文件零改动）。
- **真实 Chrome 多维矩阵（端口 4362）**：覆盖 1440 与 390、白昼与夜班、18px 与 24px 共 **13 组视图**（判错闭环卡、2009 Q4 选图与局部裁剪灯箱、2024 Q12 缺解析内联原卷入口、练习去实验再返回、总结页折叠与接今日卡片、手机题头原卷/笔记入口），`chrome-matrix-audit.json` 实测横溢 **0**、小于 24px 触控目标 **0**、低于 4.5:1 对比度 **0**。
- **未完成项**：无（归属拿铁的 P3、P4 第 1/3 点、P6、GBN 与知识页手机抽屉按分工未触碰）。


#### 学习体验 P3 / P6 与四科新题轮询收尾（2026-11-25，拿铁）

- **P3 完成**：WrongPage 增加四科及错因过滤，与年份交叉筛选；主按钮显示“开始重练 N 题”，零结果禁用并提供清除筛选。按当前题面版本和最新保存时间读取 evidence，清空的错因不会回退到旧标签；旧题面记录不串入。错因笔记及个人笔记各自提供单行摘录与原文展开。只读使用 evidence / notes，没有新增存储。
- **P6 第 1 点前半完成**：StatsPage 薄弱知识点改读 useConceptRegister，仅列 practicing 且 objectiveByConcept 为 needs-review 的叶概念（最多 5 项），显示“练习中 / 有客观错答待复习 / 已练 m/n 题”。未知过程、辅助作答和旧题面不能冒充客观错题。加载/错误单独显示；无概念百分比。题目层正确率、核心 metric-grid 文案/顺序与热力图保留。
- **四科轮询完成**：每次新生成的清单中，新题固定按 DS→CO→OS→CN 循环；各科内部按 year、number、id 升序，各科跨年队列延续；某科耗尽即跳过，由其余科补位。到期题仍先取，每日上限不变，无随机性，输入重排不改变输出。现有持久化读取逻辑不改；新增 storage 回归从旧 year/number 排序清单开始，关闭重开后换题面输入仍逐字段保留，次日才采用轮询。新增测试文件已获组长同意。
- **两项尾巴完成**：verify-live-wave12.spec.ts 两处异步 waitForFunction 改 expect.poll(page.evaluate(...))。本地 Chrome 从实际工具文件抽取两段谓词，缓存命中与 SW 激活各做延迟满足/永不满足：延迟均读取 4 次后成功（207/189ms），永不满足均读取 11 次后超时（641/619ms），4/4 行为符合预期；未访问线上。content-quality-backlog.md 只在 locator 精度节追加 46 题一致及 2024/2025 总表 answers-1.jpg、印刷页 84/85 的复核结论，保留历史与审核边界。

**验证与证据**（独立目录：`output/playwright/next-phase-impl-latte/`）：

- `npx vitest run packages/domain/src packages/storage/src/review-plan.test.ts packages/storage/src/learning-repository.test.ts apps/web/src/pages/SecondaryPages.test.tsx`：12 文件 **83/83**。`npm run typecheck`：7 workspace 通过。全仓 `npm run lint` 及随后改动 TS/TSX 定向 ESLint 均 0；新 diagnostics.css 原始色值/--palette-* 扫描 0。
- `npm run build -w @408os/web -- --outDir=output/playwright/next-phase-impl-latte/build-local`：生产构建通过。`npx playwright test --config output/playwright/next-phase-impl-latte/playwright.config.ts`：4349，实际 **1 worker**，1440/1366/390 各 **39/39**，指定 5 个文件（两份 study-flow、visual、learning-loop、learning-reliability）共 **117/117**，0 failed/skipped/flaky。不是全仓默认 E2E，也没有进行 8 worker 压力检查。
- 4351 真实 Chrome：三道题经 UI 作错并保存错因/个人笔记，验证交叉筛选、数量、空态、重置、原文展开和统计四态；1440/390 × 白昼/夜班共 **8 页面状态、20 截图**。新增文字最低对比度 **5.8745:1**，新增过滤按钮与摘录展开目标最小 **36px**，文档横溢 0、pageerror 0；JSON 记录 actualTheme 并与期望主题逐项相等。截图：`wrong-{1440,390}-{day,night}.png`、`wrong-filtered-*.png`、`wrong-note-expanded-*.png`、`stats-*.png`、`stats-concepts-*.png`。已直接查看桌面、手机、夜班概念列表与笔记展开截图。
- **既有断言变更仅 2 条**：review-plan.test.ts“keeps the selected queue stable during the day”里的 before/after ID 数组都从 [q1,q2,q3] 改为 [q1,q3,q2]；q1 仍是到期项，q3 是下一道数据结构新题，q2 是组成原理。两条都保持完整顺序严格相等断言；完成数与到期原因断言原样保留。没有修改/删除/降低既有 E2E 断言；SecondaryPages 原有断言保留并新增版本、缺证、错因和状态覆盖。
- 调试经过如实保留在交接：初次定向单测 40 通过/1 失败，原因为新增存储测试的题包文件路径；改成自包含四科 fixture。初次 typecheck 发现数组索引收窄、Testing Library 的 exact 参数和存储测试 node:fs 类型问题，均修正。初次从根脚本透传 outDir 被嵌套 npm 吞掉，改为直接 workspace build 后成功。截图脚本的主题按钮挂载竞态通过等待按钮可见并严格断言 data-theme / actualTheme 修正，最终 20 图为修正后证据。E2E 单次完整运行通过，无重跑。
- 没有修改 schema、存储实现、题包或其他成员的产品文件；只在 styles.css 末尾追加 diagnostics.css 导入。根 HANDOFF 检查点已发组长维护；未提交、推送、部署或安装依赖。未完成项：无（本任务分配范围）。

<a id="next-phase-batch-2"></a>

#### 下一阶段体验改进第二批：知识页抽屉与筛选、GBN 手机画布、模考出口与今日首尾闭环（2026-11-25，摩卡）

基于[《下一阶段学习体验改进方案》](./next-phase-proposal-2026-11-25.md)（P4、P6、搁置项表及组长裁定分工），仅修改呈现与交互层，未触碰 `apps/web/src/app/`、`packages/`、`main.tsx`、`index.html`、`tests/` 及归属拿铁的 `WrongPage.tsx` / `StatsPage.tsx`；严格遵守概念状态零百分比、AI 内容不标已审核与纯语义令牌约束。

| 模块 | 关键实现与设计取舍 |
|---|---|
| **知识页手机半屏抽屉** | `KnowledgePage.tsx` + `register.css`：`<=760px` 下用户点击寄存器概念格、知识点行或非根图节点时，`.knowledge-detail-panel.is-drawer-open` 以底部半屏抽屉（`max-height: 76dvh`）原地滑出，不触发页面纵向滚跳；桌面 `>760px` 保持左图右详情双栏不变，直接访问 URL 或刷新保持文档流呈现。抽屉打开时挂载全屏 `.knowledge-drawer-backdrop` 拦截背景点击防误触（点击遮罩直接关闭而不误点底层格），焦点自动移入顶部关闭按钮，内部 `Tab` / `Shift+Tab` 循环约束，按 `Escape`、点关闭按钮或点遮罩均收起抽屉并将焦点无滚跳返还至触发按钮（`preventScroll: true`），关掉即可紧接着点隔壁格。抽屉不设 `aria-modal="true"` 或全局 `inert`，避免 Chromium 无障碍树裁剪同页“科目总览”与知识点按钮，完整兼容键盘与视觉回归契约。 |
| **GBN 手机紧凑画布** | `GbnLabPage.tsx` + `lab-exhibit-rollout.css`：鉴于 GBN 接收窗口恒为 1，将接收端原 32 格序列框替换为单行 `.gbn-receiver-bar`（保留 `role="img"`、`aria-label="接收方期待序号 ..."` 与 `.gbn-expected-slot strong` 契约，并写明仅按序接收当前序号、乱序帧丢弃并重发最近按序累计确认）；`<=760px` 下发送端 `.gbn-sequence-space` 改为 8 列紧凑位格（隐藏冗余文字小签，完整保留 `[data-gbn-sequence]` 与 `.gbn-window-slot` / `.gbn-in-flight` / `.gbn-base` / `.gbn-next-seq` / `.gbn-timer-owner` 全部状态类与色条标记）。390px 视口下 32 序号状态面板总高实测降至 **387px**（发送端 8×4 网格 **148px**、接收条 **75px**，较原约 1,273px 缩短约 **70%**）。 |
| **P6 第 2 点：寄存器过滤与专项题量** | `ConceptRegister.tsx` 头部新增“全部 / 练习中 / 待巩固 / 未开始”四枚过滤芯片（显示整数计数，严格零百分比；筛选非“全部”时手机端自动展开匹配科目行，空匹配展示明确提示）。`KnowledgePage.tsx` 发起专项练习前先将节点可用题按**当前错题优先 → 未做题次之 → 已做对题最后**确定性排序，再提供 `5 题 / 10 题 / 全部 (N)` 分段选择（默认选中 `全部 (N)` 以保持一键全练体验，题数不足 5/10 时对应档位自动置灰），仍走普通 `createSession(targetPracticeIds, 'review')`，不冒充计时组卷。 |
| **P6 第 1 点后半：知识页卡片口径对齐** | 原 `KnowledgePage` 同时按 `card.conceptIds` **或** `card.sources.some(questionIds)` 匹配，导致同一道综合真题衍生的其他概念卡片串入当前叶概念（上方 `cardCount` 写 2 张、下方 `selectedCards` 写 6 张）。现统一改为：`effectiveCards(pack?.cards ?? [], personal ?? [])` → 校验 `card.sources.every(s => versionByQuestionId.get(s.questionId) === s.questionContentVersion)`（排除旧题面版本失效卡，与 `useConceptRegister` 及 `ReviewPage` 完全同源）→ 按 `card.conceptIds.some(id => selectedSubtreeIds.has(id))` 匹配当前概念或章节/科目子树（`Set` 去重）。叶概念下与寄存器 `cardCount` 及 `/review?concept=` 严格 1:1 相等，章节/科目节点下聚合子树有效卡片且不重复计数。 |
| **P6 第 3 点：模考未开放出口** | `MockExamPage.tsx` + `secondary.css`：当 2009 正式整卷未满足 47 题人工 `verified` 门槛或试卷结构不完整时，在告警卡操作区对所有身份（含普通 `member` 与管理员）展示次按钮 `去题库按年份顺序自测 →`（指向最新已装年份 `/questions?year=<latestYear>`，无题包时回退 `/questions`）；管理员原有的 `进入内容复核` 与 2009 正式模考人工复核门槛保持不变。 |
| **P4 第 1、3 点及第 2 点后半** | `DashboardPage.tsx`：正常题包可用模式下，仅当存在未完结且不属于当前 `dailyPlanId` 的独立练习会话或独立卡片轮次时，首屏才渲染 `继续上次未完练习`（无题包公开代码模式保留置灰 `继续学习` 以兼容既有空题包契约）；`practiced === 0` 的新成员首屏附简短起步与自选题库指引。`DailyTasks.tsx`：当 `total > 0` 且当日计划题目与卡片全部完成时，将两颗置灰 `0` 按钮替换为 `✓ 今日计划已全部完成` 横幅——有待巩固错题时提供 `复盘待处理错题（N）` 跳转 `/wrong`，并统一说明概念“稳定”状态需经跨日复习间隔（`≥ 3 天`）验证后才会点亮（因题面版本不匹配等原因被阻塞的 `0` 题仍保留原置灰按钮与阻塞提示）。新增共享纯函数 `components/card-label.ts`（`buildConceptNameMap`、`formatCardLabel`、`formatCardRoundSummaryLabel`），由 `DailyTasks` 与 `CardReviewPage` 复用，彻底消除 `CardReviewPage` 本轮总结列表暴露 `card-cn-01` 等内部 ID（同轮多卡归属同一概念时追加首条题源定位符区分）。 |

**既有单测断言调整逐条说明（仅 `DashboardPage.test.tsx` 3 处，强度不降，E2E 测试文件零改动）：**
1. `DashboardPage.test.tsx` 首屏默认态用例：原断言新用户（`practiced === 0`、无未完独立会话）首屏存在可点的 `继续学习`；按 P4 第 1 点新契约改为断言首屏不渲染 `继续学习` / `继续上次未完练习`、展示新成员起步指引且 `开始剩余 2 题` 可用，并新增独立用例专门断言存在未完非今日会话时 `继续上次未完练习` 可点并精确续接。
2. `DashboardPage.test.tsx` 题目版本绑定用例：当 `oldAttempt` 版本匹配使当日唯一计划项真正完成时，由原断言置灰 `开始剩余 0 题` 改为断言渲染 `今日计划已全部完成` 且移除冗余 `开始剩余` 按钮；版本不匹配阻塞分支仍严格保留 `expect(... '开始剩余 0 题').toBeDisabled()`。
3. `DashboardPage.test.tsx` 北京时间跨午夜用例：午夜前唯一计划题答错完结后，由原断言置灰 `开始剩余 0 题` 改为同时断言 `今日计划已全部完成` 与 `复盘待处理错题（1）`（`href="/wrong"`），跨午夜刷新后 `开始剩余 1 题` 恢复可点的断言原样保留。

**验证与证据（全部独立输出至 `output/playwright/opus-ui-2026-11-22/next-phase-impl-2/`）：**
- **静态、语义令牌与单测**：本批改动与新增的 14 份 TS/TSX 文件 `eslint --max-warnings=0` **0 错误、0 警告**；4 份改动样式文件（`register.css`、`today.css`、`lab-exhibit-rollout.css`、`secondary.css`）原始色值与 `--palette-*` 扫描 **0 命中**；全仓 `npm run typecheck` **7/7 workspace 通过**；定向 Vitest **7 文件 55/55 通过**（`ConceptRegister` 7、`KnowledgePage` 15、`GbnLabPage` 10、`MockExamPage` 3、`DashboardPage` 14、`CardReviewPage` 4、`ReviewPage` 2）。
- **三视口单并发 E2E（端口 4361 独立预览 `dist-local`）**：初次运行暴露 `chromium-390` 下抽屉 `aria-modal`/`inert` 遮蔽同页科目总览与知识点列表按钮的 2 处失败；修正为背景遮罩防误触 + 抽屉内 Tab 循环后，单次完整重跑 `study-flow`、`visual`、`learning-reliability`、`learning-loop`、`code-only-mode`、`mock-exam`、`protocol-labs`、`system-labs` 共 8 份 spec，1440 / 1366 / 390 各 42/42，合计 **126/126 通过**（**1 worker**，7.5 分钟，0 失败、0 跳过、0 flaky）。
- **真实 Chrome 多维矩阵（端口 4362）**：覆盖 1440 与 390、白昼与夜班、18px 与 24px 共 **18 组视图**（今日新成员首屏、模考未开放出口、未完独立会话续接、记忆卡总结中文概念名、今日计划全完成横幅、寄存器四态筛选、知识页题量分段与卡片口径对齐、知识页 390px 底部抽屉遮罩防误触与 Esc 焦点返还、GBN 32 序号紧凑画布），`chrome-matrix-audit.json` 实测最大横溢 **0**、小于 24px 触控目标 **0**、低于 4.5:1 对比度 **0**。已人工目视核验关键桌面/手机与昼/夜截图。
- **未完成项**：无（未运行 `npm install`，未提交、推送或部署，预览端口已全部关闭）。
