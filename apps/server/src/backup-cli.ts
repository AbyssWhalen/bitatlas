import path from 'node:path';
import { readFile } from 'node:fs/promises';
import Database from 'better-sqlite3';
import { createEncryptedBackup, restoreEncryptedBackup, retentionCandidates, uploadEncryptedBackup } from './backup';

const [command, ...arguments_] = process.argv.slice(2);
const argument = (name: string) => {
  const index = arguments_.indexOf(`--${name}`);
  const value = index >= 0 ? arguments_[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`缺少 --${name}`);
  return value;
};
const ageBinary = process.env.BITATLAS_AGE_BINARY ?? 'age';
if (command === 'create') {
  const data = path.resolve(argument('data'));
  const db = new Database(path.join(data, 'bitatlas.sqlite'), { fileMustExist: true });
  try {
    console.log(JSON.stringify(await createEncryptedBackup({ database: db, files: path.join(data, 'files'),
      output: path.resolve(argument('output')), ageBinary, recipient: argument('recipient') }), null, 2));
  } finally { db.close(); }
} else if (command === 'restore') {
  console.log(JSON.stringify(await restoreEncryptedBackup({ encryptedFile: path.resolve(argument('archive')), expectedSha256: argument('sha256'),
    destination: path.resolve(argument('destination')), ageBinary, identityFile: path.resolve(argument('identity-file')) }), null, 2));
} else if (command === 'retention') {
  console.log(JSON.stringify(retentionCandidates(JSON.parse(await readFile(argument('inventory'), 'utf8'))), null, 2));
} else if (command === 'upload') {
  console.log(JSON.stringify(await uploadEncryptedBackup({ encryptedFile: path.resolve(argument('archive')),
    host: argument('host'), remoteDirectory: argument('directory') }), null, 2));
} else throw new Error('命令：create / restore / retention / upload。参数和操作边界见 docs/server/deployment.md；不自动安装、不自动删除。');
