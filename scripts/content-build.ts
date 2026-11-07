/**
 * npm run content:build
 * 校验后生成 public/vocabulary/vocab.json。版本号 = <YYYYMMDD>-<内容 sha256 前 8 位>。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadCurated, validateVocab } from './content-lib';
import { CefrThresholds } from '../src/domain/types';
import type { CefrAssessment } from '../src/domain/types';
import { classifyCefr } from './nt2lex-cefr';

const cefrThresholds = CefrThresholds.parse(JSON.parse(readFileSync('content/sources/cefr-config.json', 'utf8')));
const vocab = { ...loadCurated(), cefr_thresholds: cefrThresholds };
const { ranks: textbookRanks } = JSON.parse(readFileSync('content/manifests/nt2lex-frequency-v1.json', 'utf8')) as {
  ranks: Record<string, number>;
};
const { entries: cefrEntries } = JSON.parse(readFileSync('content/manifests/nt2lex-cefr-v1.json', 'utf8')) as {
  entries: Record<string, CefrAssessment>;
};
for (const lexeme of vocab.lexemes) {
  lexeme.textbookFrequencyRank = textbookRanks[`${lexeme.lemma}\t${lexeme.pos}`];
  const cefr = cefrEntries[`${lexeme.lemma}\t${lexeme.pos}`];
  if (cefr) lexeme.cefr = classifyCefr(cefr.raw, cefrThresholds);
}
const lexemesById = new Map(vocab.lexemes.map((lexeme) => [lexeme.id, lexeme]));
for (const sense of vocab.senses) {
  const level = lexemesById.get(sense.lexemeId)?.cefr?.final_level;
  if (level) sense.level = level; // 没有 NT2Lex 证据时保留现有词义等级。
}

// 新词学习顺序：按对应参考项的 A1+A2+B1 词频降序；没对上参考项的（如 extra.json）排在最后。
type Freq = { A1: number; A2: number; B1: number };
const freqByRef = new Map<string, number>(
  (JSON.parse(readFileSync('content/manifests/reference-set-all-v1.json', 'utf8')).items as { id: string; freq: Freq }[])
    .map((i) => [i.id, i.freq.A1 + i.freq.A2 + i.freq.B1]),
);
const freqBySense = new Map<string, number>();
for (const f of readdirSync('content/coverage/ledger').filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(`content/coverage/ledger/${f}`, 'utf8').split('\n').filter(Boolean)) {
    const l = JSON.parse(line) as { referenceId: string; senseIds?: string[] };
    for (const id of l.senseIds ?? []) freqBySense.set(id, freqByRef.get(l.referenceId)!);
  }
}
vocab.senses.sort((a, b) => {
  const fa = freqBySense.get(a.id) ?? -1;
  const fb = freqBySense.get(b.id) ?? -1;
  if (fa !== fb) return fb - fa;
  // 纯 B2/C1 词的 A1–B1 频次均为 0，用完整教材词频排名排列，避免按作者分片分组。
  if (fa === 0) {
    return lexemesById.get(a.lexemeId)!.textbookFrequencyRank!
      - lexemesById.get(b.lexemeId)!.textbookFrequencyRank!;
  }
  return 0; // 保留原 B1 同频词及同词多个词义的相对顺序。
});
const problems = validateVocab(vocab);
if (problems.length > 0) {
  for (const p of problems) console.error(`✘ ${p}`);
  console.error(`共 ${problems.length} 个问题，未生成 vocab.json`);
  process.exit(1);
}

const hash = createHash('sha256').update(JSON.stringify(vocab)).digest('hex').slice(0, 8);
const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const version = `${date}-${hash}`;
const json = JSON.stringify({ version, ...vocab });

mkdirSync('public/vocabulary', { recursive: true });
writeFileSync('public/vocabulary/vocab.json', json);
console.log(`✔ vocab.json version=${version} (${Buffer.byteLength(json)} bytes, ${vocab.lexemes.length} lexemes, ${vocab.senses.length} senses)`);
