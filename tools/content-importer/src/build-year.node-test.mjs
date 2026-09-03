import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeComplexityNotation,
  normalizeRebuildText,
  parseAnswerTable,
  parseAnswerTableGeometry,
  parseCsgraduatesKey,
  reconcileKeys,
  splitExplanations,
  splitNumberedBlocks,
  splitOptions,
  stemReferencesFigure,
  trimExplanationNoise,
  tryParseAnswerTablePage,
} from './build-year.mjs';

describe('build-year pure parsers', () => {
  it('splitNumberedBlocks 按期望题号切分并忽略正文数字', () => {
    const pages = [
      '2010 年试卷 第1页，共2页\n1. 第一题\nA. x\n2. 散列函数 H(key)=(key×3) mod 7，因子 0.7\n3. 第三题',
      '2010 年试卷 第2页，共2页\n3. 重复页码行不应误切\n4. 第四题',
    ];
    const blocks = splitNumberedBlocks(pages, 4);
    assert.deepEqual(blocks.map((block) => block.number), [1, 2, 3, 4]);
    assert.match(blocks[1].text, /0\.7/);
    assert.deepEqual(blocks[3].pages, [2]);
  });

  it('splitOptions 支持行内选项并拒绝图示选项题', () => {
    const parsed = splitOptions('题干内容\nA. 甲 B. 乙\nC. 丙 D. 丁');
    assert.equal(parsed.stem, '题干内容');
    assert.deepEqual(parsed.options.map((option) => option.text), ['甲', '乙', '丙', '丁']);
    assert.equal(splitOptions('题干只有图形选项'), null);
  });

  it('splitExplanations 标准形态切分且不带下一题标记尾巴', () => {
    const pages = [
      '1. 解析：\n第一题解析正文。\n2. 解析：\n第二题正文，含数字 3. 不会误切。',
      '3. 解答：\n综合题正文。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(1).text, '第一题解析正文。');
    assert.equal(result.get(2).text, '第二题正文，含数字 3. 不会误切。');
    assert.equal(result.get(3).text, '综合题正文。');
    assert.equal(result.get(1).page, 1);
    assert.equal(result.get(3).page, 2);
  });

  it('splitExplanations 把被提取成 l/I 的数字 1 识别为题号（2011/2016 形态）', () => {
    const lower = splitExplanations(['l. 解析：\n第一题。\n2. 解析：\n第二题。']);
    assert.equal(lower.get(1).text, '第一题。');
    const upper = splitExplanations(['I. 解析：\n第一题。\n2. 解析：\n第二题。']);
    assert.equal(upper.get(1).text, '第一题。');
  });

  it('splitExplanations 容忍数字与分隔符之间的空格（2012/2014/2016 断链形态）', () => {
    const pages = ['1. 解析：\n第一题。\n2 . 解析：\n第二题。', '3 .. 解析：\n第三题（2015 双点形态）。'];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(2).text, '第二题。');
    assert.equal(result.get(3).text, '第三题（2015 双点形态）。');
  });

  it('splitExplanations 识别数字内空格、• 分隔与【解析】方括号（2020 形态）', () => {
    const pages = [
      '0 1 .【解析】\n第一题正文。\n02.【解析】\n第二题正文。\n3• 【解析】\n第三题正文。\n4 . 【解析】\n第四题正文。',
      '05 . 【解析】\n第五题正文。\n06.【解析】\n第六题正文。\n07.【解析】\n第七题正文。\n08.【解析】\n第八题正文。\n09.【解析】\n第九题正文。',
      '10.【解析】\n第十题正文。\n1 1 .【解析】\n第十一题正文。\n12 . 【解析】\n第十二题正文。\n13• 【解析】\n第十三题正文。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 13);
    assert.equal(result.get(1).text, '第一题正文。');
    assert.equal(result.get(11).text, '第十一题正文。');
    assert.equal(result.get(12).text, '第十二题正文。');
    assert.equal(result.get(13).text, '第十三题正文。');
    assert.equal(result.get(1).page, 1);
    assert.equal(result.get(11).page, 3);
  });

  it('splitExplanations 容忍关键词内部空格（2018 “解 析” 形态）', () => {
    const result = splitExplanations(['1. 解 析：\n第一题。\n2. 解 析：\n第二题。']);
    assert.equal(result.size, 2);
    assert.equal(result.get(2).text, '第二题。');
  });

  it('splitExplanations 容忍题号与【解析】之间的答案字母（2022 形态）', () => {
    const pages = [
      '01. B。【解析】当外层循环变量变化时结果不同。\n02. D。【解析】通过模拟出入栈判断。',
      '3. c. 【解析】时刻 0 发生超时。\n4. D。【解析】TCP 释放过程。\n05.【解析】\n综合题正文。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 5);
    assert.equal(result.get(1).text, '当外层循环变量变化时结果不同。');
    assert.equal(result.get(3).text, '时刻 0 发生超时。');
    assert.equal(result.get(5).text, '综合题正文。');
  });

  it('splitExplanations 定位【参考答案】块内的【解析】起点，并容忍分隔符后的换行（2023 形态）', () => {
    const pages = [
      '1.【参考答案】D \n【解析】 线性表的顺序存储结构采用一组地址连续的存储单元。\n2.【参考答案】C \n【解析】 主要考察双链表的插入操作。',
      '3.【解析】 \n（1）算法的第一步。\n4.\n【解析】\n（1）FTP 的控制连接是持久的。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 4);
    assert.equal(result.get(1).text, '线性表的顺序存储结构采用一组地址连续的存储单元。');
    assert.equal(result.get(2).text, '主要考察双链表的插入操作。');
    assert.equal(result.get(3).text, '（1）算法的第一步。');
    assert.equal(result.get(4).text, '（1）FTP 的控制连接是持久的。');
  });

  it('splitExplanations 顺序门禁拒绝正文里的越界标记', () => {
    const pages = ['1. 解析：\n正文引用 42. 解析：不应误切。\n答案速对里也不会出现解析标记。'];
    const result = splitExplanations(pages);
    assert.equal(result.size, 1);
    assert.equal(result.get(1).text.includes('42. 解析：'), true);
  });

  it('splitExplanations 识别扫描卷 OCR 的紧凑标记（2019 形态）', () => {
    const pages = [
      '1.解析：\n线性表是典型题型。\n2.解析：\n完全二叉树的性质。',
      '3.解析：当数据规模较小时可选择简单排序方法。\n答案速对 1. D 2. B 3. A 不会被误切。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(1).text, '线性表是典型题型。');
    assert.equal(result.get(3).text.includes('当数据规模较小时可选择简单排序方法。'), true);
    assert.equal(result.get(3).text.includes('答案速对'), true);
    assert.equal(result.get(3).page, 2);
  });

  it('splitExplanations 忽略页文本内嵌的换页符，页码不虚增（2023 形态）', () => {
    const pages = ['1. 解析：\n第一题正文\f内嵌换页符。\n2. 解析：\n第二题。', '3. 解析：\n第三题。'];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(1).text, '第一题正文\n内嵌换页符。');
    assert.equal(result.get(2).page, 1);
    assert.equal(result.get(3).page, 2);
  });

  it('splitExplanations 截断粘进末块的外来试卷页（2020 形态）', () => {
    const pages = [
      '1. 解析：\n第一题。',
      '2. 解析：\n第二题真实答案到此结束。\n2019全国硕士研究生招生考试计算机学科专业基础试题\n一、单项选择题\n01.设n是描述问题规模的非负整数，下列程序段的时间复杂度是( )。\nA. O(log n) B. O(n)',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.get(2).text, '第二题真实答案到此结束。');
  });

  it('splitExplanations 识别扫描卷综合题【答案要点】并锚定首标记（2024/2025 形态）', () => {
    const pages = [
      '2024年全国硕士研究生招生考试\n计算机学科专业基础试题参考答案\n一、单项选择题\n1.D 2.A 3.A 4.B 5.D\n二、综合应用题\n41.【答案要点】\n（1）算法的基本设计思想\n建立图G各顶点的入度表。',
      'int uniquely(MGraph G)\n42.【答案要点】\n(1）HT如下\n装填因子α=7/11。',
      '43.【答案要点】\n（1）最多有2=32个通用寄存器。',
    ];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(41).text.startsWith('（1）算法的基本设计思想'), true);
    assert.equal(result.get(41).page, 1);
    assert.equal(result.get(42).text, '(1）HT如下\n装填因子α=7/11。');
    assert.equal(result.get(42).page, 2);
    assert.equal(result.get(43).text, '（1）最多有2=32个通用寄存器。');
    assert.equal(result.get(1), undefined);
  });

  it('splitExplanations 全量年份的越界前置标记不触发锚定重扫', () => {
    const pages = ['42. 解析：\n杂项引用不应锚定。\n1. 解析：\n第一题。\n2. 解析：\n第二题。'];
    const result = splitExplanations(pages);
    assert.equal(result.size, 2);
    assert.equal(result.get(1).text, '第一题。');
    assert.equal(result.get(42), undefined);
  });

  it('normalizeComplexityNotation 恢复复杂度上下标并把 0( 修正为 O(', () => {
    assert.equal(
      normalizeComplexityNotation('时间复杂度为O(n2), 空间复杂度为0(1)。'),
      '时间复杂度为O(n²), 空间复杂度为O(1)。',
    );
    assert.equal(
      normalizeComplexityNotation('A. O(log2n) B. O(n) C. O(nlog 2n) D. O(n 2)'),
      'A. O(log₂n) B. O(n) C. O(nlog₂n) D. O(n²)',
    );
    assert.equal(
      normalizeComplexityNotation('B. O(n1/2)；需要进 行 O(n112) 趟循环'),
      'B. O(n^(1/2))；需要进 行 O(n^(1/2)) 趟循环',
    );
    assert.equal(normalizeComplexityNotation('时间0(n), 空间O(n)'), '时间O(n), 空间O(n)');
    assert.equal(normalizeComplexityNotation('空间复杂度 O(login)'), '空间复杂度 O(log n)');
    assert.equal(normalizeComplexityNotation('邻接矩阵的空间复杂度为O(n\n2)'), '邻接矩阵的空间复杂度为O(n²)');
  });

  it('normalizeComplexityNotation 归一 OCR 全角/混搭括号的复杂度记法', () => {
    assert.equal(
      normalizeComplexityNotation('算法的时间复杂度为0（n）；空间复杂度为O(1）。'),
      '算法的时间复杂度为O(n)；空间复杂度为O(1)。',
    );
    assert.equal(
      normalizeComplexityNotation('平均时间复杂度为O（n²），比较次数为O（1）。'),
      '平均时间复杂度为O(n²)，比较次数为O(1)。',
    );
    assert.equal(
      normalizeComplexityNotation('页框号范围0（0～199）保持原样'),
      '页框号范围0（0～199）保持原样',
    );
  });

  it('normalizeComplexityNotation 不误伤汇编寻址、dB 公式、位串与中文括注', () => {
    const assembly = 'I2：load s3, 0(t2) //R[s3]←M[R[t2]+0]\nlw r5, 0(r4) //R[r5]←M[R[r4]+0]';
    assert.equal(normalizeComplexityNotation(assembly), assembly);
    const shannon = '信噪比=10log10(S/N), 信道容量 C=Wlog2(1+S/N)';
    assert.equal(normalizeComplexityNotation(shannon), shannon);
    const binary = '地址范围为110...00(28 个 0)~11...1(30 个 1)，十六进制表示为 300000000H';
    assert.equal(normalizeComplexityNotation(binary), binary);
    const prose = '结点数比边数多10 (即25-15 = 10), 显然共有10棵树。';
    assert.equal(normalizeComplexityNotation(prose), prose);
    const kept = 'O(n + e)、O(ne)、O(p/2)、O(lenl+len2) 与 0(28H) 均保持原样';
    assert.equal(normalizeComplexityNotation(kept), kept);
  });

  it('trimExplanationNoise 裁掉块尾答案表并保留正文（2013 Q3 形态）', () => {
    const text = '利用 7 个关键字构建平衡二叉树 T, 构建的平衡二叉\n树如下图所示。构造及调整的过程如下：\n1. \n9. \n17. \n25. \n33. \n3. \n11. \nDCBCD 4. \n12. \nDAABA CCABB CADBB';
    assert.equal(
      trimExplanationNoise(text, 2013, 3),
      '利用 7 个关键字构建平衡二叉树 T, 构建的平衡二叉\n树如下图所示。构造及调整的过程如下：',
    );
  });

  it('trimExplanationNoise 裁掉块中表格与图示残留并保留后续正文（2016 Q1 形态）', () => {
    const text = '根据存储状态，单链表的结构如下图所示。\nDABAC \n.... \n.l975 31l23 CDB \nBD \n4. \n40. \nBCBAC \n1008H 1000H 1010H \n101411 三\n二\n其中“链接地址”是指结点 next 所指的内存地址。即 1014H 、 1004H 和 1010H 。';
    assert.equal(
      trimExplanationNoise(text, 2016, 1),
      '根据存储状态，单链表的结构如下图所示。\n其中“链接地址”是指结点 next 所指的内存地址。即 1014H 、 1004H 和 1010H 。',
    );
  });

  it('trimExplanationNoise 锚点失配即失败，无锚点题原样返回', () => {
    assert.throws(() => trimExplanationNoise('正文没有答案表锚点。', 2013, 3), /anchor "from" not found/);
    assert.equal(trimExplanationNoise('普通年份的普通解析。', 2010, 1), '普通年份的普通解析。');
  });

  it('parseAnswerTableGeometry 支持密排列组、直接单元格与连排三种形态', () => {
    const denseFragments = [
      { x: 94, y: 541, text: '1. DBDBC' },
      { x: 145, y: 541, text: '2. CDBAC' },
      { x: 196, y: 541, text: '3. DAADD' },
      { x: 247, y: 541, text: '4. CDDBC' },
      { x: 298, y: 541, text: '5. BBABB' },
      { x: 349, y: 541, text: '6. ABDCD' },
      { x: 400, y: 541, text: '7. BACBA' },
      { x: 451, y: 541, text: '8. BCADC' },
    ];
    const dense = parseAnswerTableGeometry([{ page: 1, fragments: denseFragments }]);
    assert.ok(dense, 'dense table should parse to 40 answers');
    assert.equal(dense.get(1), 'D');
    assert.equal(dense.get(9), 'B');
    assert.equal(dense.get(40), 'C');

    const grid = tryParseAnswerTablePage([
      { x: 69, y: 541, text: '1.' },
      { x: 120, y: 541, text: 'D 2.' },
      { x: 68, y: 526, text: '9. C' },
    ]);
    assert.equal(grid.get(1), 'D');
    assert.equal(grid.get(9), 'C');

    const chained = tryParseAnswerTablePage([
      { x: 69, y: 541, text: '1.' },
      { x: 94, y: 541, text: 'B 2. A 3. A 4. B 5. C 6. C 7. C 8. A' },
      { x: 68, y: 526, text: '9. D' },
      { x: 94, y: 526, text: '10.' },
    ]);
    assert.equal(chained.get(1), 'B');
    assert.equal(chained.get(2), 'A');
    assert.equal(chained.get(8), 'A');
    assert.equal(chained.get(9), 'D');
  });

  it('parseAnswerTable 按列块映射题号（N, N+8, N+16, N+24, N+32）', () => {
    const layout = [
      ' 1.  ABCDA 2.  BCDAB 3.  CDABC 4.  DABCD ',
      ' 5.  ABCDA 6.  BCDAB 7.  CDABC 8.  DABCD ',
    ];
    const key = parseAnswerTable(layout);
    assert.equal(key.size, 40);
    assert.equal(key.get(1), 'A');
    assert.equal(key.get(9), 'B');
    assert.equal(key.get(17), 'C');
    assert.equal(key.get(40), 'D');
  });

  it('parseCsgraduatesKey 顺序解析 1-40 并拒绝乱序', () => {
    const html = '<div>答案速对</div> 1 D 2 C 3 D 4 C 5 B';
    assert.equal(parseCsgraduatesKey(`${html} ${Array.from({ length: 35 }, (_, index) => `${index + 6} ${'ABCD'[index % 4]}`).join(' ')}`).size, 40);
    assert.throws(() => parseCsgraduatesKey('<div>答案速对</div> 1 D 3 D'));
  });

  it('reconcileKeys 报告全部不一致项', () => {
    const primary = new Map(Array.from({ length: 40 }, (_, index) => [index + 1, 'A']));
    const secondary = new Map(Array.from({ length: 40 }, (_, index) => [index + 1, 'A']));
    secondary.set(5, 'B');
    secondary.set(9, 'C');
    assert.deepEqual(reconcileKeys(primary, secondary), [
      { number: 5, left: 'A', right: 'B' },
      { number: 9, left: 'A', right: 'C' },
    ]);
  });

  it('normalizeRebuildText 只替换白名单形近错字', () => {
    assert.equal(normalizeRebuildText('长度大千等于 3'), '长度大于等于 3');
    assert.equal(normalizeRebuildText('不小千其左、右子树'), '不小于其左、右子树');
    assert.equal(normalizeRebuildText('己知三叉树T中'), '已知三叉树T中');
    assert.equal(normalizeRebuildText('由千转速为6000rpm'), '由于转速为6000rpm');
    assert.equal(normalizeRebuildText('对千统考算法题，己经结束'), '对于统考算法题，已经结束');
    // 白名单按完整组合替换（题面语境中“大千世界”类用法不存在，属已知且可接受的过替换）；
    // 不在白名单中的正常文本保持原样。
    assert.equal(normalizeRebuildText('一千个结点的树'), '一千个结点的树');
    assert.equal(normalizeRebuildText('已知条件成立'), '已知条件成立');
    // 2012 Q1 递归代码的右括号被提取成 0。
    assert.equal(normalizeRebuildText('return n*fact(n-10)'), 'return n*fact(n-1)');
  });

  it('stemReferencesFigure 识别题干引用图的形式', () => {
    assert.ok(stemReferencesFigure('下图所示的AOE网表示一项工程'));
    assert.ok(stemReferencesFigure('如题 38 图所示'));
    assert.ok(stemReferencesFigure('散列表HT如下图'));
    assert.ok(stemReferencesFigure('采用流程图描述算法'));
    assert.ok(!stemReferencesFigure('下列选项中，可能会将进程唤醒的事件是'));
    assert.ok(!stemReferencesFigure('图的定义中不允许边权为负')); // “图的”不在白名单
  });
});
