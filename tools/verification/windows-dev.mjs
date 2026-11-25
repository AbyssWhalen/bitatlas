import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';

if (process.platform !== 'win32') throw new Error('This check must run on Windows');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(root, process.argv[2] ?? path.join('output', `windows-dev-${Date.now()}`));
if (!output.startsWith(path.join(root, 'output') + path.sep)) throw new Error('Output must remain in the project');
await mkdir(output, { recursive: true });
const fixture = path.join(output, 'editor fixture.ts');
await writeFile(fixture, 'export const acceptance = 1;\n');
const server = await createServer({
  root: path.join(root, 'apps', 'web'), configFile: path.join(root, 'apps', 'web', 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0, open: false, fs: { allow: [root] } },
});
const receipt = { platform: process.platform, node: process.version, passed: false, editorProcessActuallyLaunched: false };
const commands = [];
const cp = createRequire(import.meta.url)('node:child_process');
const originalExec = cp.exec;
const originalEditor = process.env.LAUNCH_EDITOR;
let browser;
try {
  await server.listen();
  const baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto(baseURL);
  await expect(page.getByRole('button', { name: '开始剩余 8 题' })).toBeEnabled();
  const ts = await fetch(`${baseURL}/src/app/brand.ts`);
  assert.equal(ts.status, 200);
  assert.match(await ts.text(), /BitAtlas/);
  const sourcePath = `/@fs/${fixture.replaceAll('\\', '/')}`;
  assert.match(await (await fetch(baseURL + sourcePath)).text(), /acceptance = 1/);
  await writeFile(fixture, 'export const acceptance = 2;\n');
  await expect.poll(async () => (await (await fetch(baseURL + sourcePath + '?t=' + Date.now())).text()).includes('acceptance = 2')).toBe(true);
  // Validate Windows argument construction without opening an editor window or
  // allowing this verification to execute a command through the shell.
  process.env.LAUNCH_EDITOR = process.execPath;
  cp.exec = (command, options) => {
    commands.push({ command, shell: options.shell });
    const emitter = new EventEmitter();
    queueMicrotask(() => emitter.emit('exit', 0));
    return emitter;
  };
  const editor = await fetch(`${baseURL}/__open-in-editor?file=${encodeURIComponent(fixture + ':2:1')}`);
  assert.equal(editor.status, 200);
  assert.equal(commands.length, 1);
  assert(commands[0].command.includes(`"${fixture}"`));
  assert(commands[0].command.endsWith(' 2 1'));
  receipt.passed = true;
  receipt.checks = { appLoaded: true, typescriptServed: true, changedSourceServed: true, windowsEditorArguments: commands };
  await page.screenshot({ path: path.join(output, 'dev-home.png'), fullPage: true });
} catch (error) {
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  cp.exec = originalExec;
  if (originalEditor === undefined) delete process.env.LAUNCH_EDITOR;
  else process.env.LAUNCH_EDITOR = originalEditor;
  await browser?.close();
  await server.close();
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}
