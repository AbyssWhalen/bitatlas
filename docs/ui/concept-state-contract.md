# 概念寄存器与会话状态的只读合同

2026-11-24。页面使用 `apps/web/src/app/useConceptRegister.ts` 的 `useConceptRegister()`；会话信息使用同目录 `useSessionSyncStatus.ts` 的 `useSessionSyncStatus()`。两者都不启动学习、生成计划、登录、同步或写入学习记录。知识页无需复制统计逻辑。

## 返回值

| 字段 | 含义 |
| --- | --- |
| `concepts: ConceptStateRow[]` | 按学习包顺序，每个 `level === 'concept'` 的叶概念一行。字段恰为 `conceptId, name, subject, state, questionCount, attemptedQuestions, cardCount, dueCards, labIds, lastActivityAt`。 |
| `objectiveByConcept: Map<string, ObjectiveAssessment>` | `untested` 没有可证实的无辅助客观首答；`needs-review` 至少一道已测题的最近有效首答日有错；`positive` 每道已测题最近有效首答日都答对。未测过的题没有贡献。不要把 `untested` 写成“答错”或 0%。 |
| `subjects: SubjectStateCounts[]` | 以 `SUBJECTS` 的固定顺序返回四行 `{ subject, unstarted, practicing, consolidating, stable }`。四个数是互斥的叶概念个数，空科目也是一行 0。 |
| `todayPlan` | `{ items: (DailyPlanItem & { conceptIds: string[] })[], conceptIds: string[] }`。保留今日固定清单的数量、原顺序、目标、版本和原因；集合按第一次出现顺序去重。缺失、换版或已暂停的目标保留该项，映射为空，不会误点亮新版本。异日或空计划两数组均为空。 |
| `weeklyStudyDays: number` | 北京时间本周一到今天（含）的活动日期数，范围 0–7。 |
| `loading, error` | 沿用学习内容加载标志和学习/题库读取错误。加载中或报错时呈现相应状态；没有学习包时不会补造 102 格。 |

`questionCount` 是有**当前题面映射**的不同题目数，包含综合题，不承诺题目在此刻可练习。`attemptedQuestions` 是这些题目中有至少一次有效作答的不同题目数，而非提交次数。题目可以对应多个叶概念，在各行分别计一次。`cardCount` 是与该叶关联、来源版本有效且当前启用的卡片数。`dueCards` 只数已有日程且 `dueOn <= 今天` 的这些卡；未学新卡不是到期卡。

`labIds` 的元素是现有 `app/lab-links.ts` 给关联题目的完整站内 `destination`，保留模块、预设及查询参数，按路径去重；无配置返回 `[]`。可以直接交给路由。讲解的 `article.labPath` 是独立可选入口；不据此推断其他题目的实验。`lastActivityAt` 是本行最近一次有效作答或卡片评分的 UTC ISO 8601 时间（毫秒），无记录为 `null`。

## 证据与版本

1. 题目必须安装在当前题库。作答和学习包映射分别按 `questionId + questionContentVersion` 与当前题面做精确匹配；仅更新概念映射，不会使同题面作答失效。旧版、未标版本及未知题目不补配到新版本。只收有合法提交日期、与题型一致且 `attemptQuality` 有值的已提交作答：选择题有布尔判分；综合题有可计入现有调度的自评分（0 分也算，无分不算）。
2. 客观表现只用选择题。沿用 `isUnassistedFirstAnswer`（与 `summarizePracticeEvidence` 共用）：必须能从会话开始追踪、首答是选项、零提示、没有提前揭示答案。证明必须通过 `attemptId` 匹配，且会话、题目、题面版本、首选项与提交选项一致。未知过程、提示后答对、看答案后答对，只算活动与实际调度，不补成无提示首答。综合题自评分、卡片评级都不是客观首答。手工掌握度、笔记、收藏、浏览/登录、练习草稿、计划存在和卡片暂停操作，均不算作答或学习日。
3. 当前卡片沿用 `effectiveCards` 的个人覆盖规则，所有来源题面版本必须仍匹配；事件还需同 `cardId + cardVersion`。暂停覆盖卡不恢复它遮住的基础卡。若仅暂停而未改版，同版本历史评分仍是过去真实活动（影响最近时间与学习日），但不进入当前卡数、到期数、稳定条件或今日映射。卡片/来源换版后旧分不顺延。没有关联叶概念的有效活动仍可计入本周学习日。
4. 当天截止为次日北京零时（不含）。作答及卡片事件分别按 ID 去重。复用 `replayReviewSchedule`、`replayCardSchedule`：同一对象、同版本、同北京日只推进一次，取最低有效质量；同日先错后对或卡片自评 `0.5 → 1` 不会抹去低分。独立重放合格首答与所有有效选择题作答两条日程：后者保留既有的提示/揭示质量上限，只能限制稳定、不能代替前者证明表现。不修改既有每日计划。

## 四态判定

按下表从上到下匹配。概念状态表示当前复习证据和节奏，不是掌握度预测或百分比。

| 状态 | 精确条件 |
| --- | --- |
| `unstarted` 未开始 | 当前映射和版本范围内，没有任何有效作答或卡片事件，此时 `lastActivityAt === null`。 |
| `practicing` 练习中 | 有活动，但 `objectiveByConcept` 是 `untested` 或 `needs-review`。前者可能只有自评、辅助作答或缺少记录过程；后者有真实的客观错答证据。详情文案用伴随字段区分。 |
| `stable` 稳定 | 客观表现为 `positive`，且下述题目与卡片条件**全部**满足。 |
| `consolidating` 待巩固 | 客观表现为 `positive`，但任一稳定条件尚未满足，例如验证题目太少、复习间隔短、卡片未学、到期或缺少卡片。 |

- **题目条件**：本概念当前映射的选择题中，至少两道有合格首答；总共只有一道时需这道本身有证据。每道有合格首答的题，其无辅助首答日程均须 `intervalDays >= 3 && dueOn > 今天`；本概念每道已有有效选择题作答的题，其实际复习日程也须满足相同条件。尚未测过所有映射题并不等于这些题都已掌握。“近期”指每题最近有证据的北京日和该日程是否仍未到期，没有任意滑窗。
- **卡片条件**：至少一张当前启用卡；每张都有当前版本评分日程，且 `intervalDays >= 3 && dueOn > 今天`。现有调度首次良好评分后安排 1 天，再跨日良好评分后安排 3 天；这是**调度给出的下一次间隔**，不是声称已隔了 3 天。多次同日重答不会获得该间隔。低分将相应日程重置到 1 天；卡片条件不贡献客观正确次数。
- **边界**：只有卡片、没有客观题证据时，有评分是 `practicing/untested`，没有评分是 `unstarted/untested`。只有综合题自评也是 `practicing/untested`。只有题目没有卡片时，有良好首答最多是 `consolidating`。换版后若两个渠道都没有新证据则回到 `unstarted`；只换一方不清空另一方的独立证据。到期当天即不能为 `stable`。

本周按北京日历计算，例：`2026-11-22T15:59:59Z` 属周日，`2026-11-22T16:00:00Z` 已是北京周一。筛选当前有效题卡版本，与概念记录用同样的有效性规则；同日跨科、题卡混做均只算 1 天。不依赖某项是否列在今日计划，不计算连续天数。

## 会话与同步

| 模式 | `loggedIn` | `pendingCount` | `offlineUntil` | `lastSuccessfulSyncAt` |
| --- | --- | --- | --- | --- |
| `local` | `null`（不适用） | `null` | `null` | `null` |
| `server` 未解锁或资格已到期 | `false` | `null` | `null` | `null` |
| `server` 当前会话已解锁 | `true`（可包括合法离线恢复） | 当前账号 outbox 中 `state === 'pending'` 的操作数；等待读取/读取失败为 `null`，实读为空才是 `0` | 已有 `AccountSession.offlineUntil`，转为 UTC ISO；与是否下载全部资料无关 | 本页生命周期、**本次登录**最近真实同步循环完成的 UTC ISO；无观测为 `null` |

只观察既有账号状态和 outbox 的计数索引，不读待上传正文，不触发同步。发生待解决冲突的操作不在 `pending` 计数，0 不能表述为“没有冲突”。成功时间在既有 `bitatlas-synced` 成功分支产生；它表示此次拉取与处理流程完成，不保证无冲突。失败不制造新时间，已有成功时间不回退。刷新、退出、切换账号、同账号重新登录后均不继承；过期立即遮蔽。没有新增持久化字段、schema 或网络接口。

## 调用与复验

纯函数在 `apps/web/src/app/concept-register.ts`：`buildConceptCatalog(pack, questions, personal)` 建关联索引；`selectConceptActivity(catalog, attempts, events, evidence, 北京日期)` 返回概念行、客观表现和学习天数；`selectPlanConcepts(catalog, plan, 北京日期)` 读固定计划；`selectSubjectConceptCounts(rows)` 汇总。Hook 按数据引用分别记忆化：单纯重渲染不重放；只换计划不再扫描题卡历史。`useBeijingDate` 驱动跨日更新。

2026-11-24 对本地实包只读核对：799 题、80 卡、102 叶；四科分别 28、22、22、30。空学习历史的 102 行都是 `unstarted`。35 个叶概念有上述题目实验直达链接，35 个叶概念没有初始可用卡。原始核对结果在 `output/verification/stage-4-data-2026-11-24/actual-catalog.json`。单测覆盖缺证、换版、个人覆盖、跨日、同日重答、两类到期、账号锁定、空 outbox 与真实同步成功；详见同目录 Vitest 回执。
