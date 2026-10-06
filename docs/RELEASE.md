# 公开发布检查

本文定义 BitAtlas 代码仓库封板与公开托管条件，不代表 2009 题包已经通过人工审核。

## 已完成决策与剩余许可边界

- 原公开仓库已由 `AbyssWhalen/cpu-explorer` 改名为 `AbyssWhalen/bitatlas`，保持 PUBLIC，默认分支为 `main`。
- BitAtlas 代码通过 merge 接入并保留旧 `cpu-explorer` Git 历史；不得删除这些历史提交或恢复旧站点覆盖当前 Pages。
- Pages 使用 `.github/workflows/deploy.yml` 构建并上传 `apps/web/dist`，正式地址为 `https://408.fytjut.com/`。应用使用无 `basename` 的 `createBrowserRouter`，PWA `id/scope/start_url` 均为 `/`，与自定义域名根路径一致。
- 仓库仍没有 `LICENSE`。公开可访问不等于授予源码复制、修改或再分发许可；许可证必须由维护者另行选择，不能擅自假定 MIT 或其他授权。

2026-09-02 的仓库替换、CI、推送和公开部署已获用户授权并完成。后续新的仓库破坏性操作、权限调整或部署目标变更仍需单独授权。

## 2026-10-05/06 发布与验证结果

最终首页行为（2026-10-06 记录）：提交 `55295a8` 已移除有题包时的整条首页核对栏，来源核对和人工审核进度留在数据管理页；缺包时仍显示进入实验的引导。[Pages run 37299799639](https://github.com/AbyssWhalen/bitatlas/actions/runs/37299799639) 成功。27 项相关回归、lint、全 workspace typecheck 和生产构建通过；线上 1440×900、390×844 均无状态栏、无横向溢出或控制台错误，入口 `index-yi8k89J3.js` 与本地一致，两张截图已目检。[本轮验收](../output/playwright/dashboard-cleanup-2026-10-05/production-verification.json) 不替代下表的历史完整 E2E 与固定 8 workers 压力检查。

本轮清理完成：`apps/web/dist`、根及 Web 的 `node_modules/.vite-temp`、根 `node_modules/.vite` 已从项目移入 Windows 回收站，最终一轮共 730 文件 / 85.61 MiB，移入时确认 4/4 记录可恢复、原路径均不存在；[清理回执](../output/playwright/dashboard-cleanup-2026-10-05/cleanup-final-receipt.json)。2026-10-06 后续复查时，原路径仍不存在，但回收站中的对应元数据、实体及相同原路径记录已不存在，当前恢复能力无法确认，原因未知；[复查记录](../output/playwright/dashboard-cleanup-2026-10-05/cleanup-recheck-2026-10-06.json)。14 份保护文件哈希不变，浏览器与预览已关闭。本轮重试的永久删除命令被自动审批拒绝，实际使用回收站操作；本任务未清空回收站，也未测量磁盘空闲增量。2026-10-06 收尾文档的最终同步记录见 [finalization.json](../output/playwright/dashboard-cleanup-2026-10-05/finalization.json)。

前一轮首页提示（已被上述改动替代）：提交 `868f8da` 已部署，[Pages run 37297384316](https://github.com/AbyssWhalen/bitatlas/actions/runs/37297384316) 成功。当时与 2009 draft.3 核对版本及 hash 匹配时显示“AI 核对 47/47，可开始练习”，数据管理分别呈现 AI 核对和人工批准；正式审核状态及模考门禁不变。相关回归 28/28、lint、全 workspace typecheck、构建通过，线上 1440/390、新提示、详情跳转及模考门禁检查通过；[验收记录](../output/playwright/source-audit-banner-2026-10-05/verification.json)。该轮未重复下表的完整 E2E 或固定 8 workers 压力检查，当时新的 85.61 MiB 构建/缓存清理被自动审批阻止；后续处理见上方回收站清理记录。

R1–R5、扩展题包下载修复及 2009 draft.3 校订已按用户授权提交并推送至 origin/main，代码提交为 `0c5a03c831cd7efeb9dc76c16397166ac5406367`。[Pages 构建与部署](https://github.com/AbyssWhalen/bitatlas/actions/runs/37261850931) 成功，随后线上桌面、手机和离线功能复验通过。固定 8 并发仍未验证为通过，详见下表；默认验收不是已解决压力问题的性能结论。

| 检查 | 结果 |
| --- | --- |
| lint、全 workspace typecheck | 通过 |
| Vitest | 101 files / 1120 tests 通过 |
| release / importer | 10/10、35/35 通过 |
| content:validate | 17/17 年份，799 题通过 |
| production build | 通过；87 PWA entries / 2804.50 KiB |
| 默认完整 E2E，本次 2 workers / 三视口 | **204/204**，0 skipped / 0 flaky，400.93s |
| 最近一次固定 8 workers 完整压力检查 / 三视口 | **195/204**，9 项失败；未再次运行该压力配置 |

新增修复及时读取扩展题包响应体，并将后台下载限制为 2 路，为路由模块保留同源连接；两个回归均先失败后通过。复核双页用例改为等待第一次编辑触发的自动保存冲突，避免后续操作与 650ms 自动保存竞态；防覆盖、输入保留、禁用状态、重新读取和数据库日志断言仍保留。

完整功能验收仍是 204 项、三视口、独立 Chrome，超时和 trace 未放宽。启动流程改为先构建、后启动 Playwright，webServer 只负责 preview。默认并发依据启动时可用内存计算（预留 1 GiB、每 worker 2 GiB、上限 4）；本次实际 2 workers。固定 `--workers=8` 可以复现压力场景，但与默认通过结果分开记录。共享 Chrome 和禁用 GPU 对照均未解决问题，没有采用这些启动方式。最新 [默认完整报告](../output/pre-push-2026-10-05/release-acceptance/e2e-report/index.html)、[8 并发报告](../output/pre-push-2026-10-05/download-limit-acceptance/e2e-report/index.html) 与 [早期五轮记录](../output/pre-push-2026-10-05/e2e-comparison.json) 均保留在本机忽略目录。

线上入口 `index-COz9kYZm.js` 与 2009 JSON 字节和本地构建一致。1440×900、390×844 均展示 47 题并安装 `2009.0-draft.3`；离线刷新后 Q12 的 6 个公式完整渲染，无 KaTeX 错误、横向溢出或运行时异常，正常站内导航无控制台错误。[最终浏览器记录](../output/pre-push-2026-10-05/production-ready/verification.json) 和三张截图保留。静态 Pages 的初访深链接仍通过现有 404 跳转页恢复，这是首轮烟测出现控制台 404 的已核实原因；随后按站内导航复验，并等待懒加载公式组件完成后目检截图。

清理完成：[新回执](../output/pre-push-2026-10-05/final-cleanup/cleanup-receipt.json) 删除当前构建、Vite 缓存和已归档的原生时间线，共 5 目标 / 754 文件 / 1010.87 MiB。时间线保留为 82.22 MiB ZIP，解压往返 SHA-256 相等，本次净减少 928.66 MiB；此前 616.17 MiB 的[原回执](../output/pre-push-2026-10-05/cleanup-receipt.json) 未覆盖。两次按逻辑文件长度累计净减少约 1.51 GiB，不是整盘空闲空间测量。14 份保护文件哈希不变，原始来源、校订、学习数据、Q42 源码、`.workbuddy/` 和审查证据继续保留。

## 可提交内容

- `apps/`、`packages/`、`tools/` 中的源码、测试和配置
- `content/` 中明确允许追踪的元数据与说明
- `docs/`、`README.md`、`AGENTS.md`、`HANDOFF.md`、`notes.md`
- 根目录 package、TypeScript、ESLint、Vitest 与 Playwright 配置

## 必须排除

- `local-data/`、`output/`、`tmp/` 与 legacy 命名空间 `apps/web/public/content/2009/`
- `.env*`（仅 `.env.example` 可追踪）和任何密钥
- `node_modules/`、`.venv/`、`dist/`
- `.playwright-cli/`、`graphify-out/` 和其他生成缓存

`apps/web/public/content/` 中的 2009 题包（`2009.json` 与 `cn408-2009/`）经维护者 2026-09-02 明确授权随仓库公开发布。之后的历史提交已纳入 2010–2025；2026-10-05 核对现有范围为 17 年、799 题。新年份首次公开仍须逐次授权，现有分发不等于内容已完成人工审核。

## 封板门禁

使用 Node.js `^22.20.0 || >=24.12.0`。该范围覆盖当前锁定依赖的最高 Node 引擎要求，Pages workflow 使用 Node 22；GitHub 官方 action 使用当前 Node 24 运行时主版本。`.gitattributes` 将源码和文档统一为 LF，并保留 Windows shell 脚本的 CRLF；图片、字体、PDF 和压缩包按二进制处理。

窄改动先运行相关测试。准备提交时至少运行一次：

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

若本机装有私有题包，再运行：

```powershell
npm run test:release
npm run content:validate
```

2009 题包已随仓库发布（2026-09-02），上述内容门禁在干净克隆上同样可运行。

用户流程变更必须有桌面和移动端真实浏览器证据。默认全量 E2E 若运行，应记录准确通过数和失败 ID；不得把定向 `.last-run.json` 写成全量通过，也不得无界重跑。

完整浏览器命令为 `npm run test:e2e`，它会先构建。直接使用 `npx playwright test` 运行定向用例前须手动构建；固定 8 并发压力命令为 `npm run test:e2e -- --workers=8`，应独立保存并报告结果。

## 推送前核对

```powershell
git status --short
git status --ignored --short
git ls-files local-data apps/web/public/content output tmp
git grep -n -I -E "(api[_-]?key|secret|token|password)"
```

最后一条只能作为辅助检查，不能替代对 staged diff 的人工复核。推送前确认远端 URL、目标分支、可见性、许可证和 staged 文件；用户已经明确授权当前推送时，完成核对后直接执行，无需重复请求。

## 历史公开托管记录（2026-09-02）

以下保留早期迁移与部署时的验证结果，不代表当前线上构建或最新完整测试结果。

- 目标仓库：`https://github.com/AbyssWhalen/bitatlas`
- Pages 自定义域名：`https://408.fytjut.com/`
- Cloudflare DNS：`408.fytjut.com CNAME abysswhalen.github.io`，仅 DNS，TTL 自动
- Pages 状态：证书 `approved`，`https_enforced: true`
- 构建目录：`apps/web/dist`
- 深链接回退：`apps/web/public/404.html` 将未知 Pages 路径交回应用路由
- 域名声明：`apps/web/public/CNAME`，内容为 `408.fytjut.com`
- 首次代码迁移不含题包；同日后续题包分发见下节。`local-data/`、`output/`、`tmp/`、依赖目录及密钥始终不上传。
- 最终部署：Actions run `33574067291`（提交 `f15eea0`）成功，Node `22.23.2`，`1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`；workflow 使用 `checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`。
- 线上验收：根路径、`/lab`、`/knowledge`、Q34 网络深链接、Q24 操作系统深链接与 390px 移动端通过；manifest、favicon、`registerSW.js`、`sw.js`、192/512 图标均返回 HTTP 200
- 浏览器日志：上述页面无 console error；`/knowledge` 仍有一条既有 Cytoscape 自定义滚轮敏感度 warning。Pages deploy action 日志另有其依赖触发的 `punycode` 弃用提示，不影响 run 成功。
- 该次未重跑默认 189 项全量 E2E；当时完整事实保持 `187/189 passed`

## 2026-09-02 题包随仓库发布

- 维护者在知晓“题库与来源页图将永久公开、任何人可下载”的前提下，明确选择把 2009 题包提交进公开仓库，替代此前准备的 Cloudflare 私有分发方案（相关工具保留在被忽略的 `local-data/deploy/`，未提交）。
- 追踪范围仅限当前题包引用的 `apps/web/public/content/2009.json` 与 `apps/web/public/content/cn408-2009/source/`（19 张 PNG）；legacy `content/2009/` 命名空间继续被忽略。原始 PDF、OCR 中间产物与 `local-data/` 仍不公开。
- 题包审核状态保持 `needs-review; verified 0/47`；`/mock` 的 verified 门禁不变。
