// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApp } from '../../src/app/AppContext';
import { loadSettings } from '../../src/application/settings';
import { indexVocab } from '../../src/application/vocab';
import type { AppDb } from '../../src/data/db';
import { StudyPage } from '../../src/features/study/StudyPage';
import { newDb, T0 } from './helpers';

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
