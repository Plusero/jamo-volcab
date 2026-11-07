// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TextbookFrequency } from '../../src/features/shared/TextbookFrequency';

afterEach(cleanup);

it('显示教材词频排名和计算口径', () => {
  render(<TextbookFrequency rank={1234} />);
  expect(screen.getByText('教材词频排名：第 1,234 名')).toHaveAttribute('title', expect.stringContaining('SFI@TOTAL'));
});

it('未匹配到来源时显示暂无', () => {
  render(<TextbookFrequency />);
  expect(screen.getByText('教材词频排名：暂无')).toBeVisible();
});
