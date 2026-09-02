# 本地内容工作流

2009 题包经维护者 2026-09-02 决定随公开仓库发布（仅 `2009.json` 与 `cn408-2009/source/`）；重建题包仍在本机完成，只有确认要发布的新版本才应提交。后续年份的材料只有在你拥有合法使用权时，才应在本机生成并使用。

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

## 人工复核与发布

1. 启动应用并打开 `/review/2009`。
2. 逐题对照来源页，完成 47/47 检查并导出 ledger。
3. 运行：

```powershell
npm run release:2009 -- --ledger <path-to-ledger.json>
```

发布工具会再次验证整包与全部资产，并把正式 pack 和报告原子写入 `local-data/released/`。校验失败不会替换现有正式产物。

## 公开提交边界

不得提交以下内容：

- `local-data/`
- legacy 命名空间 `apps/web/public/content/2009/`
- 原始或裁切的真题图片、PDF、OCR 结果
- `output/`、`tmp/`、构建目录和浏览器验收产物

`apps/web/public/content/` 其余文件（当前题包 JSON 与 `cn408-2009/` 资产）经维护者授权随仓库发布；再次提交题包更新前无需重复授权，但首次新增年份题包须逐次授权。

提交前应使用 `git status --ignored` 和 `git check-ignore -v <path>` 复核；不要靠人工挑选文件来维持版权边界。
