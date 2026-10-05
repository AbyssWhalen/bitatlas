# 本地内容工作流

2009 题包经维护者 2026-09-02 决定随公开仓库发布（仅 `2009.json` 与 `cn408-2009/source/`）；重建题包仍在本机完成，只有确认要发布的新版本才应提交。后续年份的材料只有在你拥有合法使用权时，才应在本机生成并使用。

仓库随后已接入并追踪 2010–2025 题包；2026-10-05 核对现有分发范围为 17 年、799 题。所有年份仍为 `needs-review`，公开可访问与正式审核是不同状态。新增年份首次公开继续遵守维护者授权规则。

## 本地输入

以下路径均在 `.gitignore` 内：

- `local-data/sources/2009-questions.pdf`
- `local-data/sources/2009-answers.pdf`
- `local-data/sources/2009-crosscheck.md`
- `local-data/sources/2009-overrides.json`
- `local-data/work/render/*.png`

Python 工具只使用项目本地 `.venv` 或 Codex bundled runtime，不安装全局依赖。

## 生成草稿题包

```powershell
.\.venv\Scripts\python.exe tools\content-importer\src\ocr_scan.py questions
.\.venv\Scripts\python.exe tools\content-importer\src\ocr_scan.py answers
npm run build:2009 -w @408os/content-importer
npm run content:validate
```

主要输出：

- `local-data/generated/2009.pack.json`
- `local-data/generated/2009.quality.json`
- `apps/web/public/content/2009.json`
- `apps/web/public/content/cn408-2009/source/*.png`

生成器会验证 schema、canonical hash、题号、答案、资产命名空间、PNG 尺寸和文件摘要。它不会把题目自动标为 `verified`。

2009 当前为 `2009.0-draft.3`，已完成 47 题 AI 来源核对；[逐题报告](2009-source-audit-2026-10-04.md) 记录修订、来源证据及版本隔离影响。旧版本作答保留为历史记录，不计入新版统计。

## 人工复核与发布

1. 启动应用并打开 `/review/2009`。
2. 逐题对照来源页，完成 47/47 检查并导出 ledger。
3. 运行：

```powershell
npm run release:2009 -- --ledger <path-to-ledger.json>
```

发布工具会再次验证整包与全部资产，并把正式 pack 和报告原子写入 `local-data/released/`。校验失败不会替换现有正式产物。

现有规范要求 Q44 保持 `needs-review`，因此当前不能完成整包 verified。正式放行前须由维护者决定该约束并完成真实人工审核；AI 来源核对记录不能冒充 ledger。

## 公开提交边界

不得提交以下内容：

- `local-data/`
- legacy 命名空间 `apps/web/public/content/2009/`
- 原始 PDF、OCR 中间结果及未获公开授权的图片
- `output/`、`tmp/`、构建目录和浏览器验收产物

`apps/web/public/content/` 中已经纳入分发的题包 JSON 与对应来源页图可随仓库维护；原始输入仍只保存在本地。再次提交已授权题包的更新前无需重复授权，但首次新增年份题包须逐次授权。

提交前应使用 `git status --ignored`、`git ls-files` 和 `git check-ignore -v <path>` 复核实际追踪范围及忽略规则，再检查暂存 diff；避免误提交原始材料或未经授权的新年份。
