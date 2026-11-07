/**
 * npm run content:coverage [-- --strict] [--all]
 * 参考集 × 账本（content/coverage/ledger/*.jsonl）× content/curated/*.json -> coverage-report.md + missing-items.csv。
 * --strict：missing > 0 或有错误时退出码 1。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

type Item = { id: string; lemma: string; pos: string; freq: Record<string, number> };
type Ledger = { referenceId: string; status: 'included' | 'excluded'; senseIds?: string[]; excludeReason?: string };

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const all = process.argv.includes('--all');
const allItems: Item[] = read('content/manifests/reference-set-all-v1.json').items;
const items: Item[] = all ? allItems : read('content/manifests/reference-set-b1-v1.json').items;
// 账本按批次分文件：content/coverage/ledger/*.jsonl
const ledgerDir = 'content/coverage/ledger';
const ledger: Ledger[] = (existsSync(ledgerDir) ? readdirSync(ledgerDir).filter((f) => f.endsWith('.jsonl')).sort() : [])
  .flatMap((f) => readFileSync(`${ledgerDir}/${f}`, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)));
const senseIds = new Set<string>();
for (const f of existsSync('content/curated') ? readdirSync('content/curated').filter((f) => f.endsWith('.json')) : []) {
  for (const s of read(`content/curated/${f}`).senses ?? []) senseIds.add(s.id);
}

const refIds = new Set(items.map((i) => i.id));
const knownRefIds = new Set(allItems.map((i) => i.id));
const errors: string[] = [];
const covered = new Set<string>();
const seenRefs = new Set<string>();
for (const [n, l] of ledger.entries()) {
  const at = `ledger 第 ${n + 1} 行 (${l.referenceId})`;
  if (!knownRefIds.has(l.referenceId)) errors.push(`${at}: 未知 referenceId`);
  if (seenRefs.has(l.referenceId)) errors.push(`${at}: referenceId 重复`);
  seenRefs.add(l.referenceId);
  const unknown = (l.senseIds ?? []).filter((s) => !senseIds.has(s));
  for (const s of unknown) errors.push(`${at}: 未知 senseId ${s}`);
  const ok = l.status === 'included' ? (l.senseIds ?? []).length > 0 && unknown.length === 0 : l.status === 'excluded' && !!l.excludeReason?.trim();
  if (ok && refIds.has(l.referenceId)) covered.add(l.referenceId);
}
const missing = items.filter((i) => !covered.has(i.id));

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '0.0');
const byPos = new Map<string, [number, number]>();
for (const i of items) {
  const c = byPos.get(i.pos) ?? [0, 0];
  c[0]++;
  if (covered.has(i.id)) c[1]++;
  byPos.set(i.pos, c);
}
const report = [
  all ? '# A1–C1 词库覆盖报告' : '# B1 词库覆盖报告',
  '',
  `- 参考项: ${items.length}`,
  `- 已覆盖: ${covered.size} (${pct(covered.size, items.length)}%)`,
  `- missing: ${missing.length}`,
  `- 账本行数: ${ledger.length}；词义数: ${senseIds.size}`,
  `- 错误: ${errors.length}`,
  '',
  '## 按词性',
  '',
  '| pos | 总数 | 已覆盖 | missing | 覆盖率 |',
  '|---|---:|---:|---:|---:|',
  ...[...byPos].sort().map(([p, [t, c]]) => `| ${p} | ${t} | ${c} | ${t - c} | ${pct(c, t)}% |`),
  '',
  '## 错误',
  '',
  ...(errors.length ? errors.map((e) => `- ${e}`) : ['无']),
  '',
].join('\n');
const levels = all ? ['A1', 'A2', 'B1', 'B2', 'C1'] : ['A1', 'A2', 'B1'];
const csv = [['id', 'lemma', 'pos', ...levels].join(','), ...missing.map((i) => [i.id, JSON.stringify(i.lemma), i.pos, ...levels.map((l) => i.freq[l] ?? 0)].join(','))].join('\n') + '\n';
writeFileSync(all ? 'content/coverage/coverage-report-all.md' : 'content/coverage/coverage-report.md', report);
writeFileSync(all ? 'content/coverage/missing-items-all.csv' : 'content/coverage/missing-items.csv', csv);

console.log(`covered ${covered.size}/${items.length} (${pct(covered.size, items.length)}%), missing ${missing.length}, errors ${errors.length}`);
if (process.argv.includes('--strict') && (missing.length > 0 || errors.length > 0)) process.exit(1);
