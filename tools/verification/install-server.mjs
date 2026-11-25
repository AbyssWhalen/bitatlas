import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'release-manifest.json'), 'utf8'));
assert.equal(manifest.format, 'bitatlas-release-v1', '只能在独立部署包内运行安装器。');
assert.equal(process.versions.node.split('.')[0], '24', '部署运行时需要 Node 24。');
assert.equal(await lstat(path.join(root, 'node_modules')).then(() => true, () => false), false,
  '安装目录必须是全新解压的部署包；失败目录保留，不自动删除。');
const npmCli = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
async function run(args, npm = false) {
  await new Promise((resolve, reject) => {
    const useNpmCli = npm && (process.platform === 'win32' || process.env.npm_execpath);
    const child = spawn(npm && !useNpmCli ? 'npm' : process.execPath, useNpmCli ? [npmCli, ...args] : args,
      { cwd: root, windowsHide: true, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`安装子进程失败：${code}`)));
  });
}
// npm 11.9 loses gypfile:false when rebuilding from lockfile metadata. Run only
// the audited required lifecycle below, then actually load the native module.
await run(['ci', '--omit=dev', '--ignore-scripts', '--workspace', '@408os/server',
  '--workspace', '@408os/storage', '--workspace', '@408os/content-schema', '--workspace', '@408os/domain',
  '--include-workspace-root=false', '--no-fund', '--no-audit'], true);
const lifecycles = [];
async function inspect(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (item.isSymbolicLink() || !item.isDirectory() || item.name === '.bin') continue;
    const directory = path.join(folder, item.name);
    if (item.name.startsWith('@')) { await inspect(directory); continue; }
    const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    for (const name of ['preinstall', 'install', 'postinstall']) {
      if (!pkg.scripts?.[name]) continue;
      assert.ok(pkg.name === 'esbuild' && name === 'postinstall' && pkg.scripts[name] === 'node install.js',
        `未审核的安装脚本：${pkg.name} ${name}；停止，不跳过所需初始化。`);
      lifecycles.push({ package: pkg.name, name, script: pkg.scripts[name], directory });
    }
    const nested = path.join(directory, 'node_modules');
    if (await lstat(nested).then(() => true, () => false)) await inspect(nested);
  }
}
await inspect(path.join(root, 'node_modules'));
for (const hook of lifecycles) await run([path.join(hook.directory, 'install.js')]);
const require = createRequire(path.join(root, 'apps', 'server', 'package.json'));
const resolved = {};
for (const name of ['better-sqlite3', 'fastify', 'tsx', 'esbuild', 'tar', 'zod', '@fastify/static']) {
  resolved[name] = require.resolve(name);
  assert.ok(resolved[name].startsWith(path.join(root, 'node_modules') + path.sep), `依赖意外从部署包之外加载：${name}`);
}
const sqlitePackage = require('better-sqlite3/package.json');
assert.equal(sqlitePackage.gypfile, false);
const Database = require('better-sqlite3');
const database = new Database(':memory:');
try {
  database.exec('CREATE TABLE smoke (value TEXT NOT NULL) STRICT');
  database.prepare('INSERT INTO smoke(value) VALUES (?)').run('本地原生 SQLite 验证');
  assert.equal(database.prepare('SELECT value FROM smoke').get().value, '本地原生 SQLite 验证');
} finally { database.close(); }
assert.ok(require('esbuild').transformSync('const answer: number = 408', { loader: 'ts' }).code.includes('408'));
const receipt = { passed: true, createdAt: new Date().toISOString(), node: process.version, platform: process.platform,
  arch: process.arch, nativeSqliteLoaded: true, typescriptTransform: true, resolved,
  lifecycleScripts: lifecycles.map(({ package: name, name: hook, script }) => ({ package: name, hook, script })) };
await writeFile(path.join(root, '..', 'install-receipt.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
