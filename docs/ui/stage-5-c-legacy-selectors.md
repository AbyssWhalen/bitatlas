# C 组独立实验迁移后的旧 CSS 选择器

四个 TSX 的迁移前基线是 `adceb7a42431`。以下行号相对于 `apps/web/src/styles/`；逗号选择器分支单列，重复断点合在一行。范围仅限本次五个实验，不代表相应 CSS 可从全站删除。

## 离开本页的专属选择器

### DataStructuresLabPage（链表与最短路径）

| 文件、行号与断点 | 旧选择器 | 本页已移除的类 |
|---|---|---|
| `lab.css` 530 | `.ds-review-band` | `.ds-review-band` |
| `lab.css` 531 | `.ds-review-band > span` | `.ds-review-band` |
| `lab.css` 532 | `.ds-review-band > strong` | `.ds-review-band` |
| `lab.css` 533 | `.ds-review-band > small` | `.ds-review-band` |
| `lab.css` 539 | `.ds-lab-grid` | `.ds-lab-grid` |
| `lab.css` 540 | `.ds-lab-grid > .step-explorer` | `.ds-lab-grid` |
| `lab.css` 541 | `.ds-control-heading` | `.ds-control-heading` |
| `lab.css` 544 | `.ds-preset-description` | `.ds-preset-description` |
| `lab.css` 545 | `.ds-graph-workbench` | `.ds-graph-workbench` |
| `lab.css` 563 | `.ds-comparison-heading` | `.ds-comparison-heading` |
| `lab.css` 564 | `.ds-comparison-heading h2` | `.ds-comparison-heading` |
| `lab.css` 565 | `.ds-comparison-heading > strong` | `.ds-comparison-heading` |
| `lab.css` 566 | `.ds-comparison-heading > strong.danger` | `.ds-comparison-heading`、`.danger` |
| `lab.css` 567 | `.ds-comparison-heading > strong.success` | `.ds-comparison-heading`、`.success` |
| `lab.css` 576 | `.linked-list-input-grid` | `.linked-list-input-grid` |
| `lab.css` 597 | `.linked-list-empty-trace` | `.linked-list-empty-trace` |
| `lab.css` 598 | `.linked-list-result` | `.linked-list-result` |
| `lab.css` 599 | `.linked-list-result > div` | `.linked-list-result` |
| `lab.css` 600 | `.linked-list-result > div:last-child` | `.linked-list-result` |
| `lab.css` 601 | `.linked-list-result span` | `.linked-list-result` |
| `lab.css` 601 | `.linked-list-result small` | `.linked-list-result` |
| `lab.css` 602 | `.linked-list-result strong` | `.linked-list-result` |
| `responsive.css` 172 (max-width: 760px) | `.ds-review-band` | `.ds-review-band` |
| `responsive.css` 173 (max-width: 760px) | `.ds-review-band > small` | `.ds-review-band` |
| `responsive.css` 173 (max-width: 760px)、174 (max-width: 760px) | `.ds-review-band > button` | `.ds-review-band` |
| `responsive.css` 175 (max-width: 760px) | `.ds-lab-grid` | `.ds-lab-grid` |
| `responsive.css` 176 (max-width: 760px) | `.ds-lab-grid > .step-explorer` | `.ds-lab-grid` |
| `responsive.css` 177 (max-width: 760px) | `.linked-list-input-grid` | `.linked-list-input-grid` |
| `responsive.css` 178 (max-width: 760px) | `.linked-list-result > div` | `.linked-list-result` |
| `responsive.css` 179 (max-width: 760px) | `.linked-list-result strong` | `.linked-list-result` |

### VirtualMemoryLabPage（虚拟内存）

| 文件、行号与断点 | 旧选择器 | 本页已移除的类 |
|---|---|---|
| `lab.css` 486 | `.vm-review-band` | `.vm-review-band` |
| `lab.css` 487 | `.vm-review-band > span` | `.vm-review-band` |
| `lab.css` 488 | `.vm-review-band > strong` | `.vm-review-band` |
| `lab.css` 489 | `.vm-review-band > small` | `.vm-review-band` |
| `lab.css` 490 | `.vm-timing-grid` | `.vm-timing-grid` |
| `lab.css` 491 | `.vm-timing-grid .lab-input-field` | `.vm-timing-grid`、`.lab-input-field` |
| `lab.css` 508 | `.vm-state-grid` | `.vm-state-grid` |
| `lab.css` 509 | `.vm-state-panel` | `.vm-state-panel` |
| `lab.css` 514 | `.vm-timeline-section` | `.vm-timeline-section` |
| `lab.css` 515 | `.vm-section-heading` | `.vm-section-heading` |
| `lab.css` 516 | `.vm-section-heading h2` | `.vm-section-heading` |
| `lab.css` 517 | `.vm-section-heading > strong` | `.vm-section-heading` |
| `responsive.css` 164 (max-width: 760px) | `.vm-review-band` | `.vm-review-band` |
| `responsive.css` 165 (max-width: 760px) | `.vm-review-band > small` | `.vm-review-band` |
| `responsive.css` 166 (max-width: 760px) | `.vm-timing-grid` | `.vm-timing-grid` |
| `responsive.css` 166 (max-width: 760px) | `.vm-state-grid` | `.vm-state-grid` |

### NetworkLabPage（CIDR/LPM）

| 文件、行号与断点 | 旧选择器 | 本页已移除的类 |
|---|---|---|
| `lab.css` 604 | `.network-review-note` | `.network-review-note` |
| `lab.css` 605 | `.network-lab-grid` | `.network-lab-grid` |
| `lab.css` 606 | `.network-workbench` | `.network-workbench` |
| `lab.css` 607 | `.network-lab-grid > .step-explorer` | `.network-lab-grid` |
| `responsive.css` 184 (max-width: 760px) | `.network-lab-grid` | `.network-lab-grid` |
| `responsive.css` 185 (max-width: 760px) | `.network-lab-grid > .step-explorer` | `.network-lab-grid` |

### GbnLabPage（GBN）

| 文件、行号与断点 | 旧选择器 | 本页已移除的类 |
|---|---|---|
| `lab.css` 604 | `.network-review-note` | `.network-review-note` |
| `lab.css` 650 | `.gbn-lab-grid` | `.gbn-lab-grid` |
| `lab.css` 651 | `.gbn-lab-grid > .step-explorer` | `.gbn-lab-grid` |
| `lab.css` 652 | `.gbn-workbench` | `.gbn-workbench` |
| `lab.css` 653 | `.gbn-control-panel .lab-control-heading` | `.gbn-control-panel`、`.lab-control-heading` |
| `lab.css` 654 | `.gbn-config-fields` | `.gbn-config-fields` |
| `lab.css` 655 | `.gbn-script-field textarea` | `.gbn-script-field` |
| `lab.css` 658 | `.gbn-ack-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 662 | `.gbn-state-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 663 | `.gbn-state-facts` | `.gbn-state-facts` |
| `lab.css` 664 | `.gbn-state-facts > span` | `.gbn-state-facts` |
| `lab.css` 665 | `.gbn-state-facts > span:last-child` | `.gbn-state-facts` |
| `lab.css` 666、667 | `.gbn-state-facts small` | `.gbn-state-facts` |
| `lab.css` 666、668 | `.gbn-state-facts strong` | `.gbn-state-facts` |
| `lab.css` 689 | `.gbn-result-panel .lab-control-heading` | `.lab-control-heading` |
| `responsive.css` 196 (max-width: 760px) | `.gbn-lab-grid` | `.gbn-lab-grid` |
| `responsive.css` 197 (max-width: 760px) | `.gbn-lab-grid > .step-explorer` | `.gbn-lab-grid` |
| `responsive.css` 198 (max-width: 760px) | `.gbn-config-fields` | `.gbn-config-fields` |
| `responsive.css` 199 (max-width: 760px) | `.gbn-state-facts` | `.gbn-state-facts` |
| `responsive.css` 200 (max-width: 760px) | `.gbn-state-facts > span:nth-child(2)` | `.gbn-state-facts` |
| `responsive.css` 201 (max-width: 760px) | `.gbn-state-facts > span:nth-child(-n+2)` | `.gbn-state-facts` |
| `responsive.css` 217 (max-width: 760px) | `.gbn-lab-page .page-header` | `.page-header` |
| `responsive.css` 218 (max-width: 760px) | `.gbn-lab-page .page-header > button` | `.page-header` |

## 共享外壳

这些旧外壳分支在列出的页面上缺少必要的类名。实际模块导航、StepExplorer、磁盘调度等其他调用方仍可能命中，不能整条删除。

| 文件、行号与断点 | 选择器 | 已退出页面 |
|---|---|---|
| `lab.css` 16 | `.lab-module-heading` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 17 | `.lab-module-heading span` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 18 | `.lab-module-heading svg:last-child` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 19 | `.lab-panel-grid` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 20 | `.lab-control-panel` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 21 | `.lab-control-heading` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 22 | `.lab-control-heading h2` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 23 | `.lab-example-select` | 链表与最短路径 |
| `lab.css` 25 | `.lab-input-field` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 26 | `.lab-input-field.grow` | 链表与最短路径、CIDR/LPM |
| `lab.css` 28 | `.lab-input-field span` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 29 | `.lab-input-field input` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 29 | `.lab-input-field select` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 30 | `.lab-input-field input:focus` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 30 | `.lab-input-field select:focus` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 31 | `.lab-error` | 链表与最短路径、虚拟内存、GBN |
| `lab.css` 707 | `.lab-input-field textarea` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `lab.css` 708 | `.lab-input-field textarea:focus` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 34 (max-width: 760px) | `.page-header` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 35 (max-width: 760px) | `.page-header h1` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 36 (max-width: 760px) | `.page-header p` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 53 (max-width: 760px) | `.lab-panel-grid` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 56 (max-width: 760px) | `.lab-control-panel` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 57 (max-width: 760px) | `.lab-control-heading` | 链表与最短路径、虚拟内存、CIDR/LPM、GBN |
| `responsive.css` 58 (max-width: 760px) | `.lab-example-select` | 链表与最短路径 |
| `lab.css` 27 | `.lab-input-field.full` | 虚拟内存、GBN |
| `lab.css` 24 | `.lab-field-row` | CIDR/LPM、GBN |
| `responsive.css` 59 (max-width: 760px) | `.lab-field-row` | CIDR/LPM、GBN |
| `responsive.css` 60 (max-width: 760px) | `.lab-field-row .lab-input-field` | CIDR/LPM、GBN |

## 仍有 DOM 的规则

下面这些选择器仍匹配页面；保留其结构、行为和 E2E 钩子，仅列出作用已转给展厅的声明或视觉处理。

| 文件、行号 | 选择器或规则组 | 后续清理需区分的部分 |
|---|---|---|
| `lab.css` 479 | `.table tbody tr:hover` | 在五页中有表格的三页（最短路径、虚拟内存、CIDR）改为主题纸色；全站共享，不能删除。 |
| `lab.css` 492–513 | `.vm-address-breakdown`、`.vm-event-outcome span` 及三种结果色、`.vm-transfer-summary`、`.vm-state-table tr.current` | 字段和结果标签继续使用；主题色、边框和当前行底色由新样式决定。地址字段类亦用于磁盘调度。 |
| `lab.css` 518–528 | `.vm-access-timeline`、访问按钮的普通/悬停/激活态、`.vm-trace-transport` | 本地横滚、时间线按钮、外部访问控制仍在；只覆盖旧固定色。 |
| `lab.css` 546–561；`responsive.css` 180 | `.ds-graph`、`.ds-edge`、`.ds-node`、`.ds-distance-table tr.current` | SVG 的节点、路径和虚线目标仍在；填色、描边、字号和缩放边界已接管，距离表独立随主题。 |
| `lab.css` 562、568–575；`responsive.css` 181–183 | `.ds-comparison`、`.ds-result-grid` 及后代 | 旧外围渐变由表卡取代；两算法详情及手机排列仍复用，磁盘调度也使用 `.ds-comparison`。 |
| `lab.css` 577–596 | `.linked-list-viewport`、`.linked-list-node`、`.slow-pointer`、`.fast-pointer`、`.linked-list-invariant` | 轨道滚动、双指针标记与索引继续使用；节点宽度随合法整数增长，不变量改由 status 卡布局。 |
| `lab.css` 608–618 | `.network-prefix-legend`、`.network-bit-ruler`、`.prefix`、`.host`、`.octet-start` | 保留 32 个位格与 /0、/32 语义；旧 704px 最小宽度、固定列宽、比例图例及配色改由容器宽度决定。 |
| `lab.css` 630–648；`responsive.css` 189–195 | `.network-aggregate-equation`、`.network-lpm-evaluations`、`.network-route-bits`、`.network-lpm-selected` | 子网/路由表继续局部横滚；位串的读屏比较符以本地 code 定位，表决结果移至 status，未命中行不再降透明度。 |
| `lab.css` 656、669–687、696 | `.gbn-script-status`、`.gbn-sequence-space`、`.gbn-sequence-slot` 及状态、`.gbn-legend`、`.gbn-current-event`、`.gbn-result-flow code` | 发送格保留原类和 data 属性；接收行单列。状态、图例与脚本结果改用语义色，当前事件移出画布。 |

核对方式：TS 编译器提取前后 JSX 类名及 GBN 的动态类生成，PostCSS 逐分支处理规则和媒体条件。以上是页面范围清单；整站统一清理前仍应在其他页面、组件及测试中复查。原始逐行对照：`output/playwright/opus-ui-2026-11-22/stage-5-rollout-c-pages/legacy-selectors.json`。
