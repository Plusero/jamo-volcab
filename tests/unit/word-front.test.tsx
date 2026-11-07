// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { CefrAssessment, Lexeme } from '../../src/domain/types';
import { WordFront } from '../../src/features/study/WordFront';

afterEach(cleanup);

const examples = [
  { nl: 'Ik heb een broer en een zus.', zh: '我有一个兄弟和一个姐妹。' },
  { nl: 'Dit is een heel goed boek.', zh: '这是一本很好的书。' },
];

it.each(['reliable', 'needs_review', 'insufficient_evidence'] as const)('学习卡片直接显示最终等级及复核状态：%s', (review_status) => {
  const cefr: CefrAssessment = {
    first_occurrence_level: 'A1', final_level: 'A1',
    suggested_level: review_status === 'needs_review' ? 'B1' : null,
    review_status, raw: [],
  };
  const lexeme: Lexeme = { id: 'een', lemma: 'een', pos: 'article', cefr };
  render(<WordFront lexeme={lexeme} examples={examples} revealed={false} isNew voice={null} rate="normal" />);
  expect(screen.getByText('CEFR A1')).toBeVisible();
  expect(screen.queryByText('CEFR B1')).not.toBeInTheDocument();
  if (review_status === 'needs_review') expect(screen.getByText('待复核')).toBeVisible();
  if (review_status === 'insufficient_evidence') expect(screen.getByText('证据不足')).toBeVisible();
});

it('揭晓后保留原来的荷兰语例句节点，并在原处展示中文翻译', () => {
  const props = { lexeme: { id: 'een', lemma: 'een', pos: 'article' }, examples, isNew: true, voice: null, rate: 'normal' as const };
  const { rerender } = render(<WordFront {...props} revealed={false} />);
  const dutchSentences = examples.map((example) => screen.getByText(example.nl));
  for (const example of examples) {
    expect(screen.getByText(example.nl)).toBeVisible();
    expect(screen.queryByText(example.zh)).not.toBeInTheDocument();
  }
  rerender(<WordFront {...props} revealed />);
  for (const [index, example] of examples.entries()) {
    expect(screen.getByText(example.nl)).toBe(dutchSentences[index]);
    expect(screen.getByText(example.zh)).toBeVisible();
  }
  expect(screen.getAllByRole('list', { name: '语境例句' })).toHaveLength(1);
  rerender(<WordFront {...props} revealed={false} />);
  for (const example of examples) expect(screen.queryByText(example.zh)).not.toBeInTheDocument();
});
