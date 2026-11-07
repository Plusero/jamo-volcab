const POS: Record<string, string> = {
  N: 'noun', WW: 'verb', ADJ: 'adjective', BW: 'adverb', VZ: 'preposition', VG: 'conjunction',
  VNW: 'pronoun', TW: 'numeral', LID: 'article', TSW: 'interjection', SPEC: 'special',
};

/** 与 B1 参考集共用词形和词性规则，但不筛选等级或排除噪声行。 */
export function normalizeNt2LexEntry(rawWord: string, tag: string) {
  const word = rawWord.normalize('NFC').trim().replace(/\s+/g, ' ');
  const tags = tag.trim().split(/\s+/);
  const cgn = tags.map((t) => t.replace(/\(.*$/, ''));
  for (const c of cgn) if (!(c in POS)) throw new Error(`未知 CGN 标签 ${tag} @ ${word}`);
  return {
    word,
    lemma: cgn.includes('SPEC') ? word : word.toLowerCase(),
    pos: tags.length > 1 ? 'phrase' : POS[cgn[0]],
    specOnly: cgn.every((c) => c === 'SPEC'),
  };
}

/** 全部原始行按 SFI@TOTAL 降序编号；同分保持原始行顺序，合并项取最高名次。 */
export function textbookFrequencyRanks(entries: { word: string; tag: string; sfiTotal: number }[]): Record<string, number> {
  for (const entry of entries) {
    if (!Number.isFinite(entry.sfiTotal)) throw new Error(`SFI@TOTAL 不是有效数字: ${entry.word}`);
  }
  const sorted = [...entries].sort((a, b) => b.sfiTotal - a.sfiTotal);
  const ranks = new Map<string, number>();
  sorted.forEach((entry, index) => {
    const { lemma, pos } = normalizeNt2LexEntry(entry.word, entry.tag);
    const key = `${lemma}\t${pos}`;
    if (!ranks.has(key)) ranks.set(key, index + 1);
  });
  return Object.fromEntries(ranks);
}
