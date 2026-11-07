import { describe, expect, it } from 'vitest';
import { CEFR_LEVELS, CefrThresholds } from '../../src/domain/types';
import type { CefrEvidence } from '../../src/domain/types';
import config from '../../content/sources/cefr-config.json';
import { classifyCefr, parseNt2LexNumber } from '../../scripts/nt2lex-cefr';

const thresholds = CefrThresholds.parse(config);
function evidence(values: Partial<Record<(typeof CEFR_LEVELS)[number], readonly [number | null, number | null]>>): CefrEvidence {
  return {
    word: 'voorbeeld', tag: 'N(soort)',
    F: Object.fromEntries(CEFR_LEVELS.map((l) => [l, values[l]?.[0] ?? null])) as CefrEvidence['F'],
    D: Object.fromEntries(CEFR_LEVELS.map((l) => [l, values[l]?.[1] ?? null])) as CefrEvidence['D'],
  };
}

describe('首次出现等级 + F、D 可靠性复核', () => {
  it.each([
    { values: { A1: [2, 0.1], A2: [10, 0.5] }, first: 'A1', suggested: null, status: 'reliable' },
    { values: { A1: [1, 0.1], A2: [2, 0], B1: [2, 0.2] }, first: 'A1', suggested: 'B1', status: 'needs_review' },
    { values: { A2: [3, null], B1: [2, -4.7e-17], C1: [1, 0.8] }, first: 'A2', suggested: null, status: 'insufficient_evidence' },
    { values: {}, first: null, suggested: null, status: 'insufficient_evidence' },
  ] as const)('$status：首次 $first，建议 $suggested', ({ values, first, suggested, status }) => {
    const raw = [evidence(values)];
    const result = classifyCefr(raw, thresholds);
    expect(result).toMatchObject({ first_occurrence_level: first, suggested_level: suggested, final_level: first, review_status: status });
    expect(result.raw).toBe(raw);
  });

  it('采用配置阈值，不从不同原始行拼接可靠性证据', () => {
    const raw = [evidence({ A1: [3, 0], B2: [4, 0.5] }), evidence({ A1: [1, 0.8] })];
    expect(classifyCefr(raw, thresholds)).toMatchObject({ suggested_level: 'B2', final_level: 'A1', review_status: 'needs_review' });
    expect(classifyCefr(raw, { min_frequency: 4, min_dispersion: 0.5 }).review_status).toBe('insufficient_evidence');
    expect(CefrThresholds.safeParse({ min_frequency: 0, min_dispersion: 0 }).success).toBe(false);
  });

  it('区分缺失、零与负浮点 D，并拒绝损坏数据', () => {
    for (const missing of [undefined, '', ' ', '-', 'NA', 'N/A']) expect(parseNt2LexNumber(missing)).toBeNull();
    expect(parseNt2LexNumber('0')).toBe(0);
    expect(parseNt2LexNumber('-4.7e-17')).toBe(-4.7e-17);
    for (const invalid of ['unknown', 'Infinity', 'NaN']) expect(() => parseNt2LexNumber(invalid)).toThrow('无效');
  });
});
