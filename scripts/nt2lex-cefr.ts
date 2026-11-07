import { CEFR_LEVELS } from '../src/domain/types';
import type { CefrAssessment, CefrEvidence, CefrThresholds } from '../src/domain/types';

/** 缺失保留为 null；原始 D 存在极小负浮点数，原样保留且不能通过 D > 0。 */
export function parseNt2LexNumber(value: string | undefined): number | null {
  const text = value?.trim();
  if (!text || text === '-' || text === 'NA' || text === 'N/A') return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error(`无效的 NT2Lex 数值: ${value}`);
  return number;
}

/** 可靠性必须由同一原始行的 F、D 同时支持；建议等级始终不会自动成为最终等级。 */
export function classifyCefr(raw: CefrEvidence[], thresholds: CefrThresholds): CefrAssessment {
  const first = CEFR_LEVELS.findIndex((level) => raw.some((row) => (row.F[level] ?? 0) > 0));
  const firstLevel = first < 0 ? null : CEFR_LEVELS[first];
  const supportedLevel = first < 0 ? undefined : CEFR_LEVELS.slice(first).find((level) => raw.some((row) => {
    const f = row.F[level];
    const d = row.D[level];
    return f !== null && d !== null && f >= thresholds.min_frequency && d > thresholds.min_dispersion;
  }));
  return {
    first_occurrence_level: firstLevel,
    suggested_level: supportedLevel && supportedLevel !== firstLevel ? supportedLevel : null,
    final_level: firstLevel,
    review_status: supportedLevel === undefined ? 'insufficient_evidence' : supportedLevel === firstLevel ? 'reliable' : 'needs_review',
    raw,
  };
}
