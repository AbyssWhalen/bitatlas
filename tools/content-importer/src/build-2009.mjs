import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeContentPackHash, validateContentPack } from '@408os/content-schema';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = path.join(root, 'local-data', 'sources');
const renderDir = path.join(root, 'local-data', 'work', 'render');
const generatedDir = path.join(root, 'local-data', 'generated');
const publicDir = path.join(root, 'apps', 'web', 'public', 'content');
const packId = 'cn408-2009';
const metadata = JSON.parse(await readFile(path.join(root, 'content', 'sources', '2009.json'), 'utf8'));
const markdown = await readFile(path.join(sourceDir, '2009-crosscheck.md'), 'utf8');
const overridesRaw = await readFile(path.join(sourceDir, '2009-overrides.json'), 'utf8');
const manualOverrides = JSON.parse(overridesRaw);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const overrideHash = sha256(overridesRaw);
const sourceDocument = (entry, pages, locator) => {
  const { localPath, ...document } = entry;
  if (typeof localPath !== 'string' || localPath.length === 0) throw new Error('Source metadata requires a localPath.');
  return { ...document, pages, locator };
};
const normalize = (value) => value.replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim();
const stripHtml = (value) => value
  .replace(/<\/td>/gi, ' | ')
  .replace(/<\/tr>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

const allowedOverrideFields = new Set([
  'knowledgePointName',
  'stem',
  'options',
  'answer',
  'explanation',
  'hints',
]);

if (manualOverrides.schemaVersion !== 1) throw new Error('2009 overrides require schemaVersion 1.');
if (typeof manualOverrides.contentVersion !== 'string' || manualOverrides.contentVersion.length === 0) {
  throw new Error('2009 overrides require a contentVersion.');
}
if (manualOverrides.reviewStatus !== 'needs-review') {
  throw new Error('Manual overrides must remain needs-review until a separate publication review.');
}
if (!manualOverrides.questions || typeof manualOverrides.questions !== 'object' || Array.isArray(manualOverrides.questions)) {
  throw new Error('2009 overrides require a questions object.');
}
for (const [questionNumber, override] of Object.entries(manualOverrides.questions)) {
  const number = Number(questionNumber);
  if (!Number.isInteger(number) || number < 1 || number > 47) {
    throw new Error(`Invalid override question number ${questionNumber}.`);
  }
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    throw new Error(`Question ${number} override must be an object.`);
  }
  for (const field of Object.keys(override)) {
    if (!allowedOverrideFields.has(field)) throw new Error(`Unknown question ${number} override field ${field}.`);
  }
}

function collectImageAssetIds(blocks) {
  return blocks.flatMap((block) => (block.type === 'image' ? [block.assetId] : []));
}

function readPngDimensions(bytes, sourcePath) {
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== pngSignature || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`Expected a PNG with an IHDR header at ${sourcePath}.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function splitSequential(lines, start, end, matcher) {
  const result = new Map();
  let expected = start;
  let current;
  for (const line of lines) {
    const match = line.match(matcher);
    const number = match ? Number(match[1]) : NaN;
    if (number === expected && number <= end) {
      current = { number, lines: [match[2] ?? ''] };
      result.set(number, current);
      expected += 1;
    } else if (current) {
      current.lines.push(line);
    }
  }
  return result;
}

function questionSubject(number) {
  if (number <= 10 || number === 41 || number === 42) return 'data-structures';
  if (number <= 22 || number === 43 || number === 44) return 'computer-organization';
  if (number <= 32 || number === 45 || number === 46) return 'operating-systems';
  return 'computer-networks';
}

function markdownBlocks(lines, fallbackAssetId, forceFallback = false) {
  const blocks = [];
  let paragraph = [];
  let code = [];
  let inCode = false;
  let complex = forceFallback;
  const flushParagraph = () => {
    const text = normalize(paragraph.join('\n'));
    if (text) blocks.push({ type: 'text', text: stripHtml(text) });
    paragraph = [];
  };
  const flushCode = () => {
    const value = normalize(code.join('\n'));
    if (value) blocks.push({ type: 'code', code: value });
    code = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      if (inCode) flushCode();
      else flushParagraph();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(rawLine);
      continue;
    }
    if (/^!\[.*\]\(https?:\/\//.test(line)) {
      flushParagraph();
      complex = true;
      continue;
    }
    if (line.includes('<table')) {
      flushParagraph();
      const tableText = normalize(stripHtml(line));
      if (tableText) blocks.push({ type: 'text', text: tableText });
      complex = true;
      continue;
    }
    if (!line) flushParagraph();
    else if (!line.startsWith('#')) paragraph.push(rawLine);
  }
  flushParagraph();
  if (inCode) flushCode();
  if (complex && fallbackAssetId && !blocks.some((block) => block.type === 'image')) {
    blocks.push({ type: 'image', assetId: fallbackAssetId, alt: '原卷页图，用于核对公式、表格或图示' });
  }
  return blocks.length ? blocks : [{ type: 'text', text: '内容待核对' }];
}

function parseQuestion(block, page) {
  const lines = [...block.lines];
  if (block.number > 40) {
    const scoreMatch = lines[0]?.match(/[（(](\d+)\s*分[)）]/);
    return {
      stemLines: lines,
      options: undefined,
      maxScore: scoreMatch ? Number(scoreMatch[1]) : 1,
      complex: lines.some((line) => /!\[|<table|如下图|如右图|结构为/.test(line)),
    };
  }

  const stemLines = [];
  const options = new Map();
  let currentOption;
  for (const line of lines) {
    const match = line.trim().match(/^([A-D])[.．]\s*(.*)$/);
    if (match) {
      currentOption = match[1];
      options.set(currentOption, [match[2]]);
    } else if (currentOption) {
      options.get(currentOption).push(line);
    } else {
      stemLines.push(line);
    }
  }
  const complex = lines.some((line) => /!\[|<table|如下图|如右图|结构如下/.test(line));
  const parsedOptions = ['A', 'B', 'C', 'D'].map((id) => ({
    id,
    lines: options.get(id) ?? [`图示选项 ${id}，请查看原卷第 ${page} 页`],
  }));
  return { stemLines, options: parsedOptions, maxScore: 1, complex: complex || options.size !== 4 };
}

const allLines = normalize(markdown).split('\n');
const referenceIndex = allLines.findIndex((line) => line.trim() === '# 参考答案');
const explanationIndex = allLines.findIndex((line) => line.includes('选择题部分解析'));
if (referenceIndex < 0 || explanationIndex < 0) throw new Error('Cross-check Markdown is missing expected sections.');

const questionBlocks = splitSequential(allLines.slice(0, referenceIndex), 1, 47, /^\s*(\d{1,2})[.．]\s*(.*)$/);
const answerLines = allLines.slice(referenceIndex, explanationIndex);
const answerMap = new Map();
for (const line of answerLines) {
  const match = line.trim().match(/^(\d{1,2})[.．]\s*([A-D])$/);
  if (match && Number(match[1]) <= 40) answerMap.set(Number(match[1]), match[2]);
}

const comprehensiveAnswers = new Map();
let activeAnswer;
for (const line of answerLines) {
  const match = line.match(/^#\s*(4[1-7])[.．]\s*解答/);
  if (match) {
    activeAnswer = { number: Number(match[1]), lines: [] };
    comprehensiveAnswers.set(activeAnswer.number, activeAnswer);
  } else if (activeAnswer) activeAnswer.lines.push(line);
}

const choiceExplanations = splitSequential(
  allLines.slice(explanationIndex + 1),
  1,
  40,
  /^\s*(\d{1,2})[.．]\s*(.*)$/,
);

const pageMapFromRanges = (ranges) => new Map(
  ranges.flatMap(({ from, to, pages }) => Array.from({ length: to - from + 1 }, (_, index) => [from + index, pages])),
);
const questionPageMap = pageMapFromRanges([
  { from: 1, to: 6, pages: [1] },
  { from: 7, to: 7, pages: [1, 2] },
  { from: 8, to: 16, pages: [2] },
  { from: 17, to: 17, pages: [2, 3] },
  { from: 18, to: 28, pages: [3] },
  { from: 29, to: 29, pages: [3, 4] },
  { from: 30, to: 40, pages: [4] },
  { from: 41, to: 41, pages: [4, 5] },
  { from: 42, to: 43, pages: [5] },
  { from: 44, to: 44, pages: [5, 6] },
  { from: 45, to: 46, pages: [6] },
  { from: 47, to: 47, pages: [6, 7] },
]);
const answerPageMap = pageMapFromRanges([
  { from: 1, to: 4, pages: [1] },
  { from: 5, to: 8, pages: [2] },
  { from: 9, to: 13, pages: [3] },
  { from: 14, to: 20, pages: [4] },
  { from: 21, to: 30, pages: [5] },
  { from: 31, to: 39, pages: [6] },
  { from: 40, to: 41, pages: [7] },
  { from: 42, to: 42, pages: [7, 8] },
  { from: 43, to: 43, pages: [8] },
  { from: 44, to: 44, pages: [8, 9] },
  { from: 45, to: 45, pages: [10] },
  { from: 46, to: 46, pages: [10, 11] },
  { from: 47, to: 47, pages: [11, 12] },
]);

const sourcePageAssets = [];
for (const [document, total] of [['questions', 7], ['answers', 12]]) {
  for (let page = 1; page <= total; page += 1) {
    const candidates = [
      path.join(renderDir, `${document}-${page}.png`),
      path.join(renderDir, `${document}-${String(page).padStart(2, '0')}.png`),
    ];
    const sourcePath = candidates.find(existsSync);
    if (!sourcePath) throw new Error(`Missing rendered ${document} page ${page}.`);
    const bytes = await readFile(sourcePath);
    const dimensions = readPngDimensions(bytes, sourcePath);
    sourcePageAssets.push({
      id: `${packId}-source-${document}-page-${page}`,
      path: `/content/${packId}/source/${document}-${page}.png`,
      mimeType: 'image/png',
      sha256: sha256(bytes),
      sourcePage: page,
      ...dimensions,
      sourcePath,
    });
  }
}

const knowledgePoints = [
  ['data-structures', '数据结构'],
  ['computer-organization', '计算机组成原理'],
  ['operating-systems', '操作系统'],
  ['computer-networks', '计算机网络'],
].map(([id, name]) => ({ id: `subject-${id}`, subject: id, name }));

const contentVersion = manualOverrides.contentVersion;
const availableAssetIds = new Set(sourcePageAssets.map((asset) => asset.id));
const questions = [];
const quality = [];
for (let number = 1; number <= 47; number += 1) {
  const block = questionBlocks.get(number);
  if (!block) throw new Error(`Structured source is missing question ${number}.`);
  const questionPages = questionPageMap.get(number);
  const answerPages = answerPageMap.get(number);
  if (!questionPages || !answerPages) throw new Error(`Missing verified page mapping for question ${number}.`);
  const pageAssetId = `${packId}-source-questions-page-${questionPages[0]}`;
  const parsed = parseQuestion(block, questionPages[0]);
  const subject = questionSubject(number);
  const manualOverride = manualOverrides.questions[String(number)];
  const explanationSource = number <= 40 ? choiceExplanations.get(number) : comprehensiveAnswers.get(number);
  const explanationBlocks = markdownBlocks(
    explanationSource?.lines ?? [],
    `${packId}-source-answers-page-${answerPages[0]}`,
  );
  const defaultExplanation = [{ id: `q${number}-analysis`, title: '来源解析', content: explanationBlocks }];
  const explanation = manualOverride?.explanation ?? defaultExplanation;
  const firstExplanationText = explanation
    .flatMap((section) => section.content)
    .find((item) => item.type === 'text')?.text;
  const topicText = manualOverride?.knowledgePointName
    ?? firstExplanationText?.split(/[。\n]/)[0]
    ?? `第 ${number} 题`;
  const topicId = `topic-2009-q${String(number).padStart(2, '0')}`;
  knowledgePoints.push({ id: topicId, subject, name: topicText.slice(0, 80), parentId: `subject-${subject}` });
  const defaultStem = markdownBlocks(parsed.stemLines, pageAssetId, parsed.complex);
  const stem = manualOverride?.stem ?? defaultStem;
  const defaultOptions = parsed.options?.map((option) => ({
    id: option.id,
    content: markdownBlocks(option.lines, pageAssetId, option.lines.some((line) => /!\[|<table/.test(line))),
  }));
  const options = manualOverride?.options ?? defaultOptions;
  const reference = number > 40 ? explanationBlocks : [];
  const defaultAnswer = number <= 40
    ? { type: 'choice', optionId: answerMap.get(number) }
    : {
        type: 'comprehensive',
        maxScore: parsed.maxScore,
        rubric: [{ id: `q${number}-rubric`, description: '按照来源解析逐点自评', points: parsed.maxScore }],
        reference,
      };
  const answer = manualOverride?.answer ?? defaultAnswer;
  const firstHint = topicText.replace(/^考查/, '先回忆');
  const hints = manualOverride?.hints ?? [
    [{ type: 'text', text: firstHint }],
    [{ type: 'text', text: '标出题干中的关键限制，再逐项核对定义、数据流或计算过程。' }],
  ];
  const referencedBlocks = [
    ...stem,
    ...(options?.flatMap((option) => option.content) ?? []),
    ...(answer.type === 'comprehensive' ? answer.reference : []),
    ...explanation.flatMap((section) => section.content),
    ...hints.flat(),
  ];
  const assetIds = [...new Set(collectImageAssetIds(referencedBlocks))];
  for (const assetId of assetIds) {
    if (!availableAssetIds.has(assetId)) throw new Error(`Question ${number} references unknown asset ${assetId}.`);
  }
  questions.push({
    id: `cn408-2009-q${String(number).padStart(2, '0')}`,
    year: 2009,
    number,
    subject,
    kind: number <= 40 ? 'single-choice' : 'comprehensive',
    stem,
    ...(options ? { options } : {}),
    answer,
    explanation,
    hints,
    knowledgePointIds: [`subject-${subject}`, topicId],
    assetIds,
    source: {
      question: sourceDocument(metadata.question, questionPages, `PDF page ${questionPages.join(', ')}; question ${number}`),
      answer: sourceDocument(metadata.answer, answerPages, `PDF page ${answerPages.join(', ')}; answer ${number}`),
      crosschecks: [sourceDocument(metadata.crosscheck, [], `Markdown question ${number}`)],
      redistribution: 'unknown',
    },
    contentVersion,
    reviewStatus: 'needs-review',
  });
  quality.push({
    number,
    questionPages,
    answerPages,
    optionCount: options?.length ?? 0,
    hasAnswer: Boolean(number <= 40 ? answerMap.get(number) : answer.reference.length),
    usesPageFallback: assetIds.some((assetId) => assetId.includes('-source-')),
    reviewStatus: 'needs-review',
  });
}

const packCore = {
  questions,
  knowledgePoints,
  assets: sourcePageAssets.map((asset) => ({
    id: asset.id,
    path: asset.path,
    mimeType: asset.mimeType,
    sha256: asset.sha256,
    sourcePage: asset.sourcePage,
    width: asset.width,
    height: asset.height,
  })),
};
const manifestCore = {
  id: packId,
  schemaVersion: 1,
  contentVersion,
  title: '2009 年计算机学科专业基础综合试题',
  year: 2009,
  questionCount: 47,
  createdAt: metadata.createdAt,
  reviewStatus: 'needs-review',
};
const packHash = computeContentPackHash({ manifest: manifestCore, ...packCore });
const pack = {
  manifest: { ...manifestCore, sha256: packHash },
  ...packCore,
};

const validation = validateContentPack(pack, { requireVerified: false, enforceExamShape: true });
if (!validation.success) throw new Error(`Generated pack failed validation:\n${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`);

await mkdir(generatedDir, { recursive: true });
await mkdir(path.join(publicDir, packId, 'source'), { recursive: true });
await writeFile(path.join(generatedDir, '2009.pack.json'), `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
await writeFile(
  path.join(generatedDir, '2009.quality.json'),
  `${JSON.stringify({ packHash, overrideHash, validation, summary: { questions: 47, verified: 0, needsReview: 47 }, questions: quality }, null, 2)}\n`,
  'utf8',
);
await writeFile(path.join(publicDir, '2009.json'), `${JSON.stringify(pack)}\n`, 'utf8');
for (const asset of sourcePageAssets) {
  await cp(
    asset.sourcePath,
    path.join(publicDir, packId, 'source', `${asset.id.includes('questions') ? 'questions' : 'answers'}-${asset.sourcePage}.png`),
  );
}

console.log(`Generated ${questions.length} questions at ${path.relative(root, path.join(generatedDir, '2009.pack.json'))}`);
console.log(`Pack hash: ${packHash}`);
console.log('Review gate: 0/47 verified; generated content remains needs-review.');
