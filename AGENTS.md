# BitAtlas 项目规范

## 定位

BitAtlas 是面向个人考研学习的 local-first 计算机科学学习与可视化实验平台。当前版本聚焦 408 四科，定位为 2009 工程 Beta，不是正式审核题库。

公开显示名为 `BitAtlas`。目录名、`@408os/*` workspace、`408-user`、`408-content` 和既有缓存键属于兼容标识，不随品牌改名；除非有独立迁移方案，不得重命名这些标识。

公开仓库默认不附带版权状态不明确的 2009 题包、来源页图或 PDF。无题包时应用必须保持可启动，实验室、本地 PDF、设置与备份入口可用；依赖题包的流程必须明确禁用或展示空状态。显式 HTTP 缺失可进入该模式，意外网络、解析或存储错误仍须 fail closed。

## 工程结构

```text
408OS/                       # 兼容目录名
├─ apps/web/                 # React Web/PWA
├─ packages/domain/          # 领域模型与纯业务逻辑
├─ packages/content-schema/  # 内容包 schema、校验与迁移
├─ packages/storage/         # IndexedDB、内存适配器与备份
├─ packages/cpu-core/        # CPU 实验纯逻辑
├─ packages/lab-core/        # 数据结构、OS、网络实验纯逻辑
├─ tools/content-importer/   # PDF 到草稿内容包的本地工具
├─ content/                  # 可追踪的示例、manifest 与获准内容
├─ docs/                     # 架构、本地内容和发布说明
├─ local-data/               # 私人 PDF、OCR 中间件和本地题包，禁止提交
├─ output/                   # 测试与浏览器验收产物，禁止提交
├─ HANDOFF.md                # 滚动检查点
└─ notes.md                  # 决策、验证结果和未解问题
```

## 开发命令

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:release
npm run test:e2e
npm run build
npm run content:validate
```

内容导入命令在 `tools/content-importer/README.md` 中维护。所有 Python 依赖必须使用项目本地虚拟环境或 Codex bundled runtime，不安装全局依赖。

## 验证与完成判定

- 窄改动先运行直接相关的红灯与回归；阶段封板再运行全仓 lint、typecheck、Vitest 和 production build，避免为每个薄切片重复全量门禁。
- 用户流程改动必须用真实浏览器验证桌面与手机视口。
- 内容包必须通过 schema、题数、题号、答案、来源、资产和审核状态校验。
- 默认全量 E2E 结果必须按实际通过数报告；定向 `.last-run.json` 不能覆盖完整运行事实，也不得用无界重跑掩盖并发冷启动失败。
- 每完成关键步骤立即更新 `HANDOFF.md`；每阶段在 `notes.md` 记录实际命令、结果、风险和未解问题。
- 未验证结果不得描述为已完成。

## 数据与存储约束

- `408-content` 与 `408-user` 必须使用独立 IndexedDB 数据库。
- 学习数据不能只存于 React 状态或 `localStorage`。
- 内容与用户数据通过 repository/service 接口访问，页面不能直接操作 IndexedDB 表。
- 备份格式必须带 schema version，导入前先校验，损坏备份不得覆盖现有数据。
- 原 PDF、OCR 裁图、版权状态不明的规范化题库、密钥、缓存、构建产物不得提交。
- `408-user` schema v1/v2/v3 与备份兼容路径属于稳定合同，未经明确授权不得修改。

## 不允许的做法

- 不抓取或绕过 408os.cn 的登录与接口限制。
- 不把 AI 生成答案直接标记为已审核。
- 不通过注释错误、降低校验门槛或删除失败测试来让构建通过。
- 不删除 Git 历史中保留的旧 `cpu-explorer` 提交，不恢复或 iframe 嵌入旧站点。
- 未经用户授权不得删除文件、修改密钥/CI、提交、推送或公开部署。
- Q44 只保留来源支持的 `parallel-5` 与 `split-6`，保持 `needs-review`；不宣称穷尽所有合法答案，也不实现任意微操作评分器。

## 构建产物与交接

- Web 构建产物：`apps/web/dist/`
- 浏览器产物：`output/playwright/`
- PDF/OCR 临时产物：`tmp/pdfs/`、`local-data/work/`
- 持续交接文件：`HANDOFF.md`
- 公开发布检查：`docs/RELEASE.md`
