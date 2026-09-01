# 架构与运行模式

## 分层

```text
apps/web
  React 页面、路由、PWA、浏览器存储装配
        |
packages/domain
  题目、作答、复习、统计和内容复核领域逻辑
        |
packages/content-schema   packages/storage
  内容包校验与迁移        IndexedDB、Cache Storage、备份事务
        |
packages/cpu-core         packages/lab-core
  组成原理实验纯逻辑      数据结构、OS、网络实验纯逻辑
```

页面通过 repository/service 接口访问内容与学习数据，不直接操作 IndexedDB 表。实验计算放在纯逻辑 package 中，页面负责参数输入、状态展示和深链。

## 两种运行模式

### 公开代码模式

干净克隆没有 `/content/2009.json`。启动请求收到显式 HTTP 缺失后，`StudyProvider` 加载空内容集合并继续渲染：

1. 应用壳显示“本地题包未安装”提示。
2. 真题、练习、模考和复核入口进入禁用或空状态。
3. 四科实验室、本地 PDF、设置和本地数据能力继续可用。

只有预期的本地题包缺失会降级。网络拒绝、无效 JSON、内容校验失败和存储异常继续 fail closed，避免把真实故障伪装成“未安装”。

### 本地题包模式

本机存在 `apps/web/public/content/2009.json` 与对应来源资产时，启动流程校验并安装内容包。已安装 verified 题包不会被 `needs-review` 草稿覆盖。题包生成和发布流程见 [LOCAL_CONTENT.md](LOCAL_CONTENT.md)。

## 持久化边界

- `408-content`：内容包、题目、知识点和资产元数据。
- `408-user`：作答、进度、会话、笔记、收藏、设置、内容复核和模考。
- Cache Storage：本地 PDF 字节、经验证的内容文档与来源资产。

这些名称是历史兼容标识。品牌改名不改变数据库 schema、备份格式或缓存键。

## 内容可信度

内容状态与来源核对、自动测试、人工审核分离：

- `needs-review` 表示尚未完成逐题人工审核。
- schema、hash、资产和来源页校验只能证明结构与输入一致。
- 只有 47/47 ledger 通过独立发布工具后，才能生成 verified 题包。

Q44 的模型固定为 `parallel-5 / split-6`，不扩大为微操作搜索或评分系统。
