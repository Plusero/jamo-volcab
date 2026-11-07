/**
 * content-validate / content-build 共用：读取 content/curated/*.json 并校验。
 * 读不到或 JSON 坏了就直接抛错。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vocab } from '../src/domain/types';
import type { Lexeme, Sense } from '../src/domain/types';

const CURATED_DIR = 'content/curated';

export function loadCurated(): { lexemes: Lexeme[]; senses: Sense[] } {
  const files = readdirSync(CURATED_DIR).filter((f) => f.endsWith('.json')).sort();
  const lexemes: Lexeme[] = [];
  const senses: Sense[] = [];
  for (const f of files) {
    const part = JSON.parse(readFileSync(join(CURATED_DIR, f), 'utf8')) as { lexemes: Lexeme[]; senses: Sense[] };
    lexemes.push(...part.lexemes);
    senses.push(...part.senses);
  }
  return { lexemes, senses };
}

const PLACEHOLDER = /TODO|TBD|待补/i;

export function validateVocab(v: { lexemes: Lexeme[]; senses: Sense[] }): string[] {
  const problems: string[] = [];
  const parsed = Vocab.safeParse({ version: 'validate', lexemes: v.lexemes, senses: v.senses });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) problems.push(`schema: ${issue.path.join('.')}: ${issue.message}`);
  }

  const seenLexemes = new Set<string>();
  for (const lx of v.lexemes) {
    if (seenLexemes.has(lx.id)) problems.push(`重复的 lexeme ID: ${lx.id}`);
    seenLexemes.add(lx.id);
    if (lx.pos === 'noun' && (!lx.article || !lx.plural)) problems.push(`${lx.id}: 名词缺少 article 或 plural`);
    if (lx.pos === 'verb' && !lx.verbForms) problems.push(`${lx.id}: 动词缺少 verbForms`);
    if (PLACEHOLDER.test(JSON.stringify(lx))) problems.push(`${lx.id}: 含占位文本`);
  }

  const seenSenses = new Set<string>();
  for (const s of v.senses) {
    if (seenSenses.has(s.id)) problems.push(`重复的 sense ID: ${s.id}`);
    seenSenses.add(s.id);
    if (!seenLexemes.has(s.lexemeId)) problems.push(`${s.id}: 找不到 lexemeId ${s.lexemeId}`);
    for (const ex of s.examples) {
      if (ex.nl === ex.zh) problems.push(`${s.id}: 例句 nl 与 zh 相同: ${ex.nl}`);
    }
    if (PLACEHOLDER.test(JSON.stringify(s))) problems.push(`${s.id}: 含占位文本`);
  }
  return problems;
}
