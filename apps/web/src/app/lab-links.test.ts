import { describe, expect, it } from 'vitest';
import { firstQuestionLabLink, questionLabLink } from './lab-links';

describe('question lab links', () => {
  it.each([
    ['cn408-2009-q02', '/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02'],
    ['cn408-2009-q03', '/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL'],
    ['cn408-2009-q05', '/lab/data-structures?module=complete-tree&preset=cn408-2009-q05'],
    ['cn408-2009-q06', '/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR'],
    ['cn408-2009-q09', '/lab/data-structures?module=min-heap&preset=cn408-2009-q09'],
    ['cn408-2009-q10', '/lab/data-structures?module=sort-pass&preset=cn408-2009-q10'],
    ['cn408-2009-q11', '/lab?module=datapath'],
    ['cn408-2009-q12', '/lab?module=signed'],
    ['cn408-2009-q13', '/lab?module=float32'],
    ['cn408-2009-q14', '/lab?module=cache'],
    ['cn408-2009-q15', '/lab?module=memory-expansion&preset=cn408-2009-q15'],
    ['cn408-2009-q17', '/lab?module=riscv'],
    ['cn408-2009-q20', '/lab?module=bus-bandwidth&preset=cn408-2009-q20'],
    ['cn408-2009-q21', '/lab?module=cache'],
    ['cn408-2009-q25', '/lab/os-memory?module=deadlock&preset=cn408-2009-q25'],
    ['cn408-2009-q27', '/lab/os-memory?module=segmentation-address&preset=cn408-2009-q27'],
    ['cn408-2009-q24', '/lab/os-memory?module=hrrn&preset=cn408-2009-q24'],
    ['cn408-2009-q29', '/lab/os-memory?module=disk&preset=cn408-2009-q29'],
    ['cn408-2009-q31', '/lab/os-memory?module=filesystem-links&preset=cn408-2009-q31'],
    ['cn408-2009-q35', '/lab/network?module=gbn&preset=cn408-2009-q35'],
    ['cn408-2009-q34', '/lab/network?module=qam-nyquist&preset=cn408-2009-q34'],
    ['cn408-2009-q37', '/lab/network?module=csma-cd&preset=cn408-2009-q37'],
    ['cn408-2009-q38', '/lab/network?module=tcp-ack&preset=cn408-2009-q38'],
    ['cn408-2009-q36', '/lab/network?module=switch-forwarding&preset=cn408-2009-q36'],
    ['cn408-2009-q40', '/lab/network?module=ftp-control&preset=cn408-2009-q40'],
    ['cn408-2009-q39', '/lab/network?module=tcp-congestion&preset=cn408-2009-q39'],
    ['cn408-2009-q41', '/lab/data-structures?module=shortest-path&preset=cn408-2009-q41'],
    ['cn408-2009-q42', '/lab/data-structures?module=linked-list&preset=cn408-2009-q42'],
    ['cn408-2009-q43', '/lab?module=io-overhead&preset=cn408-2009-q43'],
    ['cn408-2009-q44', '/lab?module=micro-operations&preset=cn408-2009-q44&schedule=parallel-5'],
    ['cn408-2009-q45', '/lab/os-memory?module=semaphore&preset=cn408-2009-q45'],
    ['cn408-2009-q46', '/lab/os-memory?module=memory&preset=cn408-2009-q46'],
    ['cn408-2009-q47', '/lab/network?module=cidr&preset=cn408-2009-q47'],
  ])('maps %s to %s', (questionId, destination) => {
    expect(questionLabLink(questionId)?.destination).toBe(destination);
  });

  it('returns the first supported question and rejects unknown ids', () => {
    expect(firstQuestionLabLink(['cn408-2009-q01', 'cn408-2009-q14'])).toEqual({
      destination: '/lab?module=cache',
      label: '组相联 Cache 映射',
    });
    expect(questionLabLink('cn408-2009-q99')).toBeNull();
    expect(firstQuestionLabLink([])).toBeNull();
  });

  it('labels Q43 as the interrupt and DMA CPU overhead lab', () => {
    expect(questionLabLink('cn408-2009-q43')?.label).toBe('中断与 DMA CPU 开销');
  });

  it('labels Q15 as the memory chip expansion lab', () => {
    expect(questionLabLink('cn408-2009-q15')?.label).toBe('存储器芯片扩展');
  });

  it('labels Q44 as the datapath micro-operation schedule lab', () => {
    expect(questionLabLink('cn408-2009-q44')?.label).toBe('数据通路微操作调度');
  });

  it('labels Q9 as the min-heap insertion lab', () => {
    expect(questionLabLink('cn408-2009-q09')?.label).toBe('小根堆插入');
  });

  it('labels Q10 as the sort-pass invariant lab', () => {
    expect(questionLabLink('cn408-2009-q10')?.label).toBe('排序趟次不变量判别');
  });

  it('labels Q5 as the complete binary-tree maximum lab', () => {
    expect(questionLabLink('cn408-2009-q05')?.label).toBe('完全二叉树最大结点数');
  });

  it('labels Q3 as the binary-tree traversal lab', () => {
    expect(questionLabLink('cn408-2009-q03')?.label).toBe('二叉树递归遍历');
  });

  it('labels Q37 as the CSMA/CD collision-domain lab', () => {
    expect(questionLabLink('cn408-2009-q37')?.label).toBe('CSMA/CD 碰撞域距离');
  });

  it('labels Q34 as the QAM and Nyquist rate lab', () => {
    expect(questionLabLink('cn408-2009-q34')?.label).toBe('QAM / 奈氏最大速率');
  });

  it('labels Q38 as the TCP cumulative ACK lab', () => {
    expect(questionLabLink('cn408-2009-q38')?.label).toBe('TCP 累计确认');
  });

  it('labels Q6 as the forest and binary-tree conversion lab', () => {
    expect(questionLabLink('cn408-2009-q06')?.label).toBe('森林与二叉树转换');
  });

  it('labels Q27 as the segmented-address maximum-length lab', () => {
    expect(questionLabLink('cn408-2009-q27')?.label).toBe('分段地址最大段长');
  });

  it('labels Q24 as the HRRN process-scheduling lab', () => {
    expect(questionLabLink('cn408-2009-q24')?.label).toBe('高响应比进程调度');
  });

  it('labels Q20 as the bus bandwidth lab', () => {
    expect(questionLabLink('cn408-2009-q20')?.label).toBe('总线带宽');
  });

  it('labels Q36 as the switch forwarding lab', () => {
    expect(questionLabLink('cn408-2009-q36')?.label).toBe('交换机目的物理地址转发');
  });

  it('labels Q40 as the FTP control connection lab', () => {
    expect(questionLabLink('cn408-2009-q40')?.label).toBe('FTP 控制连接');
  });
});
