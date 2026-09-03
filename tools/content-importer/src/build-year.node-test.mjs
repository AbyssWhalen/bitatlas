import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeRebuildText,
  parseAnswerTable,
  parseAnswerTableGeometry,
  parseCsgraduatesKey,
  reconcileKeys,
  splitExplanations,
  splitNumberedBlocks,
  splitOptions,
  stemReferencesFigure,
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

  it('splitExplanations 忽略页文本内嵌的换页符，页码不虚增（2023 形态）', () => {
    const pages = ['1. 解析：\n第一题正文\f内嵌换页符。\n2. 解析：\n第二题。', '3. 解析：\n第三题。'];
    const result = splitExplanations(pages);
    assert.equal(result.size, 3);
    assert.equal(result.get(1).text, '第一题正文\n内嵌换页符。');
    assert.equal(result.get(2).page, 1);
    assert.equal(result.get(3).page, 2);
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
