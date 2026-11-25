# 依赖维护与剩余告警

本轮按指定版本逐项更新，未运行 `audit fix --force`，未改全局依赖、CI 或 npm 配置。核验使用官方 npm registry 元数据、GitHub 公告与实际锁文件；原始 JSON、安装日志和依赖路径保存在 `output/upgrade-2026-11-20/`。

| 依赖 | 原版 → 本地锁定版 | 实际范围与验证 |
| --- | --- | --- |
| Zod | 4.4.3 → **4.6.6** | 浏览器题包/备份校验；相关 144 测试、损坏包拒绝、v1–v4 备份往返及全量单测 |
| Vite | 7.3.6 → **7.3.7** | 开发/构建工具；内置 launch-editor 2.14.2；生产构建、真实双构建 PWA、Windows dev/TS 转换/源变更刷新及含空格路径参数 |
| KaTeX | 0.16.47 → **0.18.2** | 浏览器公式；保持 `trust:false`，正常公式/危险链接回归，6 公式离线重载与 WOFF2 字体缓存 |

对应公告保存为 `GHSA-mrhx-c7xc-m3w5.json`、`GHSA-587h-7wmj-h5pm.json`、`GHSA-238p-pmpm-9mq7.json`。修复版本核验与兼容性验证是不同证据；不能把安装成功等同于无告警。

## 剩余 18 个受影响节点

官方 registry `npm-audit-after.json` 为 **5 high / 12 moderate / 1 low**，较更新前 21 个节点减少 3 个。这是依赖树节点计数，不是 18 个已证实的产品漏洞。下表逐项列出实际依赖路径、触发条件与当前项目可达范围；未执行漏洞利用负载。

| 节点（风险） | 实际路径 / 使用 | 当前影响与处置 |
| --- | --- | --- |
| `@typescript-eslint/eslint-plugin`（中） | typescript-eslint → type-utils/utils | lint 开发链，继承 minimatch 告警；本轮不升级整个 lint 组合 |
| `@typescript-eslint/parser`（中） | typescript-eslint → typescript-estree | 解析本仓 TypeScript，继承通配模式告警 |
| `@typescript-eslint/type-utils`（中） | plugin → typescript-estree/utils | 同上，不是浏览器学习运行路径 |
| `@typescript-eslint/typescript-estree`（中） | → minimatch 10.2.6 | 特制通配模式可导致计算放大；当前配置是仓库固定路径 |
| `@typescript-eslint/utils`（中） | → typescript-estree | 继承开发链风险 |
| `typescript-eslint`（中） | 8.66.0，直接开发依赖 | 汇总以上风险；后续成组升级并重验 lint |
| `@vitest/mocker`（中） | vitest 4.1.10 → mocker 4.1.10 | 公告涉及模拟服务重定向读取与未认证手动模拟注册；当前自动门禁使用本地 `vitest run`，不把测试服务公开 |
| `vitest`（中） | 4.1.10，直接开发依赖 | 同上；后续升级到覆盖两个公告的版本并重跑测试 |
| `brace-expansion`（高） | minimatch/filelist/typescript-estree；1.1.18、2.1.4、5.0.9 | 特制嵌套或重写模式可使 CPU/栈耗尽；构建/lint 的文件模式为固定输入，不在题包正文执行 |
| `fast-uri`（高） | ajv 8.20.0 → fast-uri 3.1.5 | URI 规范化差异公告；用于工具 schema，当前不是服务器请求代理或 SSRF 安全判断入口，仍保留告警 |
| `glob`（中） | vite-plugin-pwa → workbox-build 7.4.1 → glob 11.1.0 | 构建扫描取消行为与 minimatch 计算放大；本仓使用固定资源 glob |
| `js-yaml`（高） | eslint → @eslint/eslintrc → 4.3.1 | YAML merge 键 CPU 限制旁路；当前 ESLint 为本地 JS 配置，不接受用户 YAML |
| `minimatch`（中） | glob/typescript-estree → 10.2.6 | 特制 globparts 计算放大；见上述固定模式边界 |
| `nanoid`（高） | Vite → postcss 8.5.25 → 3.3.17 | 自定义生成器 size=0 无限循环；应用学习记录使用 `crypto.randomUUID()`，不调用该自定义路径 |
| `serialize-javascript`（低） | workbox-build → @rollup/plugin-terser → 7.0.7 | 序列化函数末尾 `</script` 风险；用于构建配置，当前不把用户函数嵌入 HTML 脚本 |
| `source-map-js`（高） | postcss/css-tree → 1.2.1 | 特制索引 source map 偏移可耗尽事件循环；构建工具和 DOM 测试依赖，学习题包不接受 source map |
| `vite-plugin-pwa`（中） | 1.3.0 → workbox-build | 继承构建链告警，生成的 SW 和构建器不是同一运行范围 |
| `workbox-build`（中） | 7.4.1 → glob | 同上。audit 建议把 PWA 插件变更为 1.1.0 且标为主版本处理，不自动采用该降级建议 |

`dependency-paths.json` 保存 `npm explain` 的实际树；所有 `fixAvailable` 仅为 npm 的候选方案。受控升级优先顺序：Vitest/mocker → lint 依赖族 → PostCSS/source-map → Workbox 构建链。每批单独核验 lock 和相应流程。当前主要风险集中于开发工具，但不能把“未见产品输入可达路径”写成“绝对不可利用”。

## 验证失败记录

Vite 初次构建被新增备份预检类型错误阻断；修复 TypeScript 后构建通过，原日志保留。其他首轮测试失败、修复与最终门禁见 [验收报告](acceptance-2026-11-20.md)。Windows 独立记录为 `windows-dev-1/receipt.json`，编辑器进程由测试替身拦截，只验证参数构造，没有实际打开编辑器或执行 shell 命令。线上部署与非 Windows 主机未验证。
