/**
 * npm run content:batches -- <topN> [batchSize]
 * 1. 把 content/curated/sample.json 中能对上参考项 (lemma, pos) 的词条写进 ledger/sample.jsonl；
 * 2. 参考集按 A1+A2+B1 总词频降序取前 topN，去掉账本里已覆盖的，
 *    每 batchSize 个写一个 content/work/batch-NNN.json，供编写词义用（见 content/work/GUIDE.md）。
 * 已存在的 batch 文件不会覆盖：编号接着往后排。
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

type Item = { id: string; lemma: string; pos: string; tags: string[]; freq: { A1: number; A2: number; B1: number } };
type Ledger = { referenceId: string };

const topN = Number(process.argv[2]);
const size = Number(process.argv[3] ?? 100);
if (!topN) throw new Error('用法：npm run content:batches -- <topN> [batchSize]');

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const items: Item[] = read('content/manifests/reference-set-b1-v1.json').items;
const ledgerDir = 'content/coverage/ledger';
mkdirSync(ledgerDir, { recursive: true });
mkdirSync('content/work', { recursive: true });

// 1. 样例词库映射到参考项
const sample = read('content/curated/sample.json') as { lexemes: { id: string; lemma: string; pos: string }[]; senses: { id: string; lexemeId: string }[] };
const refByKey = new Map(items.map((i) => [`${i.lemma}|${i.pos}`, i]));
const sampleLines = sample.lexemes.flatMap((l) => {
  const ref = refByKey.get(`${l.lemma.toLowerCase()}|${l.pos}`) ?? refByKey.get(`${l.lemma}|${l.pos}`);
  const senseIds = sample.senses.filter((s) => s.lexemeId === l.id).map((s) => s.id);
  return ref ? [JSON.stringify({ referenceId: ref.id, status: 'included', senseIds })] : [];
});
writeFileSync(`${ledgerDir}/sample.jsonl`, sampleLines.join('\n') + '\n');
console.log(`样例词库对上参考项：${sampleLines.length} / ${sample.lexemes.length}`);

// 2. 按词频取前 topN，去掉已覆盖或已分配的
const covered = new Set(readdirSync(ledgerDir).filter((f) => f.endsWith('.jsonl'))
  .flatMap((f) => readFileSync(`${ledgerDir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as Ledger).referenceId)));
const existing = readdirSync('content/work').filter((f) => /^batch-\d+\.json$/.test(f)).sort();
const assigned = new Set(existing.flatMap((f) => (read(`content/work/${f}`).items as Item[]).map((i) => i.id)));

const total = (i: Item) => i.freq.A1 + i.freq.A2 + i.freq.B1;
const level = (i: Item) => (i.freq.A1 > 0 ? 'A1' : i.freq.A2 > 0 ? 'A2' : 'B1');
const todo = [...items].sort((a, b) => total(b) - total(a)).slice(0, topN)
  .filter((i) => !covered.has(i.id) && !assigned.has(i.id));

let n = existing.length;
for (let k = 0; k < todo.length; k += size) {
  const name = `batch-${String(++n).padStart(3, '0')}`;
  const batch = todo.slice(k, k + size).map((i) => ({ ...i, level: level(i), totalFreq: total(i) }));
  writeFileSync(`content/work/${name}.json`, JSON.stringify({ batch: name, items: batch }, null, 1) + '\n');
}
console.log(`前 ${topN} 项中待编写 ${todo.length} 项 → 新增 ${n - existing.length} 个批次（batch-${String(existing.length + 1).padStart(3, '0')} … batch-${String(n).padStart(3, '0')}）`);
