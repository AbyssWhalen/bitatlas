import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAnswerTable,
  parseCsgraduatesKey,
  reconcileKeys,
  splitNumberedBlocks,
  splitOptions,
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
});
