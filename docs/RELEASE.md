# 公开发布检查

本文定义 BitAtlas 代码仓库封板与公开托管条件，不代表 2009 题包已经通过人工审核。

## 当前阻塞决策

公开前由维护者明确决定：

1. GitHub 目标仓库或需要替换的原仓库。
2. 仓库可见性与最终 slug。公开显示名与仓库名均为 `BitAtlas`；GitHub 上已有无关的 `bitatlas-group/bitatlas` 项目，但不影响 `AbyssWhalen/bitatlas` 的所有权和访问路径。
3. 代码许可证。当前仓库没有 `LICENSE`，不得擅自假定 MIT 或其他授权。
4. 是否保留原仓库历史，还是建立全新历史后替换远端默认分支。

创建远端、覆盖原项目、提交、推送和公开发布都属于外部写操作；本次用户已明确授权替换 `cpu-explorer`、公开仓库和配置 `408.fytjut.com`。

只读审计显示，账号下唯一功能上接近的旧仓库是公开的 `AbyssWhalen/cpu-explorer`。它没有许可证，默认分支为未保护的 `main`，并通过 `.github/workflows/deploy.yml` 发布到 `https://abysswhalen.github.io/cpu-explorer/`。项目既有约束要求保留旧 `cpu-explorer`；只有用户明确点名覆盖它并授权删除旧文件、修改 CI 和替换公开站点时，才能把它作为目标。

旧 Pages workflow 运行 `npm run build` 后上传根目录 `dist`，而 BitAtlas 的产物位于 `apps/web/dist`。本次部署使用自定义域名根路径 `408.fytjut.com`，因此不需要项目子路径适配；应用使用无 `basename` 的 `createBrowserRouter`，PWA `id/scope/start_url` 均为 `/`，与自定义域名根路径一致。

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

使用 Node.js `^20.19.0 || >=22.12.0`。`.gitattributes` 将源码和文档统一为 LF，并保留 Windows shell 脚本的 CRLF；图片、字体、PDF 和压缩包按二进制处理。

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
- 构建目录：`apps/web/dist`
- 深链接回退：`apps/web/public/404.html` 将未知 Pages 路径交回应用路由
- 域名声明：`apps/web/public/CNAME`，内容为 `408.fytjut.com`
- 公开边界：不上传 `local-data/`、`apps/web/public/content/`、`output/`、`tmp/`、依赖目录或密钥
