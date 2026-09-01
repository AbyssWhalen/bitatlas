export interface QuestionLabLink {
  destination: string;
  label: string;
}

const QUESTION_LAB_LINKS: Readonly<Record<string, QuestionLabLink>> = {
  'cn408-2009-q02': { destination: '/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02', label: '栈最小容量' },
  'cn408-2009-q03': { destination: '/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL', label: '二叉树递归遍历' },
  'cn408-2009-q05': { destination: '/lab/data-structures?module=complete-tree&preset=cn408-2009-q05', label: '完全二叉树最大结点数' },
  'cn408-2009-q06': { destination: '/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR', label: '森林与二叉树转换' },
  'cn408-2009-q09': { destination: '/lab/data-structures?module=min-heap&preset=cn408-2009-q09', label: '小根堆插入' },
  'cn408-2009-q10': { destination: '/lab/data-structures?module=sort-pass&preset=cn408-2009-q10', label: '排序趟次不变量判别' },
  'cn408-2009-q11': { destination: '/lab?module=datapath', label: 'RV32I 单周期数据通路' },
  'cn408-2009-q12': { destination: '/lab?module=signed', label: '原码 / 反码 / 补码' },
  'cn408-2009-q13': { destination: '/lab?module=float32', label: 'IEEE 754 单精度浮点数' },
  'cn408-2009-q14': { destination: '/lab?module=cache', label: '组相联 Cache 映射' },
  'cn408-2009-q15': { destination: '/lab?module=memory-expansion&preset=cn408-2009-q15', label: '存储器芯片扩展' },
  'cn408-2009-q16': { destination: '/lab?module=datapath', label: 'RV32I 单周期数据通路' },
  'cn408-2009-q17': { destination: '/lab?module=riscv', label: 'RV32I 指令编码' },
  'cn408-2009-q18': { destination: '/lab?module=pipeline&mode=timing&preset=cn408-2009-q18-stage-clock', label: '流水线功能段时延' },
  'cn408-2009-q20': { destination: '/lab?module=bus-bandwidth&preset=cn408-2009-q20', label: '总线带宽' },
  'cn408-2009-q21': { destination: '/lab?module=cache', label: 'Cache 命中与替换' },
  'cn408-2009-q25': { destination: '/lab/os-memory?module=deadlock&preset=cn408-2009-q25', label: '单类资源死锁阈值' },
  'cn408-2009-q27': { destination: '/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27', label: '分段地址最大段长' },
  'cn408-2009-q24': { destination: '/lab/os-memory?module=hrrn&preset=cn408-2009-q24', label: '高响应比进程调度' },
  'cn408-2009-q29': { destination: '/lab/os-memory?module=disk&preset=cn408-2009-q29', label: 'SCAN 磁盘调度' },
  'cn408-2009-q31': { destination: '/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31', label: '软硬链接与引用计数' },
  'cn408-2009-q35': { destination: '/lab/network?module=gbn&preset=cn408-2009-q35', label: 'Go-Back-N 滑动窗口' },
  'cn408-2009-q34': { destination: '/lab/network?module=qam-nyquist&preset=cn408-2009-q34', label: 'QAM / 奈氏最大速率' },
  'cn408-2009-q37': { destination: '/lab/network?module=csma-cd&preset=cn408-2009-q37', label: 'CSMA/CD 碰撞域距离' },
  'cn408-2009-q38': { destination: '/lab/network?module=tcp-ack&preset=cn408-2009-q38', label: 'TCP 累计确认' },
  'cn408-2009-q36': { destination: '/lab/network?module=switch-forwarding&preset=cn408-2009-q36', label: '交换机目的物理地址转发' },
  'cn408-2009-q40': { destination: '/lab/network?module=ftp-control&preset=cn408-2009-q40', label: 'FTP 控制连接' },
  'cn408-2009-q39': { destination: '/lab/network?module=tcp-congestion&preset=cn408-2009-q39', label: 'TCP 经典拥塞控制' },
  'cn408-2009-q41': { destination: '/lab/data-structures?module=shortest-path&preset=cn408-2009-q41', label: '最短路径与贪心反例' },
  'cn408-2009-q42': { destination: '/lab/data-structures?module=linked-list&preset=cn408-2009-q42', label: '单链表倒数第 k 个结点' },
  'cn408-2009-q43': { destination: '/lab?module=io-overhead&preset=cn408-2009-q43', label: '中断与 DMA CPU 开销' },
  'cn408-2009-q44': { destination: '/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5', label: '数据通路微操作调度' },
  'cn408-2009-q45': { destination: '/lab/os-memory?module=semaphore&preset=cn408-2009-q45', label: '信号量同步与奇偶缓冲区' },
  'cn408-2009-q46': { destination: '/lab/os-memory?module=memory&preset=cn408-2009-q46', label: 'TLB / LRU 地址转换' },
  'cn408-2009-q47': { destination: '/lab/network?module=cidr&preset=cn408-2009-q47', label: 'CIDR / 路由匹配' },
};

export function questionLabLink(questionId: string | undefined): QuestionLabLink | null {
  return questionId ? QUESTION_LAB_LINKS[questionId] ?? null : null;
}

export function firstQuestionLabLink(questionIds: readonly string[]): QuestionLabLink | null {
  for (const questionId of questionIds) {
    const link = questionLabLink(questionId);
    if (link) return link;
  }
  return null;
}
