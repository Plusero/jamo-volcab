import { expect, it } from 'vitest';
import { indexVocab, searchSenses } from '../../src/application/vocab';
import type { CefrAssessment, CefrLevel, Sense, Vocab } from '../../src/domain/types';

function grade(level: CefrLevel, suggested: CefrLevel | null = null): CefrAssessment {
  return { first_occurrence_level: level, final_level: level, suggested_level: suggested, review_status: suggested ? 'needs_review' : 'reliable', raw: [] };
}

function sense(id: string, level: string, topic = '学习'): Sense {
  return { id, lexemeId: id, level, topics: [topic], zh: '词义', review: 'draft', examples: [{ nl: 'Een voorbeeld.', zh: '一个例子。' }] };
}

it('CEFR 等级与文本、词性、主题共同筛选，待复核建议不改变最终等级', () => {
  const vocab: Vocab = {
    version: 'test',
    lexemes: [
      { id: 'a', lemma: 'boek', pos: 'noun', cefr: grade('A1', 'B2') },
      { id: 'b', lemma: 'boekenkast', pos: 'noun', cefr: grade('A1') },
      { id: 'c', lemma: 'boekhandel', pos: 'noun', cefr: grade('B2') },
      { id: 'd', lemma: 'boeken', pos: 'verb', cefr: grade('A1') },
      { id: 'e', lemma: 'boekje', pos: 'noun' },
    ],
    senses: [sense('a', 'A1'), sense('b', 'A1', '住房'), sense('c', 'B2'), sense('d', 'A1'), sense('e', 'A1')],
  };
  const ix = indexVocab(vocab);
  const filters = { q: 'BOEK', pos: 'noun', topic: '学习' };
  expect(searchSenses(ix, { ...filters, level: 'A1' }).rows.map((r) => r.sense.id)).toEqual(['a']);
  expect(searchSenses(ix, { ...filters, level: 'B2' }).rows.map((r) => r.sense.id)).toEqual(['c']);
  expect(searchSenses(ix, {}).total).toBe(5); // 无 NT2Lex 分级的词保留在全部结果中。
});

it('先按等级筛选再分页，返回该等级的正确总数', () => {
  const senses = Array.from({ length: 60 }, (_, i) => sense(`s-${i}`, i < 50 ? 'A1' : 'B2'));
  const ix = indexVocab({
    version: 'test',
    lexemes: senses.map((s, i) => ({ id: s.lexemeId, lemma: s.id, pos: 'noun', cefr: grade(i < 50 ? 'A1' : 'B2') })),
    senses,
  });
  const result = searchSenses(ix, { level: 'B2' }, 3, 2);
  expect(result.total).toBe(10);
  expect(result.rows.map((r) => r.sense.id)).toEqual(['s-53', 's-54']);
});
