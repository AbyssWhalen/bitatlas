# 2026-10-04 复审问题修复

用户已授权按 [复审报告](code-review-2026-10-04.md) 的计划修改。基线为 `main` / `564d046`。**R1–R5 已修复，相关回归和真实浏览器验收通过，信心：高。** 默认完整 E2E 仍有两项超时，不能将本轮描述为所有发布门禁全绿。

后续状态（2026-10-05）：本报告保留修复当日的测试事实；最新完整 E2E 为 193/204，推送暂缓，见 [发布检查](RELEASE.md)。本次旧 `dist` / `dist-next` / `dist-final` 已按授权清理，复现脚本、日志、trace、报告和截图保留；当前复现构建位于 `apps/web/dist`。

| 问题 | 修复行为 |
| --- | --- |
| R1 · PWA 更新导致旧页面模块缺失 | 新 worker 等待所有旧页面退出再激活；提供新版就绪提示和路由载入失败后的恢复按钮。首次安装仍可接管页面用于离线刷新。 |
| R2 · 题面版本回退 | 默认沿用已发布版本；按数值单调递增，拒绝低版本和前导零别名；已有题包读取/解析/校验失败时阻止构建；题面变化仍须显式升级。 |
| R3 · verified 并发覆盖 | 防降级与替换位于同一 IndexedDB 内容事务；后台安装识别被保护的题包并跳过缓存写入和预热。 |
| R4 · 今日计划跨日不刷新 | 以北京时间日期键驱动计划，午夜、恢复可见、pageshow 和 focus 时校正；同一天队列保持稳定。 |
| R5 · 年度掌握数混入其他年份 | 2009 卡片只统计该年题目，保留手动掌握度与真实作答数量的语义区分。 |

已同步 README 的多年份范围、架构中的题包模式和导入器版本工作流。PWA 的取舍是需要保存后关闭所有页面再重新打开，避免一个标签页的更新操作丢失其他页面的未保存输入。

## 验证

- PWA 生命周期与错误恢复：2 files / 6 tests 通过。
- 导入器：35/35 通过。
- 内容存储及跨连接并发：3 files / 112 tests 通过。
- 总览与每日计划：2 files / 12 tests 通过。
- lint 与全部 workspace typecheck 通过。
- 全仓 Vitest：101 files / 1118 tests passed，4 workers，35.53 秒。
- release：10/10；content：17/17 年份、799 题，全部仍为 needs-review。
- 实际版本 production build 通过：198 static-copy，87 PWA entries / 2804.17 KiB。最后只调整错误页手机边距，另建 `dist-final` 验证：87 PWA entries / 2804.27 KiB，Web typecheck 与相关 6 tests 再次通过。
- **完整 E2E：默认 8 workers、1440/1366/390 三视口，202 passed / 2 failed / 0 skipped，224.46 秒。** 仅失败集合按 1 worker 复查一次：2/2 passed，22.4 秒；未重跑完整集合、未改变默认并发或超时。完整集合在最后的错误页边距调整之前执行；该小调整单独完成构建、回归和手机浏览器验收。

原始日志、构建和脚本均在 `output/review-fixes-2026-10-04/`：

- [单元测试](../output/review-fixes-2026-10-04/unit.log)、[最终构建](../output/review-fixes-2026-10-04/build-final.log)、[完整 E2E](../output/review-fixes-2026-10-04/e2e-results.json)、[定向复查](../output/review-fixes-2026-10-04/e2e-recheck.log)、[trace 耗时](../output/review-fixes-2026-10-04/trace-timings.json)。
- 失败分别是 Q5 实验 chromium-1440 和内容复核双标签页 chromium-390。复核 trace 中一次勾选耗时 9.4 秒、通过按钮耗时 6.5 秒；Q5 多次导航和交互累计触及 30 秒。已有操作到超时前均成功，没有据此确定单一根因。
- 运行中记录过 CPU 96%、PagesInputPersec 2516 的 [资源采样](../output/review-fixes-2026-10-04/e2e-resource-samples.jsonl)，说明当时存在资源压力；单点采样及定向复查不构成根因证明，也不将通过率变化直接归因于本轮修复。

## 真实 Chrome 验收

1. **PWA 跨构建更新**：本地服务器在两份真实生产构建间切换，使用 no-store 模拟旧文件已经撤下。新 worker 保持 waiting，旧入口及页面标记不变；同一旧模块在服务端返回 404，在受旧 worker 控制的页面返回 200，继续点击“真题”成功。1440 与 390 视口无横向溢出。[等待态与缓存证据](../output/review-fixes-2026-10-04/ui-pwa-waiting-diagnostic.log)、[旧页面导航](../output/review-fixes-2026-10-04/ui-pwa-old-page.log)。
2. **多标签页与草稿**：另一页 Q41 已保存草稿保持不变且页面没有自动刷新。关闭两个旧页面后，新 worker 激活；重新打开练习恢复同一文本，390px 断网 reload 仍可恢复。[新版激活与离线草稿](../output/review-fixes-2026-10-04/ui-pwa-activate.log)。
3. **首次升级过渡**：沿用审查时的旧 autoUpdate 构建，直接切换到本轮修复版。旧页面保持旧入口，新 worker 等待，旧页面仍能导航真题。[状态](../output/review-fixes-2026-10-04/ui-legacy-confirmed.log)、[导航](../output/review-fixes-2026-10-04/ui-legacy-navigation.log)。
4. **跨日和年度统计**：桌面与手机均从北京时间 10-04 23:59:40 快进到 10-05 00:01:10，未刷新即显示新日期；同日队列稳定。仅手动掌握 2025 Q1 后，2009 显示 0 已掌握、全局已练仍为 0/799。[桌面跨日](../output/review-fixes-2026-10-04/ui-calendar.log)、[手机跨日](../output/review-fixes-2026-10-04/ui-calendar-mobile.log)、[年度统计](../output/review-fixes-2026-10-04/ui-year-count.log)。
5. **动态模块错误恢复**：在隔离的无 SW 浏览器中模拟 QuestionsPage 模块 404，显示中文恢复页。移除拦截并点击“重新载入页面”后恢复真题页。[错误态](../output/review-fixes-2026-10-04/ui-route-error.log)、[恢复](../output/review-fixes-2026-10-04/ui-route-recovered.log)。

截图位于 `output/playwright/fixes-2026-10-04-*`，已目检更新提示、真题页、跨日总览、年度统计、离线草稿和错误恢复页面。独立 next 构建只通过验收用 Vite transform 修改标题，没有修改真实题包或将验收标题写入产品源码。

## 保留边界

测试的 verified 状态仅存在于隔离 fixture 中，真实题包仍待人工审核。用户库 schema、备份兼容、CI 和 Q44 范围保持既定合同；未提交、推送或部署。

本轮没有迁移历史作答、生成正式审核成果或补写无来源的解析。后续仍需处理默认并发 E2E 的性能稳定性，并逐题推进人工内容审核。
