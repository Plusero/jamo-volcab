// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { db } from '../../src/app/AppContext';
import { DEFAULT_SETTINGS } from '../../src/application/settings';
import type { Vocab } from '../../src/domain/types';
import { THEME_STORAGE_KEY } from '../../src/platform/theme';

vi.mock('../../src/app/UpdatePrompt', () => ({ UpdatePrompt: () => null }));

const vocab: Vocab = {
  version: 'test',
  lexemes: [{ id: 'fiets', lemma: 'fiets', article: 'de', pos: 'noun' }],
  senses: [{ id: 'fiets-1', lexemeId: 'fiets', zh: '自行车', examples: [{ nl: 'Ik heb een fiets.', zh: '我有一辆自行车。' }], topics: [], level: 'A1', review: 'reviewed' }],
};

beforeEach(async () => {
  window.history.replaceState(null, '', '/#/');
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  await db.open();
  await db.settings.put(DEFAULT_SETTINGS, 'main');
  vi.stubGlobal('__APP_VERSION__', 'test');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => vocab }));
});

afterEach(async () => {
  cleanup();
  await db.delete();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

it('延迟加载页面后更新标题和主区域焦点，词条保留荷兰语语义', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: '今日' });
  expect(document.title).toBe('今日 | Dutch Vocab');

  fireEvent.click(screen.getByRole('link', { name: '词库' }));
  await screen.findByRole('heading', { name: '词库' });
  await waitFor(() => expect(screen.getByRole('main', { name: '词库' })).toHaveFocus());
  expect(document.title).toBe('词库 | Dutch Vocab');
  expect(screen.getByRole('searchbox', { name: '搜索' })).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'CEFR 等级' })).toBeVisible();

  fireEvent.click((await screen.findByText('de fiets')).closest('a')!);
  expect(await screen.findByRole('heading', { name: 'de fiets' })).toHaveAttribute('lang', 'nl');
  expect(screen.getByText('Ik heb een fiets.')).toHaveAttribute('lang', 'nl');
  await waitFor(() => expect(document.title).toBe('fiets · 词条详情 | Dutch Vocab'));

  fireEvent.click(screen.getByRole('link', { name: '统计' }));
  await screen.findByRole('heading', { name: '统计' });
  expect(document.title).toBe('统计 | Dutch Vocab');
});

it('词库仍在加载时就应用保存的主题，其他标签页的更改也同步到设置', async () => {
  await db.settings.put({ ...DEFAULT_SETTINGS, theme: 'dark' }, 'main');
  let resolveVocab!: (vocab: Vocab) => void;
  const pendingVocab = new Promise<Vocab>((resolve) => { resolveVocab = resolve; });
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => pendingVocab } as Response);
  render(<App />);
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  expect(screen.getByText('加载中…')).toBeVisible();
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  await act(async () => { resolveVocab(vocab); });
  await screen.findByRole('heading', { name: '今日' });

  fireEvent.click(screen.getByRole('link', { name: '设置' }));
  await screen.findByRole('heading', { name: '设置' });
  expect(screen.getByRole('radio', { name: '深色' })).toBeChecked();
  fireEvent(window, new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' }));
  expect(screen.getByRole('radio', { name: '浅色' })).toBeChecked();
  expect(document.documentElement.dataset.theme).toBe('light');

  fireEvent.click(screen.getByRole('radio', { name: '跟随系统' }));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});
