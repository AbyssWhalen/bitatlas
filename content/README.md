# Content metadata

本目录保存来源元数据、schema 示例和内容说明。应用使用的题包位于 `apps/web/public/content/`；当前仓库已追踪 2009–2025 共 17 个年份、799 道题及其来源页图，干净克隆可以直接浏览与练习。原始 PDF、OCR 中间产物和本地生成副本保存在被忽略的 `local-data/`。

题包由 `tools/content-importer` 生成，全部仍为 `needs-review`。2009 当前题面版本为 `2009.0-draft.3`，正式人工审核仍为 0/47；此前 AI 来源核对见 [历史报告](../docs/2009-source-audit-2026-10-04.md)，本轮提示修改后的新摘要不继承旧核对标记。

`learning/` 保存跨年学习包编辑源：稳定概念树、799 条逐题映射和四科各 20 张卡。运行 `npm run learning:build` 生成独立学习包，`npm run learning:check` 检查确定性。结构覆盖和人工审核率分别记录在 `docs/learning/coverage.json`，当前人工审核率为 0。

缺少题包的部署仍可在无题包模式启动，实验室与本地工具继续可用。完整生成、人工复核和公开提交边界见 [本地内容工作流](../docs/LOCAL_CONTENT.md)；新增年份首次公开仍需维护者授权。
