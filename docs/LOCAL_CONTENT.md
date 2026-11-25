# 本地内容工作流

2009 题包经维护者 2026-09-02 决定随公开仓库发布（仅 `2009.json` 与 `cn408-2009/source/`）；重建题包仍在本机完成，只有确认要发布的新版本才应提交。后续年份的材料只有在你拥有合法使用权时，才应在本机生成并使用。

仓库随后已接入并追踪 2010–2025 题包；2026-10-05 核对现有分发范围为 17 年、799 题。所有年份仍为 `needs-review`，公开可访问与正式审核是不同状态。新增年份首次公开继续遵守维护者授权规则。

2026-11-22已将34份原PDF、OCR中间文件和历史二进制证据完成双份加密归档，并按批准清单删除本机副本。正常开发使用保留的题包、来源图片和`local-data/generated/`，清理后内容校验仍通过；阅读PDF使用服务器资料页。下面的OCR重建命令需要先按[归档恢复说明](server/storage-archive-2026-11-22.md)恢复相应输入到新目录，核对后再准备重建工作目录，不默认恢复整个资料库。

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

2009 当前为 `2009.0-draft.3`，[逐题报告](2009-source-audit-2026-10-04.md) 记录当时 47 题 AI 来源核对。2026-11-20 提示清理保持题面版本但改变整包摘要，因此旧 hash 绑定的来源核对结果不会自动继承到新包；人工审核状态仍为 `needs-review`。

## 跨年学习包

`content/learning/catalog.mjs` 定义科目、章节与概念，`mappings.json` 为每个原题 ID 指定叶概念，`cards.tsv` 保存正反面正文。运行 `npm run learning:build` 后生成 `apps/web/public/content/learning.json` 和 `docs/learning/coverage.json`；`npm run learning:check` 检查结果逐字节确定性。

映射和公共卡片必须绑定有效原题版本、来源文档 SHA-256 与页码；不使用题号、学科根节点或解析首句作概念。修改学习内容须提升独立学习包版本，正文变化须提升卡片版本；不因此提升题面版本。保留所有新内容 `needs-review`。逐卡 AI 检查与覆盖清单见 [card-review-2026-11-20.md](learning/card-review-2026-11-20.md)。

生成器不再从解析截取提示，只保留明确撰写的启发提示。缺失解析继续标为缺失，不以占位正文伪装完成。DeepSeek 报告只用于交互参考，不作为题库或卡片正文来源。

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
