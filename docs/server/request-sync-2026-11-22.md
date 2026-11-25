# 加载、请求与同步验收

2026-11-22，北京时间。本轮只完成本地产品修改和验收；Opus UI任务按[并行分工](parallel-ui-work-2026-11-22.md)进行衔接。没有提交、推送或重新部署正式站点。

## 结果

- 已安装内容的版本和摘要未变化时，刷新仅查询小型目录，复用校验后的学习包；桌面和手机实测题包及学习包正文请求均为 **0**。当前仍有两次目录查询，尚未合并。首装学习包源文件596,690 bytes，这个数字不是公网压缩传输节省量。
- 所有经`api()`发出的JSON请求有30秒截止时间，覆盖请求等待和响应体读取，始终释放计时器/监听器。HTML或空HTTP错误体显示明确状态码，不暴露代理诊断正文，不将HTTP失败当作离线登录资格。
- 同步绑定发起时的登录会话和仓储。退出、切换账号、同账号重新登录都会取消旧同步和排队的Web Lock；旧会话迟到的401不能锁住新登录，当前登录的401仍须锁定。
- 同步失败保留outbox和原operationId，重试不另造操作。真实浏览器故障注入中，服务器已接收但响应丢失的操作请求两次，服务端只保留一份操作；笔记原文保持，最终待同步数归零。
- 学习包下载、解析和安装检查发起会话及目录版本/摘要，旧会话返回的学习包不安装。个人记录、题包正文、审核状态、数据库schema与布局没有在本轮修改。

这些结果说明客户端处理已修复；不代表Cloudflare偶发故障已定位，也不代表线上已经应用本轮修改。未测量公网首屏提速秒数。

## 修改范围

产品文件：`apps/web/src/app/api.ts`、`account.ts`、`server-learning.ts`、`LearningProvider.tsx`。

测试文件：`apps/web/src/app/api.test.ts`、`account.test.ts`、`server-learning.test.ts`；新增可重放浏览器脚本`tools/verification/request-sync-browser.mjs`。现有页面、组件、CSS及服务器E2E断言没有为通过本轮测试而改动。

## 验证

| 门禁 | 实际结果 | 证据 |
| --- | --- | --- |
| 定向Vitest | 5文件42/42，maxWorkers=2 | `output/request-sync-2026-11-22/focused-green.log` |
| 完整Vitest | 117文件1333/1333，maxWorkers=2，70.49秒 | `vitest.log`、`vitest.json` |
| lint | 全仓通过；新增浏览器脚本和本轮源码另行定向通过 | `lint.log`、最终交付回执 |
| typecheck | 修正测试类型后全仓通过 | `typecheck-2.log`、`typecheck-2.json` |
| 服务器生产构建 | 通过，201静态复制项、87预缓存项 | `server-build-2.log`、`dist-server/` |
| 新浏览器故障流程 | 14/14，1440×900及390×844；1 worker顺序，25.277秒 | `output/playwright/request-sync-2026-11-22/attempt-2/receipt.json` |
| 现有完整服务器E2E | 14/14，2 workers，60.435秒，0 skipped/flaky | `server-e2e-result.json`、`server-e2e.log` |
| 文件差异 | `git diff --check`通过，仅既有CRLF提示 | 最终交付回执 |

表中未写完整目录的日志均位于`output/request-sync-2026-11-22/`。1333项全量单测之后的修改仅为测试类型声明和验收工具/文档；产品代码没有再变更。

新浏览器流程每个视口包含7组：冷登录及799题/80卡可用、目录未变时零正文请求及每日清单稳定、离线重开保留卡片评分、丢失确认后的超时与幂等重试、HTML502提示与恢复、不同账号切换、同账号重新登录。两种账号场景均覆盖取消旧同步、迟到401、旧学习包、当前401锁定。超时使用Playwright虚拟时间推进30秒，其余网络、Chrome、SQLite和IndexedDB均为真实本地实现。

现有服务器E2E覆盖邀请注册、知识讲解和学习闭环、v5备份导入导出、账号隔离、双设备冲突合并、匿名数据明确归属、离线来源图片、多标签切换及鉴权PDF/离线阅读。桌面首页与手机离线卡片截图已目检，手机无横向溢出。

本轮没有重跑原本地模式234场景、固定8 workers压力、release/importer/content validation或PWA双构建。此前证据保持历史时点；固定8 workers未全通过的事实没有被本轮结果替代。UI整合阶段需按届时实际差异执行统一验收。

## 失败及修正记录

1. API红灯7失败/3通过。账号同步红灯3失败/4通过，后两项受前一项未结束同步影响，不当作三个独立根因。原始`api-red.log`、`account-red.log`保留。
2. 首轮typecheck和build被新测试的`signal?: AbortSignal`与显式`undefined`不相容阻断。修成正确的`AbortSignal | undefined`记录类型后，两项通过，没有放宽编译设置。
3. 浏览器`attempt-1`完成桌面前三组后，题库跨年筛选包含多个“开始第1题”，测试定位歧义。验收脚本先选2009并核对47题，再定位第1题；`attempt-2`完整14组通过，没有修改产品、缩减断言或延长超时。
4. 初次空间盘点遇到3处Windows长路径读取错误，`size-interim.json`保留；终态使用扩展路径重新扫描，以`delivery-receipt.json`中的实际盘点为准。

## 复验方式与产物

```powershell
npm run test -- apps/web/src/app/api.test.ts apps/web/src/app/account.test.ts apps/web/src/app/server-content.test.ts apps/web/src/app/server-learning.test.ts packages/storage/src/account-sync.test.ts --maxWorkers=2
npm run build:server -- --outDir "../../output/request-sync-2026-11-22/dist-server"
node --import tsx tools/verification/request-sync-browser.mjs output/playwright/request-sync-2026-11-22/<new-run-name>
```

浏览器脚本仅监听回环4337，使用公开测试夹具密码。首次种入测试来源图片，之后复用独立基线和共享测试资产，每轮创建新SQLite并拒绝覆盖既有运行目录，避免重复复制约80MB图片。`--serve`仅供既有4323服务器E2E使用。一次验收成功后不反复重建或重跑；需要复验时选择新输出目录，保留旧失败证据。

本轮隔离构建、SQLite、截图和文字证据保留，未运行新清理。最终体积和源码/构建摘要见[交付回执](../../output/request-sync-2026-11-22/delivery-receipt.json)。测试服务及浏览器已退出。

下一步由Opus在约定的页面/组件/样式范围交付UI结果，并写`docs/ui/opus-handoff.md`；Codex没有启动或联系该模型。UI完成后再对同一工作目录做整合验收，另行确定上线时点。
