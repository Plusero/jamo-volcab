import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CefrAssessment } from '../../src/domain/types';

type Item = { id: string; lemma: string; pos: string; level: string; freq: Record<string, number> };
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const full = read('content/manifests/reference-set-all-v1.json') as {
  source: { id: string; sha256: string };
  counts: { rows: number; normalizedKeys: number };
  items: Item[];
  excluded: { lemma: string; pos: string; reason: string }[];
};
const b1 = read('content/manifests/reference-set-b1-v1.json') as { source: typeof full.source; items: Item[] };
const evidence = read('content/manifests/nt2lex-cefr-v1.json') as { entries: Record<string, CefrAssessment> };
const key = (item: { lemma: string; pos: string }) => `${item.lemma}\t${item.pos}`;

describe('完整 NT2Lex 参考集', () => {
  it('每条原始记录都归入参考项或有明确原因的排除项', () => {
    const accounted = [...full.items.map(key), ...full.excluded.map(key)];
    expect(new Set(accounted).size).toBe(accounted.length);
    expect([...accounted].sort()).toEqual(Object.keys(evidence.entries).sort());
    expect(accounted).toHaveLength(full.counts.normalizedKeys);
    expect(Object.values(evidence.entries).reduce((n, entry) => n + entry.raw.length, 0)).toBe(full.counts.rows);
    expect(full.excluded.every((item) => item.reason.trim().length > 0)).toBe(true);
  });

  it('保留全部 B1 参考项的 ID 和频次，并包括 B2/C1 首次出现的词条', () => {
    const byKey = new Map(full.items.map((item) => [key(item), item]));
    expect(full.source).toEqual(b1.source);
    expect(new Set(full.items.map((item) => item.id)).size).toBe(full.items.length);
    for (const item of b1.items) {
      const imported = byKey.get(key(item));
      expect(imported?.id).toBe(item.id);
      for (const level of ['A1', 'A2', 'B1']) expect(imported?.freq[level]).toBe(item.freq[level]);
    }
    expect(new Set(full.items.map((item) => item.level))).toEqual(new Set(['A1', 'A2', 'B1', 'B2', 'C1']));
  });
});
