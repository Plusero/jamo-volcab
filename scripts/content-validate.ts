/**
 * npm run content:validate
 * 校验 content/curated/*.json：Zod、唯一 ID、必需字段。有问题就列出并以退出码 1 结束。
 */
import { loadCurated, validateVocab } from './content-lib';

const vocab = loadCurated();
const problems = validateVocab(vocab);
if (problems.length > 0) {
  for (const p of problems) console.error(`✘ ${p}`);
  console.error(`共 ${problems.length} 个问题`);
  process.exit(1);
}

const count = (items: string[]) => {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].map(([k, n]) => `${k}=${n}`).join(' ');
};
const posOf = new Map(vocab.lexemes.map((l) => [l.id, l.pos]));
console.log(`✔ lexemes: ${vocab.lexemes.length}, senses: ${vocab.senses.length}`);
console.log(`  按词性: ${count(vocab.senses.map((s) => posOf.get(s.lexemeId) ?? '?'))}`);
console.log(`  按审核状态: ${count(vocab.senses.map((s) => s.review))}`);
