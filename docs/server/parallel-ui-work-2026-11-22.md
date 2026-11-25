# BitAtlas UI与可靠性并行分工

2026-11-22，维护者决定由Opus优化前端/UI，Codex继续首屏加载、请求可靠性与同步。两边可以同时工作，但不能同时编辑同一文件。

## 可直接发给Opus的任务

请优化`<workspace>`中的BitAtlas前端/UI。先读项目`AGENTS.md`、本约定和当前`HANDOFF.md`，以工作目录中的现有服务器版为基线。新版有大量未提交成果，不要从Git HEAD重建、reset、丢弃或覆盖现有修改。

你的主要范围是`apps/web/src/pages/`、`apps/web/src/components/`、`apps/web/src/styles.css`及你新增的纯展示组件/样式与对应测试。保留阅读优先、18px默认正文、字号调节、移动端“今日/题库/复习/知识/更多”、品牌配色和键盘可用性。可改善布局、层次、留白、响应式和交互反馈；首页不添加笼统“未审核”警示。

保持现有业务接口、账号隔离、离线资格、未同步数据保护、资料鉴权、首答证据与每日清单规则。`AccountGate`、`AccountTools`和`StorageUpgradeGate`可调整展示，但不要改认证、同步、迁移逻辑或props合同。不要顺便改数据库、题包/卡片正文、审核状态或依赖版本。

Codex负责`apps/web/src/app/`、`packages/storage/`、`apps/server/`以及加载/请求/同步相关测试与工具。`apps/web/src/main.tsx`、`apps/web/vite.config.ts`、所有`package.json`/lockfile、`AGENTS.md`、根`HANDOFF.md`/`notes.md`由Codex维护；确需改动时先在你的交接文档列出需求，不直接覆盖。

你的交接写到`docs/ui/opus-handoff.md`，列出改动文件、验证、截图路径和待合并事项。不要同时改根交接文件。测试截图放独立的`output/playwright/opus-ui-2026-11-22/`；构建使用独立输出路径，避免覆盖另一方正在验收的构建。若使用同一目录，不同时运行依赖安装、全量门禁或Git操作。保持本机约1GB目标，不复制资料全集、历史归档或依赖树。

改后验证UI相关测试、typecheck，以及桌面/手机、键盘、字号放大、公式和横向溢出。不要降低现有断言、删除失败测试或将AI内容标为已审核。提交、推送和线上部署不属于本次UI任务；先交付本地可审查结果，再统一集成验收。

## 当前协调方式

- 此文件是给另一位代理的约定；Codex尚未向外部模型发送消息、启动Opus或声称对方已接受。
- 同目录按文件划分；独立worktree也可用，但需要携带当前未提交的相关源码和非秘密新文件，不能只依赖HEAD。不要复制`local-data/`、`output/`或秘密。
- 页面调用的数据接口由Codex尽量保持兼容。需要共同修改某文件时先交接该文件，确认没有另一方在写再进行。
- Codex本轮先排查请求超时、网络错误处理、同步恢复和首屏内容加载；UI布局留给Opus。
- 集成时先看两边各自的文件差异，再运行统一门禁；分支隔离不等于无需集成测试。
