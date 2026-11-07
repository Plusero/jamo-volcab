import { describe, expect, it } from 'vitest';
import { normalizeNt2LexEntry, textbookFrequencyRanks } from '../../scripts/nt2lex';

describe('教材词频排名', () => {
  it('按全部原始行的 SFI@TOTAL 降序排名，保留未进入 B1 清单的条目', () => {
    const entries = [
      { word: 'boek', tag: 'N(soort)', sfiTotal: 50 },
      { word: '[[:digit:]]', tag: 'TW(hoofd)', sfiTotal: 90 },
      { word: 'theoretisch', tag: 'ADJ()', sfiTotal: 70 },
    ];
    expect(textbookFrequencyRanks(entries)).toEqual({
      '[[:digit:]]\tnumeral': 1,
      'theoretisch\tadjective': 2,
      'boek\tnoun': 3,
    });
    expect(entries[0].word).toBe('boek');
  });

  it('大小写和标签合并项取最高名次，不改变其他行的原始排名', () => {
    const ranks = textbookFrequencyRanks([
      { word: 'Tante', tag: 'N(soort)', sfiTotal: 80 },
      { word: 'zijn', tag: 'WW()', sfiTotal: 90 },
      { word: 'tante', tag: 'N(eigen)', sfiTotal: 95 },
      { word: 'zijn', tag: 'VNW(bez)', sfiTotal: 70 },
      { word: 'boek', tag: 'N(soort)', sfiTotal: 60 },
    ]);
    expect(ranks).toEqual({ 'tante\tnoun': 1, 'zijn\tverb': 2, 'zijn\tpronoun': 4, 'boek\tnoun': 5 });
    expect(ranks['ontbreekt\tnoun']).toBeUndefined();
  });

  it('同分按原始行顺序排列，不使用并列名次', () => {
    expect(textbookFrequencyRanks([
      { word: 'twee', tag: 'TW(hoofd)', sfiTotal: 50 },
      { word: 'een', tag: 'TW(hoofd)', sfiTotal: 50 },
      { word: 'drie', tag: 'TW(hoofd)', sfiTotal: 40 },
    ])).toEqual({ 'twee\tnumeral': 1, 'een\tnumeral': 2, 'drie\tnumeral': 3 });
  });

  it.each([NaN, Infinity, -Infinity])('拒绝无效的 SFI@TOTAL：%s', (sfiTotal) => {
    expect(() => textbookFrequencyRanks([{ word: 'boek', tag: 'N(soort)', sfiTotal }])).toThrow('SFI@TOTAL');
  });
});

describe('NT2Lex 词条匹配规则', () => {
  it('折叠空格、规范化 Unicode，保留专名大小写，并将多 token 标为短语', () => {
    expect(normalizeNt2LexEntry('  Cafe\u0301  ', 'N(soort)').lemma).toBe('café');
    expect(normalizeNt2LexEntry('Kerstmis', 'SPEC(deeleigen)').lemma).toBe('Kerstmis');
    expect(normalizeNt2LexEntry(' op   tijd ', 'VZ(init) N(soort)')).toMatchObject({
      lemma: 'op tijd', pos: 'phrase', specOnly: false,
    });
  });

  it('拒绝未知的 CGN 标签', () => {
    expect(() => normalizeNt2LexEntry('boek', 'UNKNOWN()')).toThrow('未知 CGN 标签');
  });
});
