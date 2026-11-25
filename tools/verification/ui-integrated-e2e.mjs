import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { assertBuild, fresh, json, local, server, sha256 } from './ui-integrated-browser.mjs';

const [mode, label, ...projects] = process.argv.slice(2);
assert(['local', 'server'].includes(mode) && projects.length);
const root = process.cwd();
const hash = await assertBuild(mode === 'local' ? local : server, mode);
for (const project of projects) {
  assert.match(project, /^(chromium-(1440|1366|390)|server-(desktop|mobile))$/);
  const name = `${label}-${project}`, dir = await fresh(name);
  const manifest = { mode, project, buildHash: hash, workers: 1, exitCode: null };
  // Keep tests' cwd-relative screenshots out of the previous release evidence.
  if (mode === 'local') {
    const packs = path.join(dir, 'apps/web/public/content');
    await mkdir(packs, { recursive: true });
    for (const y of ['2009.json', '2010.json']) await copyFile(path.join(root, 'apps/web/public/content', y), path.join(packs, y));
    await mkdir(path.join(dir, 'output/playwright/screenshots'), { recursive: true });
  } else {
    // Three literals open independent browser contexts / set the Origin header.
    // Save exactly the original assertions and inputs, adapting only the test port and import path.
    const specDir = path.join(dir, 'server-spec');
    await mkdir(specDir);
    const input = await readFile(path.join(root, 'tests/server-e2e/account-flow.spec.ts'), 'utf8');
    const fixture = path.relative(specDir, path.join(root, 'tools/verification/server-fixture')).replaceAll('\\', '/');
    assert.equal(input.split('http://127.0.0.1:4323').length - 1, 3);
    const adapted = input.replaceAll('http://127.0.0.1:4323', server).replace('../../tools/verification/server-fixture', fixture);
    await writeFile(path.join(specDir, 'account-flow.spec.ts'), adapted);
    manifest.sourceHash = sha256(input);
    manifest.adaptedHash = sha256(adapted);
    assert.equal(adapted.replaceAll(server, 'http://127.0.0.1:4323').replace(fixture, '../../tools/verification/server-fixture'), input);
  }
  const log = await open(path.join(dir, 'run.log'), 'wx');
  const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
  const args = [cli, 'test', '-c', path.join(root, 'tools/verification/ui-integrated.playwright.config.ts'), `--project=${project}`, '--workers=1'];
  await json(path.join(dir, 'batch.json'), { ...manifest, args: args.slice(1) });
  const child = spawn(process.execPath, args, {
    cwd: dir, windowsHide: true, stdio: ['ignore', log.fd, log.fd],
    env: { ...process.env, BITATLAS_INTEGRATED_BATCH: name, BITATLAS_INTEGRATED_MODE: mode },
  });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  await log.close();
  await json(path.join(dir, 'batch.json'), { ...manifest, args: args.slice(1), exitCode: code });
  console.log(`${project}: exit ${code}; ${dir}`);
  if (code !== 0) process.exitCode = 1;
}
