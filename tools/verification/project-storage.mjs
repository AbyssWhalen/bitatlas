import { lstat, readdir, realpath, writeFile, statfs } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve('.');
const destination = path.join(root, 'output', 'server-implementation-2026-11-20');
const stamp = Date.now();
const totals = new Map();
const links = [];
const errors = [];
const started = performance.now();
async function walk(relative) {
  const filename = path.join(root, relative);
  const info = await lstat(filename);
  if (info.isSymbolicLink()) { links.push({ path: relative, target: await realpath(filename) }); return { bytes: 0, files: 0 }; }
  const result = { bytes: info.isFile() ? info.size : 0, files: info.isFile() ? 1 : 0 };
  if (info.isDirectory()) {
    for (const item of await readdir(filename)) {
      try {
        const child = await walk(path.join(relative, item));
        result.bytes += child.bytes; result.files += child.files;
      } catch (error) { errors.push({ path: path.join(relative, item), error: error.code ?? String(error) }); }
    }
  }
  totals.set(relative.replaceAll('\\', '/'), result);
  return result;
}
const top = [];
for (const item of await readdir(root)) top.push({ path: item, ...await walk(item) });
top.sort((a, b) => b.bytes - a.bytes);
const totalBytes = top.reduce((sum, item) => sum + item.bytes, 0);
const volume = await statfs(root);
const scan = { createdAt: new Date().toISOString(), root, totalBytes, scanSeconds: (performance.now() - started) / 1000,
  top, outputs: [...totals].filter(([name]) => /^output\/[^/]+$/.test(name)).map(([name, size]) => ({ path: name, ...size })),
  links, errors, measurement: 'logical bytes; linked targets excluded; browser/global tools/recycle bin excluded; no cleanup performed' };
const scanFile = path.join(destination, `storage-scan-${stamp}.json`);
await writeFile(scanFile, JSON.stringify(scan, null, 2));
const size = (bytes) => `${(bytes / 1e9).toFixed(3)} GB`;
const recyclable = ['apps/web/dist', 'node_modules/.vite', 'node_modules/.vite-temp', 'apps/web/node_modules/.vite-temp']
  .filter((name) => totals.has(name));
const greenBytes = recyclable.reduce((sum, name) => sum + totals.get(name).bytes, 0);
const outputBytes = totals.get('output')?.bytes ?? 0;
const localBytes = totals.get('local-data')?.bytes ?? 0;
const analysis = {
  generated_at: new Date().toISOString(),
  scan_seconds: scan.scanSeconds,
  system: { os: 'Windows', build: os.release(), arch: os.arch(), user: '项目范围', home: root,
    filesystem: 'D: 项目逻辑盘点', disk_name: 'D:', disk_total: size(volume.blocks * volume.bsize),
    disk_free: size(volume.bavail * volume.bsize), disk_used: size((volume.blocks - volume.bfree) * volume.bsize) },
  top5: top.slice(0, 5).map((item, index) => ({ rank: index + 1, tier: 'yellow', size: size(item.bytes), type: '项目目录', name: item.path, path: path.join(root, item.path), note: '仅统计此项目；不将整个目录作为删除目标。' })),
  green: recyclable.map((name) => ({ name, path: path.join(root, name), trash_paths: [path.join(root, name)],
    size_estimate: size(totals.get(name).bytes), kill_processes: ['本项目测试/构建/预览需先结束'],
    commands: [{ label: '按本轮精确清单回收', cmd: 'pwsh -File output/server-implementation-2026-11-20/cleanup-current.ps1 -Mode Recycle' }] })),
  yellow: [
    { name: '历史与本轮验收证据', path: path.join(root, 'output'), size: size(outputBytes),
      content_profile: '测试日志、trace、截图、发布包及本地恢复演练。', why_manual: '包含不能重建相同事实的历史证据。',
      disposal: '先生成摘要清单。授权后加密上传独立存储。下载恢复核验后再决定本机副本。',
      risk: '当前未远端归档；不可直接清空整个 output。' },
    { name: '来源、工具与恢复演练', path: path.join(root, 'local-data'), size: size(localBytes),
      content_profile: '原始材料、工具以及合成备份演练数据。', why_manual: '来源材料及恢复密钥不能按缓存处理。',
      disposal: '按现有目录用途区分。来源随摘要清单私有归档。演练数据与回执配套保留。',
      risk: '不得把密钥/学习数据放进公开部署包。' },
  ],
  red: [],
  denied: ['.git', '.workbuddy', 'local-data', 'output', 'node_modules', 'content', 'docs', 'apps/server', 'packages']
    .map((name) => path.join(root, name)),
  summary: { overview: `项目逻辑占用 ${size(totalBytes)}；主要为受保护证据。可再生白名单 ${size(greenBytes)}。`,
    tier_stats: { green: size(greenBytes), yellow: size(totalBytes - greenBytes), red: '0 GB' },
    priority: ['先保留最终发布与验收回执，再回收精确可再生白名单。', '历史证据未归档，约 1GB 常驻目标尚未达到。', '回收站保留恢复能力，不等于释放物理空间。'],
    long_term: ['GCP 保存应用与资料；独立远端保存加密备份和历史证据。', '浏览器可再下载缓存预算为跨账号合计 250,000,000 bytes；唯一副本和未同步数据保护。'] },
};
const analysisFile = path.join(destination, `storage-analysis-${stamp}.json`);
await writeFile(analysisFile, JSON.stringify(analysis, null, 2));
console.log(JSON.stringify({ scanFile, analysisFile, totalBytes, outputBytes, localBytes, recyclable, recyclableBytes: greenBytes, skippedLinks: links.length, errors }, null, 2));
