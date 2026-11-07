/**
 * npm run content:fetch
 * 下载 content/sources/sources.json 中登记的来源，并校验 SHA-256。hash 不一致就报错退出。
 * 原始文件不进仓库（.gitignore）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

type Source = { id: string; url: string; localFile: string; sha256: string };

const sha256 = (buf: Uint8Array) => createHash('sha256').update(buf).digest('hex');
const { sources } = JSON.parse(readFileSync('content/sources/sources.json', 'utf8')) as { sources: Source[] };

for (const s of sources) {
  if (!existsSync(s.localFile)) {
    console.log(`↓ ${s.id}: ${s.url}`);
    const res = await fetch(s.url);
    if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status}`);
    mkdirSync(dirname(s.localFile), { recursive: true });
    writeFileSync(s.localFile, new Uint8Array(await res.arrayBuffer()));
  }
  const actual = sha256(readFileSync(s.localFile));
  if (actual !== s.sha256) throw new Error(`${s.id}: hash ${actual} ≠ 登记值 ${s.sha256}`);
  console.log(`✔ ${s.id}`);
}
