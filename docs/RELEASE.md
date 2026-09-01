# 公开发布检查

本文定义 BitAtlas 代码仓库封板与公开托管条件，不代表 2009 题包已经通过人工审核。

## 已完成决策与剩余许可边界

- 原公开仓库已由 `AbyssWhalen/cpu-explorer` 改名为 `AbyssWhalen/bitatlas`，保持 PUBLIC，默认分支为 `main`。
- BitAtlas 代码通过 merge 接入并保留旧 `cpu-explorer` Git 历史；不得删除这些历史提交或恢复旧站点覆盖当前 Pages。
- Pages 使用 `.github/workflows/deploy.yml` 构建并上传 `apps/web/dist`，正式地址为 `https://408.fytjut.com/`。应用使用无 `basename` 的 `createBrowserRouter`，PWA `id/scope/start_url` 均为 `/`，与自定义域名根路径一致。
- 仓库仍没有 `LICENSE`。公开可访问不等于授予源码复制、修改或再分发许可；许可证必须由维护者另行选择，不能擅自假定 MIT 或其他授权。

本次仓库替换、CI、推送和公开部署已经获得用户明确授权并完成。后续新的仓库破坏性操作、权限调整或部署目标变更仍需单独授权。

## 可提交内容

- `apps/`、`packages/`、`tools/` 中的源码、测试和配置
- `content/` 中明确允许追踪的元数据与说明
- `docs/`、`README.md`、`AGENTS.md`、`HANDOFF.md`、`notes.md`
- 根目录 package、TypeScript、ESLint、Vitest 与 Playwright 配置

## 必须排除

- `local-data/` 与 `apps/web/public/content/`
- `.env*`（仅 `.env.example` 可追踪）和任何密钥
- `node_modules/`、`.venv/`、`dist/`、`output/`、`tmp/`
- `.playwright-cli/`、`graphify-out/` 和其他生成缓存

## 封板门禁

使用 Node.js `^22.20.0 || >=24.12.0`。该范围覆盖当前锁定依赖的最高 Node 引擎要求，Pages workflow 使用 Node 22。`.gitattributes` 将源码和文档统一为 LF，并保留 Windows shell 脚本的 CRLF；图片、字体、PDF 和压缩包按二进制处理。

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

用户流程变更必须有桌面和移动端真实浏览器证据。默认全量 E2E 若运行，应记录准确通过数和失败 ID；不得把定向 `.last-run.json` 写成全量通过，也不得无界重跑。

## 推送前核对

```powershell
git status --short
git status --ignored --short
git ls-files local-data apps/web/public/content output tmp
git grep -n -I -E "(api[_-]?key|secret|token|password)"
```

最后一条只能作为辅助检查，不能替代对 staged diff 的人工复核。确认远端 URL、目标分支、可见性、许可证和 staged 文件后，才可请求最终推送授权。

## 本次公开托管记录

- 目标仓库：`https://github.com/AbyssWhalen/bitatlas`
- Pages 自定义域名：`https://408.fytjut.com/`
- Cloudflare DNS：`408.fytjut.com CNAME abysswhalen.github.io`，仅 DNS，TTL 自动
- Pages 状态：证书 `approved`，`https_enforced: true`
- 构建目录：`apps/web/dist`
- 深链接回退：`apps/web/public/404.html` 将未知 Pages 路径交回应用路由
- 域名声明：`apps/web/public/CNAME`，内容为 `408.fytjut.com`
- 公开边界：不上传 `local-data/`、`apps/web/public/content/`、`output/`、`tmp/`、依赖目录或密钥
- 首次部署：Actions run `33524976596` 成功，`1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`
- 线上验收：根路径、`/lab`、`/knowledge`、Q34 网络深链接、Q24 操作系统深链接与 390px 移动端通过；manifest、favicon、`registerSW.js`、`sw.js`、192/512 图标均返回 HTTP 200
- 浏览器日志：上述页面无 console error；`/knowledge` 仍有一条既有 Cytoscape 自定义滚轮敏感度 warning
- 未重跑默认 189 项全量 E2E；最近一次完整事实保持 `187/189 passed`
