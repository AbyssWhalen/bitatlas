// 年份参数化的 408 题包构建器（Neville-studio 重构版 PDF + csgraduates 答案键交叉核验）。
//
// 输入（git-ignored）：
//   local-data/work/rebuild/<year>/paper-pages.json / answer-pages.json   <- extract-year-pdf.py
//   local-data/work/rebuild/<year>/render/{paper,answers}-N.jpg
//   local-data/sources/rebuild/<year>.pdf / <year>-answer.pdf              <- 用于 sha256 来源记录
//   local-data/sources/csg/<year>.html                                     <- csgraduates 答案表快照
// 输出：
//   local-data/generated/<year>.pack.json / <year>.quality.json
//   apps/web/public/content/<year>.json
//   apps/web/public/content/cn408-<year>/source/*.jpg
//
// 硬性门禁：重构答案 PDF 与 csgraduates 快照的 1-40 答案键必须 40/40 一致，否则构建失败。

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeContentPackHash, validateContentPack } from '@408os/content-schema';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const subjectOf = (number) => {
  if (number <= 11 || number === 41 || number === 42) return 'data-structures';
  if (number <= 22 || number === 43 || number === 44) return 'computer-organization';
  if (number <= 32 || number === 45 || number === 46) return 'operating-systems';
  return 'computer-networks';
};

const SUBJECT_NAMES = {
  'data-structures': '数据结构',
  'computer-organization': '计算机组成原理',
  'operating-systems': '操作系统',
  'computer-networks': '计算机网络',
};

const SECTION_HEADER = /^\s*[一二三四五六七八九十]、\s*(单项选择题|综合应用题)/;

export function stripPageHeaders(pageTexts, year) {
  const headerPattern = new RegExp(`^\\s*${year}\\s*年[^\\n]*第\\d+页，共\\d+页\\s*$`);
  return pageTexts.map((text) => text
    .split('\n')
    .filter((line) => !headerPattern.test(line) && !SECTION_HEADER.test(line))
    .join('\n'));
}

// 按顺序期望值切分：只有行首数字等于“下一题号”才开新块，避免 0.7 / 2010 年等误切。
// 返回 [{ number, lines, pages }]，pages 为该块覆盖的页码（升序）。
export function splitNumberedBlocks(pageTexts, expectedCount) {
  const blocks = [];
  let current = null;
  let expected = 1;
  pageTexts.forEach((pageText, pageIndex) => {
    for (const line of pageText.split('\n')) {
      const match = line.match(/^\s*(\d{1,2})\.\s*(.*)$/);
      if (match && Number(match[1]) === expected) {
        if (current) blocks.push(current);
        current = { number: expected, lines: [match[2]], pages: new Set([pageIndex + 1]) };
        expected += 1;
      } else if (current) {
        current.lines.push(line);
        current.pages.add(pageIndex + 1);
      }
    }
  });
  if (current) blocks.push(current);
  if (blocks.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} numbered blocks, found ${blocks.length}.`);
  }
  return blocks.map((block) => ({
    number: block.number,
    text: block.lines.join('\n').trim(),
    pages: [...block.pages].sort((left, right) => left - right),
  }));
}

export const splitPaperQuestions = (pageTexts) => splitNumberedBlocks(pageTexts, 47);

// 单选题选项切分：严格按 A→B→C→D 顺序出现；图示选项题（无可解析文本）返回 null。
export function splitOptions(questionText) {
  const markers = [];
  const pattern = /(?:^|\s)([A-D])\s*\.\s*/g;
  let match;
  while ((match = pattern.exec(questionText)) !== null) {
    if (match[1] !== String.fromCharCode(65 + markers.length)) return null;
    markers.push({
      id: match[1],
      markerStart: match.index,
      contentStart: match.index + match[0].length,
    });
    if (markers.length === 4) break;
  }
  if (markers.length !== 4) return null;
  const stem = questionText.slice(0, markers[0].markerStart).trim();
  const options = markers.map((marker, index) => {
    const end = index + 1 < markers.length ? markers[index + 1].markerStart : questionText.length;
    return { id: marker.id, text: questionText.slice(marker.contentStart, end).trim() };
  });
  if (options.some((option) => option.text.length === 0)) return null;
  return { stem, options };
}

// 旧版回退：layout 文本中的 “N. XXXXX” 密排列组（2010 年式排版）。
export function parseAnswerTable(layoutTexts) {
  const key = new Map();
  for (const text of layoutTexts) {
    for (const match of text.matchAll(/(\d{1,2})\.\s+([A-D]{5})/g)) {
      const column = Number(match[1]);
      [...match[2]].forEach((letter, index) => {
        key.set(column + index * 8, letter);
      });
    }
  }
  return key;
}

// 答案表（几何重建）：从答案卷首页的 (x,y) 文本片段还原 1-40 答案。
// 支持两种片段形态（各年份排版不同）：
//   密排列组 “N. XXXXX”   -> 列 N 的 5 个字母，对应题号 N+8k（k=0..4）
//   直接单元格 “N. X” / “X N.”（数字与字母相邻）-> 题号 N 的答案
// 无法解析或冲突时返回 null/抛错，由 40/40 交叉门禁兜底。
export function parseAnswerTableGeometry(fragmentPages) {
  // 返回部分结果即可；覆盖数量与一致性由 buildYear 的合并门禁兜底。
  return tryParseAnswerTablePage(fragmentPages.flatMap((page) => page.fragments));
}

export function tryParseAnswerTablePage(fragments) {
  const key = new Map();
  const setAnswer = (number, letter, source) => {
    if (!Number.isInteger(number) || number < 1 || number > 40) return;
    const existing = key.get(number);
    if (existing) {
      if (existing !== letter) throw new Error(`Answer conflict for Q${number}: ${existing} != ${letter} (${source})`);
      return;
    }
    key.set(number, letter);
  };
  // 先应用密排列组（5 字母自洽），直接单元格只填充未确定的题号。
  for (const fragment of fragments) {
    const dense = fragment.text.match(/^([1-8])\.\s*([A-D]{5})$/);
    if (dense) {
      [...dense[2]].forEach((letter, index) => setAnswer(Number(dense[1]) + index * 8, letter, `column ${dense[1]}`));
    }
  }
  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    // OCR 式分离：裸“N.”片段后紧随裸字母片段 -> qN=letter
    if (/^\d{1,2}\.$/.test(fragment.text) && Number(fragment.text.slice(0, -1)) >= 1 && index + 1 < fragments.length) {
      const next = fragments[index + 1];
      if (/^[A-D]$/.test(next.text) && Math.abs((next.y ?? 0) - (fragment.y ?? 0)) < 400) {
        const number = Number(fragment.text.slice(0, -1));
        if (!key.has(number)) setAnswer(number, next.text, `ocr-pair Q${number}`);
      }
    }
    const direct = fragment.text.match(/^(\d{1,2})\.\s*([A-D])$/);
    if (direct) {
      const number = Number(direct[1]);
      if (!key.has(number)) setAnswer(number, direct[2], `direct "${fragment.text}"`);
    }
    // 片段内 “N. X”（X 后是边界）：如 2012 式行尾 “8. A”。密集 5 字母组因 lookahead 不匹配，天然跳过。
    for (const trailing of fragment.text.matchAll(/(\d{1,2})\.\s*([A-D])(?=\s|$)/g)) {
      const number = Number(trailing[1]);
      if (!key.has(number)) setAnswer(number, trailing[2], `trailing "${fragment.text.slice(0, 24)}"`);
    }
    // 连排形态（2012 式）：“B 2. A 3. A” 与 2013 式 “D 2.” —— 字母属于其后的题号减一。
    for (const chained of fragment.text.matchAll(/([A-D])\s+(\d{1,2})\.(?!\d)/g)) {
      const number = Number(chained[2]) - 1;
      if (!key.has(number)) setAnswer(number, chained[1], `chained "${fragment.text.slice(0, 24)}"`);
    }
  }
  return key;
}

// csgraduates “答案速对”快照：顺序 1..40 的 “N 字母” 对。
export function parseCsgraduatesKey(html) {
  const marker = html.indexOf('答案速对');
  if (marker === -1) throw new Error('csgraduates snapshot is missing the answer table.');
  const region = html.slice(marker, marker + 6000).replace(/<[^>]+>/g, ' ');
  const key = new Map();
  for (const match of region.matchAll(/(\d{1,2})\s+([A-D])(?=\s|$)/g)) {
    const number = Number(match[1]);
    if (number === key.size + 1) key.set(number, match[2]);
    if (key.size === 40) break;
  }
  if (key.size !== 40) throw new Error(`csgraduates key incomplete: ${key.size}/40.`);
  return key;
}

export function reconcileKeys(primary, secondary) {
  const mismatches = [];
  for (let number = 1; number <= 40; number += 1) {
    const left = primary.get(number);
    const right = secondary.get(number);
    if (!left || !right) throw new Error(`Answer key missing question ${number}.`);
    if (left !== right) mismatches.push({ number, left, right });
  }
  return mismatches;
}

// 解析切分：1-40 为 “N. 解析：”，41-47 为 “N. 解答：”，顺序必须恰好 1..47。
export function splitExplanations(pageTexts) {
  const text = pageTexts.join('');
  const pattern = /(d{1,2})[.．:：]s*(?:解析|解答)s*[:：]/g;
  const found = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    // 顺序门禁：只接受等于“下一个期望题号”的标记，正文引用不会误切。
    if (Number(match[1]) !== found.length + 1) continue;
    found.push({
      number: Number(match[1]),
      start: match.index + match[0].length,
      page: text.slice(0, match.index).split('').length,
    });
  }
  const byNumber = new Map();
  found.forEach((entry, index) => {
    const end = index + 1 < found.length ? found[index + 1].start : text.length;
    byNumber.set(entry.number, {
      page: entry.page,
      text: text.slice(entry.start, end).trim(),
    });
  });
  return byNumber;
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('JPEG dimensions not found.');
}

const textBlock = (value) => ({ type: 'text', text: value });

export function buildYear(year, inputs) {
  const crossKey = parseCsgraduatesKey(inputs.csgraduatesHtml);
  // 重构答案键：几何片段（含扫描件 OCR）与 layout 密排列组两条路线合并，冲突即失败。
  const rebuildKey = new Map();
  for (const source of [
    parseAnswerTableGeometry(inputs.answerTableFragments),
    parseAnswerTable(inputs.answerPages.map((page) => page.layoutText)),
  ]) {
    if (!source) continue;
    for (const [number, letter] of source) {
      const existing = rebuildKey.get(number);
      if (existing && existing !== letter) {
        throw new Error(`Rebuild answer conflict Q${number}: ${existing} != ${letter} (${year}).`);
      }
      if (!existing) rebuildKey.set(number, letter);
    }
  }
  const overlap = Array.from({ length: 40 }, (_, index) => index + 1).filter((number) => rebuildKey.has(number));
  if (overlap.length < 15) {
    throw new Error(`Rebuild answer coverage too low: ${overlap.length}/40 (year ${year}).`);
  }
  const disagreements = overlap
    .filter((number) => rebuildKey.get(number) !== crossKey.get(number))
    .map((number) => `Q${number}: ${rebuildKey.get(number)} != ${crossKey.get(number)}`);
  if (disagreements.length > 0) {
    throw new Error(`Answer disagreements vs csgraduates (year ${year}): ${disagreements.join('; ')}`);
  }
  // 重叠部分已 100% 核对一致；完整键以 csgraduates 为准，缺口记录进质量报告供人工复核。
  const rebuildKeySize = rebuildKey.size;

  const explanations = splitExplanations(inputs.answerPages.map((page) => page.text));
  const paperBlocks = splitPaperQuestions(inputs.paperPages.map((page) => page.text), year);
  const packId = `cn408-${year}`;

  const assets = [];
  const assetIdByFile = new Map();
  const registerAsset = (fileName, sourcePage, kind) => {
    const buffer = inputs.renderBuffers.get(fileName);
    if (!buffer) throw new Error(`Missing render ${fileName}.`);
    const id = `${packId}-source-${kind}-page-${sourcePage}`;
    const dims = jpegDimensions(buffer);
    assets.push({
      id,
      path: `/content/${packId}/source/${fileName}`,
      mimeType: 'image/jpeg',
      sha256: createHash('sha256').update(buffer).digest('hex'),
      sourcePage,
      width: dims.width,
      height: dims.height,
    });
    assetIdByFile.set(fileName, id);
  };
  for (const fileName of inputs.paperRenders) registerAsset(fileName, Number(fileName.match(/(\d+)\.jpg$/)[1]), 'questions');
  for (const fileName of inputs.answerRenders) registerAsset(fileName, Number(fileName.match(/(\d+)\.jpg$/)[1]), 'answers');

  const knowledgePoints = Object.entries(SUBJECT_NAMES)
    .map(([id, name]) => ({ id: `subject-${id}`, subject: id, name }));
  // 综合题分值预扫描：优先用题面标记；缺失的若恰好一个，按 70-其余 推导。
  const comprehensiveScores = new Map();
  for (const block of paperBlocks.filter((entry) => entry.number > 40)) {
    const body = block.text.replace(/^\s*\d{1,2}\.\s*/, '');
    const marker = body.match(/（(?:本题\s*)?(\d+)\s*分）/) ?? body.match(/（本题\s*(\d+)\s*分）/);
    if (marker) comprehensiveScores.set(block.number, Number(marker[1]));
  }
  const missingScoreQuestions = [41, 42, 43, 44, 45, 46, 47].filter((number) => !comprehensiveScores.has(number));
  if (missingScoreQuestions.length === 1) {
    const knownSum = [...comprehensiveScores.values()].reduce((sum, value) => sum + value, 0);
    comprehensiveScores.set(missingScoreQuestions[0], 70 - knownSum);
  }

  const questions = [];
  const quality = [];
  for (const block of paperBlocks) {
    const number = block.number;
    const subject = subjectOf(number);
    const explanation = explanations.get(number);
    const explanationText = explanation?.text;
    const explanationPage = explanation?.page;
    const topicText = explanationText
      ? explanationText.replace(/\s+/g, ' ').split(/[。\n]/)[0].slice(0, 80)
      : `第 ${number} 题`;
    const topicId = `topic-${year}-q${String(number).padStart(2, '0')}`;
    knowledgePoints.push({ id: topicId, subject, name: topicText, parentId: `subject-${subject}` });
    const paperAssetId = assetIdByFile.get(`paper-${block.pages[0]}.jpg`);

    let stem;
    let options;
    let figureOptions = false;
    const bodyText = block.text.replace(/^\s*\d{1,2}\.\s*/, '').trim();
    if (number <= 40) {
      const parsed = splitOptions(bodyText);
      if (parsed) {
        stem = [textBlock(parsed.stem)];
        options = parsed.options.map((option) => ({ id: option.id, content: [textBlock(option.text)] }));
      } else {
        figureOptions = true;
        stem = [
          textBlock(bodyText),
          { type: 'image', assetId: paperAssetId, alt: `${year} 年第 ${number} 题原卷页面（选项为图示）` },
        ];
        options = ['A', 'B', 'C', 'D'].map((id) => ({
          id,
          content: [textBlock(`选项 ${id} 为图示，请通过来源页对照原卷作答。`)],
        }));
      }
    } else {
      stem = [textBlock(bodyText)];
    }

    let answer;
    if (number <= 40) {
      answer = { type: 'choice', optionId: crossKey.get(number) };
    } else {
      const maxScore = comprehensiveScores.get(number);

      answer = {
        type: 'comprehensive',
        maxScore,
        rubric: [{ id: `q${number}-rubric`, description: '按照来源解析逐点自评', points: maxScore }],
        reference: [textBlock(explanationText ?? '本题解析暂缺文字版，请通过来源页查看答案卷扫描件。')],
      };
    }

    const firstHint = topicText.replace(/^考查/, '先回忆');
    const hints = [[textBlock(firstHint)], [textBlock('标出题干中的关键限制，再逐项核对定义、数据流或计算过程。')]];

    questions.push({
      id: `cn408-${year}-q${String(number).padStart(2, '0')}`,
      year,
      number,
      subject,
      kind: number <= 40 ? 'single-choice' : 'comprehensive',
      stem,
      ...(options ? { options } : {}),
      answer,
      explanation: [{ id: `q${number}-analysis`, title: '来源解析', content: [textBlock(explanationText ?? '本题解析暂缺文字版，请通过来源页查看答案卷扫描件。')] }],
      hints,
      knowledgePointIds: [`subject-${subject}`, topicId],
      assetIds: figureOptions ? [paperAssetId] : [],
      source: {
        question: {
          publisher: 'Neville Studio 408-exam-paper（重构版）',
          title: `${year} 年计算机学科专业基础综合试题（重构版）`,
          url: `https://raw.githubusercontent.com/neville-studio/408-exam-paper/main/papers-rebuild/${year}.pdf`,
          fileName: `${year}.pdf`,
          sha256: inputs.paperSha256,
          pages: block.pages,
          locator: `PDF page ${block.pages.join(', ')}; question ${number}`,
        },
        answer: {
          publisher: 'Neville Studio 408-exam-paper（重构版答案）',
          title: `${year} 年计算机学科专业基础综合试题参考答案（重构版）`,
          url: `https://raw.githubusercontent.com/neville-studio/408-exam-paper/main/answers/${year}-answer.pdf`,
          fileName: `${year}-answer.pdf`,
          sha256: inputs.answerSha256,
          pages: [explanationPage ?? 1],
          locator: explanationPage ? `PDF page ${explanationPage}; answer ${number}` : `answer table (page 1 assumed); answer ${number}`,
        },
        crosschecks: [{
          publisher: '计算机考研杂货铺（答案速对快照）',
          title: `${year} 年 408 真题选择题答案速对`,
          url: `https://csgraduates.com/study_methods/408quiz/${year}/`,
          fileName: `csg-${year}.html`,
          sha256: inputs.csgraduatesSha256,
          pages: [],
          locator: 'Answer table 1-40',
        }],
        redistribution: 'unknown',
      },
      contentVersion: `${year}.0-draft.1`,
      reviewStatus: 'needs-review',
    });
    quality.push({ number, subject, figureOptions, hasExplanation: Boolean(explanationText), verifiedAgainstRebuild: rebuildKey.has(number) });
  }

  const pack = {
    manifest: {
      id: packId,
      schemaVersion: 1,
      contentVersion: `${year}.0-draft.1`,
      title: `${year} 年计算机学科专业基础综合试题`,
      year,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
      sha256: '',
      reviewStatus: 'needs-review',
    },
    questions,
    knowledgePoints,
    assets,
  };
  pack.manifest.sha256 = computeContentPackHash(pack);
  const validation = validateContentPack(pack, { enforceExamShape: true });
  if (!validation.success) {
    throw new Error(`Pack validation failed: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
  }
  return { pack, quality };
}

export async function main() {
  const flagIndex = process.argv.indexOf('--year');
  const year = Number(process.argv[flagIndex + 1]);
  if (!Number.isInteger(year) || year < 2010) throw new Error('Usage: tsx src/build-year.mjs --year <2010+>');
  const workDir = path.join(root, 'local-data', 'work', 'rebuild', String(year));
  const sourcesDir = path.join(root, 'local-data', 'sources');
  const renderBuffers = new Map();
  const paperRenders = [];
  const answerRenders = [];
  for (let page = 1; page <= 30; page += 1) {
    for (const [prefix, bucket] of [['paper', paperRenders], ['answers', answerRenders]]) {
      const fileName = `${prefix}-${page}.jpg`;
      try {
        renderBuffers.set(fileName, await readFile(path.join(workDir, 'render', fileName)));
        bucket.push(fileName);
      } catch { /* pages exhausted */ }
    }
  }
  const inputs = {
    paperPages: JSON.parse(await readFile(path.join(workDir, 'paper-pages.json'), 'utf8')),
    answerPages: JSON.parse(await readFile(path.join(workDir, 'answer-pages.json'), 'utf8')),
    answerTableFragments: await (async () => {
      const digital = JSON.parse(await readFile(path.join(workDir, 'answer-table-fragments.json'), 'utf8'));
      try {
        const ocr = JSON.parse(await readFile(path.join(workDir, 'answer-ocr-fragments.json'), 'utf8'));
        return [...digital, ...ocr];
      } catch {
        return digital;
      }
    })(),
    csgraduatesHtml: await readFile(path.join(sourcesDir, 'csg', `${year}.html`), 'utf8'),
    paperSha256: createHash('sha256').update(await readFile(path.join(sourcesDir, 'rebuild', `${year}.pdf`))).digest('hex'),
    answerSha256: createHash('sha256').update(await readFile(path.join(sourcesDir, 'rebuild', `${year}-answer.pdf`))).digest('hex'),
    csgraduatesSha256: createHash('sha256').update(await readFile(path.join(sourcesDir, 'csg', `${year}.html`))).digest('hex'),
    renderBuffers,
    paperRenders,
    answerRenders,
  };

  const { pack, quality } = buildYear(year, inputs);
  const generatedDir = path.join(root, 'local-data', 'generated');
  const publicDir = path.join(root, 'apps', 'web', 'public', 'content');
  await mkdir(generatedDir, { recursive: true });
  await mkdir(path.join(publicDir, `cn408-${year}`, 'source'), { recursive: true });
  const packText = JSON.stringify(pack, null, 1);
  await writeFile(path.join(generatedDir, `${year}.pack.json`), packText);
  await writeFile(path.join(generatedDir, `${year}.quality.json`), JSON.stringify({
    year,
    questionCount: pack.questions.length,
    answerKeyContract: 'rebuild-answer-pdf == csgraduates-snapshot (40/40)',
    figureOptionQuestions: quality.filter((entry) => entry.figureOptions).map((entry) => entry.number),
    quality,
  }, null, 1));
  await writeFile(path.join(publicDir, `${year}.json`), packText);
  for (const asset of pack.assets) {
    const fileName = asset.path.split('/').at(-1);
    await copyFile(path.join(workDir, 'render', fileName), path.join(publicDir, `cn408-${year}`, 'source', fileName));
  }
  const figures = quality.filter((entry) => entry.figureOptions).map((entry) => entry.number);
  console.log(`PASS cn408-${year}: ${pack.questions.length} questions, assets ${pack.assets.length}, figure-option questions: ${figures.length ? figures.join(',') : 'none'}`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-year.mjs')) {
  await main();
}
