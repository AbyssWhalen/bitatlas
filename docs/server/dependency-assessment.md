# 服务器运行依赖核对

日期：2026-11-20。检查对象为本地未提交工作区，基线 `adceb7a42431999d6ba5312eefb171bea5b2abf8`；不是该提交或线上版本的安全结论。锁文件 `package-lock.json` 的 SHA256 为 `1aebfec40b22d0a40549a43212d90d4f8fd5c7f3fbe42c80b1803a0f61248e9e`，解析路径见 `output/server-implementation-2026-11-20/server-dependency-paths.json`。

## 当前告警与可达性

官方 registry 的 `npm audit --omit=dev --workspace @408os/server --include-workspace-root=false` 返回 1 个 high 依赖节点 `fast-uri`，包含 10 条公告；原始记录见 `server-runtime-audit-official.json`。第一次使用当前配置的 npmmirror registry 返回审计接口 404，已保留失败输出，没有把它解释为零告警，也没有修改 registry 配置。

| 实际副本 | 版本 | 引入路径与结论 |
| --- | --- | --- |
| 根 `node_modules/fast-uri` | 3.1.5 | `ajv-formats → ajv` 的 URI 解析器；在生产依赖树中，不能继续沿用旧报告“仅构建工具”的范围 |
| `@fastify/ajv-compiler/node_modules/fast-uri` | 4.2.3 | Fastify 默认 `uriResolver`，不落入本次报告的 3.x 受影响范围 |
| `@fastify/ajv-compiler/node_modules/ajv/node_modules/fast-uri` | 3.1.9 | 内层 Ajv，已越过本次报告受影响上限 |
| `fast-json-stringify/node_modules/fast-uri` | 4.2.3 | 序列化器依赖，不落入本次报告的 3.x 范围 |
| `fast-json-stringify/node_modules/ajv/node_modules/fast-uri` | 3.1.9 | 内层 Ajv，已越过本次报告受影响上限 |

公告涉及 scheme/host/port 规范化和路径等价性：`GHSA-5jgf-p345-68v8`、`GHSA-f65p-4m7j-42xc`、`GHSA-fph4-wmhf-6fwf`、`GHSA-jqff-g426-hqxp`、`GHSA-qw65-cvwx-89v3`、`GHSA-hrr3-gc8f-f4qj`、`GHSA-w74x-v6f9-j3xg`、`GHSA-xhq7-xmqj-769h`、`GHSA-wjr9-j795-jxcr`、`GHSA-333x-w4r6-6crp`。本次报告所列受影响区间最高为 `<3.1.9`，不能把早期 `<3.1.6` 当作全部修复要求。

源码检查：应用输入使用 Zod；没有把用户提供的 JSON Schema 注册到 Fastify，没有远程 `loadSchema`，没有将 `fast-uri` 结果用于下载目标、Origin 或账号鉴权。资料为上传字节，不是用户 URL 抓取。因此目前未确认用户输入通过该依赖形成 SSRF 或域名白名单绕过路径；这不是漏洞已消除的证明。告警保持开放，没有自动关闭或替维护者接受风险。

父依赖声明为 `^3.0.1`，理论上可通过精确刷新该传递依赖到 3.1.9 或后续兼容版本解决，不需要强制主版本升级。执行前需再次核验发布来源和完整性，比较锁文件受影响副本，再验证 Fastify/Ajv 初始化及现有 API；本轮按“其余告警记录影响”的范围保留原锁文件，没有批量升级。

开发工具的其余告警与指定 Zod/Vite/KaTeX 升级见上一阶段 `docs/learning/dependency-maintenance-2026-11-20.md`，其 18 节点计数是当时整仓审计结果，不能替代本次服务器筛选结果。

## 独立安装约束

`npm ci` 初次安装误调用 `better-sqlite3` 的 node-gyp 重编译；已核对 npm 11.9 本地 arborist 源码和该包的 `gypfile:false`。部署包安装器按锁文件禁用自动钩子，遍历并拒绝未审核钩子，单独执行 esbuild 自检，再实际加载 SQLite、读写严格表并验证 TypeScript 转换；不修改依赖源码、不修改全局缓存。独立安装与 HTTP 验收回执在发布目录中。它只证明当前 Windows 包运行；Linux 必须在目标环境另验。
