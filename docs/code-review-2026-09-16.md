# BitAtlas / 408OS 代码审查与完成度评估

审查开始：2026-09-16；报告完成：2026-09-17（Asia/Shanghai）。基线：`main`，HEAD `4d71c84`。范围为当前本地工作区，未验证线上部署状态。产品实现未修改。

## 判断

**当前是功能主干较完整、可本地使用的学习 Beta；正式可靠的多年份题库尚未完成。信心：高。**

分层、存储、版本迁移、事务写入、冲突处理和自动化测试都有实际实现。主要短板已经转到内容质量与功能之间的数据一致性。没有完整的终版需求验收表，因此不把主观百分比当作精确完成度。

本次确认 5 项缺陷：1 项 P1、3 项 P2、1 项 P3。前四项由隔离探针复现；手动掌握度和年份标题也在真实 Chrome 界面复现。测试通过不能覆盖这些跨功能缺口。

## 按优先级列出的发现

### F1 · P1：题面修订沿用相同版本，旧作答进入新题面的进度统计

- 位置：[build-year.mjs:527](D:/CodexProject/personal-projects/408OS/tools/content-importer/src/build-year.mjs:527)，manifest 同样固定在第 537 行；消费处为 [study.ts:205](D:/CodexProject/personal-projects/408OS/packages/domain/src/study.ts:205)。
- 原因：2010–2025 导入器始终生成 `${year}.0-draft.2`。统计、复习计划和练习恢复均依赖 `question.contentVersion` 区分题面，没有用整包 hash 替代这一合同。
- 实际复现：Git 历史 `99c33a5` 中 2012 Q1 是 `fact(n-10)`，当前已修成 `fact(n-1)`，两者仍为 `2012.0-draft.2`。以旧题创建的 Attempt 经当前投影函数处理，`oldAttemptCountedAsCurrent = true`。
- 影响：题干、选项或答案修订后，旧会话仍可能被允许继续，旧作答继续影响已练、错题和每日复习计划；版本隔离机制失去作用。
- 建议：导入过程显式管理题目修订版本；题面/答案等语义内容变化时提升版本，并增加“内容变化但版本不变”的构建检查。新增修订不能恢复过去已混合记录的精确题面来源，需要保守保留历史数据，不能猜测迁移。
- 信心：高；证据为实际历史内容差异与纯函数结果。

### F2 · P2：扩展年份启动安装会将 verified 题包降级为草稿

- 位置：[storage.ts:405](D:/CodexProject/personal-projects/408OS/apps/web/src/app/storage.ts:405)。
- 原因：`installExtraContent()` 检测到 hash 不同后直接调用 `installPack(pack, false)`；仅 2009 的安装路径有 `protectedManifest` 防降级逻辑。设置页的 verified 导入接口允许其他年份，因此两个功能的合同不一致。
- 复现：在独立的 fake IndexedDB 中安装 2010 verified 测试 fixture，再让启动请求返回仓库现有 2010 草稿。结果 `before: verified`、`after: needs-review`、`issues: []`。
- 影响：用户导入经过审核的扩展年份题包后，下一次打开应用就可能被网站草稿静默替换，练习内容与题面版本也随之改变。
- 建议：将已安装 verified 内容的保护策略统一用于所有年份；补充“导入 verified → 重新启动 → 保持 verified”的集成回归。
- 信心：高。fixture 仅存在于本次进程内存中，没有修改真实题包或宣称内容已经人工审核。

### F3 · P2：手动掌握度与真题列表、总览读取的状态不一致

- 位置：[StudyContext.tsx:225](D:/CodexProject/personal-projects/408OS/apps/web/src/app/StudyContext.tsx:225)、[QuestionsPage.tsx:78](D:/CodexProject/personal-projects/408OS/apps/web/src/pages/QuestionsPage.tsx:78)。
- 原因：手动 `setMastery()` 写入版本化 progress，练习页读该 progress；真题列表、错题页和总览的掌握度却读仅由 Attempt 重放生成的 `currentProgress`，后者没有手动 mastery。
- 浏览器复现：新建 2009 Q1 练习，未提交答案，点击“已掌握”；按钮具有 `active` 类。返回真题后，同题仍显示“未练习”。隔离探针同样得到 `storedMastery: mastered`、`projectedMastery: unseen`。
- 影响：用户无法理解手动标记为何只在练习页有效；总览的已掌握数和列表状态与刚保存的选择不一致。
- 建议：明确定义手动 mastery 与作答证据的关系，并统一展示层数据源。作答次数、正确率仍应使用真实 Attempt；若保留两种掌握度，需分别命名与展示，不能共用一个标签却含义不同。
- 信心：高。

### F4 · P2：HTTP 服务故障被当成“没有题包”

- 位置：[storage.ts:211](D:/CodexProject/personal-projects/408OS/apps/web/src/app/storage.ts:211)、[storage.ts:401](D:/CodexProject/personal-projects/408OS/apps/web/src/app/storage.ts:401)。
- 原因：2009 安装路径把任意 `!response.ok` 转为 `LocalContentUnavailableError`；扩展年份路径则直接忽略任意非 2xx 响应，没有区分 404 与 503 等服务器故障。
- 复现：空内容库收到 HTTP 503 时，`treatedAsMissing: true`；16 个扩展年份全部返回 503 时，结果仍为 `{ issues: [], installedYears: [] }`。
- 影响：首次访问遇到暂时性服务故障会显示缺题包，扩展年份缺失也没有诊断提示，违背项目“仅显式缺失可降级”的约定。已有内容时可继续使用本地数据，但刷新故障仍应能识别。
- 建议：只把合同指定的缺失状态（如 404）视作未安装；其他 HTTP 状态保留错误及年份信息，并验证不覆盖已有数据。
- 信心：高。

### F5 · P3：练习页年份写死为 2009

- 位置：[PracticePage.tsx:463](D:/CodexProject/personal-projects/408OS/apps/web/src/pages/PracticePage.tsx:463)。
- 复现：真题页选择 2025，进入 Q1，实际显示 2025 的程序复杂度题且可正确提交，但顶部仍为“2009 全国统考”；桌面与手机截图均可见。
- 影响：年份识别错误，跨年份每日复习时尤其容易混淆来源。
- 建议：按当前 `question.year` 显示年份，并增加一次非 2009 年题目的界面回归。
- 信心：高。

## 功能完成情况

| 范围 | 当前证据 | 完成判断 |
| --- | --- | --- |
| 刷题与学习记录 | 作答、提交、草稿恢复、笔记、收藏、错题、自评、统计与备份都有实现；相关 E2E 通过 | 主干已完成；F1/F3 影响一致性 |
| 持久化与恢复 | 内容/用户数据库分离；v1/v2/v3 迁移和损坏备份拒绝有测试；会话写入有并发控制 | 工程基础较扎实，本次未对所有并发交错做穷举 |
| 多年份题库 | 2009–2025，17 年、799 题、367 个资产记录，17/17 内容结构校验通过 | 导入覆盖已齐；仓库内 verified 为 0/799 |
| 解析与提示 | 80 道选择题为“本题解析暂缺文字版”（2024/2025 各 40）；791/799 的第二提示是通用模板 | 内容质量仍需专项处理；非占位文本也未等于审核正确 |
| 整卷模考 | 2009 模考、计时、持久化、交卷、自评与多标签冲突流程有实现及 fixture 验证 | 当前真实题包门禁关闭；多年份模考未形成完整产品能力 |
| 知识与实验 | 四科实验有纯逻辑层及页面/E2E；当前知识图和题目深链主要围绕 2009 | 代表题交互功能可用；不能等同于完整 408 考纲覆盖 |
| 本地 PDF | 导入、恢复、重命名、移除、中文字体和离线阅读相关 E2E 通过 | 当前范围内较完整；PDF 不属于学习 JSON 备份 |
| PWA / 移动端 | 生产构建有有效 SW；本次 390px 下 2025 Q1 已提交记录在真实离线 reload 后恢复，SW 为 activated | 抽验通过；未验证全部页面/所有资产/首次离线安装组合 |
| 文档与门禁 | README 仍称 2010 及以后未导入，ARCHITECTURE 仍称克隆不带 2009；默认发布 workflow 只有安装与构建 | 说明与当前代码脱节，发布门禁仍依赖人工执行 |

这里的范围按“个人本地学习平台”评估。要称为正式完成，至少需要解决 F1–F4、建立可证明的内容审核闭环，并让浏览器全量门禁稳定。

## 本次验证结果

| 验证 | 结果 |
| --- | --- |
| `npm run lint` | 通过 |
| `npm run typecheck` | 所有 workspace 通过 |
| `npx --no-install vitest run --maxWorkers=4` | 97 files / 1094 tests passed |
| `npm run test:release` | 10/10 passed |
| `npm run test:year -w @408os/content-importer` | 27/27 passed |
| `npm run content:validate` | 17/17 题包通过；每包 47 题，全部 needs-review |
| production build | 通过；1920 modules、198 static-copy、88 PWA entries / 2796.56 KiB |
| 完整浏览器集合 | **200/201 passed**，4 workers、1440/1366/390 三个项目，264.8 秒，无跳过 |
| 唯一失败定向复跑 | chromium-1440 模考双标签页测试，1 worker，1/1 passed，测试本身 2.9 秒 |
| 隔离缺陷探针 | 完成；结果保存于 `probe-results.json` |
| 人工驱动浏览器抽验 | 手动掌握度不一致复现；2025 年筛选、Q1 提交、手机离线刷新恢复通过；两视口截图已目检 |

构建使用 `npm run build -w @408os/web -- --outDir ../../output/code-review-2026-09-16/dist --emptyOutDir false`，避免清理原有 dist。E2E 用 `output/code-review-2026-09-16/playwright.review.config.ts` 继承仓库的 testMatch、三个 projects 和其他运行选项，只指定独立产物目录、本次 production preview 地址及 4 workers；没有改变断言或超时。

全量唯一失败位于 [mock-exam.spec.ts:155](D:/CodexProject/personal-projects/408OS/tests/e2e/mock-exam.spec.ts:155)：15 秒内没有出现“2009 整卷模考”，失败快照停留在“恢复持久化模考”。定向复跑通过说明该失败本次未稳定复现，**尚不能仅据此确认是机器负载、测试隔离还是应用并发性能问题**。不将它算成“已修复”，也不把定向通过改写为全量 201/201。本次未重跑默认 8-worker 集合。

现有全量测试配置阻止 service worker，因此额外用允许 SW 的独立 Chrome 会话验证了一次真实 PWA 离线恢复。离线时 17 个更新请求报网络错误属模拟断网的预期现象，界面仍从本地记录恢复。

## 建议推进顺序

1. 先修题面版本和 verified 防降级，保护已有学习记录与审核成果。
2. 统一掌握度展示，再修 HTTP 分类和年份标题；补能复现上述问题的回归用例。
3. 优先完成 2009 的逐题人工复核，打通当前正式模考门禁；再按年推进，避免把 799 题的导入覆盖当成审核成果。
4. 处理 80 道缺解析题与模板提示，校对 OCR 噪声，并明确多年份知识图/模考的范围。
5. 对模考启动超时做有界诊断，随后同步 README/ARCHITECTURE 与发布验证入口。当前优先级高于继续扩大视觉换肤范围。

## 证据与复现

- [隔离复现脚本](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/probes.ts) 与 [探针结果](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/probe-results.json)。在项目根执行 `npx --no-install tsx output/code-review-2026-09-16/probes.ts`；使用 fake IndexedDB，不读取或修改个人浏览器数据。
- [全量 E2E JSON](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/e2e-results.json)、[HTML 报告](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/e2e-report/index.html)、[定向复跑日志](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/e2e-recheck.log)。
- [手机截图](D:/CodexProject/personal-projects/408OS/output/playwright/review-2026-09-16-mobile-2025.png)、[桌面截图](D:/CodexProject/personal-projects/408OS/output/playwright/review-2026-09-16-desktop-2025.png)、[真实离线恢复记录](D:/CodexProject/personal-projects/408OS/output/code-review-2026-09-16/ui-offline-mobile.log)。
- `output/code-review-2026-09-16/` 还有 lint/typecheck/unit/content/release/importer/build 的原始日志及 CLI 页面快照；output 为忽略目录，以上本地证据不会自动进入 Git。
- 使用 Context Lens 压缩构建日志时，工具将 `shield-alert` 资产文件名误归类为 error；已核对原日志和退出码，构建实际成功。

本次新增报告并更新 HANDOFF/notes，未修复产品源码。原有未跟踪 `.workbuddy/` 保留；临时浏览器与 preview 已关闭。未做外网部署验收、依赖漏洞专项审计或 799 题逐题学科审核；本报告不能替代这些结论。
