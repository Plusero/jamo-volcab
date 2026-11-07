/**
 * npm run content:build
 * 校验后生成 public/vocabulary/vocab.json。版本号 = <YYYYMMDD>-<内容 sha256 前 8 位>。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadCurated, validateVocab } from './content-lib';

const vocab = loadCurated();

// 新词学习顺序：按对应参考项的 A1+A2+B1 词频降序；没对上参考项的（如 extra.json）排在最后。
type Freq = { A1: number; A2: number; B1: number };
const freqByRef = new Map<string, number>(
  (JSON.parse(readFileSync('content/manifests/reference-set-b1-v1.json', 'utf8')).items as { id: string; freq: Freq }[])
    .map((i) => [i.id, i.freq.A1 + i.freq.A2 + i.freq.B1]),
);
const freqBySense = new Map<string, number>();
for (const f of readdirSync('content/coverage/ledger').filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(`content/coverage/ledger/${f}`, 'utf8').split('\n').filter(Boolean)) {
    const l = JSON.parse(line) as { referenceId: string; senseIds?: string[] };
    for (const id of l.senseIds ?? []) freqBySense.set(id, freqByRef.get(l.referenceId)!);
  }
}
vocab.senses.sort((a, b) => (freqBySense.get(b.id) ?? -1) - (freqBySense.get(a.id) ?? -1)); // 稳定排序，同词的多个词义保持原顺序
const problems = validateVocab(vocab);
if (problems.length > 0) {
  for (const p of problems) console.error(`✘ ${p}`);
  console.error(`共 ${problems.length} 个问题，未生成 vocab.json`);
  process.exit(1);
}

const hash = createHash('sha256').update(JSON.stringify(vocab)).digest('hex').slice(0, 8);
const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const version = `${date}-${hash}`;
const json = JSON.stringify({ version, lexemes: vocab.lexemes, senses: vocab.senses });

mkdirSync('public/vocabulary', { recursive: true });
writeFileSync('public/vocabulary/vocab.json', json);
console.log(`✔ vocab.json version=${version} (${Buffer.byteLength(json)} bytes, ${vocab.lexemes.length} lexemes, ${vocab.senses.length} senses)`);
