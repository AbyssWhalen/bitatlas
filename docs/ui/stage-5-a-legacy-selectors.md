# A 组实验迁移后的旧 CSS 选择器

核对基线为 `adceb7a42431` 的 11 个页面。行号指向 `apps/web/src/styles/` 中的源文件。下表逐一列出每个选择器分支，重复出现的断点写在同一行。

## A 组页面专属选择器

旧 JSX 中存在的类名已从对应页移除。逗号并列的选择器须分别核对。

### CompleteBinaryTreeLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-exhibits.css` 354、403 (max-width: 800px) | `.complete-tree-lab-grid` | `.complete-tree-lab-grid` |
| `lab-exhibits.css` 355 | `.complete-tree-workbench` | `.complete-tree-workbench` |
| `lab-exhibits.css` 356 | `.complete-tree-control-panel` | `.complete-tree-control-panel` |
| `lab-exhibits.css` 361、406 (max-width: 800px) | `.complete-tree-input-grid` | `.complete-tree-input-grid` |

### ForestBinaryRelationLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-exhibits.css` 235、416 (max-width: 800px) | `.forest-binary-lab-grid` | `.forest-binary-lab-grid` |
| `lab-exhibits.css` 243 | `.forest-binary-workbench` | `.forest-binary-workbench` |
| `lab-exhibits.css` 244 | `.forest-binary-control-panel` | `.forest-binary-control-panel` |
| `lab-exhibits.css` 248 | `.forest-binary-control-panel .lab-control-heading` | `.forest-binary-control-panel`、`.lab-control-heading` |
| `lab-exhibits.css` 249 | `.forest-binary-state-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-exhibits.css` 253、419 (max-width: 800px) | `.forest-binary-result-metrics` | `.forest-binary-result-metrics` |
| `lab-exhibits.css` 254 | `.forest-binary-result-metrics > div` | `.forest-binary-result-metrics` |
| `lab-exhibits.css` 255、421 (max-width: 800px) | `.forest-binary-result-metrics > div:last-child` | `.forest-binary-result-metrics` |
| `lab-exhibits.css` 256 | `.forest-binary-result-metrics small` | `.forest-binary-result-metrics` |
| `lab-exhibits.css` 257 | `.forest-binary-result-metrics strong` | `.forest-binary-result-metrics` |
| `lab-exhibits.css` 420 (max-width: 800px) | `.forest-binary-result-metrics > div:nth-child(2)` | `.forest-binary-result-metrics` |

### StackCapacityLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-exhibits.css` 96、146 (max-width: 760px) | `.stack-capacity-lab-grid` | `.stack-capacity-lab-grid` |
| `lab-exhibits.css` 104 | `.stack-capacity-workbench` | `.stack-capacity-workbench` |
| `lab-exhibits.css` 105 | `.stack-capacity-control-panel` | `.stack-capacity-control-panel` |
| `lab-exhibits.css` 109 | `.stack-capacity-control-panel .lab-control-heading` | `.stack-capacity-control-panel`、`.lab-control-heading` |
| `lab-exhibits.css` 110 | `.stack-capacity-state-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-exhibits.css` 111、152 (max-width: 760px) | `.stack-capacity-input-grid` | `.stack-capacity-input-grid` |
| `lab-exhibits.css` 112 | `.stack-capacity-metrics` | `.stack-capacity-metrics` |
| `lab-exhibits.css` 113 | `.stack-capacity-metrics > div` | `.stack-capacity-metrics` |
| `lab-exhibits.css` 114 | `.stack-capacity-metrics > div:last-child` | `.stack-capacity-metrics` |
| `lab-exhibits.css` 115 | `.stack-capacity-metrics small` | `.stack-capacity-metrics` |
| `lab-exhibits.css` 116 | `.stack-capacity-metrics strong` | `.stack-capacity-metrics` |

### SortPassAnalysisLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-exhibits.css` 303、439 (max-width: 800px) | `.sort-pass-lab-grid` | `.sort-pass-lab-grid` |
| `lab-exhibits.css` 312 | `.sort-pass-workbench` | `.sort-pass-workbench` |
| `lab-exhibits.css` 313 | `.sort-pass-control-panel` | `.sort-pass-control-panel` |
| `lab-exhibits.css` 318 | `.sort-pass-control-panel .lab-control-heading` | `.sort-pass-control-panel`、`.lab-control-heading` |
| `lab-exhibits.css` 319 | `.sort-pass-state-panel .lab-control-heading` | `.lab-control-heading` |

### BinaryTreeTraversalLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-extended.css` 2、53 (max-width: 760px) | `.binary-tree-lab-grid` | `.binary-tree-lab-grid` |
| `lab-extended.css` 10 | `.binary-tree-workbench` | `.binary-tree-workbench` |
| `lab-extended.css` 11 | `.binary-tree-control-panel` | `.binary-tree-control-panel` |
| `lab-extended.css` 15 | `.binary-tree-control-panel .lab-control-heading` | `.binary-tree-control-panel`、`.lab-control-heading` |
| `lab-extended.css` 16 | `.binary-tree-state-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-extended.css` 24、60 (max-width: 760px) | `.binary-tree-metrics` | `.binary-tree-metrics` |
| `lab-extended.css` 25 | `.binary-tree-metrics > div` | `.binary-tree-metrics` |
| `lab-extended.css` 26、62 (max-width: 760px) | `.binary-tree-metrics > div:last-child` | `.binary-tree-metrics` |
| `lab-extended.css` 27 | `.binary-tree-metrics small` | `.binary-tree-metrics` |
| `lab-extended.css` 28 | `.binary-tree-metrics strong` | `.binary-tree-metrics` |
| `lab-extended.css` 29 | `.binary-tree-metrics > div:last-child strong` | `.binary-tree-metrics` |
| `lab-extended.css` 61 (max-width: 760px) | `.binary-tree-metrics > div:nth-child(2)` | `.binary-tree-metrics` |

### SingleResourceDeadlockLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-extended.css` 213、268 (max-width: 760px) | `.deadlock-lab-grid` | `.deadlock-lab-grid` |
| `lab-extended.css` 222 | `.deadlock-workbench` | `.deadlock-workbench` |
| `lab-extended.css` 223 | `.deadlock-control-panel` | `.deadlock-control-panel` |
| `lab-extended.css` 228 | `.deadlock-control-panel .lab-control-heading` | `.deadlock-control-panel`、`.lab-control-heading` |
| `lab-extended.css` 229、282 (max-width: 760px) | `.deadlock-pool-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-extended.css` 230、283 (max-width: 760px) | `.deadlock-process-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-extended.css` 231、274 (max-width: 760px) | `.deadlock-input-grid` | `.deadlock-input-grid` |
| `lab-extended.css` 234、275 (max-width: 760px) | `.deadlock-metrics` | `.deadlock-metrics` |
| `lab-extended.css` 235 | `.deadlock-metrics > div` | `.deadlock-metrics` |
| `lab-extended.css` 236 | `.deadlock-metrics > div:last-child` | `.deadlock-metrics` |
| `lab-extended.css` 237 | `.deadlock-metrics small` | `.deadlock-metrics` |
| `lab-extended.css` 238 | `.deadlock-metrics strong` | `.deadlock-metrics` |
| `lab-extended.css` 244、284 (max-width: 760px) | `.deadlock-pool-panel .lab-control-heading > strong` | `.lab-control-heading` |
| `lab-extended.css` 276 (max-width: 760px) | `.deadlock-metrics > div:nth-child(2)` | `.deadlock-metrics` |
| `lab-extended.css` 277 (max-width: 760px) | `.deadlock-metrics > div:nth-child(-n+2)` | `.deadlock-metrics` |

### FilesystemLinksLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab-extended.css` 76、164 (max-width: 760px) | `.filesystem-links-lab-grid` | `.filesystem-links-lab-grid` |
| `lab-extended.css` 85 | `.filesystem-links-workbench` | `.filesystem-links-workbench` |
| `lab-extended.css` 86 | `.filesystem-links-control` | `.filesystem-links-control` |
| `lab-extended.css` 91 | `.filesystem-links-control .lab-control-heading` | `.filesystem-links-control`、`.lab-control-heading` |
| `lab-extended.css` 92 | `.filesystem-directory-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-extended.css` 93 | `.filesystem-inode-panel .lab-control-heading` | `.lab-control-heading` |
| `lab-extended.css` 94、170 (max-width: 760px) | `.filesystem-links-input-grid` | `.filesystem-links-input-grid` |
| `lab-extended.css` 113 | `.filesystem-inode-panel .lab-control-heading > strong` | `.lab-control-heading` |

### CsmaCdCollisionLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab.css` 731 | `.csma-cd-review-band` | `.csma-cd-review-band` |
| `lab.css` 732 | `.csma-cd-review-band > span` | `.csma-cd-review-band` |
| `lab.css` 733 | `.csma-cd-review-band > strong` | `.csma-cd-review-band` |
| `lab.css` 734 | `.csma-cd-review-band > small` | `.csma-cd-review-band` |
| `lab.css` 735 | `.csma-cd-lab-grid` | `.csma-cd-lab-grid` |
| `lab.css` 743 | `.csma-cd-workbench` | `.csma-cd-workbench` |
| `lab.css` 744 | `.csma-cd-control-panel` | `.csma-cd-control-panel` |
| `lab.css` 748 | `.csma-cd-control-panel .lab-control-heading` | `.csma-cd-control-panel`、`.lab-control-heading` |
| `lab.css` 749 | `.csma-cd-result-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 750 | `.csma-cd-input-grid` | `.csma-cd-input-grid` |
| `lab.css` 777 | `.csma-cd-empty-trace` | `.csma-cd-empty-trace` |
| `responsive.css` 221 (max-width: 760px) | `.csma-cd-review-band` | `.csma-cd-review-band` |
| `responsive.css` 222 (max-width: 760px) | `.csma-cd-review-band > small` | `.csma-cd-review-band` |
| `responsive.css` 222 (max-width: 760px)、223 (max-width: 760px) | `.csma-cd-review-band > button` | `.csma-cd-review-band` |
| `responsive.css` 224 (max-width: 760px) | `.csma-cd-lab-grid` | `.csma-cd-lab-grid` |
| `responsive.css` 230 (max-width: 760px) | `.csma-cd-input-grid` | `.csma-cd-input-grid` |

### FtpControlConnectionLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab.css` 212 | `.ftp-control-lab-grid` | `.ftp-control-lab-grid` |
| `lab.css` 213 | `.ftp-control-workbench` | `.ftp-control-workbench` |
| `lab.css` 214 | `.ftp-control-config-panel` | `.ftp-control-config-panel` |
| `lab.css` 218 | `.ftp-control-review-band` | `.ftp-control-review-band` |
| `lab.css` 219 | `.ftp-control-review-band > span` | `.ftp-control-review-band` |
| `lab.css` 220 | `.ftp-control-review-band > strong` | `.ftp-control-review-band` |
| `lab.css` 221 | `.ftp-control-review-band > small` | `.ftp-control-review-band` |
| `lab.css` 222 | `.ftp-control-config-panel .lab-control-heading` | `.ftp-control-config-panel`、`.lab-control-heading` |
| `lab.css` 222 | `.ftp-control-result-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 223 | `.ftp-control-config-panel > .lab-input-field` | `.ftp-control-config-panel`、`.lab-input-field` |
| `lab.css` 225 | `.ftp-control-equation` | `.ftp-control-equation` |
| `lab.css` 226 | `.ftp-control-equation code` | `.ftp-control-equation` |
| `lab.css` 227 | `.ftp-control-equation > svg` | `.ftp-control-equation` |
| `lab.css` 228 | `.ftp-control-equation strong` | `.ftp-control-equation` |
| `lab.css` 229 | `.ftp-control-metrics` | `.ftp-control-metrics` |
| `lab.css` 230 | `.ftp-control-metrics > div` | `.ftp-control-metrics` |
| `lab.css` 231 | `.ftp-control-metrics > div:last-child` | `.ftp-control-metrics` |
| `lab.css` 232 | `.ftp-control-metrics dt` | `.ftp-control-metrics` |
| `lab.css` 233 | `.ftp-control-metrics dd` | `.ftp-control-metrics` |
| `lab.css` 234 | `.ftp-control-metrics > div:nth-last-child(1) dd` | `.ftp-control-metrics` |
| `lab.css` 252 | `.ftp-control-empty-trace` | `.ftp-control-empty-trace` |
| `responsive.css` 273 (max-width: 760px) | `.ftp-control-review-band` | `.ftp-control-review-band` |
| `responsive.css` 274 (max-width: 760px) | `.ftp-control-review-band > small` | `.ftp-control-review-band` |
| `responsive.css` 274 (max-width: 760px)、275 (max-width: 760px) | `.ftp-control-review-band > button` | `.ftp-control-review-band` |
| `responsive.css` 276 (max-width: 760px) | `.ftp-control-lab-grid` | `.ftp-control-lab-grid` |
| `responsive.css` 279 (max-width: 760px) | `.ftp-control-equation` | `.ftp-control-equation` |
| `responsive.css` 280 (max-width: 760px) | `.ftp-control-equation > svg` | `.ftp-control-equation` |
| `responsive.css` 281 (max-width: 760px) | `.ftp-control-equation strong` | `.ftp-control-equation` |
| `responsive.css` 282 (max-width: 760px) | `.ftp-control-metrics` | `.ftp-control-metrics` |
| `responsive.css` 283 (max-width: 760px) | `.ftp-control-metrics > div:nth-child(2)` | `.ftp-control-metrics` |
| `responsive.css` 284 (max-width: 760px) | `.ftp-control-metrics > div:nth-child(-n+2)` | `.ftp-control-metrics` |
| `responsive.css` 289 (max-width: 760px) | `.ftp-control-metrics dt` | `.ftp-control-metrics` |

### TcpCumulativeAckLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab.css` 816 | `.tcp-ack-review-band` | `.tcp-ack-review-band` |
| `lab.css` 817 | `.tcp-ack-review-band > span` | `.tcp-ack-review-band` |
| `lab.css` 818 | `.tcp-ack-review-band > strong` | `.tcp-ack-review-band` |
| `lab.css` 819 | `.tcp-ack-review-band > small` | `.tcp-ack-review-band` |
| `lab.css` 820 | `.tcp-ack-lab-grid` | `.tcp-ack-lab-grid` |
| `lab.css` 821 | `.tcp-ack-workbench` | `.tcp-ack-workbench` |
| `lab.css` 822 | `.tcp-ack-control-panel` | `.tcp-ack-control-panel` |
| `lab.css` 826 | `.tcp-ack-control-panel .lab-control-heading` | `.tcp-ack-control-panel`、`.lab-control-heading` |
| `lab.css` 826 | `.tcp-ack-result-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 827 | `.tcp-ack-input-grid` | `.tcp-ack-input-grid` |
| `lab.css` 828 | `.tcp-ack-equation` | `.tcp-ack-equation` |
| `lab.css` 829 | `.tcp-ack-equation code` | `.tcp-ack-equation` |
| `lab.css` 830 | `.tcp-ack-equation svg` | `.tcp-ack-equation` |
| `lab.css` 831 | `.tcp-ack-equation strong` | `.tcp-ack-equation` |
| `lab.css` 832 | `.tcp-ack-metrics` | `.tcp-ack-metrics` |
| `lab.css` 833 | `.tcp-ack-metrics > div` | `.tcp-ack-metrics` |
| `lab.css` 834 | `.tcp-ack-metrics > div:last-child` | `.tcp-ack-metrics` |
| `lab.css` 835 | `.tcp-ack-metrics dt` | `.tcp-ack-metrics` |
| `lab.css` 836 | `.tcp-ack-metrics dd` | `.tcp-ack-metrics` |
| `lab.css` 866 | `.tcp-ack-empty-trace` | `.tcp-ack-empty-trace` |
| `responsive.css` 292 (max-width: 760px) | `.tcp-ack-review-band` | `.tcp-ack-review-band` |
| `responsive.css` 293 (max-width: 760px) | `.tcp-ack-review-band > small` | `.tcp-ack-review-band` |
| `responsive.css` 293 (max-width: 760px)、294 (max-width: 760px) | `.tcp-ack-review-band > button` | `.tcp-ack-review-band` |
| `responsive.css` 295 (max-width: 760px) | `.tcp-ack-lab-grid` | `.tcp-ack-lab-grid` |
| `responsive.css` 298 (max-width: 760px) | `.tcp-ack-input-grid` | `.tcp-ack-input-grid` |
| `responsive.css` 299 (max-width: 760px) | `.tcp-ack-equation` | `.tcp-ack-equation` |
| `responsive.css` 300 (max-width: 760px) | `.tcp-ack-equation svg` | `.tcp-ack-equation` |
| `responsive.css` 301 (max-width: 760px) | `.tcp-ack-equation strong` | `.tcp-ack-equation` |
| `responsive.css` 302 (max-width: 760px) | `.tcp-ack-metrics` | `.tcp-ack-metrics` |
| `responsive.css` 303 (max-width: 760px) | `.tcp-ack-metrics > div:nth-child(2)` | `.tcp-ack-metrics` |
| `responsive.css` 304 (max-width: 760px) | `.tcp-ack-metrics > div:nth-child(-n+2)` | `.tcp-ack-metrics` |
| `responsive.css` 316 (max-width: 760px) | `.tcp-ack-metrics dt` | `.tcp-ack-metrics` |

### SwitchForwardingLabPage

| 文件、行号与断点 | 选择器 | 已移除的类名 |
|---|---|---|
| `lab.css` 171 | `.switch-forwarding-lab-grid` | `.switch-forwarding-lab-grid` |
| `lab.css` 172 | `.switch-forwarding-workbench` | `.switch-forwarding-workbench` |
| `lab.css` 173 | `.switch-forwarding-control-panel` | `.switch-forwarding-control-panel` |
| `lab.css` 177 | `.switch-forwarding-review-band` | `.switch-forwarding-review-band` |
| `lab.css` 178 | `.switch-forwarding-review-band > span` | `.switch-forwarding-review-band` |
| `lab.css` 179 | `.switch-forwarding-review-band > strong` | `.switch-forwarding-review-band` |
| `lab.css` 180 | `.switch-forwarding-review-band > small` | `.switch-forwarding-review-band` |
| `lab.css` 181 | `.switch-forwarding-control-panel .lab-control-heading` | `.switch-forwarding-control-panel`、`.lab-control-heading` |
| `lab.css` 181 | `.switch-forwarding-result-panel .lab-control-heading` | `.lab-control-heading` |
| `lab.css` 182 | `.switch-forwarding-control-panel > .lab-input-field` | `.switch-forwarding-control-panel`、`.lab-input-field` |
| `lab.css` 186 | `.switch-forwarding-equation` | `.switch-forwarding-equation` |
| `lab.css` 187 | `.switch-forwarding-equation code` | `.switch-forwarding-equation` |
| `lab.css` 188 | `.switch-forwarding-equation > svg` | `.switch-forwarding-equation` |
| `lab.css` 189 | `.switch-forwarding-equation strong` | `.switch-forwarding-equation` |
| `lab.css` 190 | `.switch-forwarding-metrics` | `.switch-forwarding-metrics` |
| `lab.css` 191 | `.switch-forwarding-metrics > div` | `.switch-forwarding-metrics` |
| `lab.css` 192 | `.switch-forwarding-metrics > div:last-child` | `.switch-forwarding-metrics` |
| `lab.css` 193 | `.switch-forwarding-metrics dt` | `.switch-forwarding-metrics` |
| `lab.css` 194 | `.switch-forwarding-metrics dd` | `.switch-forwarding-metrics` |
| `lab.css` 195 | `.switch-forwarding-metrics > div:nth-last-child(1) dd` | `.switch-forwarding-metrics` |
| `lab.css` 210 | `.switch-forwarding-empty-trace` | `.switch-forwarding-empty-trace` |
| `lab-exhibits.css` 501 (max-width: 800px) | `.switch-forwarding-review-band` | `.switch-forwarding-review-band` |
| `lab-exhibits.css` 502 (max-width: 800px) | `.switch-forwarding-review-band > small` | `.switch-forwarding-review-band` |
| `lab-exhibits.css` 502 (max-width: 800px)、503 (max-width: 800px) | `.switch-forwarding-review-band > button` | `.switch-forwarding-review-band` |
| `lab-exhibits.css` 504 (max-width: 800px) | `.switch-forwarding-lab-grid` | `.switch-forwarding-lab-grid` |
| `lab-exhibits.css` 507 (max-width: 800px) | `.switch-forwarding-equation` | `.switch-forwarding-equation` |
| `lab-exhibits.css` 508 (max-width: 800px) | `.switch-forwarding-equation > svg` | `.switch-forwarding-equation` |
| `lab-exhibits.css` 509 (max-width: 800px) | `.switch-forwarding-equation strong` | `.switch-forwarding-equation` |
| `lab-exhibits.css` 510 (max-width: 800px) | `.switch-forwarding-metrics` | `.switch-forwarding-metrics` |
| `lab-exhibits.css` 511 (max-width: 800px) | `.switch-forwarding-metrics > div:nth-child(2n)` | `.switch-forwarding-metrics` |
| `lab-exhibits.css` 512 (max-width: 800px) | `.switch-forwarding-metrics > div:nth-child(-n+2)` | `.switch-forwarding-metrics` |
| `lab-exhibits.css` 516 (max-width: 800px) | `.switch-forwarding-metrics dt` | `.switch-forwarding-metrics` |

## 旧共享外壳

这些样式在表中列出的 A 组页面已由公共外壳接管，其他实验仍可能使用同一个选择器。

| 文件、行号与断点 | 选择器 | 本次退出的页面 |
|---|---|---|
| `lab.css` 16 | `.lab-module-heading` | 全部 11 页 |
| `lab.css` 17 | `.lab-module-heading span` | 全部 11 页 |
| `lab.css` 18 | `.lab-module-heading svg:last-child` | 全部 11 页 |
| `lab.css` 20 | `.lab-control-panel` | 全部 11 页 |
| `lab.css` 21 | `.lab-control-heading` | 全部 11 页 |
| `lab.css` 22 | `.lab-control-heading h2` | 全部 11 页 |
| `lab.css` 25 | `.lab-input-field` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 27 | `.lab-input-field.full` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 28 | `.lab-input-field span` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 29 | `.lab-input-field input` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 29 | `.lab-input-field select` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 30 | `.lab-input-field input:focus` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 30 | `.lab-input-field select:focus` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 31 | `.lab-error` | 全部 11 页 |
| `lab.css` 530 | `.ds-review-band` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `lab.css` 531 | `.ds-review-band > span` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `lab.css` 532 | `.ds-review-band > strong` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `lab.css` 533 | `.ds-review-band > small` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `lab.css` 707 | `.lab-input-field textarea` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `lab.css` 708 | `.lab-input-field textarea:focus` | CompleteBinaryTree、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `responsive.css` 56 (max-width: 760px) | `.lab-control-panel` | 全部 11 页 |
| `responsive.css` 57 (max-width: 760px) | `.lab-control-heading` | 全部 11 页 |
| `responsive.css` 172 (max-width: 760px) | `.ds-review-band` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `responsive.css` 173 (max-width: 760px) | `.ds-review-band > small` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `responsive.css` 173 (max-width: 760px)、174 (max-width: 760px) | `.ds-review-band > button` | CompleteBinaryTree、ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal |
| `lab.css` 19 | `.lab-panel-grid` | ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `responsive.css` 53 (max-width: 760px) | `.lab-panel-grid` | ForestBinaryRelation、StackCapacity、SortPassAnalysis、BinaryTreeTraversal、SingleResourceDeadlock、FilesystemLinks、CsmaCdCollision、FtpControlConnection、TcpCumulativeAck、SwitchForwarding |
| `responsive.css` 328 (max-width: 760px) | `.segmented-control` | ForestBinaryRelation、BinaryTreeTraversal |
| `responsive.css` 329 (max-width: 760px) | `.segmented-control button` | ForestBinaryRelation、BinaryTreeTraversal |
| `lab.css` 486 | `.vm-review-band` | SingleResourceDeadlock、FilesystemLinks |
| `lab.css` 487 | `.vm-review-band > span` | SingleResourceDeadlock、FilesystemLinks |
| `lab.css` 488 | `.vm-review-band > strong` | SingleResourceDeadlock、FilesystemLinks |
| `lab.css` 489 | `.vm-review-band > small` | SingleResourceDeadlock、FilesystemLinks |
| `responsive.css` 164 (max-width: 760px) | `.vm-review-band` | SingleResourceDeadlock、FilesystemLinks |
| `responsive.css` 165 (max-width: 760px) | `.vm-review-band > small` | SingleResourceDeadlock、FilesystemLinks |

## 仍有 DOM 的布局钩子

类名仍用于 E2E、读屏状态或画布样式。槽位接管了旧容器的放置与吸顶，以下仅列对应的旧声明。尺寸、间距、文字、背景及其余后代规则应单独检查。

| 文件、行号与断点 | 选择器 | 已被槽位接管的声明 |
|---|---|---|
| `lab-exhibits.css` 357 | `.complete-tree-current-event` | `grid-area` |
| `lab-exhibits.css` 358 | `.complete-tree-state-panel` | `grid-area` |
| `lab-exhibits.css` 359 | `.complete-tree-conclusion` | `grid-area` |
| `lab-exhibits.css` 360 | `.complete-tree-step-explorer` | `grid-area`、`position`、`top` |
| `lab-exhibits.css` 404 (max-width: 800px) | `.complete-tree-step-explorer` | `position` |
| `lab-exhibits.css` 245 | `.forest-binary-current-event` | `grid-area` |
| `lab-exhibits.css` 246 | `.forest-binary-state-panel` | `grid-area` |
| `lab-exhibits.css` 247 | `.forest-binary-step-explorer` | `grid-area`、`position`、`top` |
| `lab-exhibits.css` 417 (max-width: 800px) | `.forest-binary-step-explorer` | `position` |
| `lab-exhibits.css` 106 | `.stack-capacity-current-event` | `grid-area` |
| `lab-exhibits.css` 107 | `.stack-capacity-state-panel` | `grid-area` |
| `lab-exhibits.css` 108 | `.stack-capacity-step-explorer` | `grid-area`、`position`、`top` |
| `lab-exhibits.css` 150 (max-width: 760px) | `.stack-capacity-step-explorer` | `position` |
| `lab-exhibits.css` 314 | `.sort-pass-current-event` | `grid-area` |
| `lab-exhibits.css` 315 | `.sort-pass-state-panel` | `grid-area` |
| `lab-exhibits.css` 316 | `.sort-pass-conclusion` | `grid-area` |
| `lab-exhibits.css` 317 | `.sort-pass-step-explorer` | `grid-area`、`position`、`top` |
| `lab-exhibits.css` 440 (max-width: 800px) | `.sort-pass-step-explorer` | `position` |
| `lab-extended.css` 12 | `.binary-tree-current-event` | `grid-area` |
| `lab-extended.css` 13 | `.binary-tree-state-panel` | `grid-area` |
| `lab-extended.css` 14 | `.binary-tree-step-explorer` | `grid-area`、`position`、`top` |
| `lab-extended.css` 57 (max-width: 760px) | `.binary-tree-step-explorer` | `position` |
| `lab-extended.css` 224 | `.deadlock-current-event` | `grid-area` |
| `lab-extended.css` 225 | `.deadlock-pool-panel` | `grid-area` |
| `lab-extended.css` 226 | `.deadlock-process-panel` | `grid-area` |
| `lab-extended.css` 227 | `.deadlock-step-explorer` | `grid-area`、`position`、`top` |
| `lab-extended.css` 272 (max-width: 760px) | `.deadlock-step-explorer` | `position` |
| `lab-extended.css` 87 | `.filesystem-current-event` | `grid-area` |
| `lab-extended.css` 88 | `.filesystem-directory-panel` | `grid-area` |
| `lab-extended.css` 89 | `.filesystem-inode-panel` | `grid-area` |
| `lab-extended.css` 90 | `.filesystem-links-step-explorer` | `grid-area`、`position`、`top` |
| `lab-extended.css` 168 (max-width: 760px) | `.filesystem-links-step-explorer` | `position` |
| `lab.css` 745 | `.csma-cd-current-event` | `grid-area` |
| `lab.css` 746 | `.csma-cd-result-panel` | `grid-area` |
| `lab.css` 747 | `.csma-cd-step-explorer` | `grid-area`、`position`、`top` |
| `responsive.css` 228 (max-width: 760px) | `.csma-cd-step-explorer` | `position` |
| `lab.css` 215 | `.ftp-control-current-event` | `grid-area` |
| `lab.css` 216 | `.ftp-control-result-panel` | `grid-area` |
| `lab.css` 217 | `.ftp-control-step-explorer` | `grid-area`、`position`、`top` |
| `responsive.css` 277 (max-width: 760px) | `.ftp-control-step-explorer` | `position` |
| `lab.css` 823 | `.tcp-ack-current-event` | `grid-area` |
| `lab.css` 824 | `.tcp-ack-result-panel` | `grid-area` |
| `lab.css` 825 | `.tcp-ack-step-explorer` | `grid-area`、`position`、`top` |
| `responsive.css` 296 (max-width: 760px) | `.tcp-ack-step-explorer` | `position` |
| `lab.css` 174 | `.switch-forwarding-current-event` | `grid-area` |
| `lab.css` 175 | `.switch-forwarding-result-panel` | `grid-area` |
| `lab.css` 176 | `.switch-forwarding-step-explorer` | `grid-area`、`position`、`top` |
| `lab-exhibits.css` 505 (max-width: 800px) | `.switch-forwarding-step-explorer` | `position` |

森林和遍历的节点、连线、次序，栈单元、死锁进程、目录项与 inode、协议时间线、字节段和转发表仍由旧画布规则绘制。`lab-exhibit-rollout.css` 为其中的文字、边和未展开状态补足对比度。
