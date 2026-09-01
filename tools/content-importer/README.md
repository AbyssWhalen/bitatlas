# Content importer

本地内容工具不会向云 OCR 上传 PDF。公开仓库不提供输入资料；原始资料、中间 OCR 和生成题包均保存在被忽略的目录。只有在拥有合法使用权时才应运行该工作流，完整版权与提交边界见 [`docs/LOCAL_CONTENT.md`](../../docs/LOCAL_CONTENT.md)。

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

`2009-overrides.json` 是人工复核后的显式差异输入，只维护无法可靠自动结构化或已确认转录错误的题目。目前覆盖 Q4、Q41-Q47，并负责内容版本号；生成器会拒绝未知字段和任何不是 `needs-review` 的 override 状态。修改生成产物而不修改 override 会在下一次构建时被覆盖。

生成器使用 canonical content-pack hash，资产 id/path 绑定题包命名空间，并从 PNG 头读取宽高。所有题干、选项、参考答案和解析中的图片引用会自动列入题目的 `assetIds`。生成器不会自动把题目标成 `verified`；正式状态提升仍需要逐题对照扫描页并通过独立发布流程完成。

## 校验与正式发布

`npm run content:validate` 除 schema、题数和来源摘要外，还会逐一读取题包中的 `AssetRef.path`，要求路径严格位于 `/content/<pack-id>/` 命名空间内，并验证文件存在且 SHA-256 与题包元数据一致。路径穿越、缺失文件和摘要不一致都会使校验失败。

完成 47/47 人工审核并从 `/review/2009` 导出 ledger 后，才能执行：

```powershell
npm run release:2009 -- --ledger <path-to-ledger.json>
```

发布命令会先重复校验全部资产，再把 pack 与 release report 写入 `local-data/released/`。两个产物先写入目标目录内的独立临时文件，再通过原子 rename 成组安装；暂存或安装中途失败时会回滚到原有的两份正式产物，并尽力清理本次事务创建的临时文件。发布工具不会绕过 47/47 门禁，也不会修改草稿题包的审核状态。
