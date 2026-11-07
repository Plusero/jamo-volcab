// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { CefrAssessment, Lexeme } from '../../src/domain/types';
import { WordFront } from '../../src/features/study/WordFront';

afterEach(cleanup);

it.each(['reliable', 'needs_review', 'insufficient_evidence'] as const)('学习卡片直接显示最终等级及复核状态：%s', (review_status) => {
  const cefr: CefrAssessment = {
    first_occurrence_level: 'A1', final_level: 'A1',
    suggested_level: review_status === 'needs_review' ? 'B1' : null,
    review_status, raw: [],
  };
  const lexeme: Lexeme = { id: 'een', lemma: 'een', pos: 'article', cefr };
  render(<WordFront lexeme={lexeme} isNew voice={null} rate="normal" />);
  expect(screen.getByText('CEFR A1')).toBeVisible();
  expect(screen.queryByText('CEFR B1')).not.toBeInTheDocument();
  if (review_status === 'needs_review') expect(screen.getByText('待复核')).toBeVisible();
  if (review_status === 'insufficient_evidence') expect(screen.getByText('证据不足')).toBeVisible();
});
