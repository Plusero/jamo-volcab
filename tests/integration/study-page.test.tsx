// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApp } from '../../src/app/AppContext';
import { loadSettings } from '../../src/application/settings';
import { rate, setSuspended } from '../../src/application/study';
import { indexVocab } from '../../src/application/vocab';
import type { AppDb } from '../../src/data/db';
import { StudyPage } from '../../src/features/study/StudyPage';
import { DAY, newDb, T0 } from './helpers';

vi.mock('../../src/app/AppContext', () => ({ useApp: vi.fn() }));

const words = ['huilen', 'stem', 'stil'];
const vocab = indexVocab({
  version: 'test',
  lexemes: words.map((word) => ({ id: word, lemma: word, pos: 'noun' })),
  senses: words.map((word) => ({
    id: `${word}-1`, lexemeId: word, zh: `${word} 的释义`,
    examples: [{ nl: `Een voorbeeld met ${word}.`, zh: `${word} 的例句译文` }],
    topics: [], level: 'A1', review: 'reviewed',
  })),
});

let db: AppDb;
beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(T0);
  db = await newDb({ newLimit: 3 });
  vi.mocked(useApp).mockReturnValue({ db, vocab, settings: await loadSettings(db), updateSettings: vi.fn() });
});

afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
});

function expectProgress(reviewLeft: number, newLeft: number, answered: number, newLearned = 0, reviewsCompleted = 0) {
  const region = screen.getByRole('region', { name: '今日学习进度' });
  expect(region).toHaveAttribute('title', `今日已作答 ${answered} 次`);
  const progress = within(region);
  expect(progress.getAllByRole('progressbar')).toHaveLength(2);
  for (const { label, completed, remaining } of [
    { label: '新词', completed: newLearned, remaining: newLeft },
    { label: '复习', completed: reviewsCompleted, remaining: reviewLeft },
  ]) {
    const group = within(progress.getByRole('group', { name: label }));
    const total = completed + remaining;
    const percent = total === 0 ? 100 : Math.floor(completed / total * 100);
    const bar = group.getByRole('progressbar', { name: `${label}进度` });
    expect(bar).toHaveAttribute('value', String(total === 0 ? 1 : completed));
    expect(bar).toHaveAttribute('max', String(total || 1));
    expect(bar).toHaveAttribute('aria-valuetext', `已完成 ${completed} / ${total} 个，剩余 ${remaining} 个，${percent}%`);
    expect(group.getByText(`${percent}%`)).toBeVisible();
    expect(group.getByText(`剩余 ${remaining}`, { exact: false })).toBeVisible();
  }
}

it('恢复已完成词数且重复评分只计一次，全部完成达到 100%，撤销后回退', async () => {
  await rate(db, 'huilen-1', 'Again', T0 - 2 * 60_000);
  await rate(db, 'huilen-1', 'Easy', T0);
  vi.mocked(useApp).mockReturnValue({
    db, vocab, settings: { ...await loadSettings(db), easyButton: true }, updateSettings: vi.fn(),
  });
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText('stem');
  expectProgress(0, 2, 2, 1, 1);

  for (let index = 1; index < words.length; index++) {
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }));
    fireEvent.click(screen.getByRole('button', { name: '轻松' }));
    if (index + 1 < words.length) await screen.findByText(words[index + 1]);
    else await screen.findByRole('heading', { name: '本轮完成' });
    await waitFor(() => expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled());
    expectProgress(0, 2 - index, index + 2, index + 1, 1);
  }

  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  await screen.findByText('stil 的释义');
  expectProgress(0, 1, 3, 2, 1);
});

it('没有待学词时显示已完成的进度条', async () => {
  for (const word of words) await setSuspended(db, `${word}-1`, true, T0);
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByRole('heading', { name: '本轮完成' });
  expectProgress(0, 0, 0);
});

it('评分后更新今日进度，包含稍后复习；本轮完成和撤销时仍显示正确数量', async () => {
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText(words[0]);
  expectProgress(0, 3, 0);

  for (let index = 0; index < words.length; index++) {
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }));
    fireEvent.click(screen.getByRole('button', { name: '忘记' }));
    if (index + 1 < words.length) await screen.findByText(words[index + 1]);
    else await screen.findByRole('heading', { name: '本轮完成' });
    await waitFor(() => expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled());
    expectProgress(index + 1, 2 - index, index + 1, index + 1);
    expect(screen.getByText(`（稍后 ${index + 1}）`)).toBeVisible();
  }

  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  await screen.findByText('stil 的释义');
  expectProgress(2, 1, 2, 2);
});

it('复习旧词只推进复习条，新词初次学习只推进新词条，并将稍后再练计入复习', async () => {
  await rate(db, 'huilen-1', 'Good', T0 - 30 * DAY);
  vi.mocked(useApp).mockReturnValue({
    db, vocab, settings: { ...await loadSettings(db), easyButton: true }, updateSettings: vi.fn(),
  });
  const page = render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText('huilen');
  expectProgress(1, 2, 0);

  fireEvent.click(screen.getByRole('button', { name: '显示答案' }));
  fireEvent.click(screen.getByRole('button', { name: '轻松' }));
  await screen.findByText('stem');
  await waitFor(() => expect(screen.getByRole('button', { name: '跳过' })).toBeEnabled());
  expectProgress(0, 2, 1, 0, 1);

  fireEvent.click(screen.getByRole('button', { name: '显示答案' }));
  fireEvent.click(screen.getByRole('button', { name: '忘记' }));
  await screen.findByText('stil');
  await waitFor(() => expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled());
  expectProgress(1, 1, 2, 1, 1);

  page.unmount();
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText('stil');
  expectProgress(1, 1, 2, 1, 1);
});

it('从数据库恢复今日进度，暂停到期词后减少剩余复习数', async () => {
  await rate(db, 'huilen-1', 'Good', T0 - 30 * DAY);
  const page = render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText('huilen');
  expectProgress(1, 2, 0);

  fireEvent.click(screen.getByRole('button', { name: '暂停' }));
  await screen.findByText('stem');
  expectProgress(0, 2, 0);

  page.unmount();
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText('stem');
  expectProgress(0, 2, 0);
});

it('跳过不扣减今日剩余数量，本轮结束时仍保留未学的新词数', async () => {
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText(words[0]);
  for (let index = 0; index < words.length; index++) {
    fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    if (index + 1 < words.length) {
      await screen.findByText(words[index + 1]);
      await waitFor(() => expect(screen.getByRole('button', { name: '跳过' })).toBeEnabled());
    } else {
      await screen.findByRole('heading', { name: '本轮完成' });
    }
    expectProgress(0, 3, 0);
  }
});

it.each(['鼠标', '键盘'] as const)('%s 连续揭晓和评分后只保留当前词卡，撤销也不残留旧卡', async (input) => {
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  await screen.findByText(words[0]);

  for (let index = 0; index < 2; index++) {
    if (input === '键盘') fireEvent.keyDown(document.body, { key: ' ' });
    else fireEvent.click(screen.getByRole('button', { name: '显示答案' }));
    expect(screen.getByText(`${words[index]} 的释义`)).toBeVisible();

    if (input === '键盘') fireEvent.keyDown(document.body, { key: '3' });
    else fireEvent.click(screen.getByRole('button', { name: '认识' }));
    await screen.findByText(words[index + 1]);
    await waitFor(() => expect(screen.getByRole('button', { name: '跳过' })).toBeEnabled());

    for (const previous of words.slice(0, index + 1)) {
      expect(screen.queryByText(previous)).not.toBeInTheDocument();
      expect(screen.queryByText(`Een voorbeeld met ${previous}.`)).not.toBeInTheDocument();
      expect(screen.queryByText(`${previous} 的例句译文`)).not.toBeInTheDocument();
    }
    expect(screen.getAllByRole('list', { name: '语境例句' })).toHaveLength(1);
    expect(screen.queryByRole('region', { name: '答案' })).not.toBeInTheDocument();
    expect(screen.queryByText(`${words[index + 1]} 的例句译文`)).not.toBeInTheDocument();
  }
  expect(await db.reviewLogs.count()).toBe(2);

  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  await screen.findByText('stem 的释义');
  expect(screen.getAllByText('stem')).toHaveLength(1);
  expect(screen.queryByText('huilen')).not.toBeInTheDocument();
  expect(screen.queryByText('stil')).not.toBeInTheDocument();
  expect(screen.getAllByRole('list', { name: '语境例句' })).toHaveLength(1);
  expect(await db.reviewLogs.count()).toBe(1);
});
