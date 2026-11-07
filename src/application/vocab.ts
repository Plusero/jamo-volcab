import type { Lexeme, Sense, Vocab } from '../domain/types';

export type VocabIndex = {
  version: string;
  senseById: Map<string, Sense>;
  lexemeById: Map<string, Lexeme>;
  /** 未退役词义，按学习顺序排列 */
  senseOrder: string[];
};

/** 词库在构建时已经校验过，运行时直接信任。 */
export async function loadVocab(baseUrl: string = import.meta.env.BASE_URL): Promise<VocabIndex> {
  const res = await fetch(`${baseUrl}vocabulary/vocab.json`);
  if (!res.ok) throw new Error(`词库加载失败：HTTP ${res.status}`);
  return indexVocab((await res.json()) as Vocab);
}

export function indexVocab(v: Vocab): VocabIndex {
  return {
    version: v.version,
    senseById: new Map(v.senses.map((s) => [s.id, s])),
    lexemeById: new Map(v.lexemes.map((l) => [l.id, l])),
    senseOrder: v.senses.filter((s) => !s.retired).map((s) => s.id),
  };
}

export type SearchFilter = { q?: string; pos?: string; topic?: string };
export type SearchRow = { sense: Sense; lexeme: Lexeme };

export function searchSenses(ix: VocabIndex, f: SearchFilter, offset = 0, limit = 50) {
  const q = f.q?.trim().toLowerCase();
  const rows: SearchRow[] = [];
  for (const id of ix.senseOrder) {
    const sense = ix.senseById.get(id)!;
    const lexeme = ix.lexemeById.get(sense.lexemeId)!;
    if (f.pos && lexeme.pos !== f.pos) continue;
    if (f.topic && !sense.topics.includes(f.topic)) continue;
    if (q && !lexeme.lemma.toLowerCase().includes(q) && !sense.zh.includes(q)) continue;
    rows.push({ sense, lexeme });
  }
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
}
