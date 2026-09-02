# HANDOFF

## 任务现状

- 当前定位：可展示、可本地使用的“2009 工程 Beta”，不是 P0-P7 全量平台，也不是已人工审核的正式题库。
- 当前公开显示名为 `BitAtlas`；`@408os/*`、`408-user`、`408-content`、缓存键和目录名继续作为兼容标识。公开代码默认不带私有 2009 题包，显式 HTTP 缺失进入可用的 code-only 模式，意外网络/解析/存储错误仍 fail closed。
- 当前封板门禁：lint/typecheck 通过，Vitest `97 files / 1090 tests`，release `10/10`，content `47 questions / 19 assets` 且 `needs-review; verified 0/47`，最新 build `1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`；最新 code-only 三视口真实 Chrome `3/3`。
- 当前公开部署：仓库为公开的 `AbyssWhalen/bitatlas`，远端 `main` 已部署；Cloudflare `408.fytjut.com` CNAME、GitHub Pages 证书和 HTTPS 强制均已生效。代码通过 merge 保留旧 `cpu-explorer` 历史，但不恢复或 iframe 嵌入旧站点。
- 已完成：P0 工程地基、2009 导入/校验/复核/发布门禁、47 题刷题闭环、错题/笔记/收藏/掌握度、版本化统计、知识证据图、备份恢复和 PWA 离线闭环。
- 已完成：本地 PDF 资料库与阅读器；支持导入、校验、页码深链、恢复、重命名、移除、适宽/缩放、CJK 标准字体和离线重开。
- 已完成：PDF worker 首次实际阅读时单飞写入共享 Cache Storage；非 PDF 页面不再承担 1.26 MB worker 的安装期预缓存。
- 已完成：计算机组成 11 个 URL 可恢复实验模块：进制、原/反/补码、IEEE 754、RV32I、单周期数据通路、五级流水线、Cache、存储器芯片扩展、中断与 DMA CPU 开销、数据通路微操作调度、总线带宽；流水线包含动态五级模式和 Q18 通用功能段时延模式。
- 已完成：CPU 实验室顶层 11 个模块按钮，机器数方向/位宽、IEEE 754 方向、RV32I 方向 4 组共 9 个内部分段按钮，以及 Pipeline 动态/功能段时延 2 个模式按钮，均以布尔 `aria-pressed` 暴露唯一选中项；现有 CSS、URL、计算与 StepExplorer 行为保持不变。
- 已完成：Knowledge 的 4 个学科按钮与叶知识点索引按钮均以布尔 `aria-pressed` 暴露 URL 派生选中态；学科始终唯一，科目根状态允许 0 个叶按钮 pressed，选择叶节点后唯一。三视口合同覆盖深链、reload 与 back/forward，现有 CSS、canonical URL 与 Cytoscape 行为不变。
- 已完成：数据结构 Q2 栈最小容量、Q3 二叉树 RNL 遍历、Q5 完全二叉树最大构型、Q6 森林与二叉树转换、Q9 小根堆插入、Q10 排序趟次判别、Q41 最短路径对照与 Q42 单链表双指针；操作系统 Q24 HRRN、Q27 分段地址字段、Q29 磁盘调度与 Q46 虚拟内存；网络 Q34 QAM/奈氏、Q35 GBN、Q36 交换机转发、Q37 CSMA/CD、Q38 TCP 累计确认、Q39 TCP 拥塞、Q40 FTP 控制/数据连接和 Q47 CIDR/LPM 独立实验室。
- 已完成：Q45 信号量同步纯逻辑与 Web 垂直切片；精确路由、当时的操作系统三模块导航（后续由 Q25/Q31/Q27 扩展为六模块）、真题双向深链、容量/脚本 URL 恢复、槽位/信号量/进程/队列时间轴和页面测试均已完成。核心审计新增回归测试并完成两轮红转绿：直接校验通用信号量状态、拒绝未知 action/进程与不配对 P/V 括号、容量上限 1024、P1 未发布值绑定实际槽位，消费者不会提前取走尚未 V(category) 的槽位；通用信号量与 Q45 定向测试 `18/18`。Web 审计修复了 URL/UI 同步、路由参数优先级、语义导航、重复 live region 与移动步进布局，页面/路由定向测试 `13/13`；Q45 三视口真实 Chrome `3/3`、Q45 收口时全量 E2E `117/117`，截图已人工检查。
- 已完成：真题与实验双向链接覆盖 Q2/3/5/6/9/10/11/12/13/14/15/16/17/18/20/21/24/25/27/29/31/34/35/36/37/38/39/40/41/42/43/44/45/46/47，共 34/47 题。
- 已完成：Q25 单类资源死锁阈值垂直切片。`R=8、M=3、Kmin=4` 均来自当前 `needs-review` 题包；纯逻辑实现 `ceil(totalResources / (maxDemandPerProcess - 1))`、极端分配与确定性 `grant / complete / deadlock-detected` trace，保留缺模块红灯 `1 failed / 0 tests`，边界审计后核心定向 `19/19`。Web 完成 `/lab/os-memory?module=deadlock&preset=cn408-2009-q25`、OS 四模块导航、URL/历史恢复、错误 fail closed、资源/进程/步骤可视化和 Q25 真题双向深链；Web 红灯为页面缺失、路由 `2` 失败和深链 `1` 失败，修复后核心+页面+路由+深链定向 `49/49`。Q25 三视口真实 Chrome `3/3` 两轮通过，五张截图已人工检查；最终全量门禁为 Vitest `46 files / 536 tests` 与 E2E `120/120`。
- 已完成：从当前版本 Attempt 重建完成度、错题与自动掌握度；总览生成北京时间每天稳定的 8 题复习计划，当天新增作答只更新完成状态，不重排队列。
- 已完成：verified 题包本地导入、资产摘要校验、安装原子性和启动防降级；当前真实题包仍未审核，因此没有伪造或安装 verified 内容。
- 已完成：canonical taxonomy 映射校验与祖先闭包投影纯逻辑；尚未接入未经官方考纲和人工映射核对的 taxonomy 内容。
- 已完成：1440、1366、390 三视口真实 Chrome 流程和最新截图人工检查；PDF/画布、Q25 资源/进程、Q31 文件链接、Q2 峰值栈与 Q9 小根堆状态均非空，页面无横向溢出或底部导航遮挡。
- 已完成：默认验证合同显式固定为 8 workers + 30 秒；最近一次完整三视口全量 E2E 为 `187/189 passed`，两项为 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树的并发冷启动/actionability 超时，不能记为全绿；模考与普通练习跨标签页双页同步均已有三视口通过证据。
- 已完成：普通 Practice 单选的四个选项以布尔 `aria-pressed` 暴露唯一选择，提交结果以 polite/atomic `role=status` 播报并在本题提交成功后接收焦点；恢复与切题不抢焦点，三视口真实 Chrome 合同已覆盖。
- 已完成：普通 `StudySession` 的事务内 exact-token CAS、提交证据与 blueprint 不变量、completed 写屏障、existing-attempt 真幂等校验、Practice A/B keyed 隔离、显式冲突恢复与 completed 只读态；storage/Web 独立审计 P0/P1 为 0，三视口真实双页合同和六张最终截图已收口。
- 未完成：2009 题包逐题人工复核，当前仍为 `needs-review`，审核计数 `0/47`。
- 未完成：P3 多年份题库、正式完整考纲 taxonomy、独立记忆卡评分和更广的四科实验；派生式间隔复习/每日计划已可用。
- 已完成：`408-user` IndexedDB schema v3 在原样保留 v1/v2 store 定义的基础上新增 `mockExams`；session 题面版本快照、版本化 progress、专用模考 repository、v3 backup、原子交卷/综合题自评和跨标签页 `liveQuery` 订阅均已完成。无法证明版本的旧草稿/mastery 保留为 legacy 且 fail-closed；模考仍受正式题包 `verified` 门禁约束。
- 待授权：旧生成目录 `apps/web/public/content/2009/` 仍有 19 张重复来源图；运行时已只使用 `cn408-2009/`，删除仍属于项目红线。
- 已完成：Q31 软/硬链接引用计数垂直切片，保留缺模块红灯；核心审计修复 canonical action-prefix replay、符号链接自身目标名解析、dangling 一致性及额外 inode/目录项注入，定向 `21/21`；页面、路由、OS 第五模块、URL/历史恢复、错误 fail closed 与双向深链定向 `33/33`。三视口真实 Chrome 与全量门禁均已通过。
- 已完成：Q2 栈最小容量纯逻辑、数据结构第三模块、精确路由、URL/历史恢复、非法排列 fail closed、Q2 双向深链和三视口 E2E。题包和本地 crosscheck 均明确给出输入 `a..g`、出栈后立即入队的顺序 `b,d,c,f,e,a,g`、14 步唯一 push/pop 过程和峰值深度 3；实验只展示栈、输入游标与已出栈并入队的顺序前缀，不构造题干未给出的实时队列占用曲线。核心缺模块红灯为 `1 failed / 0 tests`；稀疏数组审计后核心 `19/19`。Web 保留页面/路由/深链红灯，审计又以 `1 failed / 5 passed` 复现步骤播报 P1，修复后 Q2 核心+页面+路由+深链定向 `50/50`。独立端口 4195 的真实 Chrome 定向 `3/3`，五张截图已人工检查；最终全量为 Vitest `50 files / 593 tests` 与 E2E `126/126`。Q2 仍为 `needs-review`。
- 已完成：Q43 中断与 DMA 的 CPU 时间开销。题包明确给出 CPU `500MHz`、`CPI=5`，中断方式 `0.5MB/s`、32 位传输、18 条服务指令和 2 条等效开销，以及 DMA `5MB/s`、每块 `5000B`、每块 CPU 开销 500 cycles、无访存冲突；正式解析与本地 rubric 一致给出中断 `2.5%`、DMA `0.1%`。页面只按题设的十进制 MB 和一秒观察窗推导 CPU 开销，不模拟题干未给出的设备队列、总线仲裁或 DMA 访存竞争。Canonical URL 为 `/lab?module=io-overhead&preset=cn408-2009-q43`。cpu-core 保留缺模块红灯 `1 failed / 0 tests`，初版 `14/14`，核心审计新增 exact-100% 边界回归先红 `1 failed / 14 passed`，加入舍入容差后定向 `15/15`；Web 页面、CPU 路由、真题双向深链和三视口真实 Chrome 均已通过。审计报告的 3 个极端数值 P2（中间乘法溢出、正乘积下溢、trace 展示公式舍入不一致）只记录，不扩大修复。Q43 仍为 `needs-review`。
- 已完成：Q9 小根堆插入。题包给出初始层序 `[5,8,12,19,28,20,15,22]`、插入 `3`，沿父链依次越过 `19 -> 8 -> 5`，唯一结果 `[3,5,12,8,28,20,15,22,19]`；Q38 状态过薄，Q44 有五/六拍与转录纠错风险，因此暂缓。纯逻辑保留缺模块红灯 `1 failed / 0 tests`，实现不可变 append/compare/swap/complete trace、初始堆/安全整数/稀疏数组/64 项上限校验，定向 `16/16`、lab-core `200/200`、typecheck/ESLint 通过。Web 页面、数据结构第四模块、URL 恢复、错误 fail closed 和 Q9 双向深链先得页面缺失 `0 test`、路由/深链 `4 failed / 27 passed` 红灯，修复后定向 `4 files / 52 tests`；Q9 三视口真实 Chrome `3/3`，全量 Vitest `55 files / 645 tests`、E2E `132/132`。Canonical URL 为 `/lab/data-structures?module=min-heap&preset=cn408-2009-q09`，Q9 仍为 `needs-review`。独立终审无 P1，保留两个 P2：大安全整数的树节点短格式可能不可区分；冲突的 `module=min-heap&preset=其他题` 会显示 Q9 默认值但保留矛盾 URL。
- 已完成：Q3 二叉树 RNL 遍历。Q38 仍因题意内只有两个连续字节区间和一个累计 ACK、独立实验价值不足而暂缓，未修改题包的交叉材料污染。Q3 原卷树结构清晰，RNL 结果为 `3,1,7,5,6,2,4`；实现不可变六序列递归调用栈 trace、层序 `#` 输入、错误 fail closed、数据结构第五模块、URL/reload/back/forward 恢复、Q3 真题/知识双向深链和 E2E。恢复 unrestricted 后修复了稀疏数组 `map` 丢失空槽的 P1，定向 `4 files / 66 tests`、全量 Vitest `57 files / 680 tests`、真实 Chrome Q3 三视口 `3/3`、全量 E2E `135/135`，lint/typecheck、release `10/10`、内容校验和 build 均通过。独立终审无 P1，三个 P2 只记录：冲突 preset/order 不规范化 URL、390px E2E 缺纵向 bounding-box 契约、单一 live region 缺专门回归断言。Q3 仍为 `needs-review`。
- 已完成：Q37 CSMA/CD 距离变化实验。新增 `tests/e2e/csma-cd-collision-lab.spec.ts`，覆盖 canonical/custom URL、0.8μs/80m、错误恢复、StepExplorer 播放/复位、reload/back/forward、真题与知识深链及页面横溢；既有网络模块数量契约由 3 改为 4。独立端口 `4207` 的真实 Chrome 三视口 `3/3`，截图 `chromium-1440/1366/390-csma-cd-collision-q37*` 已人工检查，无横向溢出、文字重叠或底部导航遮挡。独立审计无 P1；三个 P2 只记录：极端有限数值的中间运算溢出/下溢、极端参数展示精度不统一、网络模块当前态缺少 aria 选中语义。
- 已完成：Q6 森林与二叉树转换收口。核心四路径闭集、合法上层上下文、五步不可变 trace、round-trip 与非法 path 拒绝为 `22/22`；Web 页面、数据结构第六模块、精确路由、URL/历史恢复、非法 path fail closed、Q6 真题/知识双向深链和单一 live region 均完成。独立审计立案的 P1 已修复：initial/decode-edge 期间当前关系、匹配命题和森林 callout 均显示“待判定”，classify 后才读取当前 step 的最终关系；四案例 I/II/III 只作为明确标注的总览保留。修复后核心+页面+路由+深链为 `4 files / 66 tests`，页面相关 lint/typecheck 通过。canonical URL 为 `/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR`。
- 已完成：Q15 存储器芯片扩展收口。主存 `64KB` 分为 ROM `4KB` 与 RAM `60KB`，ROM `2K x 8 bit` 芯片需 `2` 片，RAM `4K x 4 bit` 芯片需 `30` 片，总计 `32` 片、答案 D；只建模容量分区、位/字扩展、芯片矩阵与容量守恒。保留核心缺模块红灯 `1 failed / 0 tests`，核心定向 `16/16`，核心+页面+路由+深链 `4 files / 59 tests`，Q15 三视口真实 Chrome `3/3`。独立核心与 Web 审计均无 P1，P2 只记录不修；最终全量 Vitest `64 files / 752 tests`、E2E `144/144`。canonical URL 为 `/lab?module=memory-expansion&preset=cn408-2009-q15`。
- 已完成：Q44 数据通路微操作调度。核心缺模块红灯 `1 failed / 0 tests`、核心审计 P1 `2 failed / 12 passed -> 14/14` 均已保留；Web 红灯 `5 failed / 51 passed`，实现后核心+页面+路由+深链 `4 files / 62 tests`。CPU 第 10 模块、canonical/custom URL、错误 fail closed、当前拍寄存器/AB/DB/内总线/信号、两方案切换复位、Q44 真题/知识双向深链和三视口 E2E 均完成，核心、Web 与 E2E 独立审计 P0/P1 为 0；最终全量 Vitest `66 files / 776 tests`、E2E `147/147`。Q44 仍为 `needs-review`，只提供来源支持的 `parallel-5 / split-6`，不冒充人工审核、官方逐分标准、任意微操作评分器或所有合法方案全集。
- 已完成：Q10 排序趟次判别垂直切片。核心先保留缺模块红灯 `1 failed / 0 tests`，独立审计的方向无关极值与二路归并四元段 P1 先红 `4 failed / 17 passed` 后修复，核心定向 `21/21`；Web/路由/深链定向 `8 files / 95 tests`，最终边界措辞 P1 先红 `1 failed / 4 passed` 后修复并复审清零，custom 完成态回归后页面定向 `6/6`。页面接入数据结构第 7 模块、canonical URL `/lab/data-structures?module=sort-pass&preset=cn408-2009-q10`、`values` 自定义 URL、错误 fail closed、六步必要条件判别、4+3 移动导航、Q10 真题/知识双向深链；Q10 只报告“题列四项中仅 B 未被必要条件排除”，不恢复未知初始序列或真实前两趟，不实现任意排序评分器。独立端口 `4230/4231` 三视口均 `3/3`，五张截图已人工检查；全量门禁为 lint、workspace typecheck、Vitest `68 files / 808 tests`、release `10/10`、内容 `47 题/19 资产` 且 `needs-review; verified 0/47`、production build `1898 modules` / PWA `79 entries (2547.70 KiB)`、端口 `4236` 全量 E2E `150/150`。
- 已完成：Q10 收口后的剩余 20 道单选题只读候选审计。来源完整性、确定性 trace、交互厚度、虚构风险和导航成本综合首选 Q5 完全二叉树最大结点数，次选 Q34 QAM/奈氏准则；Q4 必须先独立转录并核对四棵来源树拓扑，当前不立项。Q5 的来源参数为第 6 层、8 个叶结点，确定性推导为高度上界 7、前六层 63 个结点、第六层前 24 个非叶结点产生第七层 48 个结点、总数 111。此次来源核对不是人工审核，所有题仍为 `needs-review`。
- 已完成：Q5 核心、Web、数据结构第 8 模块、canonical/custom URL、错误 fail closed、32 槽聚合分区、Q5 真题/知识双向深链、三视口 E2E 和全量门禁均已收口；不要重做 Q5/Q10/Q44 或候选比较。旧阶段的红绿与并发证据保留在历史记录中。

## 关键决策

- 项目目录为 `D:\CodexProject\personal-projects\408OS`，npm 包名为 `408os`。
- 首轮只实施 P0、2009 内容包和完整刷题闭环。
- 使用 React、TypeScript、Vite、Dexie、Zod、PWA、Vitest 和 Playwright。
- 题库与个人数据分库存储；不做账号、社区、排行榜或云同步。
- 不删除 Git 历史中保留的旧 `cpu-explorer` 提交，不恢复或 iframe 嵌入旧站点。
- 不把结构校验或 OCR 交叉校对冒充人工审核；只有逐题对照来源后才能改为 `verified`。
- 复核证据保存在 `408-user.settings`，绑定 pack id/hash/contentVersion 和题目版本；题包更新会使旧证据失效但不会删除历史。
- 页面只能保存个人复核证据，不能修改 question/manifest 的审核状态；正式发布状态提升必须由后续独立内容发布工具完成。
- `SourceRef.pages` 必须在题包资产 registry 中有 canonical 图片资产，且 MIME 与 `sourcePage` 元数据一致；正式校验还会读取实际文件并核对 SHA-256。
- 路由页面不等待 KaTeX 内容渲染器即可显示；重型渲染失败或延迟不能阻塞页面标题、导航和筛选。
- schema v3 的 `mockExams` 是持久化模考唯一事实源；不把 pack 元数据塞进 settings/session id，不清空旧进度冒充版本隔离。v1/v2 stores 与备份迁移保持兼容，正式题包 verified 门禁始终保留。
- Playwright 使用机器现有 Chrome，不下载项目外浏览器运行时。
- Playwright 的本机验收合同显式固定为 8 workers；12 workers 在当前多浏览器、多开发服务并存环境中出现跨页面路由 chunk 冷启动漂移，8 workers 保持原 30 秒全局超时与普通 5 秒断言并通过全量门禁。双页模考同时初始化的两个 readiness 断言使用局部并行 15 秒等待，不改变全局超时或业务断言。
- PDF worker 不进入应用壳 precache；由 `pdf-runtime` 在首次阅读前写入与 Workbox runtime route 相同的缓存，缓存不可用或失败时不阻断在线加载。
- 当前 51 个知识点仅是 4 个科目根节点与 47 个题目级叶节点，因此页面命名为“2009 知识证据图”，不冒充完整 408 考纲知识树。
- 活动日历、知识表现和薄弱项从 `Attempt[] + 当前 Question[] + KnowledgePoint[]` 纯派生；旧题面 Attempt 保留在备份中，但不进入当前版本统计。
- 完成度、错题和每日复习调度同样只从带 `questionContentVersion` 的 Attempt 重放；v1 `QuestionProgress` 仅保留兼容与手动掌握度控件，不再作为跨页面事实源。
- 每日计划只使用当日零点前的当前题面证据选题，并从当天 Attempt 推导完成状态，因此刷新、离线重开和备份恢复后可重复。
- verified 题包必须由发布工具和人工 ledger 产生；Web 只负责严格导入，绝不提升草稿状态。已安装 verified 包受保护，启动时的 `needs-review` 草稿不能降级它。
- CPU 迁移固定旧项目来源 commit `94194987e6ed72d437a7b3debdc14adb2aaa4619`；只迁入经规范测试的纯逻辑，不复制旧 UI 或旧算法错误，不修改旧项目。
- 无物理边界的 SCAN 不计算移动量；LOOK 的 273 不能冒充 Q29 的 SCAN 结果。C-SCAN 必须显式提供真实 bounds。
- GBN 页面固定使用“ACK n 是最后按序收到的帧 n”的累计确认语义，不与 TCP 的“下一个期待字节”混用。
- Q39 页面明确命名为“408 经典模型”，按整数 MSS 重放，不宣称代表全部现代 TCP 实现。
- `PLAYWRIGHT_TEST_PORT` 可为本地验收启用独立 preview 端口并禁用旧服务复用；默认命令仍使用 4173 和既有合同。

## 关键文件

- 项目规范：`AGENTS.md`
- 产品说明：`README.md`
- 决策与验证：`notes.md`
- 当前检查点：`HANDOFF.md`
- Web 入口：`apps/web/src/main.tsx`
- 学习状态：`apps/web/src/app/StudyContext.tsx`
- 练习工作台：`apps/web/src/pages/PracticePage.tsx`
- 来源页解析：`packages/domain/src/assets.ts`、`apps/web/src/components/SourcePageImage.tsx`
- 内容渲染懒加载：`apps/web/src/components/LazyContentRenderer.tsx`
- 模考领域底座：`packages/domain/src/mock.ts`
- 模考存储与 Web：`packages/storage/src/mock-repository.ts`、`packages/storage/src/databases.ts`、`apps/web/src/pages/MockExamPage.tsx`、`apps/web/src/pages/MockExamSessionPage.tsx`、`tests/e2e/mock-exam.spec.ts`
- 学习分析领域：`packages/domain/src/analytics.ts`
- 当前题面投影与每日计划：`packages/domain/src/study.ts`、`packages/domain/src/review-plan.ts`、`apps/web/src/pages/DashboardPage.tsx`
- canonical taxonomy 基础设施：`packages/content-schema/src/taxonomy.ts`
- 知识证据页面：`apps/web/src/pages/KnowledgePage.tsx`、`apps/web/src/components/KnowledgeGraph.tsx`
- CPU 核心与页面：`packages/cpu-core/src/number.ts`、`riscv.ts`、`cache.ts`、`datapath.ts`、`pipeline.ts`、`apps/web/src/pages/CpuLabPage.tsx`、`apps/web/src/components/PipelineLabPanel.tsx`
- 四科实验：`packages/lab-core/src/shortest-path.ts`、`linked-list.ts`、`disk-scheduling.ts`、`virtual-memory.ts`、`gbn.ts`、`tcp-congestion.ts`、`network.ts` 与 `apps/web/src/pages/*LabPage.tsx`
- Q45 纯逻辑：`packages/lab-core/src/semaphore.ts`、`semaphore.test.ts`、`q45-buffer.ts`、`q45-buffer.test.ts`
- Q25 纯逻辑：`packages/lab-core/src/single-resource-deadlock.ts`、`single-resource-deadlock.test.ts`
- Q31 纯逻辑：`packages/lab-core/src/filesystem-links.ts`、`filesystem-links.test.ts`
- Q25 Web：`apps/web/src/pages/SingleResourceDeadlockLabPage.tsx`、`SingleResourceDeadlockLabPage.test.tsx`、`apps/web/src/pages/OsLabRouterPage.tsx`、`apps/web/src/components/OsModuleTabs.tsx`
- Q45 Web：`apps/web/src/pages/SemaphoreLabPage.tsx`、`SemaphoreLabPage.test.tsx`、`apps/web/src/pages/OsLabRouterPage.tsx`、`OsLabRouterPage.test.tsx`、`apps/web/src/components/OsModuleTabs.tsx`、`StepExplorer.tsx`
- Q45 E2E：`tests/e2e/semaphore-lab.spec.ts`
- Q25 E2E：`tests/e2e/deadlock-lab.spec.ts`
- Q31 Web 与 E2E：`apps/web/src/pages/FilesystemLinksLabPage.tsx`、`FilesystemLinksLabPage.test.tsx`、`tests/e2e/filesystem-links-lab.spec.ts`
- Q2 核心、Web 与 E2E：`packages/lab-core/src/stack-capacity.ts`、`stack-capacity.test.ts`、`apps/web/src/pages/StackCapacityLabPage.tsx`、`StackCapacityLabPage.test.tsx`、`tests/e2e/stack-capacity-lab.spec.ts`
- Q3 核心、Web 与 E2E：`packages/lab-core/src/binary-tree-traversal.ts`、`binary-tree-traversal.test.ts`、`apps/web/src/pages/BinaryTreeTraversalLabPage.tsx`、`BinaryTreeTraversalLabPage.test.tsx`、`tests/e2e/binary-tree-traversal-lab.spec.ts`
- Q37 核心、Web 与 E2E：`packages/lab-core/src/csma-cd-collision.ts`、`csma-cd-collision.test.ts`、`apps/web/src/pages/CsmaCdCollisionLabPage.tsx`、`CsmaCdCollisionLabPage.test.tsx`、`tests/e2e/csma-cd-collision-lab.spec.ts`
- Q6 核心、Web 与 E2E：`packages/lab-core/src/forest-binary-relation.ts`、`forest-binary-relation.test.ts`、`apps/web/src/pages/ForestBinaryRelationLabPage.tsx`、`ForestBinaryRelationLabPage.test.tsx`、`tests/e2e/forest-binary-relation-lab.spec.ts`
- Q15 核心、Web 与 E2E：`packages/cpu-core/src/memory-expansion.ts`、`memory-expansion.test.ts`、`apps/web/src/components/MemoryExpansionLabPanel.tsx`、`MemoryExpansionLabPanel.test.tsx`、`apps/web/src/pages/CpuLabPage.tsx`、`tests/e2e/memory-expansion-lab.spec.ts`
- Q44 核心、Web 与 E2E：`packages/cpu-core/src/micro-operations.ts`、`micro-operations.test.ts`、`apps/web/src/components/MicroOperationsLabPanel.tsx`、`MicroOperationsLabPanel.test.tsx`、`apps/web/src/pages/CpuLabPage.tsx`、`tests/e2e/micro-operations-lab.spec.ts`
- Q10 核心、Web 与 E2E：`packages/lab-core/src/sort-pass-analysis.ts`、`sort-pass-analysis.test.ts`、`apps/web/src/pages/SortPassAnalysisLabPage.tsx`、`SortPassAnalysisLabPage.test.tsx`、`apps/web/src/pages/DataStructuresLabPage.tsx`、`tests/e2e/sort-pass-analysis-lab.spec.ts`
- verified 题包激活：`apps/web/src/app/storage.ts`、`apps/web/src/pages/SettingsPage.tsx`
- PDF 资料库：`apps/web/src/app/document-library.ts`、`pdf-runtime.ts`、`pdf-cache.ts`、`apps/web/src/pages/PdfReaderPage.tsx`
- 实验深链：`apps/web/src/app/lab-links.ts`
- 人工复核工作台：`apps/web/src/pages/ContentReviewPage.tsx`
- 复核领域与存储：`packages/domain/src/review.ts`、`packages/storage/src/content-review.ts`
- 存储契约：`packages/storage/src/repositories.ts`、`packages/storage/src/backup.ts`
- 题包安装与验证缓存：`apps/web/src/app/storage.ts`
- 内容校验：`packages/content-schema/src/validate.ts`
- 发布工具：`tools/content-importer/src/release-2009-lib.mjs`
- E2E：`tests/e2e/`、`apps/web/e2e/`
- 浏览器产物：`output/playwright/`

## 当前验证证据

- 题包：`2009.0-draft.2`，hash `b9b9d03c4e23d45fb4600e853c5c82deda15a9609bd3ee321386f52948c7a89c`，47 题、19 个来源资产、`verified 0/47`。
- `npm run lint`：0 error / 0 warning；`npm run typecheck`：全部 workspace 通过（2026-09-01 Q40 最终源码状态）。
- 最近一次默认全仓 Vitest 证据仍为学习备份恢复确认收口时的 `82 files / 1001 tests passed`；Q36 后续聚焦为 `8 files / 89 tests`，Q40 聚焦为 `7 files / 87 tests`。本轮按“减少测试”约束未重跑默认全仓 Vitest，不能把聚焦计数外推为新的全仓总数。
- 最近一次 release/content 完整门禁仍为 release `10/10`、content `47 题 / 19 资产` 且 `needs-review; verified 0/47`；Q40 未改题包或发布工具，因此本轮未重复运行。
- `npm run build`：Q40 最终 production build 通过；Vite 转换 `1919 modules`，static-copy `198 items`，PWA precache `87 entries (2766.47 KiB)`。
- 最近一次默认 `8 workers / 3 projects` 全量真实 Chrome 仍为 `187/189 passed`，失败是 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树的并发冷启动/actionability 超时；不能记为全绿。当前 `output/playwright/results/.last-run.json` 的 `passed/空失败` 只代表最近一次定向集合，不覆盖全量事实。
- PDF 定向 E2E：9/9；普通/CJK PDF 首开、离线重开和非空 canvas 均通过。canvas 出现与像素非空使用一致的 15 秒局部等待，未修改全局超时。
- 最新截图已人工检查总览、知识图、PDF、Cache、单周期数据通路、五级流水线、Q18 功能段时延、虚拟内存、Q2/Q6/Q9/Q10/Q15/Q25/Q29/Q31/Q35/Q37/Q39/Q43/Q44、CIDR 与 Q45 实验。Q10 截图为 `chromium-1440-sort-pass-q10.png`、`chromium-1366-sort-pass-q10.png`、`chromium-390-sort-pass-q10-top.png`、`chromium-390-sort-pass-q10-state.png`、`chromium-390-sort-pass-q10-bottom.png`；Q44 截图为 `chromium-1440-micro-operations-q44.png`、`chromium-1366-micro-operations-q44.png`、`chromium-390-micro-operations-q44-top.png`、`chromium-390-micro-operations-q44-state.png`、`chromium-390-micro-operations-q44-bottom.png`；三视口均无页面横向溢出、文字重叠或底部导航遮挡。
- 视觉产物位于 `output/playwright/screenshots/`。当前目录没有 Git 元数据，仍无法提供 git diff 或历史回退点。
- 上述 476/476 与 114/114 是 2026-08-08 Q45 开始前的完整绿灯基线。Q45 保留了两个缺模块红灯：`semaphore.test.ts` 与 `q45-buffer.test.ts` 均曾得到 `1 failed / 0 tests`。2026-08-10 核心审计又保留了 `q45-buffer.test.ts` 的 `4 failed / 6 passed` 与并发交错补测后的 `2 failed / 9 passed` 两轮红灯，修复后通用 P/V 与 Q45 缓冲区定向测试为 `18/18`；Web 路由/同步审计保留 `4 failed / 9 passed`，修复后页面/路由定向测试为 `13/13`。Q45 收口基线为 Vitest `508/508` 与 E2E `117/117`。Q25 保留缺模块红灯、核心 `19/19` 与 Web/路由/深链 `49/49`。Q31 同样保留缺模块红灯，核心审计后 `21/21`、页面/路由/深链 `33/33`、定向 E2E `3/3`，Q31 收口时全量门禁为 Vitest `565/565` 与 E2E `123/123`。
- Q2 收口证据：核心审计后 `19/19`；核心+页面+路由+深链 `4 files / 50 tests`；Web 步骤播报 P1 的新增测试先得到 `1 failed / 5 passed`，单一 live region 修复后转绿；独立端口 4195 的真实 Chrome 定向 `3/3`。本轮全量门禁为 lint、workspace typecheck、release `10/10`、内容校验、production build 全绿，Vitest `593/593`，独立端口 4196 的 E2E `126/126`。
- Q43 核心审计证据：独立只读审计复现 exact-100% 中断与 DMA 利用率因 IEEE-754 舍入输出 `100.00000000000003`；新增回归测试先得到 `1 failed / 14 passed`，随后用 `Number.EPSILON * 1_024` 的百分比容差修复，定向 `15/15`。其余中间乘法溢出、正乘积下溢和展示公式 12 位舍入不一致列为 P2，未修复。Q43 页面/组件、CPU 路由、深链定向与真实 Chrome 三视口为 `45/45` 与 `3/3`；Q43 收口后的全量 Vitest 为 `53 files / 620 tests`、E2E 为 `129/129`。
- Q9 收口证据：核心缺模块红灯 `1 failed / 0 tests`、定向 `16/16`；Web 页面缺失 `0 test`、路由/深链 `4 failed / 27 passed` 红灯，修复后核心+页面+路由+深链 `4 files / 52 tests`；真实 Chrome Q9 定向 `3/3`、全量 `132/132`。独立终审无 P1，两个 P2 只记录不修。
- Q3 最终证据：恢复 unrestricted 后首次定向暴露层序序列化使用稀疏数组 `map`、导致空槽丢失的 P1，改用按索引填充 `#` 后定向 `4 files / 66 tests` 全绿。独立端口 4204 的真实 Chrome 1440/1366/390 为 `3/3`，五张截图已人工检查；全量 `npm run test` 为 `57 files / 680 tests`，`npm run test:release` 为 `10/10`，内容校验为 47 题/19 资产且 `needs-review; verified 0/47`，production build 转换 1888 个模块并通过，独立端口 4205 全量 E2E 为 `135/135`。三个 P2 只记录不修。
- Q37 最终证据：核心缺模块红灯 `1 failed / 0 tests`、初版 `3/3`；Web 首次 `3 failed / 38 passed`，修复合法 module 优先级和测试定位后核心+页面+路由+深链 `41/41`。独立端口 4207 三视口 Q37 `3/3`；全量 Vitest `60 files / 697 tests`、release `10/10`、内容 47 题/19 资产且 `needs-review; verified 0/47`、build 1890 modules、独立端口 4210 全量 E2E `138/138`。三个 P2 只记录不修。
- Q6 最终证据：独立端口 `4212` 的真实 Chrome 1440/1366/390 定向 `3/3`；五张截图 `chromium-1440-forest-binary-relation-q06.png`、`chromium-1366-forest-binary-relation-q06.png`、`chromium-390-forest-binary-relation-q06-top.png`、`chromium-390-forest-binary-relation-q06-state.png`、`chromium-390-forest-binary-relation-q06-bottom.png` 已人工检查，六列桌面/三列两行移动导航、双视图、关系文本、步骤和底部导航无横向溢出、文字重叠或遮挡。全量门禁为 lint、workspace typecheck、Vitest `62 files / 726 tests`、release `10/10`、内容校验 `47 题/19 资产` 且 `needs-review; verified 0/47`、production build `1892 modules` / PWA precache `79 entries (2498.07 KiB)`。全量 E2E 首轮为 `140/141`，唯一失败是既有 content-review 1440px Q41 调色板点击冷启动不稳定；隔离重跑通过，独立端口 `4215` 第二轮全量真实 Chrome 1440/1366/390 为 `141/141`。P2 只记录不修：缺少 LL/RL 页面展示专门断言、冲突 preset/path 不规范化 URL、p 上下文措辞仍可更明确。
- Q15 最终证据：核心缺模块红灯 `1 failed / 0 tests`、核心 `16/16`；Web 面板缺失 `0 test` 且路由/模块数/深链 `5 failed / 33 passed`，实现后核心+页面+路由+深链 `4 files / 59 tests`。独立核心与 Web 审计均无 P1；定向三视口两次均为 `3/3`。全量门禁为 lint、workspace typecheck、Vitest `64 files / 752 tests`、release `10/10`、内容 `47 题/19 资产` 且 `needs-review; verified 0/47`、production build `1894 modules` / PWA precache `79 entries (2514.11 KiB)`、独立端口 `4223` 全量 E2E `144/144`。当时 P2 记录为容量守恒派生量、两区合计溢出回归、冲突 preset、矩阵截断和 CPU tab 缺 `aria-pressed`；最后一项已于 2026-08-17 单独立项解决，其余仍未扩大。
- Q44 最终证据：核心缺模块红灯 `1 failed / 0 tests`、核心审计 P1 红灯 `2 failed / 12 passed`、修复后核心 `14/14`；Web 红灯 `5 failed / 51 passed`，实现后核心+页面+路由+深链 `4 files / 62 tests`。独立核心、Web 与 E2E 审计均无 P0/P1；定向真实 Chrome `3/3`，五张截图已人工检查。全量门禁为 lint、workspace typecheck、Vitest `66 files / 776 tests`、release `10/10`、内容 `47 题/19 资产` 且 `needs-review; verified 0/47`、production build `1896 modules` / PWA precache `79 entries (2530.88 KiB)`、独立端口 `4227` 全量 E2E `147/147`。全量首轮 `145/147` 的既有 PDF/Q37 超时已隔离 `12/12` 并由第二轮全量消除；未修改超时或旧测试。
- 旧阶段曾启动本地开发服务验证 Q10 canonical URL；当前收口核对确认本轮临时端口 `4286/4288/4289/4290/4291/4292` 均已无监听。
- Q10 最终证据：核心定向 `21/21`，页面 custom 回归 `6/6`，独立核心/Web 复审 P0/P1/P2 均为 0。Q10 三视口定向 `3/3` 两轮通过，五张截图已人工检查；全量源码门禁为 lint、workspace typecheck、Vitest `68 files / 808 tests`、release `10/10`、内容 `47 题/19 资产` 且 `needs-review; verified 0/47`、production build `1898 modules` / PWA `79 entries (2547.70 KiB)`、端口 `4236` 全量 E2E `150/150`。开发服务 Q10 canonical URL 已实测 HTTP 200。

## 下一步

1. Q40 FTP 控制/数据连接实验已收口，不要重做 Q20/Q24/Q34/Q36/Q38/Q40、schema v3、backup v3 或 Q44 `parallel-5 / split-6`。
2. 若继续扩充四科实验，先对剩余 13 道没有实验深链的题做只读来源审计；只有来源参数足够、可形成确定性 trace 且不会补造题意时才立项，仍按红灯 → 最小实现 → 聚焦验证 → 三视口 → P0/P1 复审推进。
3. 正式题包仍需用户本人在 `/review/2009` 完成 47/47 逐题人工审核；既有 P2 继续只报告不修。旧重复图片删除、旧 `cpu-explorer`、提交、推送和部署仍受原授权边界约束。

## 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`，从 2026-09-01 Q40 FTP 控制连接实验收口检查点开始，不要从头重做。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`。当前已完成网络第 8 模块与第 34/47 个实验深链：Q40 只按 2009 基础模型展示 TCP/21 控制连接和 TCP/20 数据连接，聚焦 Vitest `7 files / 87 tests passed`，全仓 lint/typecheck 与 build `1919/198/87 (2766.47 KiB)` 通过，真实 Chrome CLI 1440/1366/390 无横向溢出并走通错误恢复、StepExplorer、Practice 和 Knowledge 往返。Q40 与题包保持 `needs-review; verified 0/47`；默认全量 E2E 最新完整事实仍为 `187/189 passed`，`.last-run.json` 的 passed 状态只来自定向集合，不得声称全绿或无界重跑。保持 Q44 仅 `parallel-5 / split-6`，不得修改 `408-user` schema v1/v2/v3、删除旧图片/测试/旧 `cpu-explorer`，提交、推送或部署；既有 P2 继续只报告不修。若继续扩充网站，先审计剩余来源候选，再写确定性红灯和最小垂直切片。

## 2026-08-07 - 五级流水线实验室垂直切片

### 当前状态

- 已完成纯逻辑 `packages/cpu-core/src/pipeline.ts`：支持 add/sub/addi/lw/sw/beq，IF/ID/EX/MEM/WB 逐周期 trace，EX/MEM 与 MEM/WB 前递，RAW/load-use 停顿，EX 判定 taken branch 冲刷，x0 抑制、uint32 回绕、稀疏 word memory、动态指令实例 ID 和 max-cycle 截断。
- 已导出三个确定性预设：ALU RAW 前递链、Load-use 停顿、分支跳转冲刷；核心边界和 golden tests 位于 `packages/cpu-core/src/pipeline.test.ts`。
- `/lab?module=pipeline` 已接入 `PipelineLabPanel`，提供自定义最多 16 条程序、寄存器/内存初值、真实前递开关、复位/前后周期/播放暂停、可点击周期表头、IF/ID/EX/MEM/WB 时空图、ST/FL 标记、当前周期事件、已提交寄存器和内存状态。
- CPU 实验室标签由 6 个扩展为 7 个；移动端为 4 + 3 两行布局，时空图只在内部横向滚动，页面和 `.main-area` 不横溢。
- 内容审计确认 2009 Q18 只考四功能段时延 `90/80/70/60ns`；现已用独立 timing 模式实现，不与五级冒险预设混用。

### 本阶段验证

- 核心首次缺少 `pipeline.ts` 的红灯证据已保留；实现后 CPU core 5 个测试文件 `163/163`，`@408os/cpu-core` typecheck 与定向 lint 通过。
- Web typecheck、页面/组件定向 lint、production build 已通过；流水线面板独立懒加载 33.94 kB，CPU 实验页 68.17 kB，PWA precache 72 项、2243.24 KiB。
- 流水线真实 Chrome 定向 E2E：1440px、1366px、390px `6/6`；动态模式覆盖三个预设、ST/FL、前递开关、播放、错误态和移动横滚，timing 模式覆盖 `90 -> 100 -> 90 ns`、Q18 真题往返和精确 URL 恢复。
- 全量最终门禁：lint 0 error、workspace typecheck 全绿、Vitest `387/387`、release `10/10`、内容 `47/47` 结构校验（人工审核仍 `0/47`）、build 通过、E2E `99/99`。

### 下一步

1. 用户本人继续 `/review/2009` 逐题人工审核；不把 Q18 概念链接或 AI 草稿当作正式验证。
2. 取得 `408-user` schema v2 授权后再做版本化 session/progress 和持久化模考。
3. Q18 独立计算器和真题深链已经完成；后续 P6 继续扩展更广的四科实验。

## 2026-08-11 - Q15 存储器芯片扩展实验检查点

### 当前状态

- Q45、Q25、Q31、Q2、Q43、Q9、Q3、Q37 与 Q6 均已收口，没有重做。
- 已对照当前题包、原卷与解析选定 Q15：主存 `64KB`，其中 ROM `4KB`、RAM `60KB`；ROM 芯片 `2K x 8 bit`，RAM 芯片 `4K x 4 bit`。只建模容量分区、位扩展、字扩展、芯片矩阵与容量守恒，不补造地址译码、片选、地址布局或总线时序。
- 已新增 `packages/cpu-core/src/memory-expansion.test.ts`，覆盖 Q15 的 ROM `1 x 2 = 2` 片、RAM `2 x 15 = 30` 片、总计 `32` 片、容量守恒、自定义合法布局、确定性、输入不变性、快照隔离、整数/宽度/深度兼容性与派生算术上界。
- 缺模块红灯已保留：`npm exec vitest run packages/cpu-core/src/memory-expansion.test.ts` 因无法解析 `./memory-expansion` 得到 `1 failed / 0 tests`。这不是回归通过；核心、Web、E2E 和全量门禁仍未完成。

### 核心绿灯

- 已实现并从 `packages/cpu-core/src/index.ts` 导出 `memory-expansion.ts`。API 严格校验运行时配置对象、正安全整数、`0 < ROM < total`、芯片位宽能整除 8 bit 编址单元、区域容量能整除芯片字数，以及派生芯片数/总容量的安全整数边界。
- trace 固定为 partition、ROM width/depth、RAM width/depth、complete 六步；Q15 得到 ROM `1 x 2 = 2` 片、RAM `2 x 15 = 30` 片、总计 `32` 片并守恒 `4KB + 60KB = 64KB`。
- 定向 Vitest `16/16`、`@408os/cpu-core` typecheck 与核心定向 ESLint 已通过。独立核心审计进行中；Web、E2E 与全量门禁尚未开始。

### Web 红转绿

- 独立核心审计未发现 P1；保留两个 P2：成功结果的 `capacityConserved` 目前是由整除因子乘回得到的恒真派生量，未独立从芯片总 bit 容量交叉计算；现有溢出测试命中区内芯片数溢出，尚未单独命中两区合计溢出分支。本轮按审计边界只记录，不扩大修复。
- Web 先新增 `MemoryExpansionLabPanel.test.tsx` 并扩展 `CpuLabPage.test.tsx`、`lab-links.test.ts`；首次定向为面板缺失 `0 test`、路由/模块数/深链共 `5 failed / 33 passed`。
- 已完成 Q15 面板、CPU 第九模块、合法 module 优先与 Q15 preset fallback、canonical/custom URL、错误 fail closed、ROM/RAM 芯片矩阵、单一 live region、真题与知识节点双向深链，以及桌面 9 列/移动 3 x 3 导航。
- 核心+页面+路由+深链定向 `4 files / 59 tests`，两个 workspace typecheck 与相关 ESLint 通过。独立 Web 审计进行中；E2E 和全量门禁尚未开始。

### 三视口浏览器检查点

- 新增 `tests/e2e/memory-expansion-lab.spec.ts`，并把 3 处既有 CPU 模块数量契约由 `8` 改为 `9`。用例覆盖 canonical/custom URL、合法 module 当前态、`2/30/32` 片结果、D、六步播放复位、非法位宽 fail closed、reload/back/forward、Q15 真题与知识双向深链、页面横溢和 `pageerror=[]`。
- 独立端口 `4220` 的真实 Chrome 1440/1366/390 定向为 `3/3`。五张截图 `chromium-1440-memory-expansion-q15.png`、`chromium-1366-memory-expansion-q15.png`、`chromium-390-memory-expansion-q15-top.png`、`chromium-390-memory-expansion-q15-state.png`、`chromium-390-memory-expansion-q15-bottom.png` 已人工检查。
- 桌面 9 列和移动 3 x 3 导航清晰；ROM 2 片、RAM 15 x 2 芯片矩阵、容量分区和步骤均非空。移动底部导航未遮挡芯片矩阵或 StepExplorer，页面无横向溢出、文字重叠或不完整控件。
- 独立 Web 审计与全量门禁已在下方完成。

### 独立审计与全量门禁

- 独立 Web 审计未发现 P1；审计另跑 Q15 三视口 `3/3`。保留三个 Web P2：冲突的其他题 preset 不规范化 URL；32 行芯片矩阵截断缺极端合法配置的专门回归；CPU tab 当前态仍只有既有 `.active`，没有 `aria-pressed`。
- 全量 `npm run lint`、workspace `npm run typecheck`、`npm run test`、`npm run test:release`、`npm run content:validate`、`npm run build` 全部通过。Vitest 为 `64 files / 752 tests`，release `10/10`，内容为 `47 题/19 资产` 且保持 `needs-review; verified 0/47`；production build 转换 `1894 modules`，PWA precache `79 entries (2514.11 KiB)`。
- 独立端口 `4223` 的真实 Chrome 1440/1366/390 全量 E2E 为 `144/144`，8 workers、30 秒全局超时不变；Q15 三视口在全量中均通过。

### 边界与下一步

- `408-user` 仍为 Dexie schema v1；`apps/web/public/content/2009/` 的 19 张旧图片仍在；`semaphore.test.ts` 仍存在且 SHA-256 为 `1AABCB04DEF264A8E6C56E3BAB9FDE0FF32D8CBE933099BE9E09A36C3D309B8B`。没有代替人工审核、修改旧 `cpu-explorer`、删除既有测试、提交、推送或部署；项目仍无 Git 元数据。
- 本地 Vite 服务仍在 `127.0.0.1:4216`，Q15 canonical URL `http://127.0.0.1:4216/lab?module=memory-expansion&preset=cn408-2009-q15` 当前返回 HTTP 200。
- Q15 已收口，不要重做。后续候选审计已选择 Q44；下一会话按顶部开场 prompt 直接从 Q44 核心缺模块红灯开始。

## 2026-08-11 - Q44 E2E 契约检查点

### 已完成

- 新增 `tests/e2e/micro-operations-lab.spec.ts`，覆盖 canonical/custom URL、5/6 拍方案、parallel C6 的 DB/内总线并行、split C6 的 unknown 暂存状态、两方案全执行拍 AB 持续驱动、16 位回绕、非法输入恢复、reload/back/forward、真题与知识双向深链、三视口截图、移动纵向顺序、页面横溢和 `pageerror=[]`。
- 将 `tests/e2e/cpu-extended-labs.spec.ts`、`pipeline-lab.spec.ts`、`io-overhead-lab.spec.ts`、`memory-expansion-lab.spec.ts` 的 CPU 模块数量契约由 `9` 更新为 `10`。
- 上述五个 E2E 文件的定向 ESLint 已通过，0 error / 0 warning。真实 Chrome 尚未运行，因此不能把该静态检查当作浏览器验收。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的 Q44 收口，不要重做核心、Web 或候选审计。Q44 核心 `14/14`，核心和 Web 独立审计均无 P0/P1；E2E 契约已新增且 lint 通过。先用独立端口 `4224` 运行 `PLAYWRIGHT_TEST_PORT=4224 npm run test:e2e -- tests/e2e/micro-operations-lab.spec.ts`，预期真实 Chrome 1440/1366/390 为 `3/3`；逐张人工检查五张 Q44 截图。若通过，及时更新 `HANDOFF.md` 与 `notes.md`，再运行 lint、workspace typecheck、全量 Vitest、release、内容校验、production build，以及独立端口 `4225` 的全量 E2E。Q44 必须保持 `needs-review`；不得修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，不得删除测试、提交、推送或部署。

## 2026-08-11 - Q44 三视口浏览器检查点

- 独立端口 `4224` 的真实 Chrome 1440/1366/390 定向 E2E 为 `3/3`。首次启动因工具层 5 秒超时留下短暂 webServer 竞争，三个项目均在首个 `page.goto` 得到 `ERR_CONNECTION_REFUSED`；确认端口和关联进程清空后干净重跑通过，该次不计为应用回归失败。
- 五张截图已逐张人工检查：桌面 10 模块导航完整，C6 同时显示 DB `memory/0x00ff` 与 CPU 内总线 `R0/0x1234`，A/MDR 已更新而 AC 保持 unknown；390px 为 2 x 5 导航，当前拍、寄存器、AB/DB/内总线和信号均无横向溢出、文字重叠或底部导航遮挡。
- 截图为 `chromium-1440-micro-operations-q44.png`、`chromium-1366-micro-operations-q44.png`、`chromium-390-micro-operations-q44-top.png`、`chromium-390-micro-operations-q44-state.png`、`chromium-390-micro-operations-q44-bottom.png`。
- 独立 E2E 复审未发现 P0/P1。P2 只记录：E2E 未重复断言 C6 的 `R0out/Ain`、终态 R0/R1 不变和 split URL 单独 reload；这些分别已有组件、核心与路由测试覆盖，不扩大本轮。
- 下一步运行 lint、workspace typecheck、全量 Vitest、release、内容校验和 production build；通过后用独立端口 `4225` 跑全量 E2E。Q44 仍为 `needs-review`。
- 全量 `npm run lint` 与 workspace `npm run typecheck` 已通过，0 error / 0 warning；全量 Vitest、release、内容校验、build 和全量 E2E 仍待运行。
- 全量 `npm run test` 已通过：`66 files / 776 tests`。release、内容校验、production build 和全量 E2E 仍待运行。
- `npm run test:release` 为 `10/10`；`npm run content:validate` 通过 47 题并保持 `needs-review; verified 0/47`。production build 与全量 E2E 仍待运行。
- `npm run build` 已通过且无 chunk 告警：Vite 转换 `1896 modules`，PWA precache `79 entries (2530.88 KiB)`。仅剩独立端口 `4225` 的全量 E2E。
- 独立端口 `4225` 的全量 E2E 首轮为 `145/147`。Q44 三视口全部通过；两个失败均为既有用例在 30 秒总超时处耗尽：1440 PDF 已渲染第一页但“下一页”点击未完成，1366 Q37 页面已完整渲染但横溢轮询未结束。先在新端口隔离复现两个完整 spec，不修改旧测试或超时合同；首轮不能记为全量通过。
- 独立端口 `4226` 隔离运行 `document-reader.spec.ts` 与 `csma-cd-collision-lab.spec.ts` 的全部三视口为 `12/12`；原失败视口分别约 10.3 秒与 11.8 秒通过。没有修改旧测试或放宽 30 秒合同，下一步用端口 `4227` 第二轮全量复验。
- 独立端口 `4227` 的第二轮全量真实 Chrome 为 `147/147`，8 workers 与 30 秒总超时保持不变；Q44 三视口在首轮和第二轮全量中均通过。Q44 已收口。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Q44 已完成核心红转绿、独立核心/Web/E2E 审计、CPU 第 10 模块、canonical URL、真题与知识双向深链、三视口截图检查和全量门禁；不要重做 Q44 或候选比较。当前基线为 lint/typecheck 全绿、Vitest `66 files / 776 tests`、release `10/10`、内容 `47 题/19 资产` 且 `needs-review; verified 0/47`、build `1896 modules` / PWA `79 entries (2530.88 KiB)`、真实 Chrome 全量 E2E `147/147`。Q44 仍为 `needs-review`，不得实现任意微操作评分器或宣称两方案穷尽所有合法答案。没有新的用户指令时不要开始下一项功能；不得修改 `408-user` schema v1、删除旧图片、修改旧 `cpu-explorer`、删除现有测试、提交、推送或部署。

## 2026-08-13 - Q5 最终收口状态

- Q5 已完成核心、独立核心审计、Web 测试先行与审计、数据结构第 8 模块、canonical/custom URL、错误 fail closed、Q5 真题/知识双向深链、三视口真实 Chrome 和五张截图人工检查。页面只推导来源支持的最大构型与受限 custom，不生成或评分任意完全二叉树；Q5 与题包仍为 `needs-review`，审核计数保持 `0/47`。
- 定向 Q5 E2E 端口 `4238` 为 `3/3`；截图为 `chromium-1440/1366/390-complete-binary-tree-q05*` 五张。独立极值复审 `L=52,k=1` 的根文档与 `.main-area` 横溢均为 0，三项指标纵向不重叠；仅保留约 1px 几何断言精度 P2。
- 新鲜源码与内容门禁：lint 通过，workspace typecheck 全绿，Vitest `70 files / 840 tests`，release `10/10`，内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`，production build `1900 modules` / PWA `79 entries (2564.22 KiB)`。
- 浏览器证据必须区分记录：默认 `8 workers`、30 秒全局超时的全量尝试端口 `4239/4241/4243/4246/4250` 分别为 `152/153`、`152/153`、`147/153`、`146/153`、`152/153`，失败在不同 1440 首屏或长链冷启动位置漂移；未修改旧测试、并发或超时合同。隔离完整 spec：数据结构 `6/6`、content-review `12/12`、Q5 `3/3`、visual `27/27`；按视口拆分的全套 153 条合计 `153/153`（1440 `50/51`，1366 `51/51`，390 `51/51`），另有 chromium-1440 单 worker 全集 `51/51`。因此 Q5 产品流程和三视口行为有完整通过证据，但默认 8-worker 单次全量仍受机器冷启动资源竞争限制，不能表述为 `153/153`。
- 运行态冒烟：`http://127.0.0.1:4216/lab/data-structures?module=complete-tree&preset=cn408-2009-q05` 返回 HTTP `200`，HTML 标题为 `408OS`。没有修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，没有删除现有测试，没有提交、推送或部署。

## 2026-08-13 - Q5 单 worker E2E 与运行态冒烟

- 独立端口 `4251` 使用既有 Playwright 项目合同，仅将 `chromium-1440` 限为 `1 worker`，完整运行 `51/51`，耗时约 `2.3m`。Q5、Q44、Q10、PDF、题库首页、Q41 和其他长链均通过；未修改 workers、超时、旧测试或应用逻辑。
- 该对照确认此前默认 `8 workers` 全量的漂移失败属于本机 1440 并发冷启动资源竞争环境 P2，而不是 Q5 回归。默认合同下的多轮实测仍按 `152/153`、`147/153`、`146/153`、`152/153` 如实保留，不宣称默认全量 `153/153`。
- 运行态冒烟：`http://127.0.0.1:4216/lab/data-structures?module=complete-tree&preset=cn408-2009-q05` 返回 `HTTP 200`，HTML `<title>` 为 `408OS`，包含应用根节点。
- Q5 与 2009 题包仍为 `needs-review; verified 0/47`。来源核对、核心/Web/E2E 门禁和运行态冒烟均不等同人工审核；实现仍只推导来源支持的最大构型与受限 custom，不生成或评分任意完全二叉树。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Q5、Q44、Q10 及候选比较均已收口，不要重做；当前新鲜证据为 lint/typecheck 全绿、Vitest `70 files / 840 tests`、release `10/10`、内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1900 modules` / PWA `79 entries (2564.22 KiB)`、Q5 定向三视口 `3/3`、按视口拆分全套 E2E 合计 `153/153`，以及 chromium-1440 单 worker 全集 `51/51`。默认 8-worker 全量的多轮结果仍受 1440 冷启动资源竞争影响，不得伪称 `153/153`。Q5 canonical URL 已实测 `HTTP 200`、标题 `408OS`。没有新的用户指令时不要开始下一项功能；不得修改 `408-user` schema v1、删除旧图片、修改旧 `cpu-explorer`、删除现有测试、提交、推送或部署。

## 2026-08-13 - 自主领域与存储审计红转绿

- 独立核心/存储审计发现两个可复现 P1：综合题 `selfScore=NaN` 会从 `evaluateResponse` 进入知识表现并传播为 `NaN`；`submitAttempt` 幂等分支会用并发调用方的旧 session 覆盖已提交 response，导致 attempt/session 不一致并使备份拒绝导入。
- 先新增回归测试，定向得到 `4 failed / 43 passed`；修复 `packages/domain/src/study.ts` 的非有限分数拒绝和综合题客观统计隔离，修复 `packages/domain/src/analytics.ts` 的有限/非负分数边界，修复 `packages/storage/src/repositories.ts` 幂等分支保留已提交 session。修复后 `packages/domain/src/study.test.ts`、`analytics.test.ts`、`packages/storage/src/storage.test.ts` 定向 `47/47`。
- 独立 Web 审计未发现新的 P0/P1；Q35 GBN、Q46 虚拟内存、Q47 网络自定义输入未写回 URL，及网络 tabs 缺 aria 选中语义列为 P2 backlog，未扩大本轮范围。
- 下一步处理 ContentReview 自动保存/批准串行化与卸载保存异常捕获，然后运行相关页面测试和全量门禁。所有题包继续 `needs-review; verified 0/47`。

## 2026-08-13 - ContentReview 写入竞态收口

- 新增 `apps/web/src/app/serial-write-queue.ts` 与 `serial-write-queue.test.ts`，以串行队列统一审核草稿、批准、驳回和卸载保存；前一写入失败不会阻塞后续写入。
- `ContentReviewPage` 的旧自动保存若尚未开始会被决定 epoch 跳过；若已经开始，则按队列先完成后再执行批准/驳回，旧完成回调不会覆盖最终状态；卸载保存显式捕获异常，避免 unhandled rejection。
- 定向相关 Vitest `5 files / 69 tests`、lint 和 workspace typecheck 全绿；production build 已通过 `1901 modules`。
- 独立端口 `4252` 的真实 Chrome content-review 三视口为 `12/12`，覆盖 47 题 URL/历史恢复、移动视图、草稿刷新、批准门禁、驳回导出；截图未新增长期保存。
- 下一步运行默认合同全量 E2E，并在完成后同步 notes 与新的下一会话 prompt。Q5/Q44/Q10 不重做，题包仍为 `needs-review; verified 0/47`。

## 2026-08-13 - 自主优化最终验收状态

- 领域与存储 P1 已修复并保留红转绿证据：综合题非有限/负分不会进入知识表现或复习计划；客观统计只计单选题；`submitAttempt` 幂等重试不会用旧 session 覆盖已提交答案，避免 attempt/session 不一致和备份拒绝导入。
- ContentReview P1 已修复：新增串行 IndexedDB 写入队列，自动保存、批准、驳回和卸载保存按顺序执行；旧草稿写入不会覆盖最终决定；卸载异步异常被捕获。新增页面竞态回归并通过。
- 最终源码门禁：`npm run lint` 通过；workspace `npm run typecheck` 通过；Vitest `72 files / 848 tests`；`npm run test:release` `10/10`；`npm run content:validate` `47 questions / 19 assets`，状态 `needs-review; verified 0/47`；`npm run build` `1901 modules`，PWA `79 entries (2564.80 KiB)`。
- 真实浏览器：端口 `4252` content-review 三视口 `12/12`；端口 `4253` 默认合同 `8 workers`、30 秒全局超时、三视口全量 `153/153`。Q5/Q44/Q10、PDF、审核工作台和既有流程均通过。
- 独立定向证据：领域/存储/队列 `69/69`，复习计划 `6/6`，ContentReview 页面竞态 `1/1`。本轮未修改题包审核状态、`408-user` schema v1、旧图片或旧 `cpu-explorer`，未删除测试，未提交、推送或部署。
- 审计结论：当前没有新的可复现 P0/P1。P2 backlog 保留 Q35 GBN、Q46 虚拟内存、Q47 网络自定义输入未写回 URL，以及网络模块 tabs 缺 aria 选中语义；这些不影响当前 preset 流程，本轮不扩大范围。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。本轮自主优化已收口：领域有限值/题型统计、幂等提交一致性、ContentReview 写入竞态均已修复并验证；不要重做 Q5、Q44、Q10 或候选比较。当前新鲜门禁为 lint/typecheck 全绿、Vitest `72 files / 848 tests`、release `10/10`、内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1901 modules` / PWA `79 entries (2564.80 KiB)`、默认三视口全量 E2E `153/153`。没有新的明确指令时，不要擅自把 P2 backlog 升级为新功能；若继续改进，先为 Q35/Q46/Q47 自定义 URL 恢复立案并先补红灯测试。不得修改 `408-user` schema v1、删除旧图片、修改旧 `cpu-explorer`、删除现有测试、提交、推送或部署。

## 2026-08-13 - 复核提效与 Q35/Q46/Q47 URL 红灯

- 用户已授权实施内容复核筛选/下一待复核、Q35/Q46/Q47 自定义状态 URL 恢复、网络模块语义导航和 Q35 脚本规模限制；不重做 Q5/Q10/Q44 或候选比较。
- 先扩展页面测试并修正测试夹具：Q1 `approved`、Q2 `rejected`、Q3 `pending`，原 ContentReview 写入竞态改从 Q3 验证，避免预置 Q1 决定干扰。
- 定向命令：`npm exec vitest run apps/web/src/pages/ContentReviewPage.test.tsx apps/web/src/pages/GbnLabPage.test.tsx apps/web/src/pages/VirtualMemoryLabPage.test.tsx apps/web/src/pages/NetworkLabPage.test.tsx`。
- 新鲜红灯为 `4 files failed`、`5 tests failed / 11 passed`：复核筛选/下一待复核、Q35 URL、Q35 16 KiB/128 动作边界、Q46 URL、Q47 URL/导航各失败 1 项；既有测试均通过。当前进入产品实现。
- 所有题继续保持 `needs-review; verified 0/47`；本次工作不写审核决定，不修改题包审核状态，不把自动测试或来源核对当作人工审核。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的复核提效与 Q35/Q46/Q47 URL 实现。红灯已稳定为 `5 failed / 11 passed`，不要重写测试契约或重做 Q5/Q10/Q44。实现复核状态筛选与循环“下一道待复核”、Q35/Q46/Q47 URL 单源恢复与 canonical reset、Q35 16 KiB/128 动作限制，以及网络模块 `nav + Link + aria-current=page`；随后跑定向 Vitest、相关 lint/typecheck、E2E、三视口截图和全量门禁。题包必须保持 `needs-review; verified 0/47`；不得修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，不得删除测试、提交、推送或部署。

## 2026-08-13 - 复核工作台与 Q35 初步绿灯

- ContentReview 新增 URL 派生的 `all/pending/rejected/approved` 筛选、带计数和 `aria-pressed` 的紧凑控制、过滤后题号列表，以及按题号向后循环的“下一道待复核”。题号跳转继续复用原 `goToQuestion`，因此脏草稿保存和串行写入规则不变；筛选不写任何复核记录。
- 移动端把筛选和题号各自放入横向滚动区，“下一道待复核”收为带可访问名称的图标按钮；待三视口浏览器和截图人工检查确认布局。
- Q35 改为 URL 单一输入源：精确 Q35 preset 优先，custom 读取/写回 `sequenceSpace/windowSize/script`，编辑使用 replace 且移除 preset，恢复写回 canonical Q35 URL。解析前拒绝超过 `16384` 字符或 `128` 条非空动作，错误 fail closed；未增加任意脚本评分器。
- 独立验证：ContentReview 页面 `2/2`、Q35 页面 `7/7`；两个实现的相关 ESLint 与 Web typecheck 均通过。Q46/Q47 与公共网络导航仍在实现，联合定向尚未运行。

## 2026-08-13 - Q46/Q47 与联合页面绿灯

- Q46 从 URL 直接派生 `addresses/tlbNs/memoryNs/faultNs`，Q47 直接派生 `cidr/subnets/destination`；精确 preset 时来源预设优先，custom 编辑 replace 写完整参数且移除 preset，恢复按钮写回各自 canonical URL。
- `NetworkModuleTabs` 从命令按钮改为语义 `nav + Link`，四个链接均指向对应 canonical preset，当前模块使用 `aria-current="page"`。Q37 组件/E2E 的旧 4-button 断言同步为更严格的 4-link + 当前项语义断言，未删除测试。
- 联合定向 Vitest：ContentReview、Q35、Q46、Q47、Q37、Q39、网络路由共 `7 files / 32 tests` 全绿。Q46/Q47 独立相关 ESLint、Web typecheck 已通过；下一步复核实现、运行完整相关静态检查和定向三视口 E2E。

## 2026-08-13 - 三视口 E2E 首轮未通过

- 独立端口 `4254` 运行 content-review、protocol-labs、system-labs、csma-cd 四个 spec，默认 8 workers、30 秒合同，共 `33` 条，首轮实测 `22 passed / 11 failed`，不能记为浏览器通过。
- 两类确定性失败属于 E2E 契约错误：Q35 `getByLabel('序号空间')` 同时部分匹配输入和“发送端序号空间”容器；Q37 虽已断言 4 个 link，下一行仍残留旧 button 当前态断言。已分别收紧为 exact textbox 和 link。
- 其余首屏失败发生于 1440/1366 并发冷启动，标题在 5 秒内未出现；390 的 Q46/Q47、content-review 和 disk 已通过。这类失败先保留为未归因，必须在修正确定性契约后用干净端口隔离/联合复跑，不能直接当作产品回归或环境豁免。

## 2026-08-13 - 独立审计 P1 与 Q35 URL 预算红转绿

- 独立实现审计立案 ContentReview P1：approve/reject promise 未完成时，题号、上一/下一题、新增“下一待复核”和表单仍可操作，可能让决定之后的草稿把最终状态降回 pending，或把审批开始后的修改误标为已保存。先加 deferred-decision 回归，得到 `1 failed / 2 passed`；随后 `goToQuestion/setReviewFilter` 忙时短路，题号/筛选/上一下一题/下一待复核/checkbox/reviewer/issue 全部在决定期间 disabled，转绿为 `3/3`。
- 独立 E2E 审计立案 Q35 URL 可恢复边界：16 KiB 文本若直接写进 URL，合法但接近上限的查询串会超过常见 HTTP request-line/header 预算，reload 可能得到 431。新增 8000 字符编码查询串预算回归，先红 `1 failed / 7 passed`；实现将不可安全序列化的拒绝态只保留在当前 location key 的局部完整 draft，fail closed 且不污染 history，缩回预算后重新写入 URL。
- 当前受限权限禁止 Node 派生 `net use`、esbuild 和 fork worker，默认 Vitest 无法启动。使用一次性、零仓库改动的 Node API 验证适配：Vite 走官方 realpath fallback、TypeScript `transpileModule` 替代 esbuild TS/TSX 转换、Vitest thread 单 worker；新鲜结果 ContentReview `3/3`、Q35 `8/8`，合计 `2 files / 11 tests`。TypeScript 与相关 ESLint 也通过。
- E2E 第二轮端口 `4255` 在测试 locator 修正后为 `30/33`；Q35 三视口唯一剩余失败仍是 reload 后另一处未收紧的 `getByLabel('序号空间')`，实际 input 值为 4。已收紧，并加强 Q35/Q46/Q47 为 sentinel + 多字段 replace + back/forward 契约，尚未重跑。

## 2026-08-13 - ContentReview 卸载决定竞态红转绿

- 在冻结可见控件后继续审计发现同一 P1 的卸载变体：approve/reject pending 时浏览器 Back 或卸载会触发 cleanup `persistDraft`，旧草稿排在决定之后仍可把记录降回 pending。
- 先新增 deferred approval + unmount 回归，动态得到 `1 failed / 3 passed`，实测 `saveContentReviewDraft` 在决定后被调用 1 次。
- 修复新增同步 `decisionBusyRef`：决定开始时先置 true，所有 `persistDraft` 入口（按钮、650ms 自动保存、切题和卸载 cleanup）首先拒绝；finally 再清除。顶部“返回总览”同时 disabled，但浏览器 Back 仍由 ref 防守。
- 零落盘 Vitest Node API适配复跑后 ContentReview `4/4`。受影响七页联合测试在卸载修复前已为 `34/34`；下一步复跑联合静态/动态并做独立复审。

## 2026-08-13 - 受影响页面联合回归

- 卸载决定防线后重新联合运行 ContentReview、Q35、Q46、Q47、Q37、Q39 和网络路由测试，受限环境下使用前述零落盘 Vitest Node API 适配，新鲜结果为 `7 files / 35 tests passed`。
- 相关 TypeScript 检查通过；实现、单测与 E2E 的定向 ESLint 为 0 errors，`styles.css` 不在 ESLint 配置范围内，只报“File ignored” warning。
- 联合回归包含延迟决定期间冻结编辑/导航、卸载不追加旧草稿、Q35 16 KiB/128 动作/编码 URL 预算、Q46/Q47 URL 恢复以及公共网络链接语义。默认 Vitest 门禁仍需在允许 Node 子进程的环境中复验。

## 2026-08-14 - 决定已持久化但刷新失败的竞态红灯

- 最终独立逻辑复审发现新 P1：`approve/reject` 在 repository 已完成 durable 写入后仍 `await reload()`；若后续任一读取失败，页面把整个决定视为失败并保留 dirty，650ms 自动保存会用 `pending` 草稿覆盖刚持久化的 approved/rejected。
- 新增 `apps/web/src/app/StudyContext.test.tsx` 定向复现“approve 成功、后续 review list 刷新失败”；零落盘 Vitest Node API 实测 `1 failed / 0 passed`，commit outcome 为 `failed`、本地决定为 `missing`。当前进入 StudyContext 的 durable-write / refresh 边界修复。

## 2026-08-14 - 复核提效与实验 URL 优化收口状态

- StudyContext 将 content-review repository 返回视为 durable commit 边界：先把返回 record 合并进 context，再尝试全量 `reload()`；刷新失败只保留已持久化的 record，不再 reject commit promise。红灯后定向 StudyContext + ContentReview 为 `2 files / 5 tests passed`。
- 最新全量静态门禁：`npm run lint` 通过；`npm run typecheck` 所有 workspace 通过。受限环境中用零落盘 Node API 适配执行全部 Vitest 逻辑，新鲜结果 `74 files / 857 tests passed`。
- content validation 用同样的进程内模块加载实测通过：`47 questions / 19 assets (40 objective, 7 comprehensive)`，`Review status: needs-review; verified 0/47`。release 测试逻辑进程内执行 `10/10` 通过。
- 默认 `npm run test:release`、`npm run content:validate`、`npm run build` 和 Playwright 均在启动 Node 子进程/esbuild/browser worker 时被当前沙箱以 `spawn EPERM` 拒绝。build 的进程内尝试仍被 Vite HTML/PWA 内部 esbuild 路径拦截，因此不能宣称本轮 production build 或强化后 E2E 已通过。稳定服务器可进程内返回 HTTP 200，PowerShell 启动 Chrome 调试进程被策略拒绝；应用内 Browser 访问 localhost 又被用户权限拒绝，遵守安全边界不再尝试绕过。
- 旧环境中本轮页面修改后的最新浏览器记录为端口 `4255` 的 `30/33`；当时三个剩余失败只是 Q35 reload 后未收紧 locator，已修正，后续又补强了 Q35/Q46/Q47 sentinel + Back/Forward 合同，但受限环境中尚未执行该最终版本。
- 截图独立审计查看 ContentReview/Q35/Q46/Q47 的 1440/1366/390 新鲜图，可见区域无 P0/P1。已确认 P2：Q47 移动标题有孤字换行；Q46/Q47 移动 fullPage 未完整捕获内部滚动区下段，是视觉证据缺口，不冒充为已完整审计。
- 全部题包仍为 `needs-review; verified 0/47`；未修改 `408-user` schema v1、旧图片、旧 `cpu-explorer`，未删除测试，未提交、推送或部署。

## 2026-08-15 - 正式 production build 收口

- 环境权限已恢复 unrestricted，按计划重跑默认 `npm run build`。
- 实测通过：TypeScript 编译通过，Vite 转换 `1901 modules`，PWA/static-copy 产物正常生成，无 chunk warning；耗时约 17.1 秒。
- 下一步是重跑 release/content 验证与强化后三视口 E2E，再做默认全量 E2E。

## 2026-08-15 - release 与内容门禁恢复

- 在 unrestricted 环境直接运行 `npm run test:release`，实测 `10 tests / 10 pass / 0 fail`。
- 直接运行 `npm run content:validate`，实测 `cn408-2009: 47 questions (40 objective, 7 comprehensive)`；审核状态仍为 `needs-review; verified 0/47`。
- 下一步进入强化后的 content-review、protocol-labs、system-labs、csma-cd 相关三视口 E2E；该步骤完成后再跑默认全量 E2E。

## 2026-08-15 - 相关 E2E 并发复跑记录

- 独立端口 `4261`、默认 `8 workers`、四个相关 spec 共 `33` 条：首轮 `32 passed / 1 failed`。唯一失败为 `chromium-1366` ContentReview 历史恢复用例在 30 秒超时；失败截图停在通用“载入页面” Suspense，未出现断言错误。
- 同一用例在独立端口 `4262`、`chromium-1366`、`1 worker` 单独执行通过（用例动作约 1.8 秒），支持“并发冷启动/资源争用”而非产品逻辑失败的判断，但不替代默认并发合同。
- 换独立端口 `4263` 按原合同重跑，结果 `27 passed / 6 failed`；6 个失败集中于桌面首个实验页面在 5 秒内仍处于“载入页面”，Q35/Q46/Q47 后续交互及全部移动用例通过。当前把该结果记录为桌面并发冷启动不稳定，暂不修改产品或放宽测试超时；需先用低并发建立稳定浏览器证据，再尝试默认全量门禁。

## 2026-08-15 - 相关三视口 E2E 功能绿灯

- 独立端口 `4264`、三个真实 Chrome 项目、`2 workers` 重跑相同四个 spec，实测 `33/33 passed`，耗时约 1.2 分钟。
- 该结果完整覆盖 ContentReview 筛选/下一待复核/历史恢复，Q35/Q46/Q47 custom URL 的 reload、sentinel Back/Forward、canonical reset，以及网络模块 Link/`aria-current` 语义。它证明功能路径稳定，但默认 `8 workers` 的冷启动不稳定仍需在全量门禁中单独验证。

## 2026-08-15 - 新鲜截图复核与移动分段证据

- 人工查看本轮 2026-08-15 生成的 ContentReview、Q35、Q46、Q47 1440/1366/390 截图：桌面布局、复核移动筛选、Q35 移动 top/bottom 均未发现重叠、横向溢出或遮挡等 P0/P1。
- Q46/Q47 的 390 `fullPage` 仍只捕获 `.main-area` 内部滚动区上段，随后是空白；这确认是截图采集方式缺口，不是已证实的产品布局错误。Q47 标题“室”单独换行仍是 P2，未擅自修改。
- 已把 `tests/e2e/system-labs.spec.ts` 对 Q46/Q47 的移动截图改为项目既有的 top/state/bottom 分段模式，桌面仍保留 fullPage；定向 ESLint 通过。随后权限切回 managed，浏览器启动被 `spawn EPERM` 拒绝，新增分段文件尚未实际生成，不能记为视觉通过。

## 2026-08-15 - 当前最终门禁状态

- 补充分段截图代码后，正式 `npm run lint` 与 `npm run typecheck` 均通过；所有 workspace typecheck 绿色。
- `npm test` 在加载 `vitest.config.ts` 时因 esbuild 子进程 `spawn EPERM` 未启动测试；最新完整逻辑证据仍是改产品实现后的进程内 Vitest `74 files / 857 tests passed`。本轮之后只修改了 E2E 截图采集，不影响这 857 项逻辑，但不能称默认 Vitest 已通过。
- 默认 `npm run test:e2e` 同样在 Playwright spawn 阶段 `EPERM`，未开始任何用例。当前已通过的浏览器合同是相关四 spec、三项目、2 workers 的 `33/33`；默认 8-worker 全量 E2E 仍未收口。
- 同一最新产品源码已有正式 build `1901 modules`、release `10/10`、content validate `47 questions / 19 assets` 且 `needs-review; verified 0/47`。之后仅改 E2E 截图代码，无产品构建输入变化。
- 边界保持：没有修改 `408-user` schema v1、旧图片或旧 `cpu-explorer`，没有删除测试、提交、推送或部署；Q44 仍不包含任意评分器，也不声称两套 trace 穷尽所有合法答案。

## 2026-08-15 - Q46/Q47 移动分段截图动态绿灯

- 权限恢复 unrestricted 后，独立端口 `4265` 运行 `system-labs.spec.ts --project=chromium-390 --workers=1`，实测 `2/2 passed`。
- Q46/Q47 的 390 top/state/bottom 六张分段截图已由真实 Chrome 生成，证明新增采集逻辑可执行；下一步逐张人工检查，再进入默认 Vitest 与默认 8-worker 全量 E2E。

## 2026-08-15 - Q46/Q47 移动分段截图人工检查

- 六张新鲜分段图已逐张查看。Q46 覆盖输入、TLB/页表/LRU、Step Trace 和访问时间线；Q47 覆盖输入、子网表、聚合、R1 路由表、最长前缀结果和 Step Trace。
- 未发现重叠、固定底栏遮住关键内容或页面级横向溢出等 P0/P1。Q46 `state`/`bottom` 因剩余滚动距离短而画面重合，属于证据冗余，关键下段仍已完整捕获；Q47 标题孤字换行仍保留为 P2。

## 2026-08-16 - 默认 Vitest 正式门禁

- unrestricted 环境直接运行默认 `npm test`，Vitest `v4.1.10` 正式 worker 模式实测 `74 files / 857 tests passed`，无失败，耗时约 37.5 秒。
- 此结果覆盖最新产品实现和 Q46/Q47 分段截图测试改动；此前进程内 Vitest 适配不再是当前唯一全量逻辑证据。下一步只剩默认 8-worker 三视口全量 E2E。

## 2026-08-16 - 默认 8-worker 全量 E2E 红灯

- 默认 `npm run test:e2e` 实际启动 `156 tests / 8 workers / 3 projects`，首轮结果 `152 passed / 4 failed`，耗时约 3.5 分钟，不能记为全量通过。
- 4 个失败全部位于 `chromium-1440` 第一波并发导航，分别是 Q14、Q37、Q41、Q25，均为默认 5 秒标题等待超时；对应失败截图生成时目标页面和标题已经完整可见，1366/390 同用例全部通过。这证明业务页面随后正常完成渲染，红灯集中在首批生产 PWA/lazy-route 冷启动争用。
- production service worker 会在每个隔离浏览器上下文首次 load 时预缓存全部 build 资产；当前 8 个首批 worker 同时安装相同 precache，属于与多数实验合同无关的测试资源争用。下一步让普通 E2E 默认阻止 service worker，仅在明确验证 PWA/offline 的 `study-flow` 与 `document-reader` spec 中显式允许；保留 30 秒 test timeout 和现有业务断言。

## 2026-08-16 - E2E service-worker 隔离红转绿

- `playwright.config.ts` 现让普通 E2E 默认 `serviceWorkers: 'block'`；`apps/web/e2e/study-flow.spec.ts` 与 `tests/e2e/document-reader.spec.ts` 显式 `allow`，因此只有真正验证 PWA/offline 的合同安装 precache。
- 定向 ESLint 与 workspace typecheck 通过。独立端口 `4266`、`chromium-1440`、最大 8 workers 联合重跑四个原失败 spec 和两组离线/PWA spec，实测 `14/14 passed`；Q14/Q37/Q41/Q25 全绿，PWA 安装、PDF 离线重开也全绿。
- 修复没有放宽 30 秒 test timeout、标题断言或产品行为。下一步重跑默认三视口全量 156 条。

## 2026-08-16 - 复核提效与实验 URL 优化最终收口

- 默认 `npm run test:e2e` 在 service-worker 测试隔离后正式执行 `156 tests / 8 workers / 3 projects`，实测 `156/156 passed`，耗时约 3.0 分钟。三个视口、Q5/Q10/Q44、ContentReview、Q35/Q46/Q47、PWA 安装与 PDF 离线读取均通过。
- 最终门禁：`npm run lint` 通过；workspace `npm run typecheck` 通过；默认 Vitest `74 files / 857 tests`；release `10/10`；内容 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），审核状态保持 `needs-review; verified 0/47`；production build `1901 modules`；默认全量 E2E `156/156`。
- 三视口截图已人工检查：ContentReview/Q35/Q46/Q47 可见区域及 Q46/Q47 移动 top/state/bottom 下段无 P0/P1。仅保留 Q47 移动标题孤字换行 P2，不在本轮擅自扩大范围。
- 自动测试和来源核对不等于人工审核。Q44 仅实现来源支持的 `parallel-5` / `split-6` 确定性 trace，不包含任意微操作评分器，也不声称 Q44 两套 trace 穷尽所有合法答案。
- 未修改 `408-user` schema v1、旧图片或旧 `cpu-explorer`，未删除现有测试，未提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。复核工作台提效、Q35/Q46/Q47 custom/canonical URL、网络 Link 语义、Q35 输入/URL 预算、ContentReview 写入竞态与 E2E service-worker 隔离均已收口；不要重做 Q5/Q10/Q44 或候选比较。最新正式门禁为 lint/typecheck 全绿、Vitest `74 files / 857 tests`、release `10/10`、内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1901 modules`、默认 8-worker 三视口全量 E2E `156/156`；Q46/Q47 六张移动分段图已人工检查，无 P0/P1。没有新的明确用户指令时不要开始下一项功能。不得把自动测试或来源核对当成人工审核，不得实现任意微操作评分器或声称 Q44 两套 trace 穷尽所有合法答案；不得修改 `408-user` schema v1、删除旧图片、修改旧 `cpu-explorer`、删除现有测试、提交、推送或部署。

## 2026-08-16 - README 基线同步与用户数据版本边界审计

- README 末尾仍停在 Q10 的旧基线 `68 files / 808 tests`、build `1898 modules`、E2E `150/150`；已同步为当前正式门禁 `74 files / 857 tests`、build `1901 modules`、默认三视口 `156/156`，并说明普通 E2E 与离线/PWA 合同的 service-worker 隔离。
- 只读审计确认 Attempt 已持有 `questionContentVersion`，统计、当前错题和每日计划可按题面版本过滤；但 `StudySession` 的题目列表/草稿与 `QuestionProgress` 的人工掌握度、累计计数仍只有 `questionId`。题包版本变化后，旧未提交草稿可能在新题面上恢复并提交，旧手工掌握度也会直接显示在新题面。
- 该缺口不能在不改变持久化契约的情况下可靠判定：旧 open session 没有证据说明每道未提交草稿属于哪个版本，旧手工 mastery 也无法安全归属当前题面。不得用当前 manifest 猜填、把版本塞进 session id/settings，或静默清空旧数据冒充迁移。
- 推荐 schema v2：session 保存每题内容版本快照；progress 改为题号+题面版本作用域；迁移只从带版本 Attempt 重建可证明的派生计数，无法证明版本的旧草稿/手工 mastery 保留为 legacy 且不参与当前题面；backup v2 同步校验这些关系，并保留 v1 只读导入迁移路径。该方案尚未获数据库 schema 红线授权，未修改任何类型、表、测试或运行时行为。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。当前功能与全量门禁已经收口，README 也已同步到 Vitest `74/857`、build `1901 modules`、默认三视口 E2E `156/156`。下一项高价值工作是 `408-user` schema v2 的题面版本隔离，但数据库 schema 属于红线，尚未获得明确授权；不得开始实现。若用户授权，先写 v2 类型/迁移/backup 的红灯测试，保持 v1 schema 定义不变并提供 v1 -> v2 fail-closed 迁移；否则只报告设计，不改 schema。所有题仍为 `needs-review; verified 0/47`；不得删除旧图片、修改旧 `cpu-explorer`、删除测试、提交、推送或部署。

## 2026-08-16 - schema v2 红灯契约

- 用户已明确授权新增 `408-user` schema v2；约束是保留 v1 定义、v1 数据不猜填、不静默清空，迁移无法证明的题面版本必须 fail-closed。
- 先新增 `packages/storage/src/user-schema-v2.test.ts`，覆盖旧会话版本推导、冲突版本降级 legacy、按题面版本重建 progress、恢复前版本一致性检查和 48 条确定性生成样本的不变量。
- 定向命令 `npm exec vitest run packages/storage/src/user-schema-v2.test.ts` 实测红灯：`1 failed suite / 0 tests`，失败原因为 `./user-schema-v2` 实现模块不存在；不是断言或环境失败。
- 下一步实现 domain 版本字段、纯迁移 helper 和 Dexie v2 新表；保持 `version(1).stores(...)` 原样不动，再转绿上述契约。

## 2026-08-16 - schema v2 纯 helper 转绿、数据库迁移红灯

- `packages/storage/src/user-schema-v2.ts` 已实现：旧 session 只从同题 Attempt 推导唯一版本，未知/冲突使用 `LEGACY_CONTENT_VERSION`；按题号+题面版本重建 progress；恢复前拒绝 legacy、缺失、多余和不匹配版本。
- 纯迁移契约转绿：`user-schema-v2.test.ts` 前 4 项通过，包含 48 条确定性样本的不变量与重复运行确定性。
- 新增 v1 IndexedDB fixture 后定向结果为 `5 tests / 1 failed`；唯一失败是 `UserDatabase.verno` 仍为 `1`，说明 Dexie v2 新表与升级回调尚未接入。当前不改 `version(1).stores(...)`。
- 下一步只接入 `versionedProgresses` 新表、session 版本快照升级和 legacy progress 保留，再复跑该文件。

## 2026-08-16 - Dexie v2 迁移转绿

- `UserDatabase` 保留完全不变的 `version(1).stores(...)`，新增 `version(2)` 的 `versionedProgresses` 复合主键 `[questionId+questionContentVersion]`。
- v1 upgrade callback 从 Attempts 重建版本化 progress，把每个旧 session 的同题唯一 Attempt 版本写入快照；无 Attempt 或冲突版本写 `LEGACY_CONTENT_VERSION`。旧 `progresses` 表不清空、不覆盖，保留手工 mastery 作为 legacy evidence。
- `user-schema-v2.test.ts` 当前 `5/5 passed`，包含真实 fake-indexeddb v1 fixture 升级、版本快照和 legacy progress 保留。
- 下一步切换 `DexieStudyRepository` 到 `versionedProgresses`，补 session/attempt 版本一致性和 v2 backup；旧 v1 backup 仍需只读迁移入口。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。schema v2 已获明确授权，红灯契约在 `packages/storage/src/user-schema-v2.test.ts`，当前为 `1 failed suite / 0 tests`（缺少 `user-schema-v2.ts`）。先实现 `LEGACY_CONTENT_VERSION`、旧 session 只按 Attempt 推导版本、冲突/未知版本 fail-closed、按 question+contentVersion 重建 progress；随后新增 Dexie v2 `versionedProgresses`，绝不改写 `version(1).stores(...)`。再扩展 v1→v2 数据库迁移、backup v2、Practice 恢复阻断和三视口 E2E。每个关键步骤更新 HANDOFF/notes；题包仍 `needs-review; verified 0/47`，不得删除旧图片、修改旧 `cpu-explorer`、删除测试、提交、推送或部署。

## 2026-08-16 - repository 与 backup v2 迁移转绿

- `DexieStudyRepository` 已改用 `[questionId+questionContentVersion]` 作用域的 `versionedProgresses`；session 写入、Attempt 提交和手工 mastery 均拒绝空版本、legacy 版本或 session/attempt 版本不一致。latest open session 不再恢复无法证明版本的 legacy session。
- `BackupService` 现在导出 `schemaVersion: 2`：active `progresses` 与旧 v1 `legacyProgresses` 分开保存；v1 输入仍由原 schema 严格预检，再仅从 Attempt 推导 session 版本与 active progress，旧 progress 原样留在 legacy 表。迁移结果还会重新通过 v2 schema 校验后才写库。
- 新增 `backup-v2.test.ts` 的首次运行为 `2/2 failed`：旧实现仍导出 v1，且 v1 导入未建立 session 版本快照。完成实现后，`backup-v2.test.ts`、`user-schema-v2.test.ts`、`storage.test.ts` 联合为 `3 files / 34 tests passed`。
- 同一轮 storage typecheck 首次因 Zod 可选字段与 `exactOptionalPropertyTypes` 边界失败；在已通过运行时 schema 的迁移边界显式收窄领域类型，并对输出二次执行 v2 schema 后，`npm run typecheck -w @408os/storage` 通过。
- `version(1).stores(...)` 仍未改写，v1 progress 未删除或覆盖。下一步补 Practice fail-closed、repository 双版本隔离与 backup UI/E2E 回归，再跑全量门禁。

## 2026-08-16 - Practice fail-closed 与 backup UI 回归转绿

- Practice 新增回归：迁移得到 `LEGACY_CONTENT_VERSION` 的 session、以及与当前题包版本不一致的 session，均显示“无法恢复练习”，不渲染题干、不允许继续提交，并提供返回真题路径。
- Settings 的备份标识已从 `BACKUP V1` 更新为 `BACKUP V2`，仍接受 v1 JSON 导入以保持迁移兼容。
- 红灯先行：新增 Settings 可见契约后定向 `PracticePage + SettingsPage` 为 `1 failed / 7 passed`，唯一失败是实现仍显示 `BACKUP V1`；更新文案后为 `2 files / 8 tests passed`。
- 仍保持题包 `needs-review; verified 0/47`，自动校验不等于人工审核。

## 2026-08-16 - 版本化 repository 审计红转绿

- 新增 storage 回归覆盖同题两个 content version 的 progress、手工 mastery 隔离，以及 legacy session/legacy mastery/版本不匹配 Attempt 的写入阻断。
- 首次运行 `packages/storage/src/storage.test.ts` 为 `29 tests / 1 failed`：发现 `recordAttempt` 与 `submitAttempt` 的 change-log entity key 仍只有题号，两个版本无法在审计记录中区分。
- 修复后该文件 `29/29 passed`；progress change-log 现在统一使用 `${questionId}:${questionContentVersion}`，与 compound progress key 保持一致。

## 2026-08-16 - backup v2 语义与 UI/E2E 契约补齐

- backup v2 新增 fail-closed 回归：Attempt 的 content version 若与 session snapshot 不一致，`preflight` 拒绝导入。
- Settings 与两套 study-flow E2E 已同步到 `BACKUP V2` / `schemaVersion: 2`；v1 损坏 JSON 导入测试仍保留，验证向后兼容入口而非改变旧 schema。
- 目标定向联合结果：`5 files / 45 tests passed`，覆盖 storage migration、backup v2、repository 隔离、Practice 恢复阻断和 Settings 文案。

## 2026-08-16 - schema v2 静态门禁

- 全 workspace `npm run typecheck` 通过，包含 web、domain、storage、content-schema、cpu-core、lab-core。
- 首轮 `npm run lint` 仅发现两个新增测试未使用 import（`QuestionProgress`、`afterEach`）；删除无效 import 后，全仓 ESLint 通过。
- 当前未发现仍把学习备份 UI/导出断言固定为 v1 的遗漏；content-review ledger、document library 等独立 schema v1 保持不变。

## 2026-08-16 - schema v2 三视口 E2E

- 首轮独立端口 `4270`、2 workers、三项目执行 `tests/e2e/study-flow.spec.ts`：既有 21 项与新增 v1 导入 3 项通过；新增 legacy/mismatch 夹具三视口失败于 `page.evaluate: Resulting promise was garbage collected`，属于夹具在数据库连接尚未稳定时的未处理事务，不是页面断言失败。
- 夹具改为等待题库标题可见，并捕获 IndexedDB open/transaction 的 blocked、abort、同步异常；独立端口 `4271`、3 workers 重跑 legacy/mismatch 场景实测 `3/3 passed`。
- v1 导入场景真实检查 `sessions.questionContentVersions`、`versionedProgresses` 和保留的 legacy `progresses`；恢复阻断场景覆盖三视口。

## 2026-08-16 - study-flow 三视口 E2E 最终绿灯

- 独立端口 `4272`、2 workers、三项目完整执行 `tests/e2e/study-flow.spec.ts`，实测 `24/24 passed`。
- 新增 v1 backup 迁移、schema v2 导出断言、legacy/mismatch session fail-closed 均在真实 production preview 中通过；既有作答、笔记、收藏、统计、备份恢复路径无回归。

## 2026-08-16 - BACKUP V2 三视口截图检查

- 新增 visual contract 后端口 `4273` 三视口 `3/3 passed`，但首轮人工查看发现 1366/390 截图未完整覆盖 BACKUP V2 区块；这是采集证据缺口，不是产品布局失败。
- 测试改为先把目标 backup band 滚入视口，端口 `4274` 再次 `3/3 passed`；重生成并逐张查看 1440、1366、390 截图。
- BACKUP V2 标签、导入/导出按钮、storage facts 与移动底栏均无重叠、截断或页面级横向溢出，未发现 P0/P1；390 下按钮并排仍完整可读。内容状态画面仍为 `needs-review`。

## 2026-08-16 - 空白版本 fail-closed 红转绿

- 核心复审新增 contract：空白 `questionContentVersion` 不得写入 session，也不得被 `getLatestOpenSession` 当作可恢复会话。
- 首次 storage 定向结果 `29 tests / 1 failed`，确认为空白版本 saveSession 会错误 resolve。
- `assertWritableStudySession` 现统一校验版本映射存在、键集合精确、值非空白且不是 legacy；Attempt 和 latest-open 路径复用同一 guard。修复后 `storage.test + user-schema-v2.test` 为 `2 files / 34 tests passed`。

## 2026-08-16 - schema v2 全量逻辑与内容门禁

- 默认 worker-mode `npm test` 实测 `76 files / 869 tests passed`，无失败或跳过。
- `npm run test:release` 实测 `10/10 passed`；`npm run content:validate` 实测 `47 questions (40 objective, 7 comprehensive)`。
- 内容审核状态明确保持 `needs-review; verified 0/47`；这些自动门禁不构成人工审核。

## 2026-08-16 - schema v2 静态与 production build 门禁

- 最终全仓 `npm run lint` 通过；workspace `npm run typecheck` 全部通过。
- `npm run build` 正式通过：Vite `1902 modules transformed`，static-copy `198 items`，PWA precache `79 entries`，无 chunk warning。
- build 模块数从 schema v2 前的 1901 增至 1902，符合新增 `user-schema-v2` 运行时模块。

## 2026-08-16 - schema v2 全量 E2E 与收口

- 默认配置、独立端口 `4275`、`8 workers / 3 projects` 全量 `npm run test:e2e` 实测 `165/165 passed`，耗时约 2.2 分钟；新增 v1 backup、legacy/mismatch recovery 和 BACKUP V2 visual contract 均包含在内。
- 三视口新鲜截图已人工检查：Settings 的 BACKUP V2 区块在 1440/1366/390 均完整可读，按钮无重叠或横向溢出，移动底栏未遮挡关键内容；未发现 P0/P1。Q47 移动标题孤字换行仍是既有 P2，不在本次范围内。
- 最终基线：lint/typecheck 全绿；Vitest `76 files / 869 tests`；release `10/10`；内容 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），`needs-review; verified 0/47`；build `1902 modules`；E2E `165/165`。
- `UserDatabase.version(1).stores(...)` 原文保留，新增仅为 v2 `versionedProgresses`；旧 progress 未删除，旧图片 19 张仍在，旧 `cpu-explorer` 未修改。未删除测试、提交、推送或部署。
- 自动测试、来源核对和截图检查都不构成人工审核。Q44 仍只提供来源支持的 `parallel-5 / split-6` 确定性 trace，不实现任意微操作评分器，也不声称两套方案穷尽所有合法答案。

## 2026-08-16 - migration fixture cleanup hardening

- 将 v1→v2 fake-IndexedDB fixture 的连接和数据库删除放入 `try/finally`，保证断言失败时也不污染后续测试环境。
- 回归：`user-schema-v2.test.ts` `5/5 passed`；默认 Vitest 再跑仍为 `76 files / 869 tests passed`。该步只改测试清理，不改变运行时契约或门禁数字。
- cleanup hardening 后最后一次 `npm run lint` 与 workspace `npm run typecheck` 仍全绿。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。`408-user` schema v2 已获授权并完成：session 题面版本快照、按题号+版本隔离 progress、v1 Dexie/backup fail-closed 迁移、Practice legacy/mismatch 阻断、BACKUP V2、三视口 E2E 与截图检查均已收口。最新门禁为 lint/typecheck 全绿、Vitest `76/869`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1902 modules`、默认 8-worker 三视口 E2E `165/165`。没有新的明确用户指令时不要开始下一项功能；若继续审计，先复核 v1 stores 未改和 legacy 数据保留，不要重做 Q5/Q10/Q44 或候选比较。不得把自动验证当人工审核，不得修改 Q44 边界、删除旧图片/测试、修改旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-16 - backup merge 一致性红灯

- schema v2 收口后的下一步只读审计确认：模考页面当前同时受 `verified` 整卷门禁和新持久化表授权约束，不应先做一个当前题包不可用的页面；先处理无需改 schema 的 backup 可靠性缺口。
- `BackupService.importJson` 的公开 `merge` 模式只校验导入包自身，未校验与现有数据库的联合状态。同题同版本的两份独立历史合并后，Attempt 会并存，但 imported progress 会覆盖 existing progress，导致计数与 Attempt 不一致；未知运行时 mode 也会被隐式当作 merge。
- 先在 `packages/storage/src/backup-v2.test.ts` 新增重叠题面历史 fail-closed、无歧义并集成功和未知 mode 拒绝契约。定向 Vitest 新鲜红灯为 `1 file / 6 tests`，其中 `2 failed / 4 passed`；两个失败都因 promise 错误 resolve，精确证明旧实现缺少联合预检和运行时 mode 白名单。
- 下一步在同一 Dexie 事务内读取当前数据，将 current + incoming 构造成 v2 联合候选并通过完整跨表 schema；任何重复主键、同题同版本 progress、同题 note 或 setting 等歧义均在写入前拒绝。`replace` 语义保持不变，v1 输入仍先迁移到 v2。

## 2026-08-16 - backup merge 定向转绿

- `BackupService.importJson` 现在先执行运行时 mode 白名单；未知字符串不会再落入 merge 分支。
- merge 在同一 Dexie 读写事务内读取当前七类备份数据，将 current + incoming 组成完整 backup v2 候选并执行既有 schema 的重复键和跨表语义校验。只有无歧义并集才写入；同题同版本 progress、重复 session/Attempt、同题双 note、重复 collection/setting 或任何联合 session/Attempt/progress 矛盾都会在第一笔写入前中止。
- 没有猜测 manual mastery、note 或 setting 的冲突胜者，也没有丢弃历史；`replace` 路径和 v1→v2 迁移路径保持原样。
- 定向 `backup-v2.test.ts` 当前 `8/8 passed`。除两项红灯外，补充验证同题不同版本的 24 条确定性分组样本可安全并集，重新 export 后仍能通过 v2 preflight；同题不同 note id 会 fail-closed 且保留当前数据。
- storage 联合回归 `backup-v2 + user-schema-v2 + storage` 为 `3 files / 42 tests passed`；`@408os/storage` typecheck 与两个改动文件的 ESLint 均通过。下一步进入全量门禁。

## 2026-08-16 - backup merge 全量源码与构建门禁

- 最终源码 `npm run lint` 与 workspace `npm run typecheck` 全绿；默认 worker-mode Vitest 为 `76 files / 874 tests passed`。
- release `10/10`；内容校验 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），状态仍为 `needs-review; verified 0/47`。这些结果不构成人工审核。
- production build 通过：Vite `1902 modules transformed`、static-copy `198 items`、PWA precache `79 entries (2581.81 KiB)`，无 chunk warning。
- 下一步只剩默认 `8 workers / 3 projects` 的全量 E2E。此次没有 Web UI 变化，不新增截图，但仍用既有真实浏览器合同验证备份/恢复与整体回归。

## 2026-08-16 - backup merge 最终收口

- 独立端口 `4276` 按默认 `8 workers / 3 projects` 运行完整真实 Chrome E2E，实测 `165/165 passed`，约 2.1 分钟。BACKUP V2 visual、v1 backup migration、legacy/mismatch recovery、PWA 安装与 PDF 离线读取均通过。
- 最终基线：lint/typecheck 全绿；Vitest `76 files / 874 tests`；release `10/10`；内容 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），`needs-review; verified 0/47`；build `1902 modules`；E2E `165/165`。
- README 已同步 merge 的 fail-closed 无歧义并集语义与 `874` 测试基线。本轮源码/测试/文档改动集中在 `packages/storage/src/backup.ts`、`backup-v2.test.ts`、README/HANDOFF/notes；build/E2E 按合同刷新了既有生成产物。未改任何 IndexedDB stores/schema、题包、旧图片、旧 `cpu-explorer` 或 Q44；未删除测试、提交、推送或部署。
- 下一项真正有产品价值的功能是持久化模考，但当前有两个硬边界：2009 整卷仍未 verified，领域门禁会正确拒绝启动；正式 mock blueprint/原子交卷需要独立持久化表，不能塞入 settings 或普通 session 冒充完成。进入该项前必须由用户明确授权新的 `408-user` schema 版本，并接受当前 needs-review 题包下页面只能展示不可用原因。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。schema v2 与 backup merge hardening 均已收口：merge 只允许完整联合状态仍通过 backup v2 schema 的无歧义并集，重叠历史/同题双 note/未知 mode 均在事务写入前 fail-closed。最新正式门禁为 lint/typecheck 全绿、Vitest `76 files / 874 tests`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1902 modules`、默认 8-worker 三视口 E2E `165/165`。不要重做 Q5/Q10/Q44、schema v2 或 merge 审计。下一功能候选为持久化模考，但它需要新的 `408-user` schema 版本明确授权，且当前 2009 题包未 verified，不能绕过领域门禁；未获授权时只做设计，不改数据库。不得删除旧图片/测试、修改旧 `cpu-explorer`、把自动验证当人工审核、提交、推送或部署。

## 2026-08-16 - 持久化模考 schema v3 设计审计（未授权）

- 已重新完整读取项目/父级 `AGENTS.md`、`HANDOFF.md` 与 `notes.md`，并复核 `packages/domain/src/mock.ts`、领域类型、`UserDatabase` v1/v2、repository、backup v2、`StudyContext` 和 Web 路由。当前没有持久化模考页面、repository 或 IndexedDB table；`types.ts` 中的 `MockExam` 只是未使用占位类型。
- 最小可靠方案不是复制第二份答题状态：继续用 v2 `StudySession` 保存 47 题顺序、逐题版本、草稿和当前位置，新增一个 v3 `mockExams` table 保存完整 `MockExamBlueprint`、关联 session、生命周期、计时锚点、提交原因和分数摘要。新表建议索引 `id, &sessionId, status, updatedAt, submittedAt`；`version(1).stores(...)` 与 v2 定义均保持原样。
- mock repository 必须成为唯一写入口：创建 exam+session、保存草稿、手动/超时交卷和综合题自评都在显式 Dexie 事务中检查 blueprint/session/题面版本一致性。普通 study repository 不得写 `mode=mock`，避免绕过交卷写保护。交卷后答案文本冻结；自评只能补综合题 rubric/selfScore，不能改原答案或重复生成 Attempt。
- backup 需要同步升级为 v3：保留 v1/v2 只读迁移入口；旧数据不猜造 blueprint。历史 `mode=mock` session 若没有 v3 exam record，只作为不可恢复 legacy evidence 保留。v3 preflight/merge 必须校验 exam id/session 唯一性、blueprint 与 session 的题号/版本闭包、生命周期/时间/分数一致性，并继续在第一笔写入前拒绝歧义并集。
- Web 路由建议为 `/mock` 与 `/mock/:examId`。当前 2009 包为 `needs-review; verified 0/47`，所以 landing page 只能解释“整卷尚未人工 verified，不能启动模考”并指向复核工作台；不能提供隐藏开关、测试后门或把来源审计当审核。真正启动路径只接受 `createFixedMockExamBlueprint` 已通过的 verified 题包。
- 本步骤只完成设计审计和文档检查点：没有修改数据库、领域/存储/Web 源码、测试、题包、旧图片或旧 `cpu-explorer`，没有运行新的门禁，也没有提交、推送或部署。上一轮正式基线仍是 lint/typecheck 全绿、Vitest `76/874`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1902`、E2E `165/165`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。持久化模考的 v3 设计已完成但尚未获得数据库 schema 红线的明确授权；不得把普通“继续”或自动测试解释为授权。若用户明确授权“新增 `408-user` schema v3”，先写缺实现红灯：v2 fixture 原样升级、新 `mockExams` table、exam/session/blueprint 不变量、普通 repository 拒绝 mock 写入、原子交卷/并发幂等、v1/v2 backup -> v3 迁移与无歧义 merge；再实现 repository，最后接 `/mock` 与 `/mock/:examId`。当前 2009 包仍 `needs-review; verified 0/47`，页面必须 fail closed，不得提供启动绕过。不要重做 Q5/Q10/Q44、schema v2 或 backup merge；不得删除旧图片/测试、修改旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-16 - schema v3 / mock repository 缺实现红灯

- 用户已明确授权新增 `408-user` schema v3 并按既定方案实现持久化模考；v1/v2 定义与既有数据必须原样保留，当前 `needs-review` 题包的 verified 启动门禁不得绕过。
- 新增 `packages/storage/src/mock-schema-v3.test.ts`，先覆盖真实 v2 fixture 原样升级、新 `mockExams` 空表、verified 创建、generic study repository 拒绝 mock 写、草稿/原子交卷/写保护、综合题自评、题面漂移零部分写入，以及 24 条确定性响应在并发交卷下不重复计数。
- 定向命令 `npm exec vitest run packages/storage/src/mock-schema-v3.test.ts` 新鲜实测为 `1 failed suite / 0 tests`；唯一失败是 `./mock-repository` 尚不存在，测试未进入执行。这是预期缺实现红灯，不是环境失败或回归通过。
- 下一步才实现正式领域类型、`UserDatabase.version(3)` 新表和 `DexieMockExamRepository`，再用同一测试转绿；当前尚未修改任何 IndexedDB stores 或运行时行为。

## 2026-08-16 - schema v3 与 mock repository 初版绿灯

- 领域 `MockExam` 占位类型已替换为完整 blueprint、`in-progress/submitted/completed` 生命周期、逐题时长、提交原因和 `MockExamScore`；固定整卷没有随机顺序，因此未保留无实际语义的 seed。
- `UserDatabase` 保持 v1/v2 stores 定义原样并新增 `version(3).stores({ mockExams: 'id, &sessionId, status, updatedAt, submittedAt' })`。v2 fixture 升级后原 session/setting 逐值保留，新表为空。
- 新增 `DexieMockExamRepository`：verified fixed paper 才能原子创建 exam+mock session；草稿写入校验 blueprint/session/版本/时长；generic study repository 拒绝 mock session/attempt；手动与超时交卷共用原子事务，创建确定性 Attempt、更新 versioned progress、冻结答案；综合题交卷后才可自评，完成后状态转 completed。
- 定向从缺模块红灯转为 `mock-schema-v3.test.ts 7/7`；与 `user-schema-v2.test.ts + storage.test.ts` 联合 `3 files / 41 tests passed`。`@408os/domain`、`@408os/storage` typecheck 与相关 ESLint 全绿。
- 下一步先为 backup v3 写失败契约；当前 BackupService 仍导出 schemaVersion 2，尚不能声称持久化模考具备备份闭环或 Web 可用。

## 2026-08-16 - backup v3 红灯

- 新增 `packages/storage/src/backup-v3.test.ts`，覆盖 mock exam+session export/replace roundtrip、v2 mock session 仅作 legacy evidence、blueprint/session 版本矛盾拒绝、重复 exam merge 原子拒绝，以及 12 份确定性 disjoint exam 合并后再次 export/preflight。
- 定向新鲜结果为 `5 tests / 4 failed / 1 passed`：旧 BackupService 仍导出 schema 2、没有 `mockExams`、不检查 exam/session 关系、重叠 exam merge 错误 resolve；唯一通过项是 v2 mock session 保留且不被既有 repository 恢复。
- 该红灯精确证明 backup v3 尚未实现。下一步扩展 schema/parser/preview/export/import/merge；v1/v2 输入必须继续兼容，且不能从旧 mock-mode session 猜造 blueprint。

## 2026-08-16 - backup v3 转绿

- BackupService 现在导出 `schemaVersion: 3`，新增 `mockExams` 数量和完整 exam record；v1/v2 输入先严格校验再迁移到 v3，旧无 blueprint 的 `mode=mock` session 原样保留但不生成 exam。
- v3 preflight 复用 v2 全部 attempt/session/progress 跨表检查，再校验 blueprint 固定 47 题结构、exam/session 闭包、生命周期/时间、唯一 exam/session、确定性 Attempt id、objective/comprehensive score 与 pending self-score 一致性。
- merge/replace 同时覆盖 mockExams；current+incoming 联合候选整体通过 v3 schema 才写入。重复 exam id/session、blueprint/session 冲突在第一笔 bulkPut 前 fail-closed，replace 仍保留旧语义，未知 mode 继续拒绝。
- `backup-v3.test.ts` `5/5`；与 backup-v2 compatibility、mock repository、schema v2、storage 联合 `5 files / 54 tests passed`。相关 storage lint/typecheck 全绿。
- 下一步进入 Web：StudyContext 暴露 mock repository，新增 `/mock` 门禁页和 `/mock/:examId` 持久化答题/交卷/综合自评页面；当前正式包仍只能显示不可用原因。

## 2026-08-16 - 持久化模考 Web 缺实现红灯

- 接管后先复验当前后端检查点：`mock-schema-v3 + backup-v3 + backup-v2 compatibility + user-schema-v2 + storage` 为 `5 files / 54 tests passed`，与记录一致。
- `StudyContext` 的 mock repository facade 和两份 Web 页面契约已在工作区；首次运行发现 `MockExamSessionPage.test.tsx` 的 questions fixture 少一个右括号，属于测试解析错误，不计产品红灯。只修测试语法后重跑。
- 干净红灯命令：`npm exec vitest run apps/web/src/pages/MockExamPage.test.tsx apps/web/src/pages/MockExamSessionPage.test.tsx`。结果为 `2 failed suites / 0 tests`，分别只因 `./MockExamPage` 与 `./MockExamSessionPage` 不存在。
- 下一步创建两个页面、接入 `/mock` 与 `/mock/:examId`，并补齐不绕过 verified gate 的入口、持久化草稿/交卷/综合题自评、计时与错误 fail-closed；随后用同一命令转绿。

## 2026-08-16 - 持久化模考 Web 首版转绿

- 新增 `apps/web/src/pages/MockExamPage.tsx` 与 `MockExamSessionPage.tsx`，接入 `/mock`、`/mock/:examId` 路由和主/移动导航；移动导航由 7 项调整为 8 项，保留既有入口。
- `/mock` 对 2009 `needs-review` 保持失败关闭，显示“尚未完成 47 题人工复核”并链接内容复核；只有 `verified` 才显示固定 180 分钟启动按钮。已存在的 v3 模考按答题中/待自评/已完成列出。
- 会话页消费 `MockExamBundle`，用串行写队列保存草稿与题目切换，倒计时基于持久化 `startedAt`，超时调用一次 `submitMockExam(reason=timeout)`；当前题面缺失、编号/类型/`contentVersion` 漂移均 fail-closed。交卷后选择题只读，综合题自评分单独调用 v3 facade。
- 首轮 Web 契约修正了测试夹具的 Vitest hoist、跨测试 DOM cleanup 和过期固定时间；定向 `MockExamPage + MockExamSessionPage` 为 `2 files / 5 tests passed`，web typecheck 与定向 ESLint 通过。
- 下一步：补倒计时/版本漂移/自评范围回归，随后做独立核心审计、三视口真实浏览器 E2E 与截图检查。自动测试和来源核对仍不等于人工审核。

## 2026-08-16 - 持久化模考 Web 边界回归转绿

- 新增 Web 回归先验证题包形状门禁：`verified` 但 manifest/实际题数不是 47 时，首轮 `MockExamPage` 断言红灯；页面已改为 `ready = verified && manifest.questionCount === 47 && loadedQuestions === 47`，修复后定向两页面为 `2 files / 8 tests passed`。
- 会话回归新增已过期 exam 自动交卷只调用一次（`reason=timeout`）以及 blueprint/current question `contentVersion` 漂移时不渲染答案；两项均通过。
- 当前 Web 定向 ESLint 与 typecheck 仍绿。下一步做不依赖 UI 的仓储/页面写入顺序审计，随后读 Playwright skill 并执行三视口 E2E/截图。

## 2026-08-16 - 持久化模考核心审计与三视口 E2E

- 独立联合定向回归：domain mock、schema v3、backup v3/v2、user-schema v2、storage、两份 Web 页面共 `8 files / 67 tests passed`；页面新增题包形状、过期自动交卷单次调用和题面漂移 fail-closed 回归，Web typecheck/ESLint 通过。
- 新增 `tests/e2e/mock-exam.spec.ts`。在独立浏览器 IndexedDB 中注入合法 v3 in-progress fixture（不改正式题包状态），真实 Chrome 三项目 `chromium-1440/1366/390`、单 worker 实测 `3/3 passed`：正式 `needs-review` 入口无启动按钮、草稿刷新恢复、手动交卷后答案冻结、综合题自评推进到下一题、8 项移动导航和无页面横溢出。
- 新鲜截图写入 `output/playwright/screenshots/`：桌面 landing/session 各 1440、1366；390 landing top/bottom、session draft top/state/bottom、session submitted top/state/bottom。已逐张人工查看，无 P0/P1；state/bottom 因剩余滚动距离短而重合，不是布局故障。
- 仍未把自动测试、来源核对或 fixture 注入当成人工审核；正式内容保持 `needs-review; verified 0/47`。下一步跑全量 lint/typecheck/Vitest/release/content/build/E2E，随后收口文档。

## 2026-08-16 - schema v3 全量 E2E 首轮红灯

- 已完成全量源码门禁：lint、workspace typecheck、release `10/10`、内容校验（`47 questions / 19 assets`，`needs-review; verified 0/47`）、Vitest `80 files / 894 tests`、production build `1905 modules` 均通过。
- 默认 `8 workers / 3 projects` 全量 E2E 启动并执行 `168` 个用例，最终 `164 passed / 4 failed`。其中 3 个 `study-flow` 失败是旧测试仍断言备份 `schemaVersion: 2`；运行时已按授权升级为 v3，另有 `mockExams` 字段，属于测试契约未同步。剩余 1 个 1440 复核题号点击超时，其他视口同流程通过，需单独复跑确认是否为并发波动。
- 本红灯没有改变正式题包、人工复核状态或旧 schema；下一步先更新受影响的 E2E/Settings 文案到 BACKUP V3 并先跑定向回归，再复跑该复核用例和全量 E2E。

## 2026-08-16 - schema v3 E2E 契约同步与恢复边界修正

- 已将 Settings、study-flow、visual contract 和辅助 E2E 的活动断言同步为 `BACKUP V3` / `schemaVersion: 3`，并明确空 `mockExams` 导出字段；历史 V2 记录保留为历史证据，不代表当前导出格式。
- 新增 `MockExamSessionPage` 的瞬时读取失败重试回归。错误绑定到本次 `loadKey`，重试成功后旧错误不会继续遮挡恢复页面；页面 ESLint 与相关 E2E/Settings ESLint 全绿。
- managed 权限下随后尝试定向 Vitest 与单项目 Playwright 均在启动 Vite/esbuild 或浏览器子进程处得到 `spawn EPERM`，未进入断言；因此不能把这两次尝试算作新的绿灯。此前已完成的 `80/894`、`1905 modules` 和模考 `3/3` 证据仍有效，但 v3 契约改动后的全量 E2E 需在允许子进程的环境复跑。
- 由于新增 1 项读取重试回归，历史 `8 files / 67 tests` 计数不再代表当前测试总数；当前应以源码同步后重新运行的结果为准，不能推算为已通过。
- 复核 Q41 的 1440 超时发生在题号栏隐式滚动后的稳定性等待；测试已改为先显式 `scrollIntoViewIfNeeded()` 再执行真实 click，URL 与 back/reload 断言未削弱。该文件 ESLint 通过，Playwright `--list` 能完整收集 `168 tests / 24 files`；实际浏览器回归仍待权限恢复。

## 2026-08-16 - 持久化模考当前收口状态

- schema v3、mock repository、backup v3、`/mock`、`/mock/:examId`、8 项导航、正式题包 fail-closed 门禁和三视口模考 E2E 均已实现。最终静态复审又修正了会话读取失败后重试仍被旧错误遮挡的问题，并把 Settings/活动测试契约同步为 `BACKUP V3`。
- 当前源码重新验证：全量 `npm run lint` 通过；workspace `npm run typecheck` 通过；`npm run content:validate` 通过并输出 `47 questions (40 objective, 7 comprehensive)`、`needs-review; verified 0/47`；release 默认命令因 Node test worker `spawn EPERM` 未执行，但同一测试文件用 `node --import tsx --test --test-isolation=none` 实测 `10/10 passed`。
- 当前权限下 `npm test`、`npm run build` 和实际 Playwright 均被子进程策略阻止：Vitest/Vite 在启动 esbuild 时 `spawn EPERM`，build 已先完成 TypeScript 阶段后在 Vite config 处失败，Playwright 浏览器启动也失败。`playwright test --list` 能完整收集 `168 tests / 24 files`。这些都是环境未验证，不是产品断言红灯，也不能算通过。
- 最后一次真实执行证据仍为：最终读取重试/备份文案同步前的 Vitest `80 files / 894 tests`、build `1905 modules`；模考专项三视口 Chrome `3/3 passed` 且截图人工检查无 P0/P1；全量 E2E 首轮 `164/168`，其中 3 个旧 v2 断言和 1 个滚动稳定性超时均已在源码修正但尚未重跑。新增读取重试回归使当前测试数比 `894` 多 1，不能推算成已通过。
- 正式内容未改，仍是 `needs-review; verified 0/47`；fixture 的 verified 只存在于隔离测试库。v1/v2 stores 与旧数据保留，旧图片未删除，旧 `cpu-explorer`、Q44 两套 trace 边界和既有测试均未删除或改写语义。没有提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。`408-user` schema v3 与持久化模考已实现，正式题包仍 `needs-review; verified 0/47`，不得绕过人工复核门禁。当前只差在允许 Node/browser 子进程的权限环境复验最终源码：先运行 `npm test`（当前应包含新增的读取重试回归），再运行 `npm run build`、`npm run test:e2e`；确认活动备份契约为 `BACKUP V3/schemaVersion 3`、全量 E2E 168 项，以及 content-review Q41 显式滚入后点击不再超时。重新生成并人工查看 Settings BACKUP V3 三视口截图；若全部通过，再把最终数字写入 README/HANDOFF/notes。不要重做 schema/候选设计，不要把 fixture 或自动验证当人工审核；不得删除旧图片/测试、修改旧 `cpu-explorer` 或 Q44 边界、提交、推送或部署。

## 2026-08-16 - schema v3 最终定向 Vitest 绿灯

- unrestricted 环境运行 `npm exec vitest run apps/web/src/pages/MockExamPage.test.tsx apps/web/src/pages/MockExamSessionPage.test.tsx apps/web/src/pages/SettingsPage.test.tsx`，实测 `3 files / 10 tests passed`。
- 新鲜结果覆盖正式题包 fail-closed 入口、持久化模考恢复/超时/题面漂移/瞬时读取失败重试，以及 Settings `BACKUP V3` 可见契约；此前 managed 环境的 `spawn EPERM` 阻塞已不再适用这一组测试。
- 下一步运行默认 worker-mode 全量 `npm test`，通过后继续 lint/typecheck/release/content/build、定向三视口 E2E、BACKUP V3 截图人工检查和默认 168 项全量 E2E。正式内容继续保持 `needs-review; verified 0/47`。
- 默认 `npm test` 已正式通过：Vitest `v4.1.10`，`80 files / 895 tests passed`。这比读取重试回归加入前的 `894` 多 1 项，当前不再沿用旧测试快照。
- 下一步运行 lint、workspace typecheck、release、content validation 与 production build；随后进入三视口定向 E2E、BACKUP V3 截图人工检查和默认 168 项全量 E2E。
- 最终源码上的 `npm run lint` 与全部 workspace `npm run typecheck` 已通过；`npm run test:release` 为 `10/10`。
- `npm run content:validate` 通过 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），并明确保持 `needs-review; verified 0/47`。自动门禁不构成人工审核。
- 下一步运行 production build；浏览器验收与截图仍未复跑。
- `npm run build` 正式通过：Vite `1905 modules transformed`，static-copy `198 items`，PWA precache `85 entries (2631.79 KiB)`，无 chunk warning。
- 下一步用独立端口定向验证 content-review Q41、backup schema v3 与 Settings BACKUP V3 visual contract；通过后人工检查三视口截图，再跑默认 168 项全量 E2E。
- 独立端口 `4284`、3 workers 的定向真实 Chrome 共 `9/9 passed`：content-review Q41 历史恢复、study-flow schema v3 备份恢复、Settings BACKUP V3 visual contract 均在 1440/1366/390 通过。
- 新鲜截图 `chromium-{1440,1366,390}-settings-backup-v3.png` 已逐张人工检查。BACKUP V3 标签、导入/导出按钮、`needs-review` 状态、storage facts 和移动固定底栏无 P0/P1；390 图为目标区块滚入视口后的采集，未发现横向溢出或遮挡。
- 下一步以独立端口运行默认 8 workers / 3 projects 的完整 168 项 E2E；不能用定向 `9/9` 替代全量门禁。
- 独立端口 `4285` 按默认合同运行完整 `168 tests / 8 workers / 3 projects`，实测 `168/168 passed`，耗时约 2.2 分钟。
- 全量中包含 schema v3 backup export/restore、v1 migration、legacy/mismatch recovery、PWA/offline、Q41 复核点击、三视口模考流程和既有全部实验；没有修改 timeout、workers 或业务断言来掩盖失败。
- 当前功能与门禁已完成；只剩核对全量运行后 Settings V3 截图的最新时间戳/尺寸，并同步 README、HANDOFF、notes 的最终基线。

## 2026-08-16 - 持久化模考 schema v3 最终收口

- 最终源码门禁：lint 通过；全部 workspace typecheck 通过；默认 Vitest `80 files / 895 tests`；release `10/10`；内容 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），状态保持 `needs-review; verified 0/47`；production build `1905 modules`、static-copy `198 items`、PWA precache `85 entries (2631.79 KiB)`，无 chunk warning。
- 真实浏览器：模考独立 fixture 三视口 `3/3`；端口 `4284` 的 Q41/schema v3/Settings V3 定向 `9/9`；端口 `4285` 默认 `8 workers / 3 projects` 全量 `168/168`。普通 E2E 继续 block service worker，PWA/offline 合同显式 allow。
- Settings BACKUP V3 最新截图已人工检查：`chromium-1440-settings-backup-v3.png` `1440x900`、`chromium-1366-settings-backup-v3.png` `1366x768`、`chromium-390-settings-backup-v3.png` `1024x2216`；按钮、状态、storage facts、移动底栏无 P0/P1。Q47 移动标题孤字换行仍只记为 P2。
- 持久化模考使用 v3 `mockExams` 表与专用 repository；v1/v2 stores、旧数据、19 张旧图片、旧 `cpu-explorer` 均保留。正式题包没有被 fixture 或自动门禁提升为 verified；Q44 仍只提供来源支持的 `parallel-5 / split-6` trace，不实现任意评分器，也不声称穷尽合法答案。
- 收口后的只读边界核对再次确认：`packages/storage/src/databases.ts` 的 v1 stores 定义未改，`mockExams` 仅出现在 v3；`apps/web/public/content/2009/` 递归仍有 19 个旧文件，端口 `4284/4285` 均已无监听。
- 本轮未删除测试或文件，未修改题包审核状态，未提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。持久化模考 schema v3 与最终门禁已收口：Vitest `80/895`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `85 entries`、默认三视口全量 E2E `168/168`；Settings BACKUP V3 三视口截图已人工检查。不要重做 schema v3、Q5/Q10/Q44 或候选比较，也不要在没有新授权时开始下一项功能。继续工作必须先提出新的明确范围并保持 v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 边界和人工审核状态不变；不得把自动验证当人工审核、删除测试、提交、推送或部署。

## 2026-08-16 - 收口后只读可靠性审计

- 复核工作台现有竞态防线已复核：`actionBusy` 期间题号导航、筛选、表单输入和决定按钮均禁用；`StudyContext.reconcileContentReviewRecord` 在 durable 写入成功但 reload 失败时保留返回记录，不会再把 approved/rejected 降级为 pending。没有发现新的可复现 P0/P1。
- 模考 v3 仓储现有事务、时间单调性、题面闭包、交卷幂等和 backup v3 闭包由核心回归覆盖；本次新鲜定向结果为 `4 files / 22 tests passed`（`mock-schema-v3`、`backup-v3`、`ContentReviewPage`、`MockExamSessionPage`）。
- 只读检查确认 Web 当前没有 `storage`/`BroadcastChannel`/live-query 监听。两个标签页同时打开同一模考时，另一页可能在主动 reload 前暂时显示旧状态；这记录为待授权的 P2“跨标签页实时同步/冲突提示”候选，不属于已实现能力，也没有擅自新增 schema 或 UI。
- 本步骤未修改源码、测试、题包、schema、旧图片或旧 `cpu-explorer`，未运行提交、推送或部署；正式内容仍 `needs-review; verified 0/47`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。schema v3 与最终门禁已收口，且收口后只读审计无新 P0/P1；核心定向回归最新为 `4 files / 22 tests passed`。不要重做 schema v3、Q5/Q10/Q44 或候选比较。若要继续实现，请先明确授权“跨标签页模考实时同步/冲突提示”这一新范围，并先写红灯契约；未获该授权时保持当前收口，不启动新功能。继续保持 v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 边界和人工审核状态不变；不得把自动验证当人工审核、删除测试、提交、推送或部署。

## 2026-08-16 - 跨标签页模考同步红灯

- 用户已在紧接该唯一候选范围后授权继续；范围限定为现有 schema v3 上的实时观察、乐观并发和冲突提示，不新增 IndexedDB version/table/field，不改变 v1/v2 数据。
- 先新增仓储契约：旧 `expectedUpdatedAt` 的草稿、交卷和综合题自评必须原子拒绝；exam/list 订阅必须观察后续更新。新增 Web 契约：无本地草稿时自动应用外部更新；有本地草稿时保留输入、禁用写入并要求显式加载最新记录。
- 定向 Vitest 新鲜红灯为 `2 files / 18 tests` 中 `5 failed / 13 passed`。仓储三项分别因旧写入错误 resolve、`subscribeExam/subscribeExams` 不存在而失败；页面两项因没有订阅同步/冲突 UI 而失败。既有 13 项全部通过。
- 下一步使用 Dexie `liveQuery` 和现有 `updatedAt` 作为并发令牌实现，不改 schema；随后同一命令转绿，再接 StudyContext 列表订阅、双页 E2E 与三视口截图。

## 2026-08-16 - 模考仓储乐观并发与订阅转绿

- `SaveMockExamDraftInput`、`SubmitMockExamInput`、`SelfScoreMockExamInput` 新增必传 `expectedUpdatedAt`；事务读取当前 exam 后先做精确令牌校验，冲突抛出 `MockExamConflictError`，任何表写入前即失败。已提交交卷和相同综合题自评仍保留原幂等返回语义。
- `DexieMockExamRepository.subscribeExam/subscribeExams` 使用 Dexie `liveQuery`，观察现有 `mockExams`/`sessions` 查询；没有新增 IndexedDB version、table、index 或 record field。
- 仓储定向从三项红灯转为 `mock-schema-v3.test.ts 10/10`，`@408os/storage` typecheck 通过。下一步给 StudyContext 暴露订阅，并在会话页区分无本地草稿的自动同步与有本地草稿的显式冲突处理。

## 2026-08-16 - 模考 Web 同步与冲突提示转绿

- `StudyContext` 现在持续订阅 mock exam 列表，并向会话页暴露单 exam 订阅；页面不直接访问 Dexie。无本地答案/自评草稿时外部 bundle 自动替换并显示同步状态；有本地输入时保留输入、冻结写操作并要求显式“加载最新记录”，不做自动合并。
- 页面写入携带 `expectedUpdatedAt`；冲突会被识别为 `MockExamConflictError`，并尝试读取最新 bundle。模考计时戳改为严格递增，避免同毫秒版本令牌相等。
- 定向新鲜结果：`mock-schema-v3 + MockExamSessionPage + StudyContext` 为 `3 files / 20 tests passed`；Web/storage typecheck 和相关 ESLint 全绿。下一步跑真实双页 E2E，确认 Dexie 跨页广播而不是只在单页 mock 中通过。

## 2026-08-16 - 模考双页真实浏览器同步转绿

- 新增 `tests/e2e/mock-exam.spec.ts` 的双页面合同：同一浏览器上下文中，干净页面自动收到另一页面保存的答案；有未保存本地答案的页面保留本地输入、停止写入并显示冲突提示；显式加载最新记录后恢复写入，另一页面也能继续收到更新。
- 首次定向运行的 `3 failed / 3 passed` 仅由 fixture 在正式内容门禁加载前写入导致，已增加等待 `needs-review` 入口出现后再注入隔离 v3 exam；修正后独立端口 `4286`、三项目、单 worker 实测 `6/6 passed`（约 52.8 秒）。
- 新鲜截图已生成并人工查看：`output/playwright/screenshots/chromium-{1440,1366}-mock-cross-tab-conflict.png`、`chromium-390-mock-cross-tab-conflict-{top,state,bottom}.png`。桌面冲突条、移动换行/按钮、答案禁用态和固定底栏均无 P0/P1；移动分段图的底栏覆盖是既有 fixed 导航预期，不是页面溢出。
- 该证据只证明隔离测试库中的浏览器同步，不改变正式题包；`needs-review; verified 0/47`、v1/v2 数据、旧图片、旧 `cpu-explorer` 和 Q44 边界保持不变。下一步跑扩展定向回归及最终全量 lint/typecheck/Vitest/release/content/build/E2E。

## 2026-08-16 - 跨标签页同步扩展定向回归

- 扩展定向命令覆盖 `mock-schema-v3`、backup v3/v2 compatibility、schema v2、storage、StudyContext、MockExam landing/session 和 Settings，共 `9 files / 71 tests passed`。
- 本次结果确认 `expectedUpdatedAt` 冲突保护、Dexie 订阅、列表 facade、会话冲突 UI 与 BACKUP V3 活动文案在既有持久化回归中同时成立。下一步运行全量 lint、workspace typecheck、Vitest、release、内容校验、production build 和默认三视口 E2E。

## 2026-08-16 - 跨标签页同步静态门禁转绿

- `npm run lint` 全绿。
- `npm run typecheck` 全 workspace 全绿（web、content-schema、cpu-core、domain、lab-core、storage）。
- 这是源码静态门禁证据；全量 Vitest、release、内容校验、build 与默认 E2E 仍待执行。

## 2026-08-16 - 跨标签页同步全量测试与内容门禁转绿

- 默认 `npm test` 新鲜实测 `80 files / 901 tests passed`。
- `npm run test:release` 实测 release `10/10 passed`。
- `npm run content:validate` 实测 `47 questions`（`40 objective / 7 comprehensive`），状态仍为 `needs-review; verified 0/47`。自动校验不构成人工审核。
- 下一步只剩 production build 与默认 `8 workers / 3 projects` 全量 E2E，然后核对新鲜截图并收口文档。

## 2026-08-16 - 跨标签页同步 build 与全量 E2E 初始化红灯

- production build 通过：Vite `1905 modules transformed`、static-copy `198 items`、PWA precache `86 entries (2635.30 KiB)`。
- Playwright 收集 `171 tests / 24 files`。端口 `4288` 首轮默认 8-worker 三项目为 `168 passed / 3 failed`：Q41 1440 与双页同步 1440/1366 都在页面初始 heading 的 5 秒等待失败，尚未进入业务断言；失败上下文中 Q41 随后已完整渲染，模考仍处于 StudyProvider 初始化占位。
- 端口 `4289` 将两个相关文件在 1440/1366 单 worker 重跑为 `8/8 passed`。端口 `4290` 第二轮完整默认合同为 `170 passed / 1 failed`，唯一重复失败仍是双页同步 1440 同时初始化时超过 heading 默认 5 秒；Q41 与 1366/390 同步均通过。
- 该重复红灯证明新双页测试的并发初始化等待过紧，不是同步业务断言红灯。下一步保留两个页面同时启动，只把两个 readiness 断言改为并行最多等待 15 秒；不改产品、全局 30 秒总超时、workers 或业务断言。随后先做高并发重复专项，再第三次跑完整 171 项。

## 2026-08-16 - 双页并发初始化专项转绿

- `tests/e2e/mock-exam.spec.ts` 只调整两个页面的初始 heading readiness：从串行默认 5 秒改为 `Promise.all` 并行等待、各最多 15 秒。双页同时启动、全局 30 秒、8 workers 和所有同步/冲突断言保持不变。
- 端口 `4291` 使用 8 workers、三项目、`repeat-each=3` 高并发运行该双页合同，实测 `9/9 passed`；文件 ESLint 通过。
- 下一步在新独立端口第三次执行完整 `171` 项默认合同；只有完整通过后才更新最终基线。

## 2026-08-16 - 跨标签页同步默认全量 E2E 转绿

- 独立端口 `4292` 按项目默认 `8 workers / 3 projects` 执行完整真实 Chrome 合同，实测 `171/171 passed`，约 2.7 分钟。
- 本轮三视口均通过双页 clean 自动同步、dirty 冲突保留、显式加载最新记录和反向更新；同时覆盖 schema v3 backup/v1 migration、PWA/offline、Q41/Q44 与全部既有实验合同。
- 没有放宽全局 30 秒总超时、减少 workers、删除断言或修改产品逻辑；本轮新鲜冲突态截图已人工复看，最终 lint 已通过，临时端口已全部释放。

## 2026-08-17 - 跨标签页模考同步最终收口

- 文档已按 neat-freak 盘点并同步：README 的模考用户流程与当前门禁已更新；根目录没有 `docs/`，`content/README.md`、项目/父级 `AGENTS.md` 与源码路径核对后无需改动；历史阶段记录保留为历史证据。
- 最终静态/运行门禁：`npm run lint`、workspace `npm run typecheck` 全绿；默认 Vitest `80 files / 901 tests`；release `10/10`；content validate `47 questions / 19 assets`、`40 objective / 7 comprehensive`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA precache `86 entries (2635.30 KiB)`。
- 最终真实浏览器：端口 `4292` 默认 `8 workers / 3 projects`、1440/1366/390 全量 `171/171 passed`；双页同步专项高并发 `9/9 passed`。新鲜冲突态截图 `chromium-1440/1366-mock-cross-tab-conflict.png` 与 390 `top/state/bottom` 已逐张人工检查，无 P0/P1；state/bottom 重合源于剩余滚动距离短。
- 可靠性边界：只新增 v3 现有记录上的 `expectedUpdatedAt` 与 Dexie liveQuery 观察，不新增 schema/table/field；v1/v2 store 定义、旧数据、19 张旧图片、旧 `cpu-explorer`、Q44 `parallel-5/split-6` 和正式审核状态均未改变。没有删除文件/测试、提交、推送或部署；临时端口 `4286/4288/4289/4290/4291/4292` 均无监听。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。跨标签页模考实时同步/冲突提示已在现有 schema v3 上收口：`mockExams`、`expectedUpdatedAt`、Dexie liveQuery、clean tab 自动同步、dirty tab 冲突只读和显式加载最新记录均已实现。最终门禁为 lint/typecheck 全绿、Vitest `80/901`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / static-copy `198` / PWA `86 entries`、默认 8-worker 三视口 E2E `171/171`，双页压力专项 `9/9`。不要重做 schema v3、backup merge、Q5/Q10/Q44 或候选比较；不要把自动验证或来源核对当人工审核。没有新的明确范围时先只读审计/报告选项，不从普通“继续”推断大功能；不得修改 v1/v2 store 定义、删除旧图片/测试、修改旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-17 - 无新范围下的只读立项审计

- 本轮没有收到新的明确功能范围，因此只做静态审计和现有回归，不修改产品代码、测试、题包、schema 或持久化数据。
- 已复核当前收口事实：ContentReview 的决定期间禁用/串行写入与 durable 写入后 reload 失败保护仍在；正式内容仍为 `needs-review; verified 0/47`；现有最终门禁不变。未发现新的可复现 P0/P1。
- 推荐的最小下一项是 CPU 实验室可访问性语义：`apps/web/src/pages/CpuLabPage.tsx` 的 `nav[aria-label="实验类型"]` 含 10 个模块按钮，当前只用 CSS `active` 表示选中状态，10 个按钮均没有 `aria-pressed`/`aria-selected`。现有 `apps/web/src/pages/CpuLabPage.test.tsx` 定向回归为 `10/10`，文件 ESLint 通过。若获明确授权，先为“恰有一个按钮为 pressed、点击后状态移动”写红灯，再补最小实现和定向/全量门禁。
- 另有两个低优先级候选仅记录不实施：Q47 移动标题的孤字换行（视觉 P2）；Pipeline/Knowledge 等其他分段按钮的选中语义（范围更大，应另立项）。不把这些候选混入当前收口。

## 2026-08-17 - 分段控件语义对照审计

- 继续保持只读：没有新增测试或产品改动。对 `apps/web/src` 的 active/segmented 控件做静态对照后，确认缺口并非全站统一问题。
- 已具备语义的样本包括数据结构算法、磁盘策略、森林路径、Q44 来源方案和 ContentReview 视图（`aria-pressed`/`aria-selected`），以及网络/操作系统/数据结构模块页的 `aria-current` 链接。
- 未具备选中语义的样本包括 CPU 页面内部的若干转换方向/位宽按钮、Pipeline 模式按钮和 Knowledge 学科/知识点按钮。它们的控件角色和交互含义不同，不应在下一项 CPU 导航修复中顺手抽象成全站重构。
- 当前首选仍是 CPU 实验类型导航 10 个按钮；若获授权，先只锁定该导航的 `aria-pressed` 红灯与实现，再单独评估 CPU 内部控件和其他页面。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。schema v3、持久化模考、跨标签页同步和最终门禁已收口；没有新明确范围时不要开始实现。当前只读审计推荐下一项为 CPU 实验室 10 个模块按钮补 `aria-pressed` 选中语义，尚未改测试或产品；若用户明确授权，先让 `CpuLabPage.test.tsx` 的语义契约红灯，再实现并验证。继续保持 `needs-review; verified 0/47`、v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 两套 trace 边界不变；不得把自动验证当人工审核、删除测试、提交、推送或部署。

## 2026-08-17 - CPU 模块导航 aria-pressed 红灯

- 用户已明确授权只实现 CPU 实验室 10 个模块按钮的 `aria-pressed` 语义；不扩展到 CPU 内部转换控件、Pipeline 或 Knowledge。
- `apps/web/src/pages/CpuLabPage.test.tsx` 新增契约：10 个模块按钮必须都具备 `aria-pressed`，恰有一个为 `true`，从 I/O 开销切换到 Cache 映射后 pressed 状态随模块迁移。
- 实测红灯：`npm exec vitest run apps/web/src/pages/CpuLabPage.test.tsx` 为 `1 failed / 10 passed`，唯一失败在“所有模块按钮均具有 aria-pressed”断言；现有实现确实只有 CSS `active`。
- 下一步只在 `CpuLabPage.tsx` 的 10 个模块按钮上补布尔 `aria-pressed`，随后用同一命令转绿并运行静态/全量门禁。

## 2026-08-17 - CPU 模块导航 aria-pressed 转绿

- `apps/web/src/pages/CpuLabPage.tsx` 仅为实验类型导航的 10 个按钮增加布尔 `aria-pressed={tab === ...}`；没有改 URL、模块选择逻辑、CPU 内部控件或任何题包/存储行为。
- 红灯契约已转绿：`npm exec vitest run apps/web/src/pages/CpuLabPage.test.tsx` 实测 `1 file / 11 tests passed`。
- 下一步运行 CPU 相关组件/页面回归、Web lint/typecheck，再执行最终全量门禁。

## 2026-08-17 - CPU 模块导航 aria-pressed 最终收口

- 变更严格限于 `apps/web/src/pages/CpuLabPage.tsx` 与 `CpuLabPage.test.tsx`：10 个实验类型按钮全部暴露布尔 `aria-pressed`，始终恰有一个为 true；点击切换后选中语义与现有 URL/active 状态同步迁移。
- 红灯证据为 `1 failed / 10 passed`，失败点是所有按钮缺少 `aria-pressed`；最小实现后页面定向 `11/11`，CPU 相关联合回归 `7 files / 69 tests`，相关 ESLint 与 Web typecheck 均通过。
- 最终门禁：全仓 lint、workspace typecheck 全绿；Vitest `80 files / 902 tests`；release `10/10`；内容 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，保持 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2635.60 KiB)`。
- 首轮端口 `4293` 全量 E2E 为 `170/171`，唯一失败页面为空白；trace 明确显示 `vendor-storage-*.js` 请求为 `net::ERR_NO_BUFFER_SPACE`。同一移动复核用例在端口 `4294` 精确复跑 `1/1`，端口 `4295` 第二轮默认 `8 workers / 3 projects`、1440/1366/390 全量 `171/171`，没有修改产品、测试超时、workers 或断言。
- 本轮没有改变视觉样式，因此不新增截图结论；三视口既有视觉合同包含在最终全量 E2E 中。没有改 CPU 内部控件、Pipeline、Knowledge、schema、题包、旧图片、旧 `cpu-explorer` 或 Q44 边界，没有删除测试、提交、推送或部署；端口 `4293/4294/4295` 均无监听。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。CPU 实验室 10 个模块按钮 `aria-pressed` 已按红转绿收口：页面定向 `11/11`、CPU 相关 `7 files / 69 tests`，最终 lint/typecheck 全绿、Vitest `80/902`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries`、默认三视口 E2E `171/171`。不要顺手扩展到 CPU 内部控件、Pipeline 或 Knowledge；如要继续需另立明确范围并先写红灯。不要重做 schema v3、Q5/Q10/Q44 或候选比较；继续保持 v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 两套 trace 和人工审核边界不变，不得删除测试、提交、推送或部署。

## 2026-08-17 - CPU 内部分段控件只读审计

- 本轮没有新实现授权，只做静态审计；没有修改产品代码、测试、题包或 schema。
- `apps/web/src/pages/CpuLabPage.tsx` 仍有 4 组、9 个内部分段按钮没有选中语义：机器数转换方向 2 个、位宽选择 3 个、IEEE 754 转换方向 2 个、RV32I 转换方向 2 个。它们与已收口的顶层 10 模块导航分属不同交互层级。
- 这是可独立立项的 P2 候选。若获授权，红灯应覆盖四组的 `aria-pressed` 唯一选中项与点击迁移，并确保方向/位宽状态及 StepExplorer 现有行为不变；不应顺手扩展到 Pipeline、Knowledge 或全站控件重构。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。CPU 顶层 10 模块 `aria-pressed` 已收口，当前只读审计发现 `CpuLabPage.tsx` 内部 4 组共 9 个方向/位宽按钮仍缺选中语义，尚未修改。没有新的明确授权时不要实现；若授权“实现 CPU 内部 4 组分段控件 aria-pressed”，先在 `CpuLabPage.test.tsx` 写红灯，再验证 `11/902` 基线、全量门禁和三视口浏览器合同。继续保持 `needs-review; verified 0/47`、v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 边界不变，不得删除测试、提交、推送或部署。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 红灯

- 用户已明确授权实现 CPU 内部 4 组、9 个方向/位宽按钮的 `aria-pressed` 语义；范围不包含 Pipeline、Knowledge 或全站控件。
- `CpuLabPage.test.tsx` 新增三项契约：signed 的方向/位宽两组、IEEE 754 方向、RV32I 方向均要求所有按钮具备 `aria-pressed`、每组恰有一个为 true，并在点击后迁移。
- 定向 Vitest 红灯：`1 file / 14 tests`，`3 failed / 11 passed`；失败分别落在 signed、IEEE 754、RV32I，均为缺少 `aria-pressed`，无夹具或业务计算错误。
- 下一步只给 `MachinePanel`、`Float32Panel`、`RiscvPanel` 的 9 个按钮补属性，保持现有方向、位宽、URL 和 StepExplorer 行为不变。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 转绿

- `CpuLabPage.tsx` 只为 `MachinePanel`、`Float32Panel`、`RiscvPanel` 的 9 个方向/位宽按钮增加布尔 `aria-pressed`；顶层模块导航、计算逻辑、URL、输入值和 StepExplorer 均未改动。
- 同一定向命令从 `3 failed / 11 passed` 转为 `1 file / 14 tests passed`；四组均锁定默认唯一选中项和点击后的状态迁移。
- 下一步运行 CPU 相关联合回归、改动文件 ESLint、Web typecheck，再执行全量 lint/typecheck/Vitest/release/content/build/E2E。

## 2026-08-17 - CPU 内部分段控件核心与静态门禁

- 当前 managed 权限下，默认 Vitest 在 Vite 读取 `vitest.config.ts` 时被 `esbuild` 的 `spawn EPERM` 阻止，未进入测试收集；这不是断言失败。使用与项目既有受限环境记录一致的一次性 Node API 适配，禁用配置打包、以 TypeScript `transpileModule` 转换 TS/TSX、Vite 使用 realpath fallback，并保持 Vitest thread 单 worker，不写入仓库配置。
- 同进程新鲜结果：CPU 相关 `7 files / 72 tests passed`，全量 Vitest `80 files / 905 tests passed`。这证明当前逻辑回归，但明确不冒充默认 worker-mode `npm test` 门禁。
- `npm run lint` 与全部 workspace `npm run typecheck` 通过；`npm run content:validate` 为 `47 questions`（`40 objective / 7 comprehensive`），正式内容继续保持 `needs-review; verified 0/47`，自动校验不构成人工审核。
- 默认 release runner 同样因 Node test runner 派生进程 `spawn EPERM` 未执行；`node --import tsx --test --test-isolation=none tools/content-importer/src/release-2009.node-test.mjs` 同进程实测 `10/10 passed`。production build 在 Vite 配置打包处被相同 `spawn EPERM` 阻止，尚无本次改动后的新鲜 build/E2E 绿灯。
- 下一步尝试真实浏览器语义合同；若浏览器启动也被当前权限阻止，则保留阻塞证据，并以最近一次改动前的 build `1905 modules` / E2E `171/171` 仅作历史基线，不声明为本次新鲜门禁。

## 2026-08-17 - CPU 内部分段控件正式门禁恢复与 E2E 首轮

- 权限上下文恢复后重新执行正式命令：默认 worker-mode `npm test` 为 `80 files / 905 tests passed`，默认 `npm run test:release` 为 `10/10`；此前同进程结果仍保留为受限环境证据，但不再替代正式门禁。
- production build 新鲜通过：Vite `1905 modules transformed`、static-copy `198 items`；本轮 CPU 变更只影响可访问性属性，没有视觉 CSS 或布局改动。
- 默认 `8 workers / 3 projects` 三视口全量 E2E 首轮为 `170 passed / 1 failed`。唯一失败是 chromium-1440 Q42 练习页按钮已解析后等待 actionability 稳定性直至 30 秒；同轮 chromium-1366/390 均通过，失败路径与 CPU 分段控件无关。
- 独立端口 `4296` 精确复跑 Q42 chromium-1440 为 `1/1 passed`（业务用时 1.6 秒）。下一步在新独立端口第二次执行完整 `171` 项；不修改产品、测试超时、workers 或断言来掩盖首轮失败。

## 2026-08-17 - CPU 内部分段控件 E2E 第二轮初始化波动

- 独立端口 `4297` 第二轮默认全量为 `168 passed / 3 failed`。三项均为 chromium-1440 的无关 lazy route 在初始 heading 默认 5 秒内仍显示“载入页面”：Q37、Q41、Q25；同轮三项在 1366/390 全部通过，Q42 也已恢复通过。
- 三份失败 trace 未发现 `net::ERR_*` 或页面异常；应用壳、题包状态与路由均已出现，只是 lazy 页面未在 5 秒 readiness 内完成。当前证据指向 8-worker 并发初始化压力，不是 CPU 分段控件回归。
- 下一步在独立端口并行精确复跑这三项 chromium-1440；不修改无关页面、测试 timeout、workers 或业务断言。只有取得可解释的复跑证据后才决定是否再执行第三轮全量。

## 2026-08-17 - CPU 内部分段控件 aria-pressed 最终收口

- 实现严格限于 `apps/web/src/pages/CpuLabPage.tsx` 与 `CpuLabPage.test.tsx`：机器数转换方向 2 个、位宽 3 个、IEEE 754 方向 2 个、RV32I 方向 2 个按钮新增布尔 `aria-pressed`；四组始终恰有一个 pressed，点击后语义随现有状态迁移。
- 红灯为页面 `3 failed / 11 passed`，失败均为 9 个按钮缺少 `aria-pressed`；最小实现后同一页面 `14/14`、CPU 相关 `7 files / 72 tests`。最终正式 worker-mode Vitest 为 `80 files / 905 tests passed`，全仓 lint 与全部 workspace typecheck 通过。
- release `10/10`；内容校验为 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，正式题包继续 `needs-review; verified 0/47`。自动测试、来源核对与截图检查均不构成人工审核。
- production build 为 `1905 modules`、static-copy `198 items`、PWA precache `86 entries (2635.78 KiB)`。三视口真实 Chrome 前两轮分别因无关 Q42 actionability 波动得到 `170/171`、因三个 lazy route 初始 5 秒 readiness 得到 `168/171`；精确复跑分别 `1/1` 与 `3/3`。端口 `4299` 第三轮默认 `8 workers / 3 projects` 最终 `171/171 passed`，未修改 timeout、workers 或业务断言。
- 新鲜 `lab-signed`、`lab-float32`、`lab-rv32i` 九张截图已逐张人工检查：1440x900、1366x768、移动 DPR 1024x2216 均无 P0/P1、重叠、横向溢出或控件截字；移动固定底栏为既有预期。本轮没有视觉 CSS 改动。
- 没有扩展到 Pipeline、Knowledge 或全站控件重构；没有改 schema v1/v2/v3、正式题包、旧图片、旧 `cpu-explorer` 或 Q44 `parallel-5 / split-6` 边界，没有删除测试或文件、提交、推送或部署。端口 `4296/4297/4298/4299` 均已释放。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。CPU 顶层 10 模块及内部 4 组共 9 个分段按钮的 `aria-pressed` 已全部按红转绿收口；最终门禁为 lint/typecheck 全绿、Vitest `80/905`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2635.78 KiB)`、默认三视口 E2E `171/171`，相关九张截图已人工检查。不要重做 CPU 语义、schema v3、Q5/Q10/Q44 或候选比较；没有新的明确范围时先只读审计，不从普通“继续”推断大功能。继续保持 v1/v2 数据、旧图片、旧 `cpu-explorer`、Q44 两套 trace 和人工审核边界不变，不得删除测试、提交、推送或部署。

## 2026-08-17 - Pipeline 模式按钮语义只读审计与立项

- 在 CPU 顶层与内部 19 个按钮语义收口后，只读检查 `PipelineLabPanel.tsx`：模式分段控件的“动态五级流水 / 功能段时延”两个按钮仍只有 `.active` 样式，没有 `aria-pressed`。同组件的前递开关已正确使用 `role="switch" + aria-checked`，周期/阶段选择已使用 `aria-current="step"`，不应混改。
- `KnowledgePage` 的学科和知识点选择也是待评估的独立语义候选，但其控件模型和范围更大，本项不包含 Knowledge、Questions、Practice 或全站重构。
- 新鲜只读证据：`packages/cpu-core/src/pipeline.test.ts` 为 `36/36`，`PipelineLabPanel.tsx` 定向 ESLint 通过；既有三视口 Pipeline E2E 两条合同通过历史门禁，但尚未断言模式按钮的 pressed 状态。
- 用户在该唯一推荐候选后授权继续。实现范围严格限于两个模式按钮：先新增独立 `PipelineLabPanel.test.tsx`，锁定两个按钮均有布尔 `aria-pressed`、默认恰有一个为 true、点击后 pressed 状态与 URL 一起迁移；再只补两个属性。前递 switch、周期/阶段选择、Knowledge 和其他页面均不改。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。当前已立项的唯一范围是 Pipeline 内部“动态五级流水 / 功能段时延”两个模式按钮的 `aria-pressed`；先新增独立 `PipelineLabPanel.test.tsx` 并保留红灯，再做两个属性的最小实现，随后跑定向/全量门禁和三视口真实浏览器合同。不要扩展到前递 switch、周期/阶段选择、Knowledge 或全站控件。继续保持正式题包 `needs-review; verified 0/47`、v1/v2/v3 数据、旧图片、旧 `cpu-explorer`、Q44 `parallel-5 / split-6` 和人工审核边界不变；不得删除测试、提交、推送或部署。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 红灯

- 新增独立 `apps/web/src/components/PipelineLabPanel.test.tsx`，契约锁定两个模式按钮都具有布尔 `aria-pressed`、默认动态模式唯一为 true，并在切换到 timing 后 pressed 状态与 canonical URL 同步迁移，再切回动态模式。
- 首次运行被 JSDOM 缺少真实浏览器 `HTMLElement.scrollTo` 截断；只在新测试内加入可清理的最小 polyfill 后重跑，得到干净目标红灯：`1 failed / 0 passed`，唯一失败是两个按钮均没有 `aria-pressed`。
- 下一步只给 `PipelineLabPanel.tsx` 的这两个模式按钮补 `aria-pressed={mode === ...}`，不改 CSS、URL、模式逻辑、前递开关、周期/阶段控件或其他页面。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 转绿

- `PipelineLabPanel.tsx` 仅为“动态五级流水 / 功能段时延”增加布尔 `aria-pressed`，值直接来自既有 URL 派生的 `mode`；CSS active、模式切换与 canonical URL 写入逻辑未改。
- 同一定向命令转绿为 `1 file / 1 test passed`。测试证明默认只有动态模式 pressed，切到 timing 后唯一 pressed 状态与 `mode=timing&preset=cn408-2009-q18-stage-clock` 同步，切回后恢复 `/lab?module=pipeline`。
- 下一步运行 Pipeline core、CPU 路由、组件联合回归和静态检查，再把同一语义合同加入既有三视口 Pipeline E2E。

## 2026-08-17 - Pipeline 模式按钮定向浏览器验收

- Pipeline core、新组件和 CPU 路由联合 Vitest 为 `3 files / 51 tests passed`；相关 ESLint、Web 与 cpu-core typecheck 全绿。
- 既有 `tests/e2e/pipeline-lab.spec.ts` 新增三视口语义合同：动态默认、timing 初始、切回动态与再切 timing 时，两个按钮始终恰有一个 `aria-pressed=true`，并与 canonical URL 同步。独立端口 `4300` 的真实 Chrome 1440/1366/390 两条 Pipeline 用例为 `6/6 passed`。
- 本轮新鲜动态/时延截图已人工查看；桌面和 390 模式控件、正文与固定底栏无重叠、截字或页面横溢，未发现 P0/P1。实现没有 CSS 变化。
- 下一步运行全量 lint、workspace typecheck、默认 Vitest、release、内容、production build 和默认 8-worker 三视口 E2E，再同步最终基线。

## 2026-08-17 - Pipeline 模式按钮全量源码门禁

- 最终源码上的 `npm run lint` 与全部 workspace `npm run typecheck` 通过。
- 默认 worker-mode `npm test` 新鲜实测 `81 files / 906 tests passed`；新增独立 `PipelineLabPanel.test.tsx` 使上一基线 `80/905` 各增加 1，没有删除或跳过既有测试。
- 下一步运行 release、内容校验与 production build；正式内容仍必须保持 `needs-review; verified 0/47`。

## 2026-08-17 - Pipeline 模式按钮 release、内容与 build 门禁

- `npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），状态明确保持 `needs-review; verified 0/47`。
- production build 新鲜通过：Vite `1905 modules transformed`、static-copy `198 items`、PWA precache `86 entries (2635.84 KiB)`，无 chunk warning。
- 下一步用独立端口按默认 `8 workers / 3 projects` 跑完整 `171` 项 E2E；定向 `6/6` 不能替代全量门禁。

## 2026-08-17 - Pipeline 模式按钮 aria-pressed 最终收口

- 最终变更严格限于 `PipelineLabPanel.tsx` 两个布尔属性、新增独立 `PipelineLabPanel.test.tsx`、既有 `pipeline-lab.spec.ts` 的三视口语义断言，以及 README/HANDOFF/notes 同步。前递 switch、周期/阶段 `aria-current`、Knowledge 和其他页面未改。
- 红灯在清理 JSDOM `scrollTo` 夹具噪声后为 `1 failed / 0 passed`，失败精确落在两个按钮缺少 `aria-pressed`；最小实现后组件 `1/1`，Pipeline core + 组件 + CPU 路由联合 `3 files / 51 tests`。
- 最终门禁：lint、全部 workspace typecheck 全绿；默认 Vitest `81 files / 906 tests`；release `10/10`；内容 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，保持 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2635.84 KiB)`。
- 真实浏览器：端口 `4300` Pipeline 三视口定向 `6/6`；端口 `4301` 默认 `8 workers / 3 projects` 全量 `171/171`。新鲜动态/时延截图已人工检查，无 P0/P1、重叠、截字、页面横溢或底栏遮挡；没有改 CSS。
- 边界复核：正式题包与 Q44 仍为 `needs-review`，自动测试和截图不构成人工审核；v1/v2/v3 store 定义、19 张旧图片、旧 `cpu-explorer`、Q44 `parallel-5 / split-6` 均未改，没有删除文件/测试、提交、推送或部署。端口 `4300/4301` 已释放。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。CPU 顶层 10 个模块、内部 4 组 9 个分段按钮和 Pipeline 2 个模式按钮的 `aria-pressed` 已全部按红转绿收口；最终门禁为 lint/typecheck 全绿、Vitest `81/906`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2635.84 KiB)`、Pipeline 定向 E2E `6/6`、默认三视口全量 `171/171`。不要重做这些语义、schema v3、Q5/Q10/Q44 或候选比较；Knowledge 学科/知识点选择仍只是范围更大的独立候选，没有新明确授权时只读审计。继续保持 v1/v2/v3 数据、旧图片、旧 `cpu-explorer`、Q44 两套 trace 和人工审核边界不变；不得删除测试、提交、推送或部署。

## 2026-08-17 - Knowledge 控件语义只读审计

- 本轮严格保持只读产品范围；没有新增/修改产品代码、测试、schema、题包或持久化数据。新鲜定向证据为 `packages/domain/src/analytics.test.ts` 的 `11/11`，Knowledge 页面/组件与现有 Knowledge E2E 文件 ESLint 全绿；当前没有独立 `KnowledgePage.test.tsx` 或 `KnowledgeGraph.test.tsx`。
- 4 个学科按钮是同一工作区的数据集切换，不是页面导航，也没有四个并列 `tabpanel`；最小正确语义是保留原生 `button` 并补布尔 `aria-pressed={subject === item.id}`，始终恰有一个为 true。改成 tabs/listbox 会额外引入当前未实现的复合控件焦点与方向键合同。
- 当前科目的叶知识点列表同样是详情对象选择，适合原生 `button` + `aria-pressed={activeSelectedId === node.point.id}`。由于默认选中项是未出现在列表中的科目根节点，叶节点列表初始允许 0 个 pressed，任何时刻至多 1 个；点击叶节点后才应恰有 1 个，不能写成初始强制唯一的错误测试。
- Cytoscape 图节点可通过 pointer `tap` 改变选择，但容器整体只暴露为 `role="img"`；下方可访问索引只列叶节点。根节点仍缺少直接的键盘选择入口，不过切换学科会默认选中对应根节点，因此当前记为独立 P2 可用性缺口，不混入按钮属性最小修复。
- 现有 Knowledge E2E 只覆盖默认 12 个叶节点、非空画布、专项练习与页面无横向溢出，没有覆盖 subject/topic pressed 状态。独立状态审计立案 1 个 P1：`subject`/`node` 只在组件初始化时从 search params 读取，页面内选择不写回 URL，同路由 query 变化也不反向更新 state；因此切换后的刷新/分享、连续 Knowledge history 的 back/forward 以及非法参数规范化都会出现地址与页面分叉。首次加载和跨路由深链仍有效，不能用它们冒充同路由恢复合同。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Knowledge 只读审计已完成，尚未改产品或测试。优先候选是已立案的 Knowledge URL/state P1：search params 当前只初始化本地 state，页面内选择、同路由 query 变化和 back/forward 会与 UI 分叉；若用户明确授权，先新增 `KnowledgePage.test.tsx` 保留 URL 唯一事实源、非法参数规范化和 history 恢复红灯，再实现并做三视口验证。`aria-pressed` 是其后的独立 P2：学科组始终唯一 true；叶节点组初始允许 0、始终至多 1、点击后唯一 true。不要把控件改成不完整的 tabs/listbox，不要顺手修改 Cytoscape、schema、题包、旧图片、旧 `cpu-explorer` 或 Q44；图根节点键盘入口仍是独立 P2。正式内容继续保持 `needs-review; verified 0/47`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge URL/state P1 页面红灯

- 用户在该唯一优先候选后明确要求继续；本轮范围只修 Knowledge URL/state P1，不夹带 `aria-pressed`、Cytoscape 键盘入口或其他 P2。
- 新增 `apps/web/src/pages/KnowledgePage.test.tsx`，mock 掉 Cytoscape 渲染但保留真实知识森林/表现聚合。契约覆盖默认与非法参数 canonical、合法深链、学科/叶节点/图节点选择写 URL、用户选择 push history、同路由 query 导航以及 back/forward 恢复。
- canonical 规则锁定为：subject 是父级权威；缺失/非法 subject 回退 `data-structures`，非法/跨科目/root node 从 URL 省略；URL 只保留单个 `subject` 与可选同科目叶 `node`，系统纠偏 replace，用户选择 push。默认根为 `/knowledge?subject=data-structures`。
- 定向 Vitest 新鲜红灯为 `1 file / 7 tests`，`5 failed / 2 passed`。合法首次深链和既有 subject 优先回退仍通过；失败精确命中 canonical 未写回、点击不写 history、同路由 query 不更新 mount-time state、图节点选择不写 URL，没有夹具异常。
- 下一步删除 Knowledge 选择的两个本地 state，直接从 `searchParams + forest` 派生；使用稳定 callback 写 canonical query，并用同一命令转绿。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的 Knowledge URL/state P1，不要重做只读审计。`KnowledgePage.test.tsx` 红灯已保留为 `5 failed / 2 passed`；先移除 `subject/selectedId` mount-time state，让 URL 成为唯一事实源，系统 canonical 纠偏 replace、用户学科/节点选择 push、根节点省略 node，再用同一测试转绿。不要加入 `aria-pressed` 或改 Cytoscape；正式题包和 Q44 继续 `needs-review`，v1/v2/v3 store、旧图片、旧 `cpu-explorer` 均不改，不得删除测试、提交、推送或部署。

## 2026-08-17 - Knowledge URL/state P1 页面转绿

- `KnowledgePage.tsx` 已移除 `subject` 与 `selectedId` 两个 mount-time state；当前学科、合法叶节点、科目根回退和详情选择均直接由 `searchParams + forest` 派生，URL 成为唯一事实源。
- canonical query 固定为单个 `subject` 与可选同科目叶 `node`，参数顺序为 subject/node。缺失、空、重复、非法、跨科目或根 node 会通过 `{ replace: true }` 重建；用户切换学科或叶/图节点使用默认 push，重复选择当前项不写 history。
- 同一 `KnowledgePage.test.tsx` 从 `5 failed / 2 passed` 转为 `7/7 passed`；测试选择器自身的两个问题同时修正：移除 Testing Library 不支持的 `exact` 选项，并排除图 mock 与叶索引按钮的重名歧义。相关 ESLint 与 Web typecheck 全绿。
- 本步骤没有加入 Knowledge `aria-pressed`、改 Cytoscape、schema、题包、旧图片、旧 `cpu-explorer` 或 Q44；正式内容与 Q44 继续 `needs-review`，自动测试不构成人工审核。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的 Knowledge URL/state P1 浏览器收口。页面红灯 `5 failed / 2 passed` 已保留，产品实现后定向 `7/7`、相关 ESLint 与 Web typecheck 全绿。下一步扩展 `tests/e2e/study-flow.spec.ts`，覆盖 Q15 合法深链、用户切到操作系统根、选择 Q29、reload、back/forward 恢复；扩展 `tests/e2e/visual.spec.ts` 刷新 OS/Q29 三视口 `knowledge-selected` 截图。不要实现 `aria-pressed` 或 Cytoscape 根节点键盘入口；正式题包和 Q44 保持 `needs-review`，v1/v2/v3 store、旧图片、旧 `cpu-explorer` 不改，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge URL/state P1 三视口浏览器合同

- `study-flow.spec.ts` 新增真实 BrowserRouter/IndexedDB/Cytoscape 流程：Q15 合法深链 -> 操作系统科目根 -> Q29 叶节点 -> reload -> back -> forward；每一步同时断言 canonical URL 与详情标题。
- `visual.spec.ts` 保留默认 Knowledge 画布像素、索引与横溢合同，并在 OS/Q29 选择后再次断言 URL/详情/横溢，生成 `knowledge-selected` 全页截图。
- 独立端口 `4302` 实际运行了上述两个 E2E 文件的全部三视口用例，结果 `57/57 passed`；其中新增 history/reload 用例 `3/3`，扩展后的 Knowledge 视觉用例 `3/3`。相关 E2E ESLint 与页面 Vitest `7/7` 仍通过。
- 下一步人工检查三张 `knowledge-selected` 截图并做独立 P0/P1 审计，然后运行全量源码与浏览器门禁。端口 `4302` 已随 Playwright 退出释放。

## 2026-08-17 - Knowledge URL/state P1 截图人工检查

- 已逐张检查 `chromium-1440/1366/390-knowledge-selected.png`：OS/Q29 的画布节点高亮、详情标题与列表选中态一致；桌面无文字重叠或截字，390px 长页无页面横溢、控件溢出或底部导航遮挡，未发现 P0/P1。
- 桌面图画布最上方两个外围节点仍有轻微裁切，属于既有 Cytoscape fit/画布观感 P2，URL/state 改动没有修改图布局；按范围只记录不修。
- 下一步等待两项独立只读审计，若 P0/P1 清零则进入全量源码门禁。

## 2026-08-17 - Knowledge URL/state P1 视觉审计与源码门禁

- 独立视觉审计与人工检查结论一致：1440/1366/390 三视口 P0/P1 为 0；OS 学科、画布 Q29、详情标题和列表选中态一致，无重叠、截字、横向溢出或底栏遮挡。
- 两个 P2 只记录不修：桌面画布顶部两个外围节点轻微裁切；390 全页截图的缩放展示主要覆盖列表选中态，未在同一张图同时展示画布/详情。两者均不表示 URL 状态不一致。
- 全量源码门禁新鲜通过：`npm run lint`、全部 workspace `npm run typecheck` 全绿；默认 worker-mode `npm test` 为 `82 files / 913 tests passed`。相较上一基线增加 `KnowledgePage.test.tsx` 及 7 项页面合同，没有删除或跳过测试。
- 下一步执行 release、内容校验与 production build，然后跑默认 8-worker / 三项目全量 E2E，预期总数由 171 增为 174。

## 2026-08-17 - Knowledge URL/state P1 release、内容与 build 门禁

- `npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions / 19 assets`（`40 objective / 7 comprehensive`），明确保持 `needs-review; verified 0/47`。
- production build 通过：Vite `1905 modules transformed`、static-copy `198 items`、PWA precache `86 entries (2636.26 KiB)`，无 chunk warning。
- 下一步取得独立代码审计结论；P0/P1 清零后在独立端口执行默认 `8 workers / 3 projects` 全量 `174` 项 E2E。

## 2026-08-17 - Knowledge 图实例稳定性 P1 红灯

- 独立代码审计立案 1 个 P1：本地 React Router `7.18.2` 的 `setSearchParams` 依赖当前 `searchParams`，使 `selectNode` 随 node query 改变引用；`KnowledgeGraph` 建图 effect 依赖 `onSelect`，因此同科目选点/back-forward 会 destroy/recreate Cytoscape，丢失 zoom/pan 并可能闪烁。
- `KnowledgePage.test.tsx` 新增同科目根 -> 叶变化时 `onSelect` 身份保持不变的回归；新鲜红灯为 `1 failed / 7 passed`，失败精确是回调引用变化，既有 7 项 canonical/history 合同继续通过。
- 下一步在页面内稳定节点选择 callback，同时保留重复点击不新增 history；不修改图组件、键盘入口、`aria-pressed` 或 CSS。

## 2026-08-17 - Knowledge 图实例稳定性 P1 转绿

- `selectNode` 改为通过现有稳定 `navigate` 写 query，callback dependency 只保留 `navigate + nodeById + subject`；当前选中 id 由 effect 同步到 ref，用于拦截当前叶/根的重复点击。因此同科目 node/back-forward 不再改变回调身份，学科或 forest 真正变化时仍允许图重建。
- 同一页面测试从 `1 failed / 7 passed` 转为 `8/8 passed`；产品/测试 ESLint 与 Web typecheck 通过。实现没有修改 `KnowledgeGraph`、Cytoscape 布局或交互。
- 原独立审计已收到定向复审任务；P0/P1 清零后重跑全量源码/build 门禁与最终 174 项 E2E。

## 2026-08-17 - Knowledge 重复图事件 history P1 红灯

- 复审立案稳定 callback 的重入 P1：passive effect 更新当前选择 ref 前，连续两次同一 Cytoscape tap 会 push 两个相同 leaf URL，违反“当前项不新增 history”。
- 新增同一 `onSelect` 在一个 act 内连续选择 OS leaf 两次、随后 back 一次必须回 OS 根的回归；新鲜结果 `1 failed / 8 passed`，失败时 URL/详情仍停在 leaf，准确证明重复 history entry。
- 下一步在首次导航前立即更新 ref，并以 layout effect 同步外部 back/forward 选择；不改图组件或其他 P2。

## 2026-08-17 - Knowledge 重复图事件 history P1 转绿

- `selectNode` 在通过旧 ref 的 no-op 判断后、调用 navigate 前立即写入目标 id，保证同批/重入的相同节点事件幂等；外部 URL/back-forward 派生的当前选择通过 `useLayoutEffect` 在交互前同步 ref。
- 同一页面定向从 `1 failed / 8 passed` 转为 `9/9 passed`；相关 ESLint 与 Web typecheck 全绿。回调身份稳定、重复事件不写 history、原 7 项 canonical/history 合同全部同时保留。
- 已发出最终独立复审；清零后重跑所有最终门禁。

## 2026-08-17 - Knowledge URL/state P1 最终独立审计

- 最终独立复审确认 P0/P1 清零：同科目 node 变化下 callback identity 稳定，不重建 Cytoscape；同批重复 tap 幂等；外部 query/back-forward 在重新可交互前同步 ref。
- 定向复审实测 `9/9`。保留既有 P2 记录，不修 canonical 文本子串测试严谨性、桌面顶部外围节点轻微裁切、Knowledge `aria-pressed` 或图根键盘入口。
- 下一步刷新 lint、workspace typecheck、全量 Vitest、release、内容、build 与默认三视口全量 E2E。

## 2026-08-17 - Knowledge URL/state P1 最终源码门禁

- 最终实现后的 `npm run lint` 与全部 workspace `npm run typecheck` 全绿。
- 默认 worker-mode `npm test` 为 `82 files / 915 tests passed`；上一完整基线 `81/906`，本项净增 1 个页面测试文件和 9 项合同，没有删除、跳过或放宽既有测试。
- 下一步刷新 release/content/build，然后执行默认 `8 workers / 3 projects` 全量 `174` 项 E2E。

## 2026-08-17 - Knowledge URL/state P1 最终 release、内容与 build 门禁

- 最终 `npm run test:release` 为 `10/10 passed`；内容校验为 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，继续 `needs-review; verified 0/47`。
- 最终 production build 为 Vite `1905 modules transformed`、static-copy `198 items`、PWA `86 entries (2636.35 KiB)`，无 chunk warning。
- 下一步独立端口 `4303` 执行默认 `8 workers / 3 projects` 全量 `174` 项 E2E；不调整超时、workers 或业务断言。

## 2026-08-17 - Knowledge URL/state P1 全量 E2E 首轮

- 端口 `4303` 默认 `8 workers / 3 projects` 全量结果 `173/174`；新增 Knowledge history/reload 与视觉用例三视口 `6/6` 均通过，唯一失败是既有 chromium-390 双标签模考用例等待主页面 heading 15 秒超时。
- 失败时 error context 停在 Suspense“载入页面”，失败截图稍后已完整显示 2009 整卷模考；trace 未发现 `net::ERR`、4xx/5xx、page error 或 console error，初步归为 8-worker lazy route 初始化压力波动，不是 Knowledge 改动或已证明的模考产品错误。
- 不修改模考产品、局部 15 秒 readiness、全局超时、workers 或断言。下一步端口 `4304` 精确复跑该 chromium-390 用例；若通过，再以新端口完整复跑 `174` 项。

## 2026-08-17 - Knowledge URL/state P1 E2E 失败项精确复跑

- 端口 `4304` 的 chromium-390 双标签模考用例精确复跑 `1/1 passed`，业务用例 2.7 秒完成；未修改产品、测试、超时或 worker 配置。
- 首轮失败归为并发 lazy route 初始化波动。下一步端口 `4305` 按默认 `8 workers / 3 projects` 完整复跑 `174` 项，精确结果不替代全量门禁。

## 2026-08-17 - Knowledge URL/state P1 全量 E2E 第二轮

- 端口 `4305` 默认全量再次为 `173/174`；首轮失败的 chromium-390 双标签模考已在同轮通过，唯一失败换为既有 chromium-1440 ContentReview Q41 URL/history 用例。
- ContentReview 页面快照完整包含 47 题和三个面板；失败发生在 Q41 按钮 `scrollIntoViewIfNeeded()` 持续等待 stable 至 30 秒全局超时。1366/390 同用例通过，trace 无网络、page 或 console error，仍属并发 actionability 波动。
- 不修改 ContentReview 产品、scroll helper、超时、workers 或断言。下一步端口 `4306` 精确复跑该 1440 用例；通过后端口 `4307` 进行第三轮全量。

## 2026-08-17 - Knowledge URL/state P1 第二个失败项精确复跑

- 端口 `4306` 的 chromium-1440 ContentReview Q41/history 用例精确复跑 `1/1 passed`，业务用例 1.5 秒完成。
- 未修改产品、测试 helper、超时、workers 或断言。下一步端口 `4307` 第三轮默认全量 `174` 项。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的 Knowledge URL/state P1 最终收口。页面红转绿为 `5 failed / 2 passed -> 7/7`；端口 `4302` 两个 E2E 文件三视口 `57/57`，新增 Q15/OS 根/Q29/reload/back/forward 合同与 `knowledge-selected` 三视口截图均已生成。下一步检查三张新截图、完成独立 P0/P1 审计，再跑 lint、workspace typecheck、全量 Vitest、release、内容、build 和默认三视口全量 E2E。不要夹带 `aria-pressed` 或 Cytoscape P2；题包与 Q44 保持 `needs-review`，v1/v2/v3 store、旧图片、旧 `cpu-explorer` 不改，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge URL/state P1 最终收口

- 端口 `4307` 的最终 Playwright HTML 报告已直接解包复核：`actualWorkers=8`，项目为 chromium-1440/1366/390，统计为 `174 total / 174 expected / 0 unexpected / 0 flaky / 0 skipped`，`.last-run.json` 同时为 `passed` 且没有 failed test。第三轮持续约 175 秒，没有修改 timeout、workers、产品代码或业务断言。
- 前两轮全量各为 `173/174`：端口 `4303` 的 chromium-390 模考双标签 lazy 初始化波动已在 `4304` 精确复跑 `1/1`；端口 `4305` 的 chromium-1440 ContentReview Q41 actionability 波动已在 `4306` 精确复跑 `1/1`。两项都在后续轮次恢复，最终全量无失败或 flaky 标记；没有借此改动无关模块。
- 再次逐张检查 `chromium-1440/1366/390-knowledge-selected.png`：OS/Q29 选中态在学科、桌面画布、详情和列表之间一致；无 P0/P1、文字重叠、截字、页面横溢或底栏遮挡。继续只记录两个 P2：桌面图顶部两个外围节点轻微裁切；移动长图没有在同一画面同时展示画布与详情。
- 最终基线：lint 与全部 workspace typecheck 通过；Vitest `82 files / 915 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.35 KiB)`；定向浏览器 `57/57`；默认三视口全量浏览器 `174/174`。独立代码与视觉审计 P0/P1 均为 0。
- 端口 `4302-4307` 已重新检查，均无监听进程。Knowledge `aria-pressed` 与 Cytoscape 根节点键盘入口仍是两个独立 P2；本轮未修改 v1/v2/v3 store、题包、旧图片、旧 `cpu-explorer` 或 Q44 `parallel-5 / split-6` 边界，未删除测试/文件、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Knowledge URL/state P1 已最终收口：URL 是学科/叶节点唯一事实源，canonical 只保留合法 `subject` 与可选同科 `node`，系统纠偏 replace、用户选择 push，reload、同路由 query、back/forward、稳定图 callback 和重复事件幂等均有回归；独立审计 P0/P1 为 0。最终门禁为 lint/typecheck 全绿、Vitest `82/915`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2636.35 KiB)`、定向三视口 `57/57`、默认 8-worker 三视口 E2E `174/174`，三张截图已复核。下一个可独立立项的候选是 Knowledge 学科与叶节点按钮 `aria-pressed` P2；在用户明确授权前只读审计，不实现，也不夹带 Cytoscape 根节点键盘入口。继续保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不改 v1/v2/v3 store、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge 按钮 aria-pressed 红灯

- 用户通过“继续下一步”明确承接上一检查点唯一候选，授权范围仅为 Knowledge 的 4 个学科按钮与当前科目叶节点按钮；不包含 Cytoscape 根节点键盘入口、角色重构、CSS 或 URL/state P1。
- `KnowledgePage.test.tsx` 新增两项语义合同：学科组全部显式暴露布尔 pressed 且始终唯一；叶节点在科目根状态允许 0 个 pressed，选择叶后唯一，切科后清零，再选新科目叶后唯一。
- 新鲜定向 Vitest 为 `1 file / 11 tests`、`2 failed / 9 passed`。两项失败都精确落在现有按钮缺少 `aria-pressed`，已有 9 项 canonical/history/callback 回归全部保持通过，没有夹具异常。
- 下一步只在 `KnowledgePage.tsx` 两处现有 button 上分别增加 `aria-pressed={subject === item.id}` 与 `aria-pressed={activeSelectedId === node.point.id}`，保留 class、onClick、URL 和视觉不变。

## 2026-08-17 - Knowledge 按钮 aria-pressed 转绿

- `KnowledgePage.tsx` 的 4 个学科按钮增加 `aria-pressed={subject === item.id}`，叶节点索引按钮增加 `aria-pressed={activeSelectedId === node.point.id}`；值均直接来自既有 URL 派生状态。
- 同一定向 Vitest 从 `2 failed / 9 passed` 转为 `1 file / 11 tests passed`。学科组唯一 true、叶节点根态 0 个 true、选叶唯一、切科归零与再选择均已锁定。
- 没有新增本地 state、角色或键盘模型，也没有修改 class、CSS、点击处理、canonical/history、KnowledgeGraph 或图根节点键盘入口。下一步把相同语义加入既有三视口 URL/history E2E。

## 2026-08-17 - Knowledge 按钮 aria-pressed 三视口合同

- `study-flow.spec.ts` 的既有 Q15 -> OS 根 -> Q29 -> reload -> back -> forward 用例新增 pressed 分区断言：每个按钮都显式为 true/false，学科始终唯一；叶节点在根态为 0、合法深链或选叶后唯一。
- 页面 Vitest `11/11`、改动文件 ESLint 与 Web typecheck 通过。独立端口 `4308` 的真实 Chrome 1440/1366/390 定向结果为 `3/3 passed`，三视口均验证 URL、详情与 pressed 状态同步。
- 下一步刷新既有 Knowledge 视觉用例的三视口截图并检查无视觉回归；ARIA 正确性仍以行为合同为证，不把截图冒充语义测试。

## 2026-08-17 - Knowledge 按钮 aria-pressed 截图检查

- 独立端口 `4309` 的 Knowledge 视觉用例在真实 Chrome 1440/1366/390 为 `3/3 passed`，刷新默认与 OS/Q29 选中态共六张截图。
- 六张图已逐张人工检查：四学科分段控件、OS active、Q29 列表选中、桌面两列、移动单列均与改前一致，无 P0/P1、文字重叠、截字、页面横溢或固定底栏遮挡。`aria-pressed` 没有触发 Knowledge 范围内的属性 CSS。
- 继续只记录既有 P2：桌面画布顶部外围节点轻裁切；移动选中态长图未在同一画面同时展示图与详情。端口 `4308/4309` 均无监听进程。下一步执行最终全量门禁与独立复审。

## 2026-08-17 - Knowledge pressed E2E 非空分区 P1

- 独立 E2E 复审立案 1 个测试合同 P1：`expectPressedPartition` 在根态没有 activeName 时，若叶按钮列表错误地变为空集合，`total=0 / true=0 / false=0` 也会通过，存在假绿窗口。
- 产品当前三视口实际列表非空且定向合同通过；这是测试充分性问题，不是已观察到的产品故障。最小修正是在计算 total 后断言 `total > 0`，再保留 true/false 数量完整分区。
- 独立代码审计 P0/P1 为 0，确认两处产品属性与 URL/callback 均正确。下一步修正 helper 后重新执行定向三视口。

## 2026-08-17 - Knowledge pressed E2E 非空分区 P1 转绿

- `expectPressedPartition` 已在数量分区前增加 `expect(total).toBeGreaterThan(0)`；因此 OS 根态必须同时满足叶列表非空、0 个 true、全部按钮显式 false，空集合不能再假绿。
- 修改后的 E2E 文件 ESLint 通过；独立端口 `4311` 真实 Chrome 1440/1366/390 再次 `3/3 passed`。产品代码未因该测试加固改变。
- 全量源码门禁：lint、全部 workspace typecheck 通过；默认 Vitest `82 files / 917 tests`，相较 URL/state 最终基线净增 2 项 pressed 单测；release `10/10`；内容 `47 questions` 且 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.40 KiB)`。
- 下一步等待 E2E 复审清零并运行默认 8-worker / 三项目完整 `174` 项浏览器门禁。

## 2026-08-17 - Knowledge 按钮 aria-pressed 最终收口

- 最终产品改动严格限于 `KnowledgePage.tsx` 两个布尔属性表达式；页面新增 2 项测试，既有 Knowledge history E2E 增加 pressed 非空完整分区合同。Cytoscape 根节点键盘入口、角色模型、CSS、URL/state、题包与存储均未改。
- 红灯为页面 `2 failed / 9 passed`，分别精确命中学科与叶按钮缺少 pressed；最小实现后页面 `11/11`。E2E 独立审计发现空集合假绿 P1，helper 增加 `total > 0` 后端口 `4311` 三视口 `3/3`，最终复审清零。
- 独立代码、E2E 与视觉审计 P0/P1 均为 0。学科组始终 1 true + 3 false；叶列表在科目根为 0 true 且全部 false，合法叶深链/点击后唯一 true，切科、reload、back/forward 均同步。
- 最终门禁：全仓 lint 与全部 workspace typecheck 通过；默认 Vitest `82 files / 917 tests`；release `10/10`；内容 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，保持 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.40 KiB)`。
- 真实浏览器：端口 `4308` 初版语义 `3/3`，`4309` 视觉 `3/3`，`4311` 非空合同修正后 `3/3`；端口 `4312` 默认 `8 workers / 3 projects` 全量首轮 `174/174`，报告 `0 unexpected / 0 flaky / 0 skipped`、持续约 147 秒。最终三张 OS/Q29 选中态截图已复查，无 P0/P1、重叠、截字、横溢或底栏遮挡；本批桌面外围节点完整，移动单图构图限制仅为 P2 证据缺口。
- `4308-4312` 已检查，均无监听进程。正式题包与 Q44 继续 `needs-review`，Q44 仍只支持 `parallel-5 / split-6`；未修改 v1/v2/v3 store、题包、旧图片、旧 `cpu-explorer`，未删除测试/文件、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Knowledge URL/state P1 与学科/叶节点按钮 `aria-pressed` P2 均已收口：页面红转绿 `2 failed / 9 passed -> 11/11`，独立代码/E2E/视觉审计 P0/P1 为 0；最终 lint/typecheck 全绿、Vitest `82/917`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2636.40 KiB)`、默认 8-worker 三视口 E2E `174/174`，最终截图已检查。不要重做 Knowledge URL/pressed、CPU/Pipeline 语义、schema v3、Q5/Q10/Q44 或候选比较。下一独立候选是 Cytoscape 图根节点直接键盘入口，尚未设计或授权；没有新的明确范围时先只读审计，不从普通维护动作夹带实现。继续保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不改 v1/v2/v3 store、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - Knowledge 科目根节点键盘入口立项

- 用户通过“继续下一步”明确承接上一检查点唯一候选，授权范围仅为当前科目根节点的直接键盘入口；不重做 Knowledge URL/pressed、候选比较或 Cytoscape 角色模型，也不扩展为任意图键盘导航。
- 设计固定为把图面板标题右侧的装饰性 `Network` 图标替换成始终可见的原生 `button type="button"`：可见文案“科目总览”，动态 accessible name 为“<当前科目>科目总览”，布尔 `aria-pressed` 直接表示根节点是否为当前详情；Enter/Space 使用原生按钮语义，不添加自定义 `onKeyDown`。
- `subjectRootId` 必须从 `forest.rootIds` 按当前 subject 单独取得；缺少明确根节点时不把 `defaultSelectedId` 的叶回退伪装成总览。点击只复用现有稳定 `selectNode(subjectRootId)`，因此 leaf -> root push 为仅含 subject 的 canonical URL，当前根重复激活保持 no-op，back/forward 继续由既有 URL 唯一事实源恢复。
- 不复用已 pressed 的学科按钮执行隐藏重置，不把根插入 `.knowledge-topic-list`，继续保持叶列表根态非空且 `0 pressed`、叶态唯一 pressed 的现有合同；不引入 `tree`、`application`、`listbox` 或不完整方向键/焦点模型。
- 下一步先扩展 `KnowledgePage.test.tsx`，用原生键盘 Enter/Space 从 OS 叶深链验证根按钮 false -> true、精确 canonical URL、详情/图选中、叶 pressed 清零和 back/forward 双向恢复；先运行定向 Vitest 保留缺按钮红灯，再实现产品与最小视觉状态。

## 2026-08-17 - Knowledge 科目根节点键盘入口红灯

- `KnowledgePage.test.tsx` 新增参数化 Enter/Space 两项合同；每项均从 OS 叶深链开始，要求动态根按钮初始 `pressed=false` 且可聚焦，激活后 canonical URL 精确变为仅含 `subject`，详情与图选中根、叶列表清零，并由 back/forward 双向恢复。
- 定向命令 `npm exec vitest run apps/web/src/pages/KnowledgePage.test.tsx` 新鲜结果为 `1 file / 13 tests`、`2 failed / 11 passed`。两项失败都只因无法找到 accessible name 为“操作系统科目总览”的按钮；既有 11 项 canonical/history/pressed/callback 回归全部通过，没有夹具、键盘模拟或业务断言噪声。
- 下一步才修改 `KnowledgePage.tsx`：单独派生 `subjectRootId`，以标题区原生按钮复用 `selectNode`；随后同一命令转绿。

## 2026-08-17 - Knowledge 科目根节点键盘入口页面转绿

- `KnowledgePage.tsx` 现在从 `forest.rootIds` 按当前 subject 单独派生 `subjectRootId`，`defaultSelectedId` 仍保留原叶回退但不被总览入口使用；标题右侧装饰图标替换为原生“科目总览”按钮，accessible name 为当前科目加“科目总览”。
- 按钮用 `aria-pressed={activeSelectedId === subjectRootId}` 表示详情对象是否为根，点击只调用既有 `selectNode(subjectRootId)`；没有新增 state、`onKeyDown`、URL 写入分支或图 callback dependency。根态仍可聚焦，重复激活沿用既有 no-op。
- `styles.css` 只为 pressed 根按钮增加与既有深色选中态一致的颜色；标题 flex、画布尺寸、叶列表与其他控件未改。
- 同一定向 Vitest 从 `2 failed / 11 passed` 转为 `1 file / 13 tests passed`。下一步运行页面 ESLint/Web typecheck，再新增独立三视口键盘 E2E。

## 2026-08-17 - Knowledge 科目根节点键盘入口三视口合同

- 页面产品/测试 ESLint、Web typecheck 与 E2E 文件 ESLint 均通过；Playwright 收集为 `177 tests / 24 files`，相较上一基线只增加一个用例在三个视口中的执行。
- `tests/e2e/study-flow.spec.ts` 新增独立 Space 合同：OS/Q29 叶态根按钮 `pressed=false`，聚焦后激活进入仅含 subject 的 canonical 根 URL，焦点保留且 `pressed=true`，叶列表清零；back/forward 双向恢复根叶状态。
- 独立端口 `4313` 的 chromium-1440/1366/390 定向结果为 `3/3 passed`。独立核心代码复审同时确认 P0/P1 为 0，并复跑页面 `13/13`。
- 下一步最小扩展既有 Knowledge 视觉用例，核对默认根态与 OS/Q29 叶态的根按钮 pressed，并在叶态聚焦按钮后刷新三视口截图，重点检查 390 标题区、focus outline、横向溢出和底栏。

## 2026-08-17 - Knowledge 科目根节点键盘入口视觉检查

- `visual.spec.ts` 的既有 Knowledge 用例现在断言默认“数据结构科目总览” `pressed=true`，OS/Q29 叶态“操作系统科目总览” `pressed=false`；叶态截图前显式聚焦根按钮并确认焦点。
- 视觉文件 ESLint 通过；独立端口 `4314` 的真实 Chrome 1440/1366/390 为 `3/3 passed`，默认与叶态六张 Knowledge 截图均已刷新。
- 六张图逐张检查未见 P0/P1：桌面和 390 标题区均完整，固定文案不换行或截断；默认深色 pressed 与根态一致，叶态焦点轮廓可见且未被面板裁切；无横向溢出、内容重叠或底栏遮挡。
- 下一步等待独立视觉/E2E 复审；若 P0/P1 为 0，执行最终全量源码、内容、build 和默认 `177` 项三视口浏览器门禁。

## 2026-08-17 - Knowledge 科目根节点键盘入口独立复审与源码门禁

- 独立视觉复审逐张检查六图，P0/P1 为 0；390 标题按钮完整、focus outline 四边可见且与 `overflow: hidden` 保持安全距离。移动选中图不同时展示下方详情、1366 默认图为 viewport-only 仅是既有截图证据范围 P2。
- 独立 E2E 复审 P0/P1 为 0：动态名称、false -> Space -> true、焦点、精确 canonical、叶列表非空全 false、back/forward，以及视觉根/叶两态均有稳定合同。
- 最终实现后的全仓 `npm run lint`、全部 workspace `npm run typecheck` 通过；默认 worker-mode `npm test` 为 `82 files / 919 tests passed`。
- 下一步刷新 release、内容校验与 production build，再运行默认 `8 workers / 3 projects` 全量 `177` 项 E2E。

## 2026-08-17 - Knowledge 科目根节点键盘入口 release、内容与 build 门禁

- `npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，题包继续 `needs-review; verified 0/47`，自动验证不计入人工审核。
- production build 为 Vite `1905 modules transformed`、static-copy `198 items`、PWA `86 entries (2636.77 KiB)`；Knowledge chunk `453.14 kB / gzip 145.90 kB`，无新增 warning。
- 下一步使用独立端口执行默认 `8 workers / 3 projects` 全量 `177` 项 E2E；不调整 timeout、workers 或既有业务断言。

## 2026-08-17 - Knowledge 科目根节点键盘入口最终收口

- 独立端口 `4315` 按默认 `8 workers / 3 projects` 首轮全量为 `177/177 passed`，持续约 `2.9m`；新增根入口行为与视觉用例在 1440/1366/390 均通过。`output/playwright/results/.last-run.json` 为 `passed` 且 `failedTests` 为空。
- 全量运行后再次逐张检查六张 Knowledge 截图并由独立视觉代理复审，根入口按钮、root/leaf pressed 两态、leaf focus、标题区与 390 底栏均无 P0/P1、截字、横溢或遮挡。
- 保留准确 P2：最终 `chromium-1366-knowledge-selected.png` 有至少三枚外围节点标签完全越出 canvas，仅剩连线/箭头触顶；问题局限于既有 Cytoscape fit/动画构图，Q29、根节点、详情和 12 个叶节点列表均完整，同批 1440/390 未复现。本轮不修改图布局。
- 最终门禁：lint、全部 workspace typecheck 通过；Vitest `82 files / 919 tests`；release `10/10`；内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2636.77 KiB)`；定向键盘与视觉浏览器各 `3/3`；默认全量浏览器 `177/177`。独立代码、E2E、视觉复审 P0/P1 均为 0。
- `4302-4315` 已检查无监听进程。Q44 仍只支持 `parallel-5 / split-6` 并保持 `needs-review`；本轮未修改 v1/v2/v3 store/schema、题包、旧图片或旧 `cpu-explorer`，未删除测试/文件、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。Knowledge 科目根节点直接键盘入口已最终收口：标题区原生“科目总览”按钮使用明确 `forest.rootIds` 根 id、动态 accessible name、布尔 `aria-pressed` 与既有稳定 `selectNode`；Enter/Space、精确 canonical URL、根/叶 pressed、焦点、back/forward 和三视口视觉均有合同。红转绿为 `2 failed / 11 passed -> 13/13`；最终 lint/typecheck 全绿、Vitest `82/919`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2636.77 KiB)`、默认 8-worker 三视口 E2E `177/177`，独立代码/E2E/视觉复审 P0/P1 为 0。不要重做 Knowledge URL/pressed/根入口、CPU/Pipeline 语义、schema v3、Q5/Q10/Q44 或候选比较。已记录的 1366 selected 顶部若干 Cytoscape 外围节点标签越界是 P2，没有新明确授权时只报告不修；先只读审计下一个最有价值的独立候选。继续保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不改 v1/v2/v3 store/schema、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - 下一独立候选只读审计

- 三路独立只读审计均未改文件，结论为 P0 `0`。持久化审计复现两个产品 P1：普通练习陈旧 session 写入可覆盖另一标签已提交的 `responses/submittedQuestionIds`，留下 attempt/session 不一致且导出后无法通过本项目 preflight 的备份；ContentReview 跨标签陈旧 autosave 可把已 `approved` 记录降回 `pending`。两者现有相关测试 `5 files / 50 tests` 全绿，证明当前合同未覆盖，不代表风险不存在。
- 主审复核确认第一项写路径：`DexieStudyRepository.saveSession` 事务内直接 `put` 整个 session，没有 expected version/CAS；`saveResponse`、`moveSession`、`finishSession` 都从页面持有的完整快照派生，Practice 仅在进入/重载时读取 session。`submitAttempt` 的原子与幂等保护不能阻止提交后的陈旧 `saveSession`。该问题会破坏已提交学习证据和备份可恢复性，是下一项最高优先级候选。
- 语义审计另报两个 P1 候选：普通练习选择题只用 class 表示已选项，提交后结果没有 status/live 或焦点交接；来源 modal 声明 `aria-modal`，但没有初始焦点、Escape、焦点约束或背景 inert。掌握度、答题卡当前态、Questions 科目筛选、Cache 时间线、ContentReview mobile tabs、全局 SPA route announcement 等保留为 P2，不在本轮实现。
- 视觉/URL 审计另报两个测试合同 P1：`expectNoPageOverflow` 只检查 document root，可能漏掉移动端实际滚动容器 `.main-area` 的内部横溢；Q43 CPU 顶层切换测试只匹配 `/lab?module=io-overhead` 前缀，不能防止 canonical `preset=cn408-2009-q43` 被误删。1366 Knowledge selected 的 Cytoscape `center` 动画把外围节点推离 canvas 继续是产品 P2，只报告不修。
- 推荐下一步单独立项普通 `StudySession` CAS：先在 storage 写红灯，证明 stale `saveResponse`、`moveSession`、`finishSession` 都不能覆盖已提交 session，并证明失败后 attempt/session 与导出 preflight 仍一致；随后以事务内 expected `updatedAt` 比较实现，不修改 408-user v1/v2/v3 schema。ContentReview CAS、Practice 可访问性与测试 helper 分别另案。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。最新三路只读审计 P0 为 0，但已复现普通练习跨标签陈旧 `saveSession` 覆盖已提交证据的产品 P1：最终 attempt 仍在，session 的 response/submitted 标记可被清空，导出 JSON 随后无法通过自己的 preflight。下一独立候选是为普通 `StudySession` 写入增加事务内 CAS；尚未获实现授权，用户明确承接后先写红灯覆盖 stale response/move/finish 不得覆盖已提交 session 与备份一致性，再实现，不改 408-user v1/v2/v3 schema。ContentReview 跨标签 approved -> pending 是后续独立 P1；Practice 作答/来源 modal 可访问性、`.main-area` overflow helper、Q43 exact canonical 合同也分别另案。不要夹带任何 P2，Knowledge 1366 selected 越界仍只报告。继续保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不改题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - 普通 StudySession CAS 红灯

- 用户通过“继续下一步”明确授权上一检查点唯一候选。范围扩展只包含同一根因的必要入口：`saveSession` 的 response/move/finish 与 `submitAttempt` 的不同题并发提交都必须用事务内 expected version fail closed；不包含 ContentReview、可访问性或任何 P2。
- `storage.test.ts` 新增/加强 7 项确定性合同：stale response draft、question move、session finish 均不得覆盖已提交 session；第二标签从同一旧 base 提交另一题必须原子拒绝；同题不同答案不能冒充幂等成功；`expected=null` 仅能创建；成功更新必须严格推进 `updatedAt`，关闭同毫秒 token 复用窗口。代表性交错同时要求最终 attempt/session 精确保留且 export 后 preflight 可恢复。
- 最新定向 Vitest 为 `1 file / 35 tests`、`7 failed / 28 passed`。三种普通写、create-only 和 monotonic 合同都因旧 `saveSession` 忽略第二参数而错误成功；不同题 stale submit 错误生成 Q2 progress；同题不同答案被错误当成成功。其余 28 项全绿，红灯精确命中未实现的 CAS/冲突语义，不是夹具或环境失败。
- 下一步实现 `StudySessionConflictError`、必传的 expected `updatedAt | null`、事务内 compare-and-swap 与严格单调时间；`submitAttempt` 只对 same-question 且相同 response 的真正重复提交保持幂等，不同 response 或不同题 stale submit 均冲突拒绝。随后更新所有调用点与测试夹具，不改数据库 schema。

## 2026-08-17 - 普通 StudySession CAS 核心转绿

- `StudyRepository.saveSession/submitAttempt` 现在都要求显式 `expectedUpdatedAt: string | null`；null 只在 session 不存在时创建，字符串必须与事务内当前 row 精确相等。冲突抛导出的 `StudySessionConflictError`，且在任何 session/attempt/progress/changeLog 写入前退出。
- 每次更新还必须让 `next.updatedAt` 的毫秒值严格大于当前 token；`StudyContext` 统一使用 `max(Date.now(), previous + 1ms)`，并把输入 session 的旧 token 传给 save/submit/move/finish。没有新增 store、字段或 schema version。
- `submitAttempt` 对同 session/同题/同版本/同 response 的重复提交继续返回既有 progress，不重写 session；同题不同 response 现在冲突，尚无 attempt 的不同题提交先做 CAS，因此整个事务回滚。
- 红灯阶段类型强转已移除，monotonic 合同补充正确 token 的成功更新。相关 `storage.test.ts + backup-v2.test.ts + mock-schema-v3.test.ts` 为 `3 files / 53 tests passed`；storage typecheck 与四个改动文件定向 ESLint 通过。
- 下一步补 Web 接线测试，证明四类更新都传旧 token 且生成严格递增的新 token；再为 Practice 的 CAS 冲突增加专用 fail-closed UI，避免现有“重试保存”永久拿 stale base 重试。

## 2026-08-17 - Practice 跨标签冲突 UI 红灯

- `PracticePage.test.tsx` 新增两个合同：response save 冲突后保留本地选择但冻结写操作、隐藏普通“重试保存”，显式重新读取后清除远端已提交题的本地 overlay 并显示权威答案；finish/move/submit 一类页面动作冲突进入同一冻结恢复态。
- 新鲜定向为 `1 file / 9 tests`、`2 failed / 7 passed`。旧页面把 response conflict 显示成普通草稿失败并继续给 stale base 重试；finish conflict 显示成“可以再次执行”，两项都没有“重新读取最新进度”。其他 7 项读取失败、版本 fail-closed 和普通 I/O 重试合同通过。
- 下一步仅在 `PracticePage.tsx` 识别 `StudySessionConflictError`：建立独立 conflict 状态，冻结会话写控件，保留本地 drafts；用户显式读取最新 session 后，只移除最新 session 已提交题的本地 draft，重建持久化队列并解除冻结。普通 quota/temporary failure 继续原重试行为。

## 2026-08-17 - StudySession CAS Web 转绿

- Practice 现在把 `StudySessionConflictError` 与普通 I/O 错误分开：冲突时冻结 response、palette、submit、session navigation 和 finish，明确本页草稿不会覆盖另一标签最新进度；笔记、收藏、掌握度等独立写入不受影响。
- “重新读取最新进度”显式读取权威 session；只删除最新 session 已提交题目的本地 response overlay，未提交草稿保留在页面且不会自动重放。读取失败保持冲突冻结态并显示错误，可再次读取；普通 quota/temporary failure 仍使用原“重试保存”队列。
- 页面定向从 `2 failed / 7 passed` 转为 `9/9`。`StudyContext.test.tsx` 新增 1 项 bridge 合同，在系统时钟回拨时验证 saveResponse、submitResponse、moveSession、finishSession 都传输入旧 token 并生成 `previous + 1ms`。
- 五个相关测试文件合计 `65/65`；Web typecheck 与四个 Web 改动文件 ESLint 通过。初版静态门禁曾发现 mock 零参数推断、无效 Testing Library `exact` 和 effect 同步 setState，均按根因修正，没有 lint 绕过。
- 下一步独立审计普通 session CAS 的事务原子性、真正幂等判定、missing/update/create 边界、Practice 恢复时序和测试假绿窗口；只修本范围 P0/P1，P2 报告不夹带。

## 2026-08-17 - StudySession CAS 独立审计立案

- 三路独立只读审计均未修改文件，结论为 P0 `0`，但发现 3 个范围内产品 P1：正确当前 token 仍可删除或修改既有 `submittedQuestionIds/responses` 并留下 attempt/session 不一致；带 `completedAt` 的 session 仍可继续 save 或新增 attempt；同一 Practice 组件从 `/practice/A` 切到 `/practice/B` 时，本地 overlay 未隔离且 A 的延迟保存回调可能在 B 加载后重新写回 A。
- 核心代理已实测第一项：提交 Q1 后以正确 token 清空提交证据会成功，session change-log 增加，attempt 保留，导出 JSON 后本项目 preflight 报 `Attempt question q1 is not marked submitted by session s1.`。这证明 CAS 只能阻止 stale writer，不能替代提交证据单调性约束。
- 两个测试合同 P1 同时立案：代表性 save/submit 冲突只匹配文案，没有断言导出的 `StudySessionConflictError` 类型；缺少“current row 已不存在而 expected token 非 null”的 save/submit 边界与零部分写入断言。真实页面严格依赖 `instanceof`，因此同文案普通 `Error` 会让现有 65 项假绿。
- completed session 是终态：仓储必须拒绝任何后续 save/new attempt；Practice 初次加载或冲突恢复得到 completed session 时不得重新开放练习。A/B 切换必须重置会话局部状态，并用 generation/session-id guard 忽略旧加载与保存回调。
- P2 只记录不修：公共 `recordAttempt` 仍可制造同 session/question 重复 attempt；Practice session actions 未统一 busy，冲突 reload 未同步刷新 attempts/progress 和计时基准。本轮不得借机扩大范围。
- 下一步先新增仓储与页面红灯，保留新鲜失败证据；随后做最小实现并重跑相关测试、typecheck、ESLint。只有独立复审 P0/P1 清零后才进入跨标签三视口 E2E、截图和全量门禁。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的普通 StudySession CAS 收口，不要重做候选或第一轮实现。独立审计 P0 为 0，但已立案 3 个范围内产品 P1：正确 token 可破坏已提交证据、completed session 仍可写、Practice A/B 路由切换会串 overlay/延迟回调；另有 typed conflict 与 missing-row 两个测试假绿 P1。先在 storage 和 Practice 测试中保留红灯，再实现提交证据单调性、完成态写屏障、session generation/id guard 与 completed 终态恢复。P2 只报告不修。不要改 v1/v2/v3 store/schema、题包、旧图片、旧 `cpu-explorer` 或 Q44 `parallel-5 / split-6` 边界；Q44 与正式内容继续 `needs-review`，不得删除测试/文件、提交、推送或部署。

## 2026-08-17 - StudySession 提交证据与完成态红灯

- `storage.test.ts` 新增 3 项正确 token 下的提交证据单调性合同，分别阻止删除 submitted 标记、删除已提交 response、修改已提交 response；拒绝后 session/attempt/progress/changeLog 必须与调用前完全一致且导出仍通过 preflight。
- 新增完成态 save/new submit 两项终态合同，并补 missing current row + non-null expected 的 save/submit 零部分写入合同；代表性 stale save/submit 已从文案匹配收紧为 `StudySessionConflictError` 类型断言。
- 新鲜命令 `npm exec vitest run packages/storage/src/storage.test.ts` 为 `1 file / 41 tests`、`5 failed / 36 passed`。五项失败正是旧实现错误接受三种提交证据破坏及 completed 后 save/submit；typed conflict 与 missing-row 加固项保持通过，未被误报为红灯。
- 当前尚未修改仓储实现。下一步补 Practice A/B overlay、延迟回调和 completed 只读红灯，再统一做最小产品修复。

## 2026-08-17 - Practice 会话隔离与完成态红灯

- `PracticePage.test.tsx` 新增初次加载 completed session 只读合同、同组件 A -> B 后 response overlay 清空合同、A 的 deferred save 晚于 B load 时不得改回 A 的合同；既有 conflict reload 用例改为远端 completed，并要求恢复后仍显示终态。
- A/B 测试用第二题独特题面确认 B 已真实加载；延迟回调结算后还要求下一次 response 写入的 session id/question id 属于 B，避免只看 UI 的假绿。
- 新鲜命令 `npm exec vitest run apps/web/src/pages/PracticePage.test.tsx` 为 `1 file / 12 tests`、`4 failed / 8 passed`。四项失败分别精确命中 completed 初次/冲突恢复未终态、draft overlay 泄漏和旧 A 回调回写；其余 8 项旧恢复与普通 I/O 重试合同通过。
- 下一步实现仓储迁移不变量和 Practice keyed session scope/completed 只读态，再依次重跑两组定向测试转绿。

## 2026-08-17 - StudySession CAS 第二轮核心与 Web 转绿

- 仓储新增事务内提交证据迁移守卫：普通 `saveSession` 必须精确保留当前 submitted id 顺序及每个已提交 response；新 `submitAttempt` 只允许在当前列表末尾追加本题并保留全部旧证据。违反统一抛 `StudySessionConflictError`，所有检查仍在写 attempt/progress/session/changeLog 前完成。
- current session 带 `completedAt` 时，普通 save 与尚无 existing attempt 的新 submit 均 typed conflict；已有同题/同版本/同 response 的只读幂等 retry 仍先核对数据库 session 证据后返回既有 progress。existing attempt 但 current session 缺失/损坏不再冒充成功。
- Practice 外层只读取 route `sessionId`，内层工作台以该 id 作为 React key；A -> B 会一次性重置 drafts、revealed/hints、错误、pending、计时与 queue/ref，A 的迟到 callback 只能落在已卸载实例。completed session 显示明确只读警告和统计/返回入口，所有 session 写 handler/控件保持冻结，来源与独立 annotation 工具不受影响。
- 同一新鲜命令转绿：storage 从 `5 failed / 36 passed` 变为 `41/41`；Practice 从 `4 failed / 8 passed` 变为 `12/12`。下一步扩大到相关五文件、storage/Web typecheck 与定向 ESLint，再独立复审。

## 2026-08-17 - StudySession CAS 第二轮定向门禁

- 扩大定向 Vitest 覆盖 `storage.test + backup-v2 + mock-schema-v3 + StudyContext + PracticePage`，新鲜结果为 `5 files / 74 tests passed`；相较审计前 65 项净增 9 个执行合同，没有删除或跳过旧测试。
- `npm run typecheck -w @408os/storage`、`npm run typecheck -w @408os/web` 均通过；仓储/Web 相关 8 个产品与测试文件的定向 ESLint 通过。
- 下一步三路独立复审当前实现与测试；只有 P0/P1 清零才扩展真实跨标签三视口 E2E 与 completed 截图。

## 2026-08-17 - StudySession 不可变身份复审 P1

- 独立核心复审发现 1 个范围内 P1：第二轮提交证据守卫只冻结 submitted ids/responses，未冻结 session 的 `mode`、`questionIds`、`questionContentVersions`、`startedAt`。正确 current token 仍可让这些身份字段漂移，save 与 new submit 两条路径都受影响。
- 代理实测已提交 Q1 后把 session `mode: practice -> review` 会成功并增加 change-log，attempt 仍为 practice；导出后 preflight 报 `Attempt mode does not match session immutable.`。这与已修提交证据破坏同属 session 状态迁移不变量，不是新模块。
- 下一步把四类身份 mutation 加入现有 current-token 参数化合同，保留红灯；再在同一事务 helper 中做精确比较并 typed conflict。P2 仍不修，浏览器与全量门禁继续暂停。

## 2026-08-17 - StudySession 不可变身份红灯

- 现有 current-token 参数化合同新增 `mode`、题目序列、题面版本映射、`startedAt` 四种 mutation；仍要求 typed conflict、四表/changeLog 不变及原备份 preflight 通过。
- 新鲜 `npm exec vitest run packages/storage/src/storage.test.ts` 为 `1 file / 45 tests`、`4 failed / 41 passed`。四项均因旧 guard 错误 resolve，原第二轮 41 项全部保持通过。
- 下一步只在现有事务 helper 增加身份精确比较并重跑，不处理已记录的 `recordAttempt` 与 action busy/navigation P2。

## 2026-08-17 - StudySession 不可变身份转绿

- 事务 helper 现在要求 current 与 next 的 `mode`、`startedAt`、`questionIds` 有序序列、`questionContentVersions` 键值映射完全相同；任一漂移在写入前抛 `StudySessionConflictError`。同一 helper 同时覆盖普通 save 与新 attempt submit。
- `npm exec vitest run packages/storage/src/storage.test.ts` 从身份红灯 `4 failed / 41 passed` 转为 `45/45`。没有新增 schema/store/API，也未触碰 `recordAttempt` P2。
- Web 复审确认 keyed session scope 与 completed read-only 主路径无 P0/P1；其报告的旧 finish 命令式导航竞态仍归 session action P2。下一步重跑扩大定向与静态门禁，再让核心/测试代理复审新 guard。

## 2026-08-18 - StudySession CAS 测试合同复审 P1

- 独立测试复审发现两个跨层假绿窗口：同题不同 response 的 existing-attempt 分支仍只匹配错误文案，无法锁定 Practice 依赖的 `StudySessionConflictError`；completed-save case 同时 move/add draft，无法证明纯 token 推进也一定被终态屏障拒绝。
- stale save/submit 代表合同还需补 progress/changeLog exact snapshot，防止实现先写 conflict log 或部分 progress 后再抛 typed error而测试仍绿。以上只加固测试，不改产品语义或 P2 边界。
- 下一步修改现有断言并重跑定向；这些加固在当前正确实现上预期保持绿色，不冒充新的产品红灯。

## 2026-08-18 - StudySession CAS 测试合同复审转绿

- existing-attempt/different-response 现在断言 exact `StudySessionConflictError` 并快照 progress/changeLog/backup；completed save 候选除 `updatedAt` 外与完成 row 完全相同，确保测试只命中终态屏障；stale save/submit 同样补齐 progress/changeLog exact snapshot。
- 加固后相关五文件仍为 `78/78`，storage/Web typecheck 与 4 个直接修改文件 ESLint 通过。没有修改产品实现来迁就测试。
- 已请求核心与测试代理最终复审；P0/P1 清零后进入浏览器合同。

## 2026-08-18 - StudySession CAS 最终独立复审

- 核心与测试代理最终只读复审均确认本轮 `saveSession/submitAttempt/Practice` 范围 P0 `0`、P1 `0`；新鲜复审为相关 `5 files / 78 tests`，storage/Web typecheck 与相关 ESLint 通过。
- 核心额外手工交错验证 Q1 已提交后，Q2 new submit 夹带 `practice -> review` 身份漂移会抛 `StudySessionConflictError`，session/attempt/progress/changeLog exact unchanged，导出 preflight `1/1/1` 通过。
- 测试复审确认 typed conflict、missing row、证据/identity、completed、backup、A/B overlay 与 late callback 合同均闭合。只剩既定 P2：`recordAttempt`、旧 finish Promise 延迟导航及部分逐控件覆盖缺口，不修。
- 下一步新增一个真实双页普通练习 E2E，在 1440/1366/390 三项目覆盖 stale draft 冲突、显式恢复、远端 finish、completed 只读，并保存冲突/终态截图。

## 2026-08-18 - StudySession CAS 双页 E2E 首轮（未收口）

- `tests/e2e/study-flow.spec.ts` 已新增一个双页普通练习合同：A 提交后 B 的 stale draft 进入 typed conflict 冻结，B 显式读取权威答案，A 远端完成后 B 的 stale finish 再次冲突，B 恢复 completed session 后保持只读；最终还核对 session/attempt 证据。冲突态与完成态截图名分别为 `practice-cross-tab-conflict`、`practice-completed-readonly`。
- 原计划只收集用例，但误用 `npm exec playwright test --list`，npm 没有把 `--list` 传给 Playwright，因此实际启动了默认 `8 workers / 3 projects` 的完整 `180` 项套件。正确命令是 `npm exec -- playwright test --list`。
- 首轮为 `4 failed / 176 passed`。新用例 chromium-1366/390 已走完整业务流程，仅在 completed 断言处因 `getByRole('button', { name: '结束' })` 同时匹配“结束”和“练习已结束”而 strict-mode 假失败；chromium-1440 在 A 点击“结束”后 5 秒内仍停留于已提交练习页，尚需定向复跑区分高并发 action/lazy 波动。另一个失败是既有 daily-plan chromium-1440 停在“载入页面”的 5 秒 lazy-route 超时。
- `.last-run.json` 当前为 failed；三张 `practice-cross-tab-conflict` 截图已生成，完成态截图尚未生成；`4173-4400` 当前无监听端口。下一步收紧新用例的 exact locator、运行 E2E 文件 ESLint，并用独立端口精确复跑新用例三视口。不得借此修改既有 daily-plan、全局 timeout/workers 或已记录 P2。

## 2026-08-18 - StudySession CAS 双页 E2E 定向转绿

- 新用例中三个字面“结束”按钮 locator 均收紧为 `exact: true`；没有修改产品、timeout、workers 或导航行为。`npm exec eslint tests/e2e/study-flow.spec.ts` 通过，正确的 `npm exec -- playwright test --list` 仅收集并确认 `180 tests / 24 files`。
- 独立端口 `4316` 精确运行双页用例，chromium-1440/1366/390 为 `3/3 passed`，各视口业务约 3.7-3.9 秒。1440 的完成导航未复现，因此首轮 5 秒失败保留为默认 8-worker action/lazy 波动候选，不立项修改既定 finish Promise navigation P2。
- 六张 `practice-cross-tab-conflict` / `practice-completed-readonly` 截图已刷新。下一步逐张检查布局、横溢、截字和底栏，并做独立 E2E/视觉复审；P0/P1 为 0 后才运行全量源码、内容、build 与默认 `180` 项 E2E 门禁。

## 2026-08-18 - StudySession CAS 双页 E2E 与视觉独立复审

- 主审与独立视觉代理逐张检查六图，P0/P1/P2 均为 `0`：1440/1366 无横溢、截字或重叠；390 冲突与完成态文案正常换行，按钮未挤压，固定 answer actions 与 62px 移动底栏分离，八项导航完整。`fullPage` 不能单独证明内部 `.main-area` 滚动到底后的可达性，这是静态证据范围，不是截图中发现的视觉缺陷。
- 独立 E2E 复审确认 P0/P1 为 `0`：peer 在 A 提交前已打开同一 session，两次 stale 写都由旧 token 触发冲突；最终 session 精确保留 A response/submitted/completed，按 session id 过滤的 attempts 精确只有 A 一条。代理在独立端口 `4317` 再跑三视口为 `3/3 passed`，结束后无监听。
- 仅保留测试证据 P2：浏览器合同不重复读取 progress/changeLog 或执行 backup preflight；这些原子性已由 storage `45/45` 合同直接覆盖，不在 E2E 重复。下一步刷新 lint、workspace typecheck、Vitest、release、内容、build 和默认 `180` 项三视口 E2E。

## 2026-08-18 - StudySession CAS 最终源码门禁与产物核对

- `npm run lint`、全部 workspace `npm run typecheck` 均通过；默认 worker-mode `npm test` 为 `82 files / 941 tests passed`。相较上一最终基线 `82/919` 增加 CAS/Practice 合同，没有删除或跳过旧测试。
- 独立产物核对确认当时 `.last-run.json` 为 passed/empty failures，HTML 报告唯一目标为新双页用例的三项目 `3 expected / 0 unexpected / 0 flaky / 0 skipped`；六图均非空且时间与报告收口一致。`4316` 无监听或残留 TCP state。
- 独立代理曾再次误用没有 `--` 的 npm exec，实际启动 study-flow 文件 `33` 项；只捕获到进行中的 `14/33`，最终汇总未知，不能计入任何门禁。随后精确 `4317` 的 `3/3` 已完成，正式全量还会覆盖运行元数据。
- 新记录的证据追溯 P2：自定义 `capture` 把图直接写入 screenshot 目录，HTML 报告 `attachments=[]`，没有内嵌或哈希绑定截图；当前命名、mtime 和页面状态一致，不影响行为合同，本轮不扩展报告基础设施。下一步运行 release、内容校验与 production build。

## 2026-08-18 - StudySession CAS release、内容与 build 门禁

- `npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions`、`40 objective / 7 comprehensive`，仍为 `needs-review; verified 0/47`。来源核对、自动测试与截图复审均未计作人工审核。
- production build 通过：Vite `1905 modules`、static-copy `198 items`、PWA `86 entries (2640.08 KiB)`；Practice chunk `16.80 kB / gzip 6.00 kB`，无 chunk warning。
- 下一步独立端口 `4318` 运行默认 `8 workers / 3 projects / 180 tests` 全量 E2E；不调整 timeout、workers 或既有断言。

## 2026-08-18 - StudySession CAS 全量 E2E 首轮

- `PLAYWRIGHT_TEST_PORT=4318 npm run test:e2e` 按默认配置运行 `180 tests / 8 workers / 3 projects`，结果为 `174 passed / 2 failed / 4 did not run`，持续约 `2.8m`。新双页 CAS 用例在 1440/1366/390 均通过，耗时约 5.3/6.6/3.1 秒。
- 两个失败均为既有 chromium-1440 路径：ContentReview Q41/history 已完整渲染 47 题，但 `scrollIntoViewIfNeeded` 等待按钮稳定直至 30 秒超时；visual practice 用例进入 `/questions` 后 5 秒仍为纯应用背景且 `.question-row` 为 0，导致 serial visual 组后续 4 项未运行。`.last-run.json` 为 failed，失败 id 两项；端口 `4318` 仅有 TIME_WAIT、无监听。
- 这两项与新 CAS 产品/测试无共同改动面，且前者有历史同型高并发 actionability 波动。下一步在独立端口精确复跑两个失败项；若通过，仍必须再跑完整 `180` 项，不能以定向结果替代全量门禁。不修改 ContentReview、visual helper、timeout、workers 或业务断言。

## 2026-08-18 - StudySession CAS E2E 首轮失败项精确复跑

- 独立端口 `4319` 只运行两个 chromium-1440 失败项，ContentReview Q41/history 与 visual practice 均通过，各约 `1.6s`，总进程约 `33.2s`（含 build/server）。未修改任何产品、测试 helper、timeout、workers 或断言。
- 定向通过只用于确认首轮失败可归为高并发 actionability/lazy mount 波动，不替代全量门禁。下一步端口 `4320` 完整运行默认 `180` 项第二轮。

## 2026-08-18 - StudySession CAS 最终收口

- 独立端口 `4320` 按默认 `8 workers / 3 projects` 完整运行 `180` 项，结果为 `180/180 passed`，持续约 `3.2m`；没有调整 timeout、workers、retry 或业务断言。新双页 CAS 用例在 1440/1366/390 均通过。
- HTML 报告内嵌 `report.json` 为 `total 180 / expected 180 / unexpected 0 / flaky 0 / skipped 0 / ok true`；`.last-run.json` 为 `passed` 且失败列表为空。`4316-4320` 无监听进程。
- 六张最终 `practice-cross-tab-conflict` / `practice-completed-readonly` 图的 mtime 为 00:29-00:30，主审与独立视觉代理再次逐张复看，三视口 P0/P1 为 `0`：无横溢、截字或重叠；冲突原因、显式恢复、完成只读警告、答案结果与 disabled 控件均清楚，390 固定操作条和八项底栏分离。
- 最终新鲜门禁：lint、全部 workspace typecheck 通过；Vitest `82 files / 941 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2640.08 KiB)`；默认全量 E2E `180/180`。
- 保留既定 P2，不在本轮修：公共 `recordAttempt` 可重复写、旧 finish Promise 可能延迟导航、session action 缺统一 busy、E2E 未重复 progress/changeLog/preflight、外部 screenshots 未绑定 HTML report。Q44 仍只支持 `parallel-5 / split-6` 并保持 `needs-review`；没有修改 v1/v2/v3 store/schema、题包、旧图片或旧 `cpu-explorer`，没有删除测试/文件、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取 `AGENTS.md`、`HANDOFF.md`、`notes.md`。普通 `StudySession` CAS 已最终收口：exact-token CAS、提交证据/blueprint 不变量、completed 写屏障、existing-attempt 真幂等、Practice keyed A/B 隔离、显式冲突恢复和 completed 只读均已完成；核心/测试/Web/E2E/视觉独立复审 P0/P1 为 0。最终门禁为 lint/typecheck 全绿、Vitest `82/941`、release `10/10`、内容 `47/19` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2640.08 KiB)`、默认 8-worker 三视口 E2E `180/180`。不要重做 StudySession CAS、Knowledge、CPU/Pipeline 语义、schema v3、Q5/Q10/Q44 或候选比较。下一独立 P1 候选是已复现的 ContentReview 跨标签 stale autosave 可把 approved 降回 pending；尚未立项，用户明确承接后先写确定性交错红灯，再设计不改 schema 的 CAS/序列化边界。已记录 P2 继续只报告不修。保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不改 v1/v2/v3 store/schema、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-18 - ContentReview 跨标签 CAS 红灯

- 用户通过“继续下一步”明确承接上一检查点唯一 P1：陈旧 autosave 可覆盖另一标签已通过记录，使 `approved -> pending`。范围只包含 ContentReview 仓储的事务内 CAS、Web typed-conflict 恢复及必要浏览器合同；不处理既定 P2，也不改任何 v1/v2/v3 schema/store。
- 先审查属性测试方法：该风险来自有副作用的 IndexedDB 固定交错，随机生成不能替代关键顺序。因此未新增依赖，采用 `base -> peer commit -> stale write` 的确定性合同，并锁定“冲突前零写入、权威记录不变、changeLog 不增加”等强不变量。
- `packages/storage/src/storage.test.ts` 新增 6 项合同：peer approve 后 stale draft、`expected=null` create-only、current row 缺失但 expected 非空、成功更新 token 必须严格推进、stale approve、stale reject。新鲜命令 `npm exec -- vitest run packages/storage/src/storage.test.ts --reporter=verbose` 为 `1 failed file / 6 failed / 45 passed`；六项都因旧 API 忽略 expected token 而错误成功，代表案例明确把已通过记录降成带 `tab-b-stale-draft` 的 pending。原 45 项全绿。
- 当前只修改了测试，产品实现尚未变更。下一步在既有 settings/changeLog 同一事务内读取 current、核对 `updatedAt | null`、要求成功 token 严格递增，并在任何写入前抛导出的 typed conflict；随后更新 StudyContext 与 ContentReview 页面显式恢复，不新增字段或 store。

## 2026-08-18 - ContentReview 仓储 CAS 转绿

- `packages/storage/src/content-review.ts` 已实现同一 `settings + changeLog` 事务内的 current 读取、key 校验、`expectedUpdatedAt` 精确比较和严格递增时间检查；`null` 仅允许创建，missing/mismatch/same-token 均抛导出的 `ContentReviewConflictError`，任何写入前退出。
- 既有 `ContentReviewRecord` 的 `updatedAt` 直接作为版本令牌，没有新增 schema、字段、store 或版本；当前 token 仍允许用户有意把 approved 改回 pending，但 stale token 不能覆盖。
- storage 定向命令 `npm exec -- vitest run packages/storage/src/storage.test.ts --reporter=verbose` 已转为 `1 file / 51 tests passed`，六个新合同全绿，原 45 项保持通过。
- 下一步更新 StudyContext 的 token bridge/单调时间和 ContentReview 页面冲突冻结、显式 authority reload；页面尚未接线。

## 2026-08-18 - ContentReview CAS Web 转绿

- `StudyContext` 三类 review 写现在都要求旧 `updatedAt | null`，并生成 `max(Date.now(), previous + 1ms)` 的严格递增时间；新增单题 authority read，成功读取后才更新 context。时钟回拨 bridge 合同锁定旧 token 与 `+1ms`。
- ContentReview 页面用 question-local token 驱动 autosave/approve/reject；成功写以返回记录推进 token。发生 `ContentReviewConflictError` 时保留本地草稿，冻结编辑、决策、题目跳转和导出，明确提示“不会覆盖权威复核记录”；只有显式“重新读取最新复核记录”成功后才替换草稿、更新 token 并解除冻结，读取失败继续 fail closed。
- 同标签排队写在 operation 真正执行时读取前一次成功返回的 token，避免两个连续保存因调用时捕获同一 token 而自撞；新增合同证明第二次写得到第一次返回 token。
- 新增 draft conflict、decision conflict、authority reload、same-tab queued token 及 Context 单调 bridge 合同。新鲜定向 `storage.test + StudyContext.test + ContentReviewPage.test` 为 `3 files / 62 tests passed`；storage/Web typecheck 通过。相关 ESLint 首轮仅报 autosave effect 缺 `conflict` dependency，已补齐，需刷新 ESLint 结果。
- 下一步分离式复审事务/页面时序与测试假绿窗口；P0/P1 为 0 后新增真实双页三视口 E2E 和冲突/恢复截图。

## 2026-08-18 - ContentReview 队列冲突复审 P1 与修复

- 与实现过程分离的时序复审发现 1 个本范围 P1：若 draft 已进入仓储、用户随后把 decision 排到队尾，而前置 draft 最终冲突，decision callback 会因 conflict 跳过，但外层旧代码仍清 dirty 并显示“已通过复核”，造成未落库却报成功。
- `decide` 现在要求队列 operation 明确返回 committed=true 才能清 dirty/显示成功；前置冲突后的 skipped decision 保留本地草稿与冲突提示，且不会调用 approve/reject。
- 新增精确 deferred 合同锁定 `in-flight draft reject -> queued decision skip` 时序；ContentReview 页面定向现为 `8/8`。下一步继续复审 reload 失败、仓储 typed error/零写入和 Web bridge 假绿窗口，再刷新相关门禁。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的 ContentReview 跨标签 stale-write 修复。六个 storage 确定性交错合同已保留红灯：`6 failed / 45 passed`，旧实现会把 peer 已 approved 记录降回 pending。不要重做候选比较或随机属性测试；直接实现不改 schema/store 的事务内 exact-token CAS、严格单调 `updatedAt` 与 `ContentReviewConflictError`，先把 storage 定向测试转绿，再接 StudyContext token、页面冲突冻结/显式 authority reload、三视口真实双页 E2E、截图与全量门禁。既定 P2 只报告不修。Q44 仍只支持 `parallel-5 / split-6` 且保持 `needs-review`；不得改题包、旧图片、旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-18 - ContentReview 冲突状态标签语义红灯

- 三视口双页合同已经在独立端口 `4322` 实测 `3/3 passed`，六张 `content-review-cross-tab-conflict/recovered` 截图已刷新；此前 390 失败只来自隐藏结构化 panel 的“下一题” locator，改为 `includeHidden: true` 后三项目全绿。
- 截图复审发现冲突冻结期间页面仍会把本标签旧 context 的 decision 显示为“当前记录 已通过/待复核/有问题”，但页面此时没有读取到数据库权威 decision，文案会误导。
- 先在 `ContentReviewPage.test.tsx` 增加合同，要求冲突状态卡统一显示“待重新读取”。定向 Vitest 新鲜红灯为 `1 failed / 8 passed`；实际收到“当前记录 已通过”，精确证明问题，不是夹具或环境失败。
- 下一步只修改冲突态展示标签，保留现有图标、写冻结、authority reload、草稿与 CAS 行为；转绿后重跑相关三文件、三视口双页 E2E、刷新六图并完成全量门禁。Q44 与题包继续 `needs-review`。

## 2026-08-18 - ContentReview 冲突状态标签语义转绿

- `ContentReviewPage` 在 conflict 时固定使用中性 pending 图标/样式，但可见状态标签改为“待重新读取”；非冲突的 pending/approved/rejected 显示保持原样。
- 同一页面定向从 `1 failed / 8 passed` 转为 `9/9 passed`。实现没有改写 token、队列、草稿、冻结范围、authority reload 或数据库行为。
- 下一步刷新 storage/StudyContext/Page 联合测试、typecheck 与 ESLint，再运行三视口真实双页合同并复查六图。

## 2026-08-18 - ContentReview CAS 扩大定向门禁

- `storage.test + StudyContext.test + ContentReviewPage.test` 新鲜结果为 `3 files / 65 tests passed`；新增状态语义合同与原 exact-token、单调时间、队列时序、reload failure 合同同时通过。
- storage/Web workspace typecheck 通过；仓储、StudyContext、页面与 ContentReview E2E 共 7 个相关文件 ESLint 通过。
- 下一步在独立端口 `4323` 运行真实双页合同三项目并刷新六张冲突/恢复图；定向浏览器通过后再执行全量门禁。

## 2026-08-18 - ContentReview 双页 E2E 与视觉收口

- 现有双页 E2E 增加冲突态“待重新读取”和 authority reload 后“已通过”的直接断言；E2E 文件 ESLint 通过。
- 独立端口 `4323` 初次刷新、`4324` 最终断言版复跑均为 chromium-1440/1366/390 `3/3 passed`。`.last-run.json` 为 passed/empty failures，两个端口均无监听。
- 六张最终截图时间为 16:48:30-31，桌面尺寸 `1440x900 / 1366x768`，Pixel 7 DPR 输出 `1024x2216`。逐张复核确认冲突态统一为“待重新读取”、恢复态为“已通过”；无横溢、截字、重叠或底栏遮挡，P0/P1 为 0。
- 下一步运行 lint、workspace typecheck、默认 Vitest、release、内容校验、production build 和默认 8-worker 三视口全量 E2E。自动门禁与截图不构成人工审核。

## 2026-08-18 - ContentReview CAS 全量源码门禁

- 最终源码上的 `npm run lint` 与全部 workspace `npm run typecheck` 通过。
- 默认 worker-mode `npm test` 为 `82 files / 954 tests passed`；相较 StudySession 最终基线 `82/941` 增加 13 项 ContentReview 仓储、StudyContext、页面冲突与状态语义合同，没有删除或跳过既有测试。
- 下一步运行 release、内容校验与 production build，再执行默认三视口全量 E2E。

## 2026-08-18 - ContentReview CAS release、内容与 build 门禁

- `npm run test:release` 为 `10/10 passed`；`npm run content:validate` 为 `47 questions / 19 assets`、`40 objective / 7 comprehensive`，正式内容保持 `needs-review; verified 0/47`。
- production build 通过：Vite `1905 modules`、static-copy `198 items`、PWA `86 entries (2642.75 KiB)`；ContentReview chunk `19.22 kB / gzip 6.31 kB`，无 chunk warning。
- 下一步正确收集 Playwright 数量后，在新独立端口运行默认 `8 workers / 3 projects` 全量 E2E。

## 2026-08-18 - ContentReview CAS 全量 E2E 首轮（待复跑）

- 端口 `4325` 按默认 `8 workers / 3 projects` 收集到 `183 tests / 24 files`，结果为 `176 passed / 4 failed / 3 did not run`，持续约 `4.3m`；新 ContentReview CAS 双页合同三视口均通过。
- 四个失败均为既有浏览器路径：chromium-1440 的 ContentReview Q41/history `scrollIntoViewIfNeeded` 稳定性超时、Q25 deadlock 首屏 heading 5 秒未出现；chromium-1366 的模考跨标签 alert 未出现、settings schema v3 heading 首屏未出现。后两项与本轮 ContentReview 实现无共同代码面；失败时未见 CAS 状态断言失败。
- Playwright 最终状态为 failed，3 项因 serial 依赖未运行；`4325` 监听已释放。下一步使用新端口精确复跑这 4 项，若全部通过再运行完整 `183` 项第二轮；不修改 timeout、workers、retry、既有断言或业务实现。

## 2026-08-18 - ContentReview CAS 首轮失败项精确复跑

- 端口 `4326` 只运行两个 chromium-1440 失败项，ContentReview Q41/history 与 Q25 deadlock 为 `2/2 passed`，业务分别约 `2.0s / 3.4s`。
- 端口 `4327` 只运行两个 chromium-1366 失败项，mock-exam 跨标签合同与 settings schema v3 visual 为 `2/2 passed`，业务分别约 `3.2s / 1.5s`。四项均保持原 timeout、断言和业务代码。
- 定向结果支持首轮失败属于高并发 actionability/lazy mount 波动，但不替代全量门禁。下一步端口 `4328` 完整运行默认 `183` 项第二轮。

## 2026-08-18 - ContentReview CAS 最终收口

- 端口 `4328` 按默认 `8 workers / 3 projects` 完整运行 `183` 项第二轮，结果为 `183/183 passed`，持续约 `3.3m`；未调整 timeout、workers、retry、业务断言或实现。首轮四个失败点在同等并发环境全部通过。
- HTML 报告内嵌统计为 `183 total / 183 expected / 0 unexpected / 0 flaky / 0 skipped / ok=true`；`output/playwright/results/.last-run.json` 为 `passed` 且 `failedTests=[]`。`4325-4328` 无监听。
- 全量第二轮刷新六张 ContentReview conflict/recovered 图：桌面 `1440x900 / 1366x768`、Pixel 7 DPR 输出 `1024x2216`。最终逐张复看 P0/P1 为 `0`，无横向页面溢出、截字、重叠或固定导航遮挡；冲突态“待重新读取”、恢复态“已通过”与数据库事实一致。
- 最终新鲜门禁为 lint、全部 workspace typecheck 通过；Vitest `82 files / 954 tests`；release `10/10`；内容 `47 questions / 19 assets`、`needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2642.75 KiB)`；默认三视口 E2E `183/183`。
- Q44 仍只支持来源支持的 `parallel-5 / split-6`，并保持 `needs-review`。本轮未把来源核对、自动测试或截图当人工审核；未改 v1/v2/v3 schema/store、题包、旧图片、旧 `cpu-explorer`，未删除测试/文件、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。ContentReview 跨标签 stale-write 已最终收口：事务内 exact-token CAS、严格单调 `updatedAt`、typed conflict、页面写冻结、显式 authority reload、冲突态“待重新读取”与恢复态“已通过”均完成；最终门禁为 lint/typecheck 全绿、Vitest `82 files / 954 tests`、release `10/10`、内容 `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules` / PWA `86 entries (2642.75 KiB)`、默认 `8 workers / 3 projects` E2E `183/183`。不要重做 ContentReview CAS、StudySession CAS、schema v3、CPU/Knowledge 可访问性、Q44 或候选比较。下一步先只读审计尚未覆盖的独立 P0/P1 候选，P2 只报告不修；没有新 P0/P1 时直接报告，不为继续而改动。保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不得改 v1/v2/v3 schema/store、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-18 - 下一独立候选只读审计：普通练习综合题自评分

- 按最新检查点只读审计，未修改产品或测试。P0 为 `0`；新增并确定性复现产品 P1 `1`：普通 Practice 综合题自评分直接执行 `Number(event.target.value)`，清空输入会变成已填写的 `0`，负数虽被原生 `min=0` 标为 invalid，仍会进入 handler 并写入 session。提交按钮只检查 `selfScore === undefined`，因此 `-1` 可继续提交。
- 根因链路为 `PracticePage.tsx:442/450` 未做值域解析，`evaluateResponse` 仅拒绝非有限值、对负数和超上限值做夹紧，`DexieStudyRepository.submitAttempt` 不校验 response 值域。内存 IndexedDB 复现实测 session/attempt 都持久化 `selfScore=-1`，attempt score 为 `0`；随后同一 `BackupService.exportJson` 生成的 JSON 被自身 `preflight` 拒绝：`data.attempts.0.response.selfScore: Too small: expected number to be >=0`。这是可恢复性与学习证据一致性问题，不只是表单样式。
- 模考路径不受该根因影响：`MockExamSessionPage` 保留 raw string，并在调用 repository 前显式校验 finite、`>=0` 与 `<=maxScore`。普通练习当前没有综合题页面合同；相关 `PracticePage + study domain + storage + backup-v2` 现有测试仍为 `4 files / 80 tests passed`，证明是未覆盖合同而非既有失败。
- 既有未修 P1 经当前源码复核仍存在，但不是本次新发现：普通选择题选中态仍只有 CSS class、提交结果无 status/live/focus 交接；来源 dialog 仍无初始焦点、Escape、焦点约束或背景 inert；`.main-area` overflow helper 与 Q43 exact canonical 测试仍是测试合同缺口。它们与本次自评分根因解耦，未夹带修复。
- property-based-testing 指南只用于提炼 `parse -> validate -> persist -> export/preflight` 不变量；IndexedDB 与 UI 是固定副作用链，本次采用确定性 `-1` 与清空输入边界，没有引入随机生成器或依赖。三路辅助审计因服务端 429 限流均未产出，不计作证据。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。最新只读审计 P0 为 0，新立案普通练习综合题自评分 P1：`PracticePage` 把清空转为 `0`，并允许负数写入、提交；内存 IndexedDB 已复现 session/attempt 持久化 `selfScore=-1`、attempt score 被夹为 `0`，而同一应用导出的备份被自身 preflight 拒绝。用户明确承接后先写红灯：清空必须恢复未评分且禁用完成自评，负数/超上限不得写入或提交，合法边界值保持可持久化；再决定 UI raw-string 与 domain/repository fail-closed 的最小组合，不改 schema/store。不要重做 StudySession/ContentReview CAS、模考自评、CPU/Knowledge 语义、Q44 或候选比较。既有 Practice 选项/结果播报、来源 modal、overflow helper、Q43 canonical 测试分别另案，P2 只报告不修。保持 Q44 仅支持 `parallel-5 / split-6` 且为 `needs-review`，不得改 v1/v2/v3 schema/store、题包、旧图片或旧 `cpu-explorer`，不得删除测试/文件、提交、推送或部署。

## 2026-08-18 - 普通练习综合题自评分红灯

- 只修改三处测试文件，未改产品：`PracticePage.test.tsx` 新增普通综合题 fixture，锁定清空恢复未评分、负数/超上限仅保留为本地无效输入、`0/maxScore` 可保存提交；`study.test.ts` 锁定领域层拒绝区间外分数并原样保留边界；`storage.test.ts` 锁定负自评分在 session/attempt/progress/changeLog 任何写入前被拒绝，空备份仍可 preflight。
- 新鲜命令 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx packages/domain/src/study.test.ts packages/storage/src/storage.test.ts --reporter=verbose` 为 `3 files / 83 tests`、`7 failed / 76 passed`。失败精确命中旧行为：领域层 `-1/10.01` 被夹紧，仓储 draft/submit 两路错误成功，UI 清空写成 `0`，负数/超上限没有 `aria-invalid` 本地错误态。合法 `0/10` 与原有合同保持绿色。
- 下一步实现按题保存的 raw score string；空字符串持久化为 `undefined`，有限且在 `[0,maxScore]` 内才允许保存/提交，越界原样显示但不触发写入。领域层对区间外 fail closed；仓储层因不知道题目上限，只拒绝 comprehensive `selfScore` 的非有限值或负值，并覆盖 save/record/submit 入口。不得只依赖 HTML `min/max`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的普通练习综合题自评分 P1。红灯已保留：三文件 `83 tests` 中 `7 failed / 76 passed`，失败分别为 UI 清空写成 0、负数/超上限仍保存，domain 夹紧区间外分数，storage 接受负分 draft/attempt。直接实现 `PracticePage` raw string + 明确错误态、`evaluateResponse` 区间 fail-closed、`DexieStudyRepository` finite/nonnegative 运行时守卫；先转绿定向测试，再做独立 P0/P1 复审、三视口浏览器与全量门禁。不要修改 v1/v2/v3 schema/store、题包、旧图片、旧 `cpu-explorer`，不要删除测试/文件、提交、推送或部署。Q44 继续保持 `parallel-5 / split-6` 与 `needs-review`。

## 2026-08-18 - 普通练习综合题自评分转绿

- `PracticePage` 现在按题保存 raw score string：空字符串写回 `selfScore: undefined`；只有 finite 且位于 `[0,maxScore]` 的值才进入 `saveResponse`；越界值保留在输入框，显示 `aria-invalid` 和范围错误，并禁用“完成自评”。综合题不再在渲染阶段无条件调用 domain evaluation，旧的无效草稿不会让页面崩溃。
- `evaluateResponse` 对负数和超过 `maxScore` 的分数 fail closed，`0` 与 `maxScore` 原样返回；普通 study repository 的 save/record/submit 入口拒绝 comprehensive `selfScore` 的非有限值或负值，拒绝发生在事务写入前。未改 schema/store、备份格式或模考路径。
- 定向 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx packages/domain/src/study.test.ts packages/storage/src/storage.test.ts --reporter=verbose` 从 `7 failed / 76 passed` 转为 `3 files / 83 tests passed`。
- 下一步由独立代理复审 domain/storage 与 Practice UI 的 P0/P1；复审清零后跑 workspace typecheck、相关 ESLint，再进行三视口浏览器和全量门禁。Q44 继续只支持 `parallel-5 / split-6` 且保持 `needs-review`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 的普通练习综合题自评分 P1。红灯已转绿，定向 `PracticePage + domain study + storage` 为 `3 files / 83 tests passed`。先完成独立 P0/P1 复审，重点检查旧 invalid session 的 fail-closed、raw score 与 response queue 交错以及 repository 所有普通写入口；清零后跑相关 typecheck/ESLint、三视口真实浏览器与截图，再刷新全量 lint、Vitest、release、content validate、build 和默认 8-worker E2E。不要修改 v1/v2/v3 schema/store、题包、旧图片、旧 `cpu-explorer`，不要删除测试/文件、提交、推送或部署。Q44 继续保持 `parallel-5 / split-6` 与 `needs-review`。

## 2026-08-18 - 自评分旧非法 session 复审 P1

- 独立 domain/storage 复审确认新写路径均在事务前拒绝 invalid selfScore，且 domain 区间正确；但发现 1 个高信心 P1：旧版本已写入的负分 session 仍会由 `getSession/getLatestOpenSession` 返回，页面也能显示无效原始值，可是用户清空后 `saveSession` 在事务内又校验数据库 current 旧行并拒绝，形成无法自愈的兼容死路。该旧行导出的备份仍被自身 preflight 拒绝。
- 下一步先新增确定性 recovery 合同：直接注入旧 `selfScore=-1` 行，使用相同 exact token 把 next 修复为 `undefined`，必须成功写回且导出后 preflight 通过。实现只能放宽“current 可被合法 next 修复”，仍要保证 next 全量合法、identity/evidence/CAS/timestamp 屏障不变。
- 同步补齐 storage 对 `NaN/+Infinity` 和 `recordAttempt` 入口的短合同，不把共享 guard 的源码覆盖当作完整测试证据。浏览器与全量门禁暂停，待该 P1 红转绿和两路复审清零。

## 2026-08-18 - 自评分旧非法 session 自愈红灯扩展

- storage 入口合同已参数化覆盖 `-1/NaN/+Infinity` 的 save、submit、record；这 9 项均在当前 guard 上保持绿色。新增旧 unsubmitted `-1 -> undefined` exact-token 修复合同，新鲜 storage 定向为 `1 failed / 60 passed`，唯一失败由 current 旧行校验触发。
- Web 复审进一步确认旧缺陷也能产生已提交坏证据：session/attempt response 都是 `selfScore=-1`，attempt.score 已被旧 domain 夹为 `0`。页面因 submitted 不再显示评分输入，只显示“自评 0 分”，而备份仍被 preflight 拒绝。
- 因此增加第二个兼容合同：备份导出前必须事务化修复已提交已知旧缺陷，使用既有 finite/nonnegative `attempt.score` 同步 session 与 attempt response，推进 session token，记录两类 changeLog，重复执行幂等。未提交非法分数修复为 `undefined`。无法由 attempt.score 证明的损坏继续 fail closed，不猜测题目上限或新分数。
- 复审收紧兼容边界：只有 `attempt.correct === null` 且 `attempt.score === 0` 才能证明这是旧 domain 将负自评分夹为 0 的已知路径；任意其他 finite score 或 objective attempt 均不自动修复，继续由 preflight fail closed。

## 2026-08-18 - 自评分旧数据与备份兼容红绿闭环

- 在既有红灯上补齐四条合同：已提交 `NaN/+Infinity` 缺唯一 attempt 时必须 fail closed；旧超上限分数只在 session/attempt response、mode、版本、`correct === null` 和有限夹紧 score 全部匹配时修复；旧负分草稿 v3 备份必须在严格 schema 前迁移；修复时间仅推进旧 token `1ms`，不能把旧 session 抬到最新排序。
- 产品实现收紧 `repairLegacyStudySelfScores`：合法已提交分数直接跳过；负分或非有限坏值缺唯一证据时整体抛错；已知负分夹到 `0` 与已知上限夹紧才同步修复 session/attempt。事务在 unresolved 时零写入。
- `parseAnyBackup` 现在先对 JSON 结构执行同一保守兼容迁移，再运行 v1/v2/v3 严格 Zod/语义校验；无法证明的值不猜测。`exportJson` 在返回前用自身解析合同自检，旧“先导出坏 JSON、再由 preflight 拒绝”的测试收紧为导出当场失败。
- 红灯为 `2 files / 75 tests` 中 `5 failed / 70 passed`；实现后同一 storage + backup-v2 定向为 `75/75 passed`。`@408os/storage` typecheck 与 `repositories.ts / backup.ts / storage.test.ts / backup-v2.test.ts` ESLint 通过。
- 下一步两路独立复审纯修复和备份迁移，重点检查 v1/v2/v3、merge/replace 原子性、混合可修/不可修记录、上限证据误判与测试假绿。清零后再跑 Practice/domain/storage 联合定向和 Web typecheck，不进入浏览器或全量门禁。

## 2026-08-18 - 自评分兼容独立复审 P1 红绿

- 三路复审与主审反例又立案并先红了五类 P1：raw backup 未比较 session/attempt 原始 `selfScore`；upper clamp 错把 `attempt.score <= 0` 当正上限；`-Infinity` 错当旧负分夹紧；未提交坏 response 挂 orphan attempt 时只修 session；旧 token `+1ms` 与真正较新 session 打平后被主键 tie-break 选成 latest。
- 修复后只承认：未提交且无 attempt 的有限负分清空；已提交有限负分与 `score=0`；已提交有限上限外分数与正的 attempt score。session/attempt raw score、文本、rubric、mode、版本、`correct === null` 均须精确匹配；其余统一 unresolved 并在写前整体失败。
- repair token 始终与旧 token 不同；无阻塞 peer 时推进标准 `1ms`，相邻或同毫秒碰撞时生成 Zod 可接受的高精度 ISO token，并在 IndexedDB 字符串排序中位于阻塞 peer 之前。这样不改变 `getLatestOpenSession` 排序，也不会让旧 PWA exact-token writer 把坏值写回；已提交证据仍受 exact evidence guard 保护。
- 新增 raw replace 零写入、mixed rollback、orphan、额外题目、`NaN/±Infinity`、zero/negative upper 与相邻 1ms 排序合同。storage + backup-v2 为 `2 files / 89 tests passed`；扩大到 Practice、domain、storage、backup v2/v3、mock schema v3 为 `6 files / 134 tests passed`。storage/Web typecheck 与相关 ESLint 通过。
- 下一步等待最终独立复审确认当前代码 P0/P1 为 0；通过后新增/刷新普通综合题三视口真实浏览器合同与截图，再进入全量门禁。

## 2026-08-18 - 普通综合题三视口浏览器合同与移动遮挡 P1

- `tests/e2e/study-flow.spec.ts` 已覆盖普通练习综合题的空值、`-1`、`11`、合法上界 `10`、IndexedDB session/attempt 证据与提交结果；真实 Chrome 1440/1366/390 定向运行新鲜结果为 `3/3 passed`。
- 六张 `practice-comprehensive-invalid-score` / `practice-comprehensive-submitted` 截图已生成。桌面两视口与三视口 submitted 状态无 P0/P1；390px invalid 状态发现 1 个视觉 P1：移动端 sticky `.answer-actions` 覆盖自评分输入下缘和错误提示，用户无法完整读取校验反馈。
- 该问题只涉及移动布局，不改变自评分业务、存储兼容或桌面样式。下一步先给 E2E 增加输入/错误提示与 `.answer-actions`、移动底部导航互不重叠的 bounding-box 红灯，再做最小 CSS 修复并刷新三视口合同和六图。

## 2026-08-18 - 移动操作条遮挡几何红灯

- 现有综合题 E2E 新增仅在 `chromium-390` 执行的 bounding-box 合同：自评分输入/错误提示必须完整位于 `.answer-actions` 上方，操作条必须完整位于 `.mobile-nav` 上方。
- 独立端口 `4329` 新鲜结果为 `1 failed / 0 passed`：错误内容下边缘 `708.0625px`，操作条上边缘 `659px`，重叠约 `49px`。失败精确命中新断言。
- 根因是移动 `.main-area` 的 flex 高度已经排除 62px 静态导航，sticky 操作条再设 `bottom: 62px` 形成重复预留。下一步只把移动端操作条改为相对滚动区 `bottom: 0`，随后用同一命令转绿。

## 2026-08-18 - 移动操作条遮挡转绿

- `apps/web/src/styles.css` 仅将 760px 以下 `.answer-actions` 的 `bottom` 从 `62px` 改为 `0`；桌面规则、操作条 sticky 行为、自评分业务和底部导航结构均未改。
- 独立端口 `4330` 用同一 `chromium-390` 综合题合同复跑为 `1/1 passed`。输入/错误提示与操作条、操作条与移动导航两条 bounding-box 断言均通过。
- 下一步端口 `4331` 跑三项目 `3/3` 并刷新六图，逐张检查后再做最终独立 P0/P1 复审。

## 2026-08-18 - 普通综合题三视口与视觉复验转绿

- 独立端口 `4331` 运行同一完整综合题合同，1440/1366/390 为 `3/3 passed`，业务约 `3.3-3.4s`；`tests/e2e/study-flow.spec.ts` ESLint 通过。
- 六张 invalid/submitted 图已刷新。逐张复看确认桌面无变化；390px invalid 的自评分输入和完整错误提示位于操作条上方，操作条紧邻但不覆盖底部导航；移动 submitted 无新增截字、横溢或重叠。P0/P1 为 `0`。
- 下一步并行进行移动布局/E2E 与自评分兼容核心两路独立只读终审；清零后运行全量门禁。

## 2026-08-18 - 普通综合题扩大定向门禁刷新

- Practice/domain/storage/backup-v2/backup-v3/mock-schema-v3 六文件新鲜 Vitest 为 `134/134 passed`。
- `@408os/storage` 与 `@408os/web` typecheck 通过；Practice/domain/storage/backup/E2E 相关 9 个文件定向 ESLint 通过。
- 两路独立终审进行中；全量门禁尚未开始，不能用本组定向结果代替最终基线。

## 2026-08-18 - 移动动态视口终审 P1

- 独立移动布局终审 P0 `0`、P1 `1`：基础 `.app-shell min-height: 100vh` 未在移动 `height: 100dvh` 规则中重置，地址栏展开时 large viewport 的 `min-height` 可压过 dynamic viewport；`.practice-shell` 也仍用 `calc(100vh - 62px)`。
- 当前固定 `390x844` Chrome 项中 `vh === dvh`，所以元素彼此不重叠合同会假绿，不能证明真实浏览器动态工具栏下底部操作可达。
- 下一步在移动 E2E 中先锁定 `.app-shell` 不保留 large-viewport 最小高度、`.practice-shell` 使用容器高度的 computed-style 红灯；再最小改为移动 `.app-shell min-height: 0`、`.practice-shell min-height: 100%`，并复跑几何合同。

## 2026-08-18 - 移动动态视口 computed-style 红灯

- `chromium-390` 综合题专项新增 computed-style 合同后，独立端口 `4332` 为 `1 failed`：实际 `.app-shell min-height: 844px`、`.practice-shell min-height: 782px`，精确命中 large-viewport 遗留规则；此前几何断言尚未执行。
- 下一步只改移动规则的两个高度值，保持桌面 `100vh`、`height: 100dvh`、导航 62px 和 sticky 操作条逻辑不变。

## 2026-08-18 - 移动动态视口修复转绿

- 移动 media query 现在显式设置 `.app-shell min-height: 0`，并将 `.practice-shell` 从 `calc(100vh - 62px)` 改为 `min-height: 100%`；桌面规则未变。
- 独立端口 `4333` 的 390px 综合题专项为 `1/1 passed`，computed-style 与两组 bounding-box 几何断言均通过。
- 自评分核心终审仍待回报；通过后刷新三视口截图并运行全量门禁。

## 2026-08-18 - 自评分兼容 extra 结构 P1 红灯

- 核心独立终审 P0 `0`、P1 `1`：可修复 Q44 负分草稿与同 session 的额外合法 choice response 或额外 attempt 并存时，`repairLegacyStudySelfScores` 会先推进 session/token 并写 changeLog；随后 `exportJson` 才因额外题目拒绝，形成不可恢复的部分迁移。
- 新增两条 storage 红灯合同，均要求 `getSession()` 直接拒绝、session/attempt 原样保留、changeLog 零写入；旧 storage + backup-v2 基线当时仍为 `89/89`，证明是覆盖缺口。
- 下一步只在实际发生 repair 的 session 上增加完整 question/response/version/submitted/attempt 闭包检查，发现额外或不一致证据时整体 fail closed。

## 2026-08-18 - 动态视口与自评分兼容最终定向收口

- 自评分兼容扩大定向为 `6 files / 136 tests passed`；storage/Web typecheck 通过，直接相关 TS/TSX/E2E ESLint 通过。CSS 被 ESLint 配置忽略，无错误。
- 端口 `4334` 的普通综合题真实 Chrome 三视口在动态视口合同加入后仍为 `3/3 passed`；computed `0px/100%`、输入/错误提示/操作条/导航几何和 session/attempt 证据均通过。
- 独立移动复审确认原 `vh/dvh` P1 已清零、当前移动 P0/P1 为 `0`。核心复审在修复后未能因限流回读，但新增 extra-structure 合同已先红后绿，当前进入全量门禁前的源码自审阶段。

## 2026-08-18 - 全量静态与内容门禁转绿

- `npm run lint` 通过。
- 全 workspace `npm run typecheck` 通过（web、content-schema、cpu-core、domain、lab-core、storage）。
- `npm run test:release` 为 `10/10 passed`。
- `npm run content:validate` 通过 `47 questions / 19 assets`，状态仍为 `needs-review; verified 0/47`；自动内容校验不构成人工审核。
- 下一步运行默认 worker-mode `npm test` 与 production `npm run build`，随后默认 `8 workers / 3 projects` 全量 E2E。

## 2026-08-18 - 默认 Vitest 暴露模考评分回归

- `npm test` 新鲜结果为 `82 files / 995 tests`、`1 failed / 994 passed`。
- 唯一失败是既有 `packages/domain/src/mock.test.ts` 模考合同：`scoreMockExam` 对综合题 `selfScore=99` 过去按模考规则夹到 `10`，普通 study `evaluateResponse` 新增区间 fail-closed 后被直接复用并抛错。
- 这是跨领域语义耦合，不改普通练习自评分边界，也不改变模考自评路径；下一步在 `mock.ts` 内恢复模考专属 finite clamp，保留非有限值拒绝，再重跑 domain/mock 定向和默认 Vitest。

## 2026-08-18 - 模考评分语义隔离转绿

- `scoreMockExam` 现在在 mock domain 内独立处理 comprehensive selfScore：非有限值拒绝，有限值按模考既有规则夹到 `[0,maxScore]`；普通 `evaluateResponse` 继续对 Practice 越界值 fail closed。
- `packages/domain/src/mock.test.ts + study.test.ts` 定向为 `18/18 passed`，未改模考 schema/store、页面路径或普通练习合同。
- 下一步重跑默认 `npm test`，通过后继续 build 和全量 E2E。

## 2026-08-18 - 默认 Vitest 最终转绿

- 默认 worker-mode `npm test` 新鲜结果：`82 files / 995 tests passed`，无失败、跳过或 flaky。
- 这组结果同时覆盖普通综合题自评分、旧非法 session/backup v1-v3 兼容、extra response/attempt fail-closed、模考持久化与 mock clamp 合同。
- 下一步运行 production `npm run build`；通过后在独立端口执行默认 `8 workers / 3 projects` 全量 E2E。

## 2026-08-18 - Production build 转绿

- `npm run build` 通过：Vite `1905 modules transformed`，static-copy `198 items`，PWA precache `86 entries (2649.44 KiB)`，无 chunk warning。
- 下一步端口 `4335` 运行默认 `8 workers / 3 projects` 全量 E2E；不得用定向 `3/3` 替代全量门禁。

## 2026-08-18 - 全量 E2E 首轮并发失败候选

- 端口 `4335` 默认 `8 workers / 3 projects` 收集到 `186 tests`，结果 `183 passed / 3 failed`，耗时约 `4.5m`；新增普通综合题三视口合同已全部通过。
- 三个失败均为 chromium-1440 既有路径：普通练习首次选项 click actionability 超时、Q42 来源按钮 click actionability 超时、双页 Practice 完成后统计 heading 未在 30 秒内出现。1366/390 对应流程通过，失败未进入本轮新增业务断言。
- `.last-run.json` 当前为 failed；下一步端口 `4336` 精确复跑这三项。若 `3/3`，仍必须在新端口完整重跑 `186` 项；不调整 timeout/workers/retry 或断言。

## 2026-08-18 - 全量 E2E 首轮失败项精确复跑

- 端口 `4336` 只运行首轮三个 chromium-1440 失败项，结果 `3/3 passed`，业务约 `2.5-4.0s`。
- 精确复跑未改任何产品、测试、timeout、workers、retry 或业务断言；支持首轮失败为并发 actionability/lazy 冷启动候选，但不替代完整门禁。
- 下一步端口 `4337` 按默认 `8 workers / 3 projects` 完整运行 `186` 项。

## 2026-08-18 - 全量 E2E 第二轮单项并发失败

- 端口 `4337` 默认 `8 workers / 3 projects` 完整运行 `186` 项，结果 `185 passed / 1 failed`，约 `3.9m`。
- 唯一失败是 chromium-1366 既有跨标签 Practice 合同在 A 页“提交答案” click actionability 超时；1440/390 同合同、普通综合题三视口及其余 185 项通过。失败未进入新增自评分或动态视口断言。
- `.last-run.json` 为 failed；下一步端口 `4338` 精确复跑该一项，若通过必须第三轮完整 `186` 项。

## 2026-08-18 - 第二轮失败项精确复跑

- 端口 `4338` 只运行 chromium-1366 跨标签 Practice 合同，结果 `1/1 passed`，业务约 `3.3s`。
- 未修改 timeout、workers、retry、断言或产品实现；下一步端口 `4339` 按默认合同完整运行 `186` 项。

## 2026-08-18 - 全量门禁最终收口

- `PLAYWRIGHT_TEST_PORT=4339 npm run test:e2e` 按默认 `8 workers / 3 projects` 完整运行 `186/186 passed`，约 `3.6m`；`output/playwright/results/.last-run.json` 为 `status: passed` 且 `failedTests: []`，HTML 报告已刷新至 `output/playwright/report/index.html`。
- `4335-4339` 均无监听端口。六张综合题截图已刷新并复看：桌面 `1440x1458 / 1440x1332`、`1366x1432 / 1366x1306`，移动 DPR 截图 `1024x2216` 两张；无 P0/P1、截字、横向溢出或控件重叠。移动 invalid 错误提示完整位于操作条上方，submitted 的底部裁切符合滚动视口预期。
- 最终门禁证据为：lint、workspace typecheck、Vitest `82 files / 995 tests`、release `10/10`、content `47 questions / 19 assets`（仍 `needs-review; verified 0/47`）、production build `1905 modules / 198 static-copy / 86 PWA entries`、默认 E2E `186/186`。
- 自动内容校验、来源核对、Vitest、E2E 与截图均不等于人工审核；Q44 仍只支持来源审计已确认的 `parallel-5 / split-6`，并保持 `needs-review`。未修改 408-user schema v1/v2/v3、题包、旧图片或旧 `cpu-explorer`，未删除、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、本文件和 `notes.md`，以本节最终收口为基线；不要重做 Q44 候选比较，不把自动来源证据当人工审核，不声称 `parallel-5 / split-6` 穷尽所有合法答案。当前本轮代码与门禁已完成，若没有新的明确需求只做状态核对；任何新改动仍需先写红灯、更新交接与记录、定向验证后再扩大门禁。不得修改 408-user schema v1/v2/v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 普通选择题反馈语义红绿

- 只读复核确认既有 P1：普通 Practice 单选选中态只有 CSS class，提交后的正确/错误结果也没有 status/live/focus 交接；辅助技术无法可靠获知唯一选项与异步提交结果。没有修改评分、存储、题包或路由。
- 先新增两条 `PracticePage` 合同，旧实现精确红灯为 `2 failed / 17 passed`：四个选项缺少布尔 `aria-pressed`，提交后找不到 `role=status`。随后为选项补 pressed partition，并将答案状态设为 polite/atomic status；仅在当前题从未提交变为已提交时聚焦结果，不在初始恢复或切题时抢焦点。
- 首次实现把 effect 放在早返回之后，定向运行暴露 Hook 顺序错误；已将 effect 移到所有返回之前。最终 `apps/web/src/pages/PracticePage.test.tsx` 为 `19/19 passed`。下一步独立复审焦点边界，并运行 Web typecheck、相关 ESLint 和真实三视口键盘/DOM 合同；通过后再决定全量门禁范围。

## 2026-08-18 - 普通选择题反馈语义定向收口

- Web typecheck 与 `PracticePage.tsx`、其单测及 `tests/e2e/study-flow.spec.ts` ESLint 均通过。端口 `4340` 的既有普通单选完整流程在 1440/1366/390 三项目为 `3/3 passed`，并真实验证初始全 false、选择后唯一 pressed、reload 恢复 pressed、提交结果 status 与焦点；端口已释放。
- 独立只读审计 P0 `0`、P1 `0`。确认初始恢复/切题不抢焦点，本题本地提交聚焦结果，冲突恢复与综合题完成自评的结果交接合理，测试不是只看 CSS class 的假绿。
- 两项 P2 只记录不修：`tabIndex=-1` 结果区没有专用可见焦点样式；负向合同未逐项锁定初始已提交、切到已提交题、冲突恢复和综合题提交。下一步运行全仓 lint/typecheck/Vitest/release/content/build，再在新端口运行默认全量 E2E。

## 2026-08-18 - 普通选择题反馈语义全量首轮

- 全仓 lint、workspace typecheck 通过；默认 Vitest `82 files / 997 tests passed`；release `10/10`；内容 `47 questions / 19 assets` 且仍为 `needs-review; verified 0/47`；build `1905 modules`、static-copy `198`、PWA `86 entries (2649.71 KiB)`。
- 端口 `4341` 默认 `8 workers / 3 projects` 全量 E2E 为 `184 passed / 2 failed`，约 `4.2m`；新增普通单选 pressed/status/focus 流程三视口均通过。失败均是既有跨标签并发候选：1440 Practice 已完成后 5 秒内未见统计标题，1366 模考双页首屏 15 秒内未挂载。
- 未改 timeout、workers、retry、断言或产品。下一步端口 `4342/4343` 分别精确复跑两项；若均通过，仍需新端口完整重跑 `186` 项，不能用定向结果替代全量。

## 2026-08-18 - 全量首轮失败项精确复跑

- 初次并行启动 `4342/4343` 时，两个 Playwright webServer 同时清理共享 `apps/web/dist`，使 `4342` 在进入测试前以 Vite `prepare-out-dir EPERM` 失败；这是执行方式造成的构建竞争，不计为产品测试失败。`4343` 的 chromium-1366 模考双页项为 `1/1 passed`，业务约 `2.8s`。
- 改为串行后，端口 `4344` 的 chromium-1440 Practice 双页项为 `1/1 passed`，业务约 `3.7s`。两项均未改产品、测试、timeout、workers、retry 或断言。
- 精确复跑只支持首轮失败为并发冷启动波动，不替代全量。下一步端口 `4345` 完整重跑默认 `186` 项。

## 2026-08-18 - 普通选择题反馈语义最终收口

- 端口 `4345` 的第二轮默认 `8 workers / 3 projects` 全量 E2E 为 `186/186 passed`，约 `3.9m`；首轮两项跨标签候选及新增单选 pressed/status/focus 合同在完整并发环境全部通过。
- `output/playwright/results/.last-run.json` 为 `status: passed` 且 `failedTests: []`，HTML 报告已刷新；`4340-4345` 均无监听端口。改动不涉及 CSS 或视觉结构，因此未新增截图分支。
- 最终门禁：lint、全部 workspace typecheck、Vitest `82 files / 997 tests`、release `10/10`、content `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2649.71 KiB)`、默认 E2E `186/186`。
- 独立审计 P0/P1 为 `0`；两项 P2 继续只记录不修。未修改评分、storage/schema v1-v3、题包、旧图片、旧 `cpu-explorer`，未删除、提交、推送或部署。自动门禁不构成人工内容审核，Q44 仍只支持 `parallel-5 / split-6` 并保持 `needs-review`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、`HANDOFF.md` 和 `notes.md`。普通 Practice 单选 pressed/status/focus 语义已红转绿并最终收口：独立审计 P0/P1 为 0，最终门禁为 lint/typecheck 全绿、Vitest `82 files / 997 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905/198/86`、默认 E2E `186/186`。不要重做本案、Q44 候选比较、StudySession/ContentReview CAS 或 schema v3；下一步先只读审计剩余独立候选，只有确定性 P0/P1 才先写红灯，P2 只报告不修。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`；不得修改 schema v1-v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 来源弹窗焦点与背景隔离 P1 红灯

- 按剩余独立候选只读审计，来源页弹窗已有 `role=dialog`/`aria-modal=true`，但打开后焦点留在背景“原卷第 … 页”触发按钮；Escape 不关闭；Tab 可进入背景笔记 textarea。弹窗没有焦点回收或背景 inert，键盘和读屏用户无法可靠完成来源核对。
- 先在 `apps/web/src/pages/PracticePage.test.tsx` 新增三条确定性合同：打开聚焦关闭按钮并将背景设为 inert、Escape 关闭并把焦点还给触发器、Tab/Shift+Tab 在弹窗内循环。定向 Vitest 为 `1 file / 3 failed / 19 passed`，失败均精确命中旧行为。
- 下一步只实现来源弹窗的焦点进入/回收、Escape、Tab 循环与背景 inert；保留现有来源图片、CSS、路由和内容审核边界。转绿后做独立 P0/P1 复审、相关 typecheck/ESLint 和三视口真实浏览器合同，再决定是否扩大门禁。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。当前新立案来源弹窗可访问性 P1 已先写红灯：`PracticePage.test.tsx` 定向 `1 file / 3 failed / 19 passed`，失败为打开不聚焦、Escape 不关闭/不回收、Tab 逃到背景。直接实现最小焦点管理与背景 inert，先转绿再独立审计和真实三视口；不要重做单选语义、Q44、StudySession/ContentReview CAS、自评分兼容或 schema v1/v2/v3。Q44 只支持 `parallel-5 / split-6` 且保持 `needs-review`；不得删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 来源弹窗焦点管理转绿与三视口合同

- `PracticePage` 为来源触发器、dialog 与关闭按钮保存 DOM 引用；打开后将 dialog 的四个背景兄弟节点设为 `inert`/`aria-hidden` 并聚焦关闭按钮。dialog 内 Escape 关闭，Tab/Shift+Tab 在可聚焦项首尾循环；清理时精确恢复每个背景节点原属性，并在触发器仍连接时回收焦点。
- `PracticePage.test.tsx` 由 `3 failed / 19 passed` 转为 `22/22 passed`。第一次转绿仅剩一条测试查询错误：背景 main 正确 inert 后已从可访问树移除，`getByRole('main')` 找不到；改为直接查询 DOM 属性后全绿，不是产品失败。
- 新增真实浏览器合同 `traps focus inside the practice source dialog and restores it on Escape`，端口 `4346` 的 1440/1366/390 三项目为 `3/3 passed`；真实 Chrome 验证初始焦点、背景 inert、双向 Tab 环绕、Escape、触发器焦点恢复和 inert 清理。Web typecheck 与三文件 ESLint 通过，端口已释放。
- 下一步等待独立 P0/P1 终审；清零后按改动风险运行全仓 lint/typecheck/Vitest、release/content/build 和默认全量 E2E。该改动无 CSS/视觉结构变化，现有来源截图不应变化，但全量视觉合同仍可刷新来源弹窗路径。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 来源弹窗可访问性 P1。红灯已转绿：Practice 单测 `22/22`，Web typecheck/相关 ESLint 通过，端口 `4346` 三视口真实 Chrome `3/3`。先取得独立 P0/P1 终审结论；清零后运行全量静态/Vitest/release/content/build 和默认 `8 workers / 3 projects` E2E，必要时刷新来源弹窗截图。不要重做普通单选、Q44、自评分兼容、CAS 或 schema v1-v3；Q44 保持仅 `parallel-5 / split-6` 且 `needs-review`，不得删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 来源弹窗独立终审与全量静态门禁

- 独立只读终审确认当前来源弹窗 P0/P1 为 `0`：初始焦点、Escape、单一可聚焦控件的 Tab 环、四个背景兄弟 inert/aria-hidden、关闭与卸载 cleanup 均成立，现有单测和真实 Chrome 合同不是假绿。
- P2 只记录不修：关闭按钮路径、打开时卸载、背景原属性精确还原、四兄弟逐一断言、未来多可聚焦元素和脚本强制移焦没有分别覆盖。这些不是当前 DOM 的确定性 P0/P1。
- 全仓 `npm run lint` 与全部 workspace `npm run typecheck` 通过；release `10/10`；内容校验 `47 questions / 19 assets` 且仍为 `needs-review; verified 0/47`。自动校验和来源弹窗测试不构成人工审核。
- 下一步串行运行默认 Vitest 与 production build，随后用新端口跑默认 `8 workers / 3 projects` 全量 E2E；避免多个 webServer 并行清理共享 `apps/web/dist`。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS` 来源弹窗收口。独立终审 P0/P1 已清零；全仓 lint/workspace typecheck、release `10/10`、content `47/19` 且 `needs-review; verified 0/47` 已通过。下一步先跑默认 Vitest 和 production build，再用独立端口跑默认 `8 workers / 3 projects` 全量 E2E；不要并行启动 webServer。P2 只报告不修。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`，不得修改 schema v1-v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 来源弹窗全量 Vitest 与 production build

- 默认 `npm test` 通过：`82 files / 1000 tests passed`，无失败、跳过或 flaky；新增来源弹窗单测包含在内。
- `npm run build` 通过：Vite `1905 modules transformed`、static-copy `198 items`、PWA precache `86 entries (2650.93 KiB)`，无 chunk warning。
- 下一步端口 `4347` 串行运行默认 `8 workers / 3 projects` 全量 E2E；完成后读取 `.last-run.json`、检查端口释放并复看来源弹窗三视口截图。

## 2026-08-18 - 来源弹窗全量 E2E 首轮并发失败候选

- 端口 `4347` 默认 `8 workers / 3 projects` 收集 `189 tests`，结果 `179 passed / 10 failed`，约 `5.4m`。新增来源弹窗焦点/inert/Escape 合同在 1440/1366/390 均通过，三张既有来源弹窗视觉截图也已刷新。
- 六项失败集中于 chromium-1440 首批懒加载页面在 5 秒内未出现标题；另外是三视口模考双页 30 秒超时，以及 chromium-1366 ContentReview 双页 actionability 超时。对应实验在其余视口通过，失败未进入来源弹窗新增断言。
- `.last-run.json` 当前为 failed 并记录 10 个 id；端口 `4347` 已释放。下一步端口 `4348` 使用 Playwright `--last-failed` 原参数精确复跑 10 项；若通过仍必须新端口完整重跑 `189` 项，不得以定向结果替代全量。

## 2026-08-18 - 首轮 10 项 --last-failed 复跑

- 端口 `4348` 以原默认 worker 参数运行 `--last-failed`，结果 `5 passed / 5 failed`。Q3、ContentReview 双页和 mock 双页的 1366/390 均通过；剩余失败全部为 chromium-1440，在 8 个失败项并发冷启动时，Q5/Q14/Q37/Q41 页面标题或 mock alert 未在 5 秒内出现。
- 该结果仍不能作为产品通过，也未命中来源弹窗路径。下一步把剩余 5 个 chromium-1440 用例分别在 `4349-4353` 独立端口、默认单测试参数下串行精确复跑；不改 timeout/workers/retry/断言。全部通过后仍需完整 `189` 项第二轮。

## 2026-08-18 - 剩余 5 个 1440 失败项逐项复跑

- `4349` Q5、`4350` Q14、`4351` Q37、`4352` Q41、`4353` mock 双页均在 chromium-1440 单项默认参数下 `1/1 passed`；业务分别约 `10.6s / 1.9s / 6.3s / 2.1s / 3.6s`。
- 未修改产品、测试、timeout、workers、retry 或断言；`4348-4353` 均已释放。结果支持首轮/批量复跑失败来自并发冷启动拥塞，但单项通过不替代全量。
- 下一步端口 `4354` 完整重跑默认 `189` 项；只有 `.last-run.json` passed/空失败和端口释放后才能收口。

## 2026-08-18 - 全量 E2E 第二轮结果

- 端口 `4354` 默认 `8 workers / 3 projects` 完整运行 `189` 项，结果 `181 passed / 8 failed`，约 `6.0m`。来源弹窗新增三视口合同再次全部通过。
- Q5/Q14/Q37/Q41/mock 1440 已在此前独立端口单项通过，本轮再次只在完整并发中失败；另外新增 chromium-1440/1366 ContentReview 双页 actionability 及 chromium-1440 Practice 双页统计跳转超时。对应其余视口通过。
- `.last-run.json` 为 failed/8 ids，`4354` 已释放。下一步只在 `4355-4357` 精确复跑本轮新出现的 ContentReview 1440/1366 与 Practice 1440 三项；若通过，端口 `4358` 再做第三轮完整 `189` 项。保持所有产品与测试参数不变。

## 2026-08-18 - 第二轮新增失败项复跑与固定 preview

- `4355` 首次尚未进入测试即因 Playwright webServer 60 秒启动超时失败；只读检查无本轮端口/测试进程残留，表明机器 I/O/CPU 拥塞也影响重复 build 启动，不计作产品测试失败。
- 复用已独立通过的 production `dist`，在空闲默认端口 `4173` 启动本轮 preview；Playwright 复用该 server 后，ContentReview stale-tab 的 1440/1366 和 Practice 双页 1440 分别 `1/1 passed`，业务约 `3.5s / 4.0s / 3.5s`。
- 下一步保持该 preview，按默认配置运行完整 `189` 项第三轮；测试完成后必须关闭本轮 preview 并确认 4173 释放。独立 production build 证据仍为此前 `1905/198/86`。

## 2026-08-18 - 来源弹窗焦点与背景隔离转绿

- `PracticePage` 为来源触发器、弹窗容器和关闭按钮增加 refs；打开时把 header、答题卡、题面区和工具栏兄弟节点设为 `inert` + `aria-hidden=true`，焦点进入关闭按钮；弹窗处理 Escape 关闭、Tab/Shift+Tab 单元素环绕，清理时恢复原属性并把焦点还给触发器。
- 定向 `npm exec -- vitest run apps/web/src/pages/PracticePage.test.tsx --reporter=verbose` 从 `3 failed / 19 passed` 转为 `1 file / 22 passed`。Web typecheck 与 `PracticePage.tsx`、其单测、`study-flow.spec.ts` ESLint 均通过。
- 新增真实浏览器合同 `traps focus inside the practice source dialog and restores it on Escape`，端口 `4346` 的 `chromium-1440/1366/390` 为 `3/3 passed`，并验证背景 inert 属性恢复；端口已释放。未改 CSS、来源图片、路由、schema、题包或审核状态。
- 下一步做独立 P0/P1 复审与现有来源 modal 三视口截图复看；确认无回归后再按风险扩大 lint/typecheck/Vitest/release/content/build/E2E 门禁。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。来源弹窗焦点 P1 已红转绿：Practice 定向 `22/22`，Web typecheck/相关 ESLint 全绿，真实 Chrome 三视口 `3/3`；实现仅加入焦点进入/回收、Escape、Tab 环绕与背景 inert。下一步先独立审计当前实现 P0/P1，并运行现有 `visual.spec.ts` 来源弹窗三视口截图检查；不要重做单选、Q44、CAS、自评分或 schema v1-v3。若审计清零，再扩大全量门禁。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`；不得删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 来源弹窗最终验证收口

- 复用已通过 production build 的固定 preview 后，第三轮默认 `8 workers / 3 projects` 完整运行 `189` 项，结果 `176 passed / 13 failed`，约 `4.4m`。失败包括三视口 PWA Service Worker ready 超时、PDF/offline 路径的并发超时，以及 chromium-1440 的 Q5、Q31 与 Practice 跨标签各一项；新增来源弹窗焦点/inert/Escape 合同仍为三视口 `3/3 passed`。
- 三轮默认全量分别为 `179/189`、`181/189`、`176/189`，失败集合随并发运行变化；多个候选已有串行精确通过证据，但这些结果不能替代完整门禁。未修改 timeout、workers、retry、既有断言或产品逻辑，也不再用无界重跑掩盖当前机器的 8-worker 资源拥塞。
- `output/playwright/results/.last-run.json` 最终为 `status: failed` 且记录 13 个 failed test ids；本轮 preview 已停止，端口 `4173` 无监听。不得声称默认全量 E2E 已通过。
- 三张来源弹窗截图已人工与独立只读双重检查：`1440x900`、`1366x768`、移动高 DPR `1024x2216`。桌面双栏与移动单列均清晰，无横向溢出、文字截断、控件遮挡或异常裁切；当前视觉 P0/P1/P2 均为 `0`。静态截图本身不证明焦点交互，交互证据来自三视口真实浏览器合同。
- 来源弹窗功能本身已经完成：红灯 `3 failed / 19 passed`，转绿 `22/22`；三视口定向 E2E `3/3`；独立源码终审 P0/P1 `0`。全仓其余门禁为 lint/typecheck 通过、Vitest `82 files / 1000 tests`、release `10/10`、content `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2650.93 KiB)`。
- 自动来源证据、测试与截图不构成人工审核。Q44 仍只支持 `parallel-5 / split-6` 且保持 `needs-review`；未修改 schema v1/v2/v3、旧图片、旧 `cpu-explorer` 或既有测试，未删除、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。来源弹窗 P1 已完成红转绿、独立终审和三视口截图检查：单测 `22/22`、定向 E2E `3/3`、视觉与源码 P0/P1 为 0；静态/Vitest/release/content/build 全绿。当前默认全量 E2E 的最新事实是固定 preview 下 `176/189 passed`、`.last-run.json` failed/13 ids，三轮失败集合随 8-worker 并发变化，因此不得写成全绿，也不要继续无界重跑。若无新的明确需求，只做状态核对或审计新的独立确定性 P0/P1；P2 只报告不修。不要重做来源弹窗、普通单选、Q44、CAS、自评分或 schema v1-v3。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`；不得删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-18 - 剩余可访问性候选只读审计

- 网络模块导航复核确认 `NetworkModuleTabs` 的四个链接均按 active module 暴露 `aria-current="page"`，既有页面单测和 `csma-cd-collision-lab.spec.ts` 也覆盖该合同；历史“网络模块缺少选中语义”已不是当前缺口。
- 扫描剩余用户控件未发现新的确定性 P0/P1。确认的 P2 包括：`QuestionsPage` 科目筛选按钮仅以 `active` class 表示当前项；`PracticePage` 掌握度三选一仅以 `active` class 表示；`StepExplorer` 播放/暂停用动态 accessible name 但无 `aria-pressed`、当前 `<li>` 无独立 `aria-current`，且 transport button 未显式声明 `type="button"`；Cache 访存时间线当前项主要靠 class；VirtualMemory 播放切换无 `aria-pressed`（其时间线当前事件已有 `aria-current`）；AppShell/Suspense 的全局 loading/fatal 与 SPA 路由播报仍是语义增强缺口。它们仍可操作、没有键盘死路或数据损坏证据，按边界只报告不修。
- 本次为只读审计，未新增测试、未运行服务、未修改产品代码；不把 P2 语义覆盖缺口升级成新立案。来源弹窗、普通单选、StudySession/ContentReview CAS、Q44 和 schema v1-v3 均未重做。

## 2026-08-19 - 状态核对

- 重新核对相关监听端口，`4173`、`4335`、`4354-4358` 均无监听；没有遗留 preview 或 Playwright 服务。
- `output/playwright/results/.last-run.json` 未漂移，仍为 `status: failed`、13 个 failed test ids。没有重跑默认全量 E2E，也没有把既有失败改写成通过。
- 本次仅更新交接日期与状态证据，未修改产品代码、测试、配置、schema 或审核状态。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。截至 2026-08-19，来源弹窗修复、独立审计和三视口截图已收口；剩余交互候选均为已记录 P2。相关端口已释放，`.last-run.json` 仍为全量 E2E `failed/13 ids`，不要无界重跑或声称全绿。没有新的明确 P0/P1 范围时只做状态核对；如用户明确授权语义增强，仍需先写红灯再实现。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`，不得修改 schema v1-v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

### 下一会话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取父级与项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。最新只读审计确认网络模块 `aria-current` 已存在，剩余 Questions 科目筛选、Practice 掌握度、StepExplorer/虚拟内存播放状态均只是已记录 P2；没有新的确定性 P0/P1，不要为继续而改动或把 P2 当成产品阻塞。当前默认全量 E2E 最新事实仍为固定 preview 下 `176/189 passed`、`.last-run.json` failed/13 ids；静态/Vitest/release/content/build 和来源弹窗定向证据保持此前记录。若没有新的明确范围，只做状态核对。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`；不得修改 schema v1-v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-19 - 最新开场基线

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md`。截至 2026-08-19，来源弹窗已完成，剩余交互候选均为 P2；相关端口已释放，`.last-run.json` 仍为默认全量 E2E `failed/13 ids`。没有新的明确 P0/P1 时只做状态核对，不无界重跑、不声称全绿、不把 P2 当成产品阻塞。若用户明确授权语义增强，先写红灯再实现。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`；不得修改 schema v1-v3、删除旧图片/测试/旧 `cpu-explorer`、提交、推送或部署。

## 2026-08-19 - 阶段收尾完成

- 本阶段冻结为可本地使用的 `2009 工程 Beta` 检查点：来源弹窗焦点修复已完成，剩余审计候选无确定性 P0/P1；不继续扩展 P2，也不在当前机器上无界重跑全量 E2E。
- README 已从旧的 2026-08-17/`171/171` 历史基线更新为当前事实：lint/typecheck 全绿、Vitest `82 files / 1000 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905/198/86`，最新默认全量 E2E 为 `176/189 passed`、13 项失败且 `.last-run.json` 仍为 failed。
- 本次收尾校验：`npm run content:validate` 通过，输出 `PASS cn408-2009: 47 questions (40 objective, 7 comprehensive)`、`Review status: needs-review; verified 0/47`；所有相关端口已释放。
- 本阶段没有新增产品代码、测试、schema、题包、图片或配置变更；没有删除、提交、推送或部署。Agent memory 未写入新条目，避免在未获明确授权时修改跨会话记忆层。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`，从阶段收尾检查点开始，不要从头重做。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`，以 2026-08-19 最新收尾段为准。

当前基线：这是可本地使用的 `2009 工程 Beta`，不是正式发布题库。来源弹窗焦点管理已完成：Practice 单测 `22/22`、真实三视口合同 `3/3`、独立 P0/P1 `0`。全仓静态门禁和内容校验已通过：lint/typecheck、Vitest `82 files / 1000 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries`。最新默认 `8 workers / 3 projects` 全量 E2E 在固定 preview 下为 `176/189 passed`，`.last-run.json` 为 failed/13 ids；失败集合随当前机器并发冷启动变化，不要声称全绿，也不要无界重跑。

下一步规则：没有新的明确 P0/P1 时只做状态核对；既有 P2（Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement）只报告不修。若用户明确授权新的语义增强，必须先写确定性红灯，再做最小实现、定向验证、独立 P0/P1 复审，之后才考虑全量门禁。Q44 只保留来源支持的 `parallel-5 / split-6`，保持 `needs-review`，不声称穷尽所有合法答案，不实现任意微操作评分器。不得修改 `408-user` schema v1/v2/v3，删除旧图片、测试或旧 `cpu-explorer`，提交、推送或部署。

## 2026-08-23 - 学习备份恢复确认 P1 红灯

- 既有 backup replace/merge 存储事务复核无新案；解析、联合语义校验、清空和八类数据写入仍为单事务，已有失败零写入测试，本轮不重做该范围。
- 新立案独立数据安全 P1：`SettingsPage` 选择任意合法备份文件后立即执行 replace，没有明确确认；用户可能因选错旧备份直接替换当前浏览器中的作答、进度、笔记、收藏、设置和模考记录。
- `SettingsPage.test.tsx` 已先写两条确定性合同：取消恢复必须零调用 `importBackup`，确认后才允许调用。旧实现新鲜结果为 `2 failed / 0 passed`，失败均精确命中确认函数从未调用；产品实现尚未修改。
- 下一步仅在 Settings Web 入口增加恢复确认门，同步既有备份 E2E 接受确认后做定向验证；不改 `408-user` v1/v2/v3 schema、BackupService、题包、Q44 或既有 P2。

## 2026-08-23 - 学习备份恢复确认定向收口

- `SettingsPage` 已在任何文件读取和 replace 调用前增加原生确认，明确会替换作答、进度、笔记、收藏、设置和模考记录，本地 PDF 不受影响；取消路径零调用 `importBackup` 并显示取消状态。未改 BackupService、schema 或数据格式。
- Settings 确定性红灯 `2 failed / 0 passed` 已转为 `2/2 passed`。实现后曾有 1 项纯测试隔离失败：旧单用例文件没有清理前一渲染 DOM；补齐 cleanup 后同命令全绿，产品断言未削弱。
- Web typecheck、三文件定向 ESLint 与 Playwright `--list` 通过。端口 `4359` 的 V3 roundtrip + V1 migration 两条真实 Chrome 合同在 1440/1366/390 为 `6/6 passed`，均捕获、核对并接受确认后成功恢复；端口已释放。
- 定向运行后的 `.last-run.json` 为 passed/空失败，只能代表 6 项定向结果；此前最新默认完整 E2E 仍是 `176/189 passed`、failed/13 ids，不得改写成全量通过。分离式源码复核当前改动 P0/P1 为 0；备份内容预览与导出失败提示两个 P2 只记录不修。
- 下一步串行执行全仓 lint/typecheck、默认 Vitest、release、content、build，再只执行一次默认 `8 workers / 3 projects` 全量 E2E；不无界复跑。Q44、`needs-review`、schema v1-v3 和既有 P2 边界不变。

## 2026-08-23 - 学习备份恢复确认全量首轮与修正

- 全仓门禁新鲜通过：lint、workspace typecheck、Vitest `82 files / 1001 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905/198/86 PWA entries (2651.13 KiB)`。
- 端口 `4360` 默认全量 `189` 项首轮为 `180 passed / 9 failed`。3 项失败来自重复的 `apps/web/e2e/study-flow.spec.ts` 仍假定无确认框；6 项为 chromium-1440 实验室首屏 lazy/actionability 冷启动候选，与本次 Settings 改动无关。
- 已修正重复 E2E 合同并通过 ESLint；端口 `4361` 的该备份流程三视口 `3/3 passed`，确认框类型/文案和接受动作均已验证。`4360/4361` 均无监听。
- 下一步只进行一次修正后的默认 `8 workers / 3 projects` 全量 `189` 项运行，随后按原样收口，不因并发失败继续重跑。

## 2026-08-23 - 学习备份恢复确认最终收尾

- 修正后的默认 `8 workers / 3 projects` 在固定 production preview（端口 `4362`）完整运行 `189` 项，最终为 `187 passed / 2 failed`，约 `4.0m`。失败是 `chromium-1440` 的 `tests/e2e/csma-cd-collision-lab.spec.ts` CSMA/CD 碰撞域实验和 `chromium-1366` 的 `tests/e2e/complete-binary-tree-lab.spec.ts` 完全二叉树实验，均在固定视口冷启动时发生 30 秒 locator/actionability 超时；未命中 Settings 备份确认路径。
- `output/playwright/results/.last-run.json` 当前为 `status: failed`，记录 2 个 failed test ids：`fe079b396292f25d68f5-44b2b53359d3cb339084`、`2d978c01f21bfda0ea02-2fea01b6bd67b8f3c14c`。端口 `4360`、`4361`、`4362` 均无监听；不再启动第三轮全量 E2E，也不把并发结果写成全绿。
- 本轮 P1 修复的独立复审仍为 `0`：确认门只包围 Settings 学习备份入口，取消在读文件前返回并零调用 `importBackup`，确认后沿用既有原子 replace 事务；未改 schema、备份格式或既有 P2。既有 P2（Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement）继续只报告不修。
- 全仓新鲜门禁保持：lint/typecheck 通过、Vitest `82 files / 1001 tests`、release `10/10`、content `47 questions / 19 assets` 且 `needs-review; verified 0/47`、build `1905 modules / 198 static-copy / 86 PWA entries (2651.13 KiB)`。Q44 仅保留来源支持的 `parallel-5 / split-6`，继续 `needs-review`。
- 本轮未删除旧图片、测试或旧 `cpu-explorer`，未修改 `408-user` schema v1/v2/v3，未提交、推送或部署。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`，从 2026-08-23 学习备份恢复确认最终收尾检查点开始，不要从头重做。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`。

当前事实：这是可本地使用的 `2009 工程 Beta`，不是正式发布题库。Settings 学习备份恢复确认 P1 已红转绿：定向单测 `2/2`、备份真实浏览器合同 `6/6`（含三视口）、独立 P0/P1 `0`。全仓静态/内容门禁为 lint/typecheck、Vitest `82 files / 1001 tests`、release `10/10`、content `47/19` 且 `needs-review; verified 0/47`、build `1905/198/86`；修正后的默认全量 E2E 为 `187/189 passed`，`.last-run.json` 为 `failed/2 ids`，失败集合仍可能随并发冷启动变化，不要声称全绿或无界重跑。

没有新的明确 P0/P1 时只做状态核对；既有 P2 只报告不修。若明确授权新的语义增强，必须先写确定性红灯，再做最小实现、定向验证、独立 P0/P1 复审，之后才考虑全量门禁。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`，不声称穷尽所有合法答案，不实现任意微操作评分器。不得修改 `408-user` schema v1/v2/v3，删除旧图片、测试或旧 `cpu-explorer`，提交、推送或部署。

## 2026-08-24 - Q34 QAM / 奈氏准则实验垂直切片

- 按原有“更广的四科实验”路线，在 Q5 收口后完成 Q34 候选的来源审计并立项。题包与本地 crosscheck 支持的范围是无噪声、`3 kHz` 带宽、`4` 个相位和 `4` 种振幅，得到 `16` 个符号状态、`4 bit/符号` 和 `24 kbps`；答案为 B，但题包继续保持 `needs-review`，来源核对不等同人工审核。
- 先新增 `packages/lab-core/src/qam-nyquist.test.ts` 并保留缺模块红灯 `1 failed / 0 tests`，再实现 `traceQamNyquist` 五步确定性 trace、Q34 预设、有限参数校验和快照隔离。核心/Web/路由/深链相关定向共 `5 files / 58 tests passed`。
- 新增 `QamNyquistLabPage`、网络路由和 Q34 真题实验/知识节点深链；网络实验导航由四个更新为五个模块，并同步现有模块数量合同。自定义 URL 只重放 `R = 2 × B × log2(M)`，非法带宽、相位或振幅参数 fail closed；页面明确不估计香农容量、信噪比或实际调制误差，不实现任意微操作或答案评分器。
- 全仓 `npm run lint` 复核通过；Q34 涉及的 Web 与 lab-core typecheck 通过。production build 新鲜通过：`1907 modules`、`198 static-copy`、PWA `86 entries (2665.99 KiB)`。
- 独立端口 `4363` 的真实 Chrome 1440/1366/390 Q34 合同为 `3/3 passed`，覆盖 Q34 结果、五模块当前态、URL 自定义/恢复、非法输入、步进、深链和页面无横向溢出；端口已释放。当前 `output/playwright/results/.last-run.json` 的 `passed/空失败` 只代表这 3 项定向运行。
- 本轮没有重跑全仓 Vitest、release、content 或默认全量 E2E。默认 `8 workers / 3 projects` 全量最新事实仍为 `187/189 passed`，两项为 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树的冷启动/actionability 超时；不把定向 `.last-run.json` 写成全量通过，也不再无界重跑。独立 P0/P1 复审为 `0`。
- 未修改 `408-user` schema v1/v2/v3、题包审核状态或 Q44 的 `parallel-5 / split-6` 边界，未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续只报告不修。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`，以 2026-08-24 Q34 收尾段为准。Q34 QAM/奈氏实验已完成核心/Web/路由/深链切片：定向 Vitest `5 files / 58 tests`，真实 Chrome 三视口 `3/3`，lint、相关 typecheck 和 build `1907/198/86` 通过；Q34 与题包仍为 `needs-review`。当前默认全量 E2E 最新完整结果仍是 `187/189 passed`、2 项冷启动失败，`.last-run.json` 的 passed/空失败只来自 Q34 定向运行，不要声称全绿或再次无界重跑。

若继续授权新的实验功能，先做来源和交互边界审计，再写确定性红灯、最小实现、定向验证和独立 P0/P1 复审；既有 P2 仍只报告不修。保持 Q44 仅来源支持的 `parallel-5 / split-6` 且 `needs-review`，不得修改 `408-user` schema v1/v2/v3，删除旧图片、测试或旧 `cpu-explorer`，提交、推送或部署。

## 2026-08-26 - Q27 分段地址字段实验垂直切片

- 按原有“更广的四科实验”路线审计并实现 Q27。来源只支持 32 位逻辑地址、8 位段号，因此确定性结论是 24 位段内位移和最大段长 `2^24 B`，对应选项 C；题目与题包继续保持 `needs-review`，不把来源核对或自动验证当作人工审核。
- 先新增 `packages/lab-core/src/segmentation-address.test.ts`，缺少实现模块时得到预期红灯 `1 failed / 0 tests`；随后实现严格输入校验、五步不可变 trace 和 `cn408-2009-q27` 预设，核心定向为 `3/3 passed`。
- 新增 `SegmentationAddressLabPage`、OS 路由、六模块导航和 Q27 真题/知识节点双向深链。canonical URL 为 `/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27`；自定义地址总位数/段号位数非法时 fail closed，恢复预设后回到来源参数。
- 页面边界明确限定为地址字段拆分和容量换算，不模拟来源未给出的段表、基址/限长寄存器、物理地址转换或保护机制，也不引入答案评分器、持久化字段或 schema 变化。
- 核心/Web/路由/深链定向 Vitest 为 `4 files / 59 tests passed`；受六模块导航影响的既有 OS 页面合同为 `3 files / 17 tests passed`。全仓 lint、`@408os/lab-core` 与 `@408os/web` typecheck 通过。
- production build 通过：`1909 modules transformed`、`198 static-copy`、PWA `87 entries (2680.89 KiB)`。独立端口 `4364` 的真实 Chrome 1440/1366/390 Q27 合同为 `3/3 passed`，覆盖来源结果、六模块当前态、步进、自定义/非法/恢复、双向深链和无横向溢出；端口已释放。
- 当前 `output/playwright/results/.last-run.json` 的 `passed/空失败` 只代表 Q27 三视口定向集合。本轮按用户要求减少测试，没有重跑全仓 Vitest、release、content 或默认全量 E2E；最新默认全量仍为 `187/189 passed`，两项冷启动/actionability 失败不能写成全绿。
- 独立源码复审未发现新的 P0/P1。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续作为 P2 只报告不修。
- 未修改 `408-user` schema v1/v2/v3、Q44 的 `parallel-5 / split-6` 边界或题包审核状态，未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`，以 2026-08-26 Q27 收尾段为准。Q27 分段地址字段实验已完成核心/Web/路由/深链切片：红灯 `1 failed / 0 tests`，核心 `3/3`，相关定向 Vitest `4 files / 59 tests`，既有 OS 页面合同 `3 files / 17 tests`，真实 Chrome 三视口 `3/3`，lint、相关 typecheck 和 build `1909/198/87` 通过；Q27 与题包仍为 `needs-review`，实验只支持 32 位地址、8 位段号、24 位段内位移和 `2^24 B` 最大段长，不模拟段表、物理地址或保护机制。

按用户要求继续扩充网站时，先审计下一道来源完整、确定性且有学习价值的 2009 题，再写红灯、做最小垂直切片和定向验证；不要为每个薄切片重跑全仓门禁。默认全量 E2E 最新完整事实仍是 `187/189 passed`、2 项冷启动失败，当前 `.last-run.json` 的 passed/空失败仅来自 Q27 定向运行。保持 Q44 仅 `parallel-5 / split-6` 且 `needs-review`，不得修改 `408-user` schema v1/v2/v3，删除旧图片、测试或旧 `cpu-explorer`，提交、推送或部署；既有 P2 继续只报告不修。

## 2026-08-31 - Q38 TCP 累计确认实验垂直切片

### 来源审计与边界

- 按原有“更广的四科实验”路线审计剩余候选后选择 Q38。题面给出已建立 TCP 连接、首段序列号 `200`、两个连续 payload `300 B` 与 `500 B`，接收方正确收到两段；在 TCP 基本累计确认语义下，两个范围为 `[200, 500)` 与 `[500, 1000)`，下一个期望字节序号为 `ACK 1000`。该推导只使用来源明确给出的连续、按序、无丢失条件，题包仍保持 `needs-review`。
- 当前题包解析把普通累计 ACK 的说明写成“选择确认”。页面显式保留这一待人工复核问题，并采用标准“ACK 字段表示下一个期望序列号”的教学语义；不改写题包，不将该实验扩展为 SACK、窗口、丢包、重传或序列号回绕模拟。
- 自定义输入只接受首段序列号和恰好两个正 payload，限制在非回绕的 32 位序列空间与可视化上限内；无效输入 fail closed，不写入持久化数据，也不新增 schema 字段。

### 红绿与实现

- 先新增 `packages/lab-core/src/tcp-cumulative-ack.test.ts`，缺少实现时得到预期 `1 failed / 0 tests`；随后实现 `traceTcpCumulativeAck`、五步不可变 trace、Q38 预设、连续区间和严格输入校验，并从 `packages/lab-core/src/index.ts` 导出。
- 新增 `apps/web/src/pages/TcpCumulativeAckLabPage.tsx` 与页面合同，接入 `NetworkLabRouterPage`、`NetworkModuleTabs`、`questionLabLink`。canonical URL 为 `/lab/network?module=tcp-ack&preset=cn408-2009-q38`；自定义 URL 使用 `firstSequence`、`firstLength`、`secondLength`，支持恢复预设、StepExplorer、Q38 练习和知识节点双向深链。
- 网络实验导航由五个扩为六个模块，并同步既有 Q34/Q37、协议实验和系统实验中的导航数量合同；未改变其他实验的计算语义。

### 验证证据

- 聚焦 Vitest：`6 files / 67 tests passed`，覆盖核心、页面、路由、深链以及受导航影响的 Q34/Q37 合同。
- `npm run lint` 与 `npm run typecheck` 全仓通过（Web、content-schema、cpu-core、domain、lab-core、storage）。
- production build 通过：`1911 modules transformed`、`198 static-copy`、PWA `87 entries`。
- Playwright CLI 临时预览端口 `4366` 的真实检查覆盖 1440、1366、390 三个视口：预设 `ACK 1000`、自定义 `ACK 20`、非法 payload 的 fail-closed、步骤推进、练习入口、知识节点回链和横向溢出核对均通过；截图保存在 `output/playwright/screenshots/chromium-1440-tcp-ack-q38.png`、`chromium-390-tcp-ack-q38.png` 与 `chromium-390-tcp-ack-q38-bottom.png`，端口和浏览器会话已释放。知识页出现的唯一 warning 是既有自定义滚轮敏感度提示，无 console error。
- 本轮未重跑全仓 Vitest、release、content 或默认全量 E2E。最近一次默认全量仍为 `187/189 passed`，两项冷启动/actionability 失败不能写成全绿；本次定向检查不覆盖该全量事实。独立 P0/P1 复审为 `0`。

### 保留事项

- 正式人工复核仍为 `0/47`，Q38 和题包保持 `needs-review`；自动测试、RFC 语义核对、截图和浏览器检查不等同逐题人工审核。
- 未修改 `408-user` schema v1/v2/v3、Q44 的 `parallel-5 / split-6` 边界或题包解析，未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续按约定只报告不修。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`，以 2026-08-31 Q38 收尾段为准。Q38 TCP 累计确认实验已完成核心/Web/路由/深链切片：红灯 `1 failed / 0 tests`，聚焦 Vitest `6 files / 67 tests`，lint、相关 typecheck、build `1911/198/87` 通过，真实浏览器 CLI 三视口检查通过；Q38 与题包仍为 `needs-review`，页面只重放两个连续、按序、无丢失 payload，范围 `[SEQ, SEQ + length)`，累计 ACK 表示下一个期望字节序号，不模拟 SACK、窗口、丢包、重传或回绕。默认全量 E2E 最新完整事实仍为 `187/189 passed`、2 项冷启动失败，`.last-run.json` 只代表最近一次定向运行，不要声称全绿或无界重跑。保持 Q44 仅 `parallel-5 / split-6`，不得修改 `408-user` schema v1/v2/v3、删除旧图片/测试/旧 `cpu-explorer`，提交、推送或部署；既有 P2 继续只报告不修。

## 2026-08-31 - Q24 高响应比调度实验立项

- 按用户授权继续扩充四科实验，先对照原卷、正式解析、题包和 `local-data/work/ocr/answers.json`。四份材料一致支持 Q24 的概念结论：高响应比优先同时考虑等待时间和执行时间，`R=(等待时间+执行时间)/执行时间`，答案 D；原题没有给出进程到达时间、执行时间或完整调度序列。
- 因此本项不声称重放 2009 的真实进程轨迹。页面将来源概念与“通用教学示例”分栏，示例进程由用户编辑；核心只实现受限的非抢占 HRRN 计算、CPU 空闲间隔、候选响应比和确定性 tie-break，不新增题包内容、持久化字段或 schema。
- 计划先新增 `packages/lab-core/src/hrrn-scheduling.test.ts` 形成缺模块红灯，再实现核心、OS 第七模块、Q24/知识双向深链，最后做少量定向 Vitest、lint/typecheck、build 和真实 Chrome 三视口检查；不重跑默认全量 E2E。

## 2026-08-31 - Q24 高响应比调度实验收口

### 来源边界与实现

- 原卷、正式解析、题包和 OCR 交叉材料只支持 Q24 的概念结论：答案 D，高响应比优先同时考虑等待时间和执行时间，`R=(等待时间+执行时间)/执行时间`。来源没有进程到达时间、服务时间或完整调度轨迹，因此页面把 Q24 来源结论与可编辑的通用教学示例明确分栏，不把示例写成 2009 真题重放。
- 新增 `packages/lab-core/src/hrrn-scheduling.ts` 与 `hrrn-scheduling.test.ts`，实现有限进程表、非抢占式 HRRN、就绪队列响应比、CPU 空闲区间、稳定 tie-break、不可变 trace 和严格输入边界；由 `packages/lab-core/src/index.ts` 导出。未新增题包内容、持久化字段或 schema。
- 新增 `apps/web/src/pages/HrrnSchedulingLabPage.tsx` 与页面合同，接入 `OsLabRouterPage`、`OsModuleTabs` 第七模块和 `questionLabLink`。canonical URL 为 `/lab/os-memory?module=hrrn&preset=cn408-2009-q24`；自定义 `jobs` URL 可恢复编辑进程表，支持恢复示例、StepExplorer、Q24 Practice 和 Knowledge 双向深链。

### 红绿与验证

- 核心缺模块红灯为 `1 failed / 0 tests`；页面缺失红灯为 `1 failed / 0 tests`。修复后核心、页面、路由、深链及受 OS 导航影响的既有合同共 `8 files / 85 tests passed`。
- `npm run lint` 与 `npm run typecheck` 全仓通过；production build 通过，`1913 modules transformed`、`198 static-copy`。本轮没有重跑全仓 Vitest、release、content 或默认全量 E2E。
- Playwright CLI 临时开发端口 `4367` 的真实检查覆盖 1440、1366、390 三视口：Q24 来源结论 D、预设调度顺序 `P1 → P3 → P4 → P2`、自定义 CPU 空闲 4 个时间单位和稳定同到达 tie-break、非法执行时间 fail closed、步骤推进、Practice 入口、Knowledge 回链及无横向溢出均通过。页面自身无 console error；知识图出现的 warning 是既有 Cytoscape 自定义滚轮敏感度提示。
- 独立源码 P0/P1 复审为 `0`：HRRN 只读取 URL/内存中的受限教学输入，不触碰 schema 或个人数据；错误输入不显示旧调度结果，Practice 仍走现有会话事务。既有 P2（Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement）继续只报告不修。

### 保留事项

- 正式人工复核仍为 `0/47`，题包和 Q24 继续 `needs-review`。自动测试、来源交叉核对、截图和浏览器检查不等同逐题人工审核。
- 默认 `8 workers / 3 projects` 全量 E2E 的最新完整事实仍为 `187/189 passed`，两个冷启动/actionability 失败不能写成全绿；本轮没有再次无界重跑。定向运行产生的 `.last-run.json`（若被覆盖）不代表全量结果。
- 未修改 `408-user` schema v1/v2/v3、Q44 的 `parallel-5 / split-6` 边界、旧题包或来源图片；未删除旧图片、测试或旧 `cpu-explorer`，未提交、推送或部署。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`，从 2026-08-31 Q24 高响应比调度实验收口检查点开始，不要从头重做。先完整读取项目 `AGENTS.md`、`HANDOFF.md`、`notes.md` 和 `README.md`。当前事实：Q24 已完成核心/Web/OS 第七模块/路由/深链，聚焦 Vitest `8 files / 85 tests passed`，全仓 lint/typecheck 和 build `1913/198` 通过，真实 Chrome CLI 1440/1366/390 通过且无横向溢出；Q24 与题包仍为 `needs-review`，页面只展示来源概念和明确标注的通用教学示例，不冒充 2009 真题轨迹。默认全量 E2E 最新完整结果仍为 `187/189 passed`、2 项冷启动/actionability 失败，不要声称全绿或无界重跑。保持 Q44 仅 `parallel-5 / split-6`，不得修改 `408-user` schema v1/v2/v3，删除旧图片/测试/旧 `cpu-explorer`，提交、推送或部署；既有 P2 继续只报告不修。若继续扩充网站，先做来源审计和确定性红灯，再做最小垂直切片、定向验证和独立 P0/P1 复审。

## 2026-08-31 - Q20 总线带宽实验立项

- 只读核对原卷渲染图 `local-data/work/render/questions-3.png`、解析渲染图 `local-data/work/render/answers-04.png`、`local-data/generated/2009.pack.json`、`local-data/work/ocr/answers.json` 和 `local-data/sources/2009-crosscheck.md`：Q20 明确给出每总线周期并行传输 `4 B`、占用 `2` 个时钟周期、总线时钟 `10 MHz`，答案为 B（`20 MB/s`）。解析给出 `1 MHz` 时钟周期 `0.1 μs`、总线周期 `0.2 μs`，因此 `4 B / 0.2 μs = 20 MB/s`。
- 立项边界为“来源公式 + 可编辑单位换算教学示例”，不声称模拟真实总线事务。页面只计算周期时长、每秒总线周期数、字节/秒和 bit/秒；明确采用十进制 `MHz`/`MB`，且不建模等待状态、突发重叠、仲裁、编码或协议开销。
- 输入限制为正整数传输字节数/时钟周期数与有限正总线频率，推导结果必须有限；无效输入 fail closed，不新增题包内容、持久化字段或 `408-user` schema 变更。Q20 与题包继续 `needs-review`，来源核对不等同人工审核。
- 下一步先新增 `packages/cpu-core/src/bus-bandwidth.test.ts` 形成缺模块红灯，再实现核心、CPU 第 11 个模块、Q20 真题/知识双向深链；按用户“减少测试”约束只做核心/页面/受影响合同定向验证与真实 Chrome 三视口检查，不重跑默认全量 E2E。

## 2026-08-31 - Q20 总线带宽实验收口

### 实现与边界

- 先在 `packages/cpu-core/src/bus-bandwidth.test.ts` 建立缺模块红灯（`1 failed / 0 tests`），再实现 `analyzeBusBandwidth`、Q20 预设和不可变七步推导，并从 `cpu-core` 公共入口导出。输入只接受受限的正整数传输字节数/时钟数和有限正总线频率；非法或派生算术溢出时 fail closed，不保留旧结果。
- Web 接入 CPU 第 11 个实验模块，canonical URL 为 `/lab?module=bus-bandwidth&preset=cn408-2009-q20`；支持 `bytes`、`clocks`、`frequency` 自定义参数、StepExplorer、预设恢复、Q20 真题入口和知识节点双向深链。页面明确十进制 `MHz/MB` 约定、`20 MB/s = 160 Mbit/s` 结果，以及“来源公式与可编辑教学示例，不是总线事务时序重放”的边界。
- 未修改题包、审核状态、`408-user` schema v1/v2/v3、旧图片、旧测试或旧 `cpu-explorer`；Q20 与题包继续 `needs-review`，不把自动校验或浏览器检查当作人工审核。

### 验证证据

- 核心、页面、CPU 路由和实验入口聚焦 Vitest 为 `4 files / 71 tests passed`；全仓 `npm run lint` 与 `npm run typecheck` 通过。production build 通过，产物为 `1915 modules transformed`、`198 static-copy`、PWA `87 entries (2734.82 KiB)`。
- Playwright CLI 在临时端口 `4370` 使用现有 Chrome 完成 1440、1366、390 三视口检查：预设结果、自定义 `8/4/25` 得到 `50 MB/s`、零值错误恢复、七步推进、预设恢复、Q20 练习入口打开第 20 题、知识节点往返和横向溢出检查均通过；三视口 `bodyWidth === clientWidth`，控制台 `0 errors`。截图保存在 `output/playwright/screenshots/chromium-1440-bus-bandwidth-q20.png`、`chromium-1366-bus-bandwidth-q20.png`、`chromium-390-bus-bandwidth-q20.png` 及移动端底部截图。
- 本轮按“减少测试”约束未重跑全仓 Vitest、release、content 或默认全量 E2E。最近一次默认全量仍为 `187/189 passed`，失败为已知 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树冷启动/actionability 超时；本轮 `.last-run.json` 不作为全量证据。独立 P0/P1 复审为 `0`，既有 Questions 科目筛选、Practice 掌握度、StepExplorer/VirtualMemory 播放语义、Cache timeline、全局 loading/route announcement 继续只报告不修。

### 下一检查点

- 继续工作前先对剩余未接实验深链题目做只读来源审计；没有新的明确 P0/P1 时不修既有 P2。若授权新的语义增强，仍须先写确定性红灯、最小实现、定向验证和独立 P0/P1 复审。不得提交、推送或部署。

## 2026-08-31 - Q36 以太网交换机转发实验立项

### 来源审计与边界

- 原卷、正式解析、当前题包和 `local-data/sources/2009-crosscheck.md` 对 Q36 的结论一致：以太网交换机工作在数据链路层，转发决策使用目的物理地址，答案 A。来源没有给出具体交换机拓扑、MAC 地址表、端口状态或未知单播处理过程。
- 本项只做“来源结论 + 通用教学示例”：允许编辑一个有限的目的 MAC 和静态转发表，逐步展示规范化、精确目的地址匹配和选定出口端口；未命中只报告“本示例没有匹配项”，不模拟泛洪、学习、VLAN、生成树、速率或真实帧转发时序，不把示例称为 2009 真题重放。
- 输入只存在 URL 与内存状态，严格限制 MAC 格式、表项数量和端口文本；错误时 fail closed，不新增题包、持久化字段或 `408-user` schema，Q36 与题包继续 `needs-review`。

### 执行顺序

- 先新增 `packages/lab-core/src/switch-forwarding.test.ts`，在实现缺失时保留确定性导入红灯；再实现最小不可变转发表匹配 trace，接入网络第 7 模块、Q36 真题/知识双向深链和响应式页面。
- 按“减少测试”约束只跑核心/页面/受影响导航定向验证、lint/typecheck/build 和 1440/1366/390 真实 Chrome；不重跑默认全量 E2E。默认全量最新完整事实仍为 `187/189 passed`，不作全绿声明。

## 2026-09-01 - 公开仓库封板与 code-only 模式收口

### 实现与边界

- 公开显示名已由“研径 408”更新为 `BitAtlas`，并集中在 `apps/web/src/app/brand.ts`。应用壳、HTML、PWA manifest、备份文件名和复核 ledger 文件名使用独立品牌；`@408os/*` workspace、`408-user`、`408-content`、缓存键与目录名不改，以免破坏兼容合同。
- 公开仓库不提交 `local-data/` 或 `apps/web/public/content/`。启动时若 `/content/2009.json` 明确返回 HTTP 缺失，`StudyProvider` 进入空内容模式；总览/真题/复核展示空状态，练习动作禁用，实验室和本地工具保持可用。真实网络拒绝、无效 JSON、内容校验与存储错误不会被伪装成“未安装”。
- 新增 `docs/ARCHITECTURE.md`、`docs/LOCAL_CONTENT.md`、`docs/RELEASE.md`，整理 README/AGENTS/content importer 说明，并把 `.playwright-cli/`、`graphify-out/`、整个 `output/` 和 `.codex/` 纳入忽略边界。没有删除任何本地资料、旧图片、测试或旧 `cpu-explorer`。
- 新增 `tests/e2e/code-only-mode.spec.ts`，只覆盖公开克隆关键合同；没有扩展为重复全站测试。Q44 仍仅 `parallel-5 / split-6` 且 `needs-review`，`408-user` schema v1/v2/v3 未修改。

### 红绿与验证

- 存储红灯证明旧实现会把 `TypeError('network unavailable')` 错误转成 `LocalContentUnavailableError`；修复后只让显式 HTTP 缺失降级，意外网络错误保留原错误。相关定向 Vitest 为 `5 files / 42 tests passed`。
- code-only E2E 首轮因测试写错 CPU 页面标题为 `3 failed`；快照证明无题包启动、复核空状态和 `/lab` 跳转均已通过。选择器改为真实标题后，1440/1366/390 三视口 `3/3 passed`。
- 全仓门禁：lint 通过；全部 workspace typecheck 通过；production build `1920 modules / 198 static-copy / 87 PWA entries (2770.12 KiB)`；release `10/10`；content `47 questions / 19 assets` 且 `needs-review; verified 0/47`。
- 首次并行全仓 Vitest 为 `96 files passed / 1 failed`、`1089/1090 tests`。唯一失败是 Q36 页面测试仍硬编码网络导航 7 项，而 Q40 已把导航扩为 8 项；相邻网络页面合同均为 8。只修正过期计数后定向 `5/5`，单独重跑全仓得到 `97 files / 1090 tests passed`。
- 本轮没有重跑默认 189 项全量 E2E。其最新完整事实仍为 `187/189 passed`，两项为已知 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树并发冷启动/actionability 超时；定向 `.last-run.json` 不覆盖该事实。

### 公开发布待决策

- 当前目录没有 `.git`。`gh auth status` 确认登录 `AbyssWhalen`；当前仓库列表没有 BitAtlas 或 `bitatlas-study`。`cpu-explorer` 必须保持原状，不能据“替换原项目”猜测为目标。
- 可提交树排除生成/私有目录后没有发现密钥模式或异常大文件。仓库尚无 `LICENSE`；许可证、远端目标、可见性、slug、历史保留策略都需要用户明确选择。
- 新增 `.gitattributes` 固定跨平台换行与二进制类型；根 package/lockfile 同步声明 Node `^20.19.0 || >=22.12.0`。`npm install --package-lock-only --ignore-scripts --offline` 通过，审计 584 个包、`0 vulnerabilities`；7 份公开说明的相对链接核对通过。
- 只读远端审计确认 `AbyssWhalen/cpu-explorer` 是公开仓库、无 LICENSE、默认 `main` 未保护，当前由 active 的 `.github/workflows/deploy.yml` 发布到 `https://abysswhalen.github.io/cpu-explorer/`，无 GitHub Releases。覆盖它会删除/替换旧文件、改变 CI 并替换现有公开站点；除非用户明确点名并覆盖此前“保留 cpu-explorer”边界，不得以它为目标。
- 旧 workflow 上传根 `dist`，新产物为 `apps/web/dist`；当前 `createBrowserRouter` 无 `basename`，PWA `id/scope/start_url` 为 `/`。因此直接复用 workflow 部署到 `/cpu-explorer/` 会破坏路由/PWA。上传仓库与替换 Pages 站点必须分别授权；若要部署，先写项目子路径红灯并做最小适配、三视口真实浏览器与 CI 验证。
- 在上述选择与最终红线确认前，不执行 `git init`、commit、远端创建、push 或公开发布。

### 下一对话开场 prompt

继续 `D:\CodexProject\personal-projects\408OS`，从 2026-09-01 BitAtlas 品牌收口检查点开始，不要从头重做。公开显示名 `BitAtlas`、新 atlas-route 图标和 code-only 无题包模式已收口；最新窄验证结果见文末品牌收口段。默认全量 E2E 最新完整事实仍为 `187/189 passed`，不要声称全绿或无界重跑。

下一步只需向用户确认 GitHub 目标仓库/是否新建、public/private、代码许可证、是否保留原历史；推荐新仓库 slug `bitatlas-study`。在执行 commit/push/公开发布前再次明确说明影响并取得授权。不得把 `cpu-explorer` 当成替换目标，不得提交 `local-data/`、`apps/web/public/content/`、`output/` 或其他私有/生成内容；保持 Q44 与 schema 边界不变。

## 2026-09-01 - Q40 FTP 控制连接实验收口

### 实现与边界

- 核心先保留缺模块红灯 `1 failed / 0 tests`，再实现 `traceFtpConnections`、Q40 预设、控制/数据两条独立连接快照和五步不可变 trace，并从 `lab-core` 公共入口导出。运行时只接受 `control` 或 `data`；控制连接固定为当前来源基础模型的 TCP/21 与 FTP 命令，数据连接固定为 TCP/20 与文件数据，非法通道 fail closed。
- Web 接入网络第 8 个模块，canonical URL 为 `/lab/network?module=ftp-control&preset=cn408-2009-q40`；支持 `channel` 自定义 URL、控制/数据双卡对照、五步 StepExplorer、预设恢复、Q40 Practice 入口和 Knowledge 双向深链。桌面导航为 8 列，移动端为 4 x 2，三视口无页面横向溢出。
- 页面明确这是来源支持的 2009 基础模型，不覆盖主动/被动模式协商、动态数据端口、TLS、NAT、重传或真实网络时序。未修改题包、审核状态、`408-user` schema v1/v2/v3、旧图片、旧测试或旧 `cpu-explorer`。

### 验证证据

- 页面缺失红灯同样为 `1 failed / 0 tests`；修复后核心、页面、网络路由、受影响导航和实验入口聚焦 Vitest 为 `7 files / 87 tests passed`。全仓 `npm run lint` 与 `npm run typecheck` 通过；production build 为 `1919 modules transformed`、`198 static-copy`、PWA `87 entries (2766.47 KiB)`。
- Playwright CLI 临时端口 `4372` 使用现有 Chrome 完成 1440、1366、390 三视口：Q40 控制连接 `TCP/21`、数据连接 `TCP/20`、非法 `channel=udp` fail closed 与预设恢复、五步推进、Practice 第 40 题、Knowledge Q40 往返和横向溢出检查均通过；控制台 `0 errors`，两条 warning 为既有 Knowledge/Cytoscape 滚轮敏感度提示。截图在 `output/playwright/q40/chromium-1440-ftp-control-q40.png`、`chromium-1366-ftp-control-q40.png`、`chromium-390-ftp-control-q40.png`。
- 端口 `4360/4361/4362/4370/4371/4372` 当前均无监听。独立 P0/P1 复审为 `0`：Q40 只读取受限 URL/内存状态，错误输入不展示旧 trace，Practice 继续使用现有会话事务，没有新增持久化或 schema 写入。
- 本轮按“减少测试”约束未重跑默认全仓 Vitest、release、content 或默认全量 E2E。最近一次默认全量仍为 `187/189 passed`；当前 `.last-run.json` 的 `passed/空失败` 只代表定向运行，不能覆盖全量失败事实。正式人工复核仍为 `0/47`，Q40 与题包继续 `needs-review`，既有 P2 继续只报告不修。

### 下一检查点

- Q40 已收口。继续扩充前先对剩余 13 道未接实验深链题做只读来源审计；下一项仍必须有来源支持的确定性教学切片，不补造题意或任意评分器。不得提交、推送或部署。

## 2026-09-01 - Q36 以太网交换机转发实验收口

### 实现与边界

- 核心缺模块红灯为 `1 failed / 0 tests`，随后实现 `traceSwitchForwarding`、Q36 预设、MAC 规范化、有限静态转发表精确查找、命中/未命中 trace、不可变快照和严格输入边界，并从 `lab-core` 公共入口导出。转发表最多 8 项，MAC 必须为六组十六进制字节，端口只接受有限 ASCII 标识；重复地址、坏格式和超限输入均拒绝。
- Web 接入网络第 7 个实验模块，canonical URL 为 `/lab/network?module=switch-forwarding&preset=cn408-2009-q36`；支持 `destination` 与 `table` URL 参数、五步 StepExplorer、错误 fail closed、预设恢复、Q36 Practice 入口和 Knowledge 双向深链。桌面导航改为 7 列，移动端最后模块独占一行，保持无横向溢出。
- 来源只支持“交换机工作在数据链路层、按目的物理地址转发决策”。静态转发表、端口和命中结果是明确标注的通用教学示例；未命中不推断泛洪或学习。未修改题包、审核状态、`408-user` schema v1/v2/v3、旧图片、旧测试或旧 `cpu-explorer`。

### 验证证据

- 核心、页面、网络路由、受影响导航和入口聚焦 Vitest：`8 files / 89 tests passed`；全仓 `npm run lint`、`npm run typecheck` 通过。production build 通过，产物为 `1917 modules transformed`、`198 static-copy`、PWA `87 entries (2751.85 KiB)`。
- Playwright CLI 临时端口 `4371` 使用现有 Chrome 完成 1440、1366、390 三视口：Q36 命中 `P3`、自定义未命中、坏表 fail closed、五步推进、预设恢复、Practice 第 36 题、Knowledge 往返和横向溢出检查均通过；三视口 `bodyWidth === clientWidth`，控制台 `0 errors`。截图：`output/playwright/screenshots/chromium-1440-switch-forwarding-q36.png`、`chromium-1366-switch-forwarding-q36.png`、`chromium-390-switch-forwarding-q36.png`。
- 本轮按“减少测试”约束未重跑全仓 Vitest、release、content 或默认全量 E2E。最近一次默认全量仍为 `187/189 passed`，已知失败为 chromium-1440 CSMA/CD 与 chromium-1366 完全二叉树冷启动/actionability 超时；本轮定向运行不覆盖该事实。独立 P0/P1 复审为 `0`，既有 P2 继续只报告不修。

### 下一检查点

- 继续前先对剩余未接实验深链候选做只读来源审计，再决定是否立项；若授权新的语义增强，仍须先写确定性红灯、最小实现、定向验证和独立 P0/P1 复审。Q36 与题包保持 `needs-review`，正式人工复核仍为 `0/47`，不得提交、推送或部署。

## 2026-09-01 - Q40 FTP 控制连接实验立项

### 来源审计与边界

- 原卷、解析渲染图 `local-data/work/render/answers-07.png`、当前题包和 `local-data/sources/2009-crosscheck.md` 一致支持 Q40 答案 A：FTP 基于 TCP，FTP 命令走独立的控制连接；当前解析还给出基础模型端口 21（控制）与 20（数据）。
- 本项只重放来源明确的基础双连接模型：在一条有限时间线上选择“发送 FTP 命令”或“传输文件数据”，分别显示 TCP 控制/数据连接、用途与题设端口。页面会明确这是 2009 基础模型示例，不覆盖主动/被动模式协商、动态数据端口、TLS、NAT 或真实网络时序。
- 状态只在 URL 与内存中流转，输入限于两个来源支持的通道选项；错误时 fail closed，不新增题包、持久化字段或 `408-user` schema，Q40 与题包继续 `needs-review`。

### 执行顺序

- 先新增 `packages/lab-core/src/ftp-control-connection.test.ts`，在实现缺失时保留确定性导入红灯；再实现最小不可变双连接 trace，接入网络第 8 模块、Q40 真题/知识双向深链和响应式页面。
- 按“减少测试”约束只跑核心/页面/受影响导航定向验证、lint/typecheck/build 和 1440/1366/390 真实 Chrome；不重跑默认全量 E2E。默认全量最新完整事实仍为 `187/189 passed`，不作全绿声明。

## 2026-09-01 - BitAtlas 品牌与图标收口

### 决策与实现

- 用户最终确认公开英文名为 `BitAtlas`。公开品牌常量、HTML 标题/描述、PWA manifest、应用侧栏、备份下载前缀和内容复核 ledger 前缀均已同步；内部 `408OS` 目录、`@408os/*` workspace、`408-user`、`408-content` 和缓存键继续作为兼容标识，不做破坏性迁移。
- 新图标采用无文字的 atlas-route 标记：深绿底、浅色折页地图、珊瑚色路线、琥珀色起点和珊瑚色终点。`favicon.svg` 保留圆角外形；`pwa-192.png` 与 `pwa-512.png` 从同一 SVG 派生为全幅深色底，满足 `maskable` 裁切且避免安装图标白边。
- README、项目 AGENTS 和发布说明的当前品牌已更新。GitHub 存在活跃的无关项目 `bitatlas-group/bitatlas`，因此只把 `BitAtlas` 作为显示品牌，当前建议新仓库 slug 为 `bitatlas-study`；远端目标仍未授权或创建。

### 红绿与有限验证

- 先把 `apps/web/src/app/brand.test.ts` 改为 `BitAtlas` 合同，旧实现确定性失败：品牌常量仍为“研径 408”，静态 HTML 仍包含旧名称。最小实现后，品牌、Settings 备份和 ContentReview 导出定向 Vitest 为 `3 files / 14 tests passed`。
- 相关 ESLint 通过；全部 workspace `typecheck` 通过。production build 为 `1920 modules transformed`、`198 static-copy`、PWA `87 entries (2779.47 KiB)`；构建产物的 title、description、manifest name/short_name 均为 `BitAtlas`，PWA PNG 实测为 `192x192` 与 `512x512`。
- `tests/e2e/code-only-mode.spec.ts` 新增品牌文字与 SVG 实际加载合同；复用固定 preview 的 Chrome 1440/1366/390 三视口为 `3/3 passed`。人工检查 `output/playwright/brand/bitatlas-brand-block-1440.png`、`bitatlas-dashboard-1440.png` 和 `apps/web/public/pwa-512.png`，未发现图标模糊、文字挤压或布局重叠。
- 本轮按减少测试约束没有重跑全仓 Vitest、release、content 或默认 189 项全量 E2E。默认全量最新完整事实仍为 `187/189 passed`，两个并发冷启动/actionability 失败不能写成全绿；当前定向 `.last-run.json` 不覆盖该事实。
- 变更范围独立复审 P0/P1 为 `0`：备份只改下载文件名前缀，图标和显示名不参与导入校验、IndexedDB 或题目语义。未修改 Q44 的 `parallel-5 / split-6` 与 `needs-review` 边界、`408-user` schema v1/v2/v3、旧图片、旧测试或旧 `cpu-explorer`；未提交、推送或部署。

## 2026-09-02 - 自定义域名接入（已完成）

- 已在 Cloudflare `fytjut.com` 区域新增 `408.fytjut.com CNAME abysswhalen.github.io`，代理状态为“仅 DNS”，TTL 自动；Cloudflare 表格回读与公共 `Resolve-DnsName` 均确认 CNAME 生效，公共 TTL 为 `300`。
- GitHub Pages 当前托管公开仓库 `AbyssWhalen/bitatlas`，最终提交 `f15eea0` 对应 Actions run `33574067291` 已成功。Pages API 已接受 `cname: 408.fytjut.com`；证书状态为 `approved`，有效期至 `2026-11-30`，并已启用 `https_enforced: true`。正式地址为 `https://408.fytjut.com/`。
- 首次 Actions 日志确认部署产物为 `1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`，并暴露 workflow 的 Node 20 与锁定依赖引擎不一致；根 engine、公开文档和 workflow 已统一为 Node 22（`^22.20.0 || >=24.12.0`）。
- 最终 Actions run `33574067291` 在 Node `22.23.2` 下成功构建和部署，产物仍为 `1920 modules / 198 static-copy / 88 PWA entries (2780.31 KiB)`；三项 `EBADENGINE` 与旧 action Node 20 runtime 提示均已消失。workflow 现使用 `checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`；部署动作日志仍有其依赖触发的 `punycode` 弃用提示，但不影响成功结果。
- 初步线上检查已通过根路径、`/lab`、`/knowledge`、Q34 网络与 Q24 OS 深链接；390px 首页和 Q34 页面均无横向溢出或遮挡。manifest、favicon、`registerSW.js`、`sw.js`、192/512 图标均为 HTTP 200；浏览器没有 console error，Knowledge 仅保留既有 Cytoscape wheel sensitivity warning。
- 公开仓库、远端、commit、push 与 Pages 部署均已完成；旧 `cpu-explorer` 历史通过 merge 保留，未恢复旧站点或 iframe。仓库仍没有 `LICENSE`，公开访问不等于源码再分发授权。
- 本步骤没有修改题库、实验语义、`408-user` schema v1/v2/v3、Q44 边界或私有内容，也没有重跑默认 189 项全量 E2E。其最新完整事实仍为 `187/189 passed`，不能声称全绿。

## 2026-09-02 - 线上题包私有分发方案（本地就绪，待部署授权）

### 背景与结论

- 线上站 `408.fytjut.com` 当前 `/content/2009.json` 为 404，应用按设计进入无题包空状态；题包安装只认同源 `/content/` 路径，数据页 Verified 导入也要求同源资产，因此在不提交版权内容的前提下，线上刷题必须在同源路径上提供私有内容服务。
- 方案定为 Cloudflare Worker 接管 `408.fytjut.com/content/*`：cookie 门禁（`/content/auth?token=<TOKEN>` 种一年期 HttpOnly cookie）+ 私有 R2 桶存放草稿题包与 19 张来源页 PNG；无 cookie 一律 404（应用进入既有空状态），R2 意外故障返回 500（应用 fail closed），未绕过 `/mock` 的 verified 门禁。
- 全部工具落在被忽略的 `local-data/deploy/`：`worker/src/worker.js`（生产 Worker）、`worker/wrangler.toml`、`upload-content.mjs`（上传 20 对象并逐个 SHA-256 校验）、`local-preview.mjs`（本地组合验证服务器）、`verify-flow.spec.ts`（真实 Chrome 全链路检查）、`README.md`（部署/验证/回滚手册）。公开仓库零改动，工作树无可提交差异。

### 验证证据

- Worker 逻辑 `node --test worker.test.mjs`：10/10 通过（cookie 门禁、auth 404/302、JSON/PNG Content-Type、缺对象 404、R2 异常 500、路径穿越拒绝、HEAD、未配置 token 全 404、非 GET/HEAD 404）。
- `npm run content:validate` 通过：`cn408-2009` 47 题（40 客观 + 7 综合），`needs-review; verified 0/47`。
- `npm run build` 通过（88 PWA entries）；`local-preview.mjs` 以内存 R2 + 生产 dist 复现同源门禁后，真实 Chrome（channel=chrome，SW 屏蔽）6/6 通过：无 cookie 空状态、auth 授权后 47 题安装、Q1 作答提交+解析+来源页双图加载（`/content/cn408-2009/source/*.png`）、刷新恢复练习、`/mock` 显示"尚未完成 47 题人工复核"（needs-review）、无 cookie 新上下文保持空状态。截图在 `output/playwright/verify-content-gate/`。
- 已知 IAB 内嵌浏览器会丢弃 302 的 Set-Cookie（本地 http 预览现象）；`local-preview.mjs` 有仅预览用的去 Secure shim，生产 HTTPS 不受影响，真实 Chrome 行为正确。

### 待授权事项（均未执行）

- 需要 Cloudflare API Token（Workers Scripts Edit、Workers R2 Storage Edit、fytjut.com 的 Workers Routes Edit；如代切 DNS 代理另需 DNS Edit）或由用户按 `local-data/deploy/README.md` 手动操作。
- 部署动作：创建 R2 桶 `bitatlas-content`、上传题包、`wrangler deploy` + `secret put CONTENT_TOKEN`、把 `408` CNAME 切为已代理；切换前必须确认区域 SSL/TLS 为 Full (strict)（或对 408.fytjut.com 用 Configuration Rule 覆盖），否则代理 GitHub Pages 会重定向循环。
- 部署后需按 README 完成 curl 三态检查（404/302/200）与桌面+390px 真实浏览器验收；回滚为 DNS 切回仅 DNS。
- 本方案安装 needs-review 草稿题包，刷题/复习/统计可用；`/mock` 仍需 47/47 人工复核 ledger 走 `npm run release:2009` 后从数据页导入 verified 包，该门禁未改变。

## 2026-09-02 - 2009 题包随仓库公开发布（用户授权，替代 Cloudflare 方案）

### 决策

- 用户在“题库与来源页图将永久公开、任何人可下载”的明确提示下，选择把 2009 题包提交进公开仓库，放弃 Cloudflare Worker 私有分发部署（该方案工具保留在被忽略的 `local-data/deploy/`，未提交，可随时重启）。
- 追踪范围仅限当前题包引用的 `apps/web/public/content/2009.json`（140KB）与 `apps/web/public/content/cn408-2009/source/`（19 张 PNG，约 9.6MB）；legacy `content/2009/` 命名空间继续忽略。`.gitignore` 已相应收窄。
- 边界文档同步改写：AGENTS.md（定位段 + 数据约束条目）、README（题包发布模式/在线访问/验证）、docs/RELEASE.md（必须排除 + 新增发布记录）、docs/LOCAL_CONTENT.md（简介 + 提交边界）。规则：后续年份题包公开前须逐次授权。
- 题包审核状态保持 `needs-review; verified 0/47`；`/mock` verified 门禁不变；`tests/e2e/code-only-mode.spec.ts` 无需修改（本就以路由拦截模拟无题包部署）。

### 提交前门禁

- `npm run content:validate` 通过（47 题 / 19 资产，needs-review）。
- 提交前按 RELEASE 清单执行 `git status --ignored --short`、`git ls-files local-data output tmp`、密钥模式 grep 与 staged diff 人工复核。
- 线上验收（部署完成后补记）：见下一段。

### 线上验收（2026-09-02）

- 提交 `66f2324` 推送后，Actions run `33580225575` 构建并部署成功。
- curl：`/content/2009.json`、`/content/cn408-2009/source/questions-1.png` 均为 200。
- 真实 Chrome（channel=chrome，SW 屏蔽）线上验收 8/8 通过：桌面 1440 真题页 47 题、Q1 作答提交判定正确（选 B 队列）、来源解析展示、原卷/解析扫描图从 `/content/cn408-2009/` 加载成功、刷新后练习恢复、`/mock` 保持“尚未完成 47 题人工复核”关闭态；移动 390 真题页 47 题、无横向溢出、Q2 练习可用；全程无资源级 4xx/5xx、无 pageerror。
- 已知既有现象（与本次改动无关）：GitHub Pages 对应用深链接文档本身返回 HTTP 404 并以 `apps/web/public/404.html` 回退进 SPA（`/lab` 等老路由同样如此，RELEASE.md 已文档化）；直接输入深链接时控制台会出现一条该文档 404 提示，应用正常渲染。
- 截图：`output/playwright/verify-live-pack/`。题包现为公开可下载内容（用户已知情并授权）；`needs-review; verified 0/47` 状态未变。

### 下一检查点

- 2009 刷题闭环已在线上可用。下一步自然候选：在站内 `/review/2009` 推进 47/47 人工复核以解锁 `/mock`；或开始 2010 题包导入（新增年份首次公开须逐次授权）。Cloudflare 私有分发工具保留在 `local-data/deploy/`，如未来想收回公开内容可按其 README 重新启用。
