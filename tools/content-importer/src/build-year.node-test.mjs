import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAnswerTable,
  parseAnswerTableGeometry,
  parseCsgraduatesKey,
  reconcileKeys,
  splitNumberedBlocks,
  splitOptions,
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
});
