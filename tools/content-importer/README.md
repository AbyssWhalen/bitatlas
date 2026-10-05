# Content importer

本地内容工具不会向云 OCR 上传 PDF。原始 PDF、OCR 中间产物和本地生成副本保存在被忽略的目录；构建器还会把应用所需的题包与来源图写入 `apps/web/public/content/`。生成产物不等于取得公开发布授权，各年份的发布边界见 [`AGENTS.md`](../../AGENTS.md) 与 [`docs/LOCAL_CONTENT.md`](../../docs/LOCAL_CONTENT.md)。

## 2009 工作流

```powershell
.\.venv\Scripts\python.exe tools\content-importer\src\ocr_scan.py questions
.\.venv\Scripts\python.exe tools\content-importer\src\ocr_scan.py answers
npm run build:2009 -w @408os/content-importer
npm run content:validate
```

输入：

- `local-data/sources/2009-questions.pdf`
- `local-data/sources/2009-answers.pdf`
- `local-data/sources/2009-crosscheck.md`
- `local-data/sources/2009-overrides.json`
- `local-data/work/render/*.png`

输出：

- `local-data/work/ocr/*.json`
- `local-data/generated/2009.pack.json`
- `local-data/generated/2009.quality.json`
- `apps/web/public/content/2009.json`
- `apps/web/public/content/cn408-2009/source/*.png`

`2009-overrides.json` 是经过来源核对的显式差异输入，只维护无法可靠自动结构化、已确认转录错误或需要说明来源差异的题目；输入来源核对也可以由 AI 辅助完成，但不自动取得人工审核状态。该输入负责内容版本号，生成器会拒绝未知字段和任何不是 `needs-review` 的 override 状态。修改生成产物而不修改 override 会在下一次构建时被覆盖。

2026-10-04/05 已完成 47 题 AI 来源核对并校订 17 题内容，另补 3 题跨页来源索引；具体差异和验证见 [逐题报告](../../docs/2009-source-audit-2026-10-04.md)。当前版本为 `2009.0-draft.3`，仍全部 needs-review。题包 schema 要求题目版本与 manifest 一致，升级会使旧版本作答继续作为历史证据保存，并从新版统计中隔离；不要为保留显示进度而复用旧题面版本。

生成器使用 canonical content-pack hash，资产 id/path 绑定题包命名空间，并从 PNG 头读取宽高。所有题干、选项、参考答案和解析中的图片引用会自动列入题目的 `assetIds`。生成器不会自动把题目标成 `verified`；正式状态提升仍需要逐题对照扫描页并通过独立发布流程完成。

## 2010–2025 草稿构建与版本

输入位于 `local-data/work/rebuild/<year>/`（页面文字、OCR、渲染图）和 `local-data/sources/`（来源 PDF 与答案快照）。本地准备好输入后运行：

```powershell
npm run build:year -w @408os/content-importer -- --year 2010
npm run build:year -w @408os/content-importer -- --year 2010 --content-version 2010.0-draft.3
npm run test:year -w @408os/content-importer
npm run content:validate
```

省略 `--content-version` 时沿用 `apps/web/public/content/<year>.json` 的当前版本；首次构建默认 `<year>.0-draft.2`。版本格式为 `<year>.<major>-draft.<revision>`，数字不带前导零，按 major、revision 的数值顺序比较，禁止回退或重新使用已发布的低版本。例：`draft.2 → draft.3` 后再省略参数，继续使用 `draft.3`。

题干、选项或答案发生变化时必须显式提升版本；相同版本的题面变化会在写文件前被拒绝，并给出下一版本示例。解析与提示更新不改变作答表面，可沿用版本；图片重渲染仍按既有 assetId 指纹规则处理。仅文件不存在视为首次构建，已有文件不可读、JSON 损坏或校验失败时停止构建。历史作答保持原有版本证据，不猜测迁移。

输出包括 `local-data/generated/<year>.pack.json`、`<year>.quality.json`、`apps/web/public/content/<year>.json` 和对应来源图。生成题包保持 `needs-review`，不会自动变为 verified。

## 校验与正式发布

`npm run content:validate` 除 schema、题数和来源摘要外，还会逐一读取题包中的 `AssetRef.path`，要求路径严格位于 `/content/<pack-id>/` 命名空间内，并验证文件存在且 SHA-256 与题包元数据一致。路径穿越、缺失文件和摘要不一致都会使校验失败。

完成 47/47 人工审核并从 `/review/2009` 导出 ledger 后，才能执行：

```powershell
npm run release:2009 -- --ledger <path-to-ledger.json>
```

发布命令会先重复校验全部资产，再把 pack 与 release report 写入 `local-data/released/`。两个产物先写入目标目录内的独立临时文件，再通过原子 rename 成组安装；暂存或安装中途失败时会回滚到原有的两份正式产物，并尽力清理本次事务创建的临时文件。发布工具不会绕过 47/47 门禁，也不会修改草稿题包的审核状态。
