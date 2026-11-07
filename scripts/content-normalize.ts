/**
 * npm run content:normalize
 * NT2Lex 基础版 TSV -> content/manifests/reference-set-b1-v1.json（冻结的 B1 及以下参考清单）。
 * 同时生成完整词频排名和 CEFR 分级证据清单。
 *
 * 规则：
 * - 候选 = F@A1、F@A2、F@B1 任一 > 0 的行。
 * - 词性：单 token 取该 token 的 CGN 大类（N/WW/ADJ/BW/VZ/VG/VNW/TW/LID/TSW/SPEC）；
 *   多 token（tag 序列长度 > 1）一律 phrase，不挑 head，固定表达整体收录。
 * - lemma：NFC、trim、折叠空格；含 SPEC 的保留大小写，其余转小写（Tante/tante 句首大写是语料噪声）。
 * - 按 (lemma, pos) 去重，词频相加，原始 tag 保留在 tags，大小写不同的原词保留在 words。
 * - 排除（每条写理由，全部进入 excluded）：
 *   数字/括号占位符、无字母、词与 tag token 数不一致、单字母（代词 u 除外）、
 *   SPEC 多词专有名词、与非 SPEC 行同形的 SPEC 行（in/op 的标注噪声）。
 *   SPEC 在数据里只有 deeleigen：单词形的月份/星期/节日保留（pos=special）。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { normalizeNt2LexEntry, textbookFrequencyRanks } from './nt2lex';
import { classifyCefr, parseNt2LexNumber } from './nt2lex-cefr';
import { CEFR_LEVELS, CefrThresholds } from '../src/domain/types';
import type { CefrEvidence } from '../src/domain/types';

const LEVELS = ['A1', 'A2', 'B1'] as const;
type Level = (typeof LEVELS)[number];
type Freq = Record<Level, number>;
type Group = { lemma: string; pos: string; tags: Set<string>; words: Set<string>; freq: Freq; specOnly: boolean; tokens: number };

const src = (JSON.parse(readFileSync('content/sources/sources.json', 'utf8')) as {
  sources: { id: string; localFile: string; sha256: string }[];
}).sources.find((s) => s.id === 'nt2lex-cgn-v01')!;
const buf = readFileSync(src.localFile);
const actual = createHash('sha256').update(buf).digest('hex');
if (actual !== src.sha256) throw new Error(`${src.id}: hash ${actual} ≠ 登记值 ${src.sha256}`);

const [header, ...lines] = buf.toString('utf8').trimEnd().split('\n').map((l) => l.split('\t'));
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`缺少列 ${name}`);
  return i;
};
const fCol = LEVELS.map((l) => col(`F@${l}`));
const num = (v: string) => (v === '-' ? 0 : Number(v));
const sfiCol = col('SFI@TOTAL');
const textbookRanks = textbookFrequencyRanks(lines.map((row) => ({ word: row[0], tag: row[1], sfiTotal: Number(row[sfiCol]) })));
const cefrThresholds = CefrThresholds.parse(JSON.parse(readFileSync('content/sources/cefr-config.json', 'utf8')));
const cefrColumns = CEFR_LEVELS.map((level) => ({ level, f: col(`F@${level}`), d: col(`D@${level}`) }));
const cefrGroups = new Map<string, CefrEvidence[]>();

const groups = new Map<string, Group>();
let candidates = 0;
for (const row of lines) {
  if (row.length !== header.length) throw new Error(`列数不符: ${row[0]}`);
  const { word, lemma, pos, specOnly } = normalizeNt2LexEntry(row[0], row[1]);
  const key = `${lemma}\t${pos}`;
  const raw: CefrEvidence = {
    word: row[0], tag: row[1],
    F: Object.fromEntries(cefrColumns.map(({ level, f }) => [level, parseNt2LexNumber(row[f])])) as CefrEvidence['F'],
    D: Object.fromEntries(cefrColumns.map(({ level, d }) => [level, parseNt2LexNumber(row[d])])) as CefrEvidence['D'],
  };
  const evidence = cefrGroups.get(key) ?? [];
  evidence.push(raw);
  cefrGroups.set(key, evidence);
  const f = fCol.map((i) => num(row[i]));
  if (f.some(Number.isNaN)) throw new Error(`频次不是数字: ${row[0]}`);
  if (!f.some((x) => x > 0)) continue;
  candidates++;
  const g = groups.get(key) ?? { lemma, pos, tags: new Set(), words: new Set(), freq: { A1: 0, A2: 0, B1: 0 }, specOnly: true, tokens: word.split(' ').length };
  g.tags.add(row[1]);
  g.words.add(word);
  LEVELS.forEach((l, i) => (g.freq[l] += f[i]));
  g.specOnly &&= specOnly;
  groups.set(key, g);
}

const nonSpecLemmas = new Set([...groups.values()].filter((g) => g.pos !== 'special').map((g) => g.lemma));
const reason = (g: Group): string | null => {
  if (/\[\[:|[()]/.test(g.lemma)) return '数字/括号占位符（语料切分产物）';
  if (!/\p{L}/u.test(g.lemma)) return '纯标点或数字';
  if ([...g.tags].some((t) => t.split(' ').length !== g.tokens)) return '词与 tag 的 token 数不一致（语料标注噪声）';
  if ([...g.lemma].length === 1 && g.pos !== 'pronoun') return '单字母';
  if (g.specOnly && g.tokens > 1) return 'SPEC 多词专有名词';
  if (g.pos === 'special' && nonSpecLemmas.has(g.lemma)) return 'SPEC 标注噪声（同形词已有正常词性）';
  return null;
};

const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const first = (f: Freq) => LEVELS.findIndex((l) => f[l] > 0);
const total = (f: Freq) => f.A1 + f.A2 + f.B1;

const items: object[] = [];
const excluded: { lemma: string; tags: string[]; reason: string }[] = [];
const ids = new Set<string>();
const sorted = [...groups.values()].sort((a, b) => first(a.freq) - first(b.freq) || total(b.freq) - total(a.freq) || a.lemma.localeCompare(b.lemma) || a.pos.localeCompare(b.pos));
for (const g of sorted) {
  const why = reason(g);
  if (why) {
    excluded.push({ lemma: g.lemma, tags: [...g.tags], reason: why });
    continue;
  }
  const id = `ref-${slug(g.lemma)}-${g.pos}`;
  if (ids.has(id)) throw new Error(`id 重复: ${id}`);
  ids.add(id);
  const words = [...g.words].filter((w) => w !== g.lemma);
  items.push({ id, lemma: g.lemma, pos: g.pos, tags: [...g.tags], ...(words.length ? { words } : {}), freq: g.freq });
}

const counts = { rows: lines.length, candidates, deduped: groups.size, excluded: excluded.length, included: items.length };
const out = {
  version: 'b1-v1',
  source: { id: src.id, sha256: src.sha256 },
  rule: 'NT2Lex 基础版中 F@A1/F@A2/F@B1 任一 > 0，按 (lemma, pos) 去重，排除噪声条目并逐条写明理由',
  counts,
  items,
  excluded,
};
mkdirSync('content/manifests', { recursive: true });
writeFileSync('content/manifests/reference-set-b1-v1.json', JSON.stringify(out, null, 2) + '\n');
writeFileSync('content/manifests/nt2lex-frequency-v1.json', JSON.stringify({
  source: out.source,
  totalEntries: lines.length,
  rule: '全部原始词条按 SFI@TOTAL 降序排名；同分保持原始行顺序；同一 (lemma, pos) 取最高名次',
  ranks: textbookRanks,
}, null, 2) + '\n');
// 每个词条一行，便于核对原始证据并控制生成文件大小；无需原始 TSV 即可在 CI 构建。
const cefrEntries = [...cefrGroups].map(([key, raw]) => `    ${JSON.stringify(key)}: ${JSON.stringify(classifyCefr(raw, cefrThresholds))}`);
writeFileSync('content/manifests/nt2lex-cefr-v1.json', '{\n'
  + `  "source": ${JSON.stringify(out.source)},\n`
  + `  "thresholds": ${JSON.stringify(cefrThresholds)},\n`
  + '  "entries": {\n' + cefrEntries.join(',\n') + '\n  }\n}\n');

console.log(counts);
const byReason = new Map<string, number>();
for (const e of excluded) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
console.table(Object.fromEntries(byReason));
