import path from 'node:path';
import { openDatabase } from './database';
import { AuthService } from './auth';

// Read the password from stdin, never from argv, logs, or a checked-in configuration.
const [command, username] = process.argv.slice(2);
if (command !== 'bootstrap' || !username) throw new Error('用法：npm run admin -w @408os/server -- bootstrap <username>；密码从标准输入读取。');
let input = '';
for await (const chunk of process.stdin) {
  input += String(chunk);
  if (input.length > 1024) throw new Error('密码输入过长。');
}
const data = path.resolve(process.env.BITATLAS_DATA ?? path.join(process.cwd(), '..', '..', 'local-data', 'server'));
const db = openDatabase(path.join(data, 'bitatlas.sqlite'));
try {
  const auth = new AuthService(db, 'http://127.0.0.1:4310', false);
  const account = await auth.bootstrap(username, input.replace(/\r?\n$/, ''));
  console.log(`Created administrator ${account.username} (${account.id}).`);
} finally { db.close(); }
