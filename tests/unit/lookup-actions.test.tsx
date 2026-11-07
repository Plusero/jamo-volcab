// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Lexeme, Sense } from '../../src/domain/types';
import { LookupActions } from '../../src/features/shared/LookupActions';
import { aiWordPrompt } from '../../src/platform/dictionary-links';

const lexeme: Lexeme = { id: 'roepen', lemma: 'roepen', pos: 'verb' };
const sense: Sense = {
  id: 'roepen-1', lexemeId: 'roepen', zh: '喊叫', level: 'A2', review: 'draft', topics: ['交流'],
  examples: [{ nl: 'Zij roept haar kinderen naar binnen.', zh: '她喊孩子们进屋。' }],
};
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('仅动词显示 Verbix，并直接链接当前动词的变位页', () => {
  const { rerender } = render(<LookupActions lexeme={lexeme} sense={sense} />);
  const link = screen.getByRole('link', { name: 'Verbix 动词变位' });
  expect(link).toHaveAttribute('href', 'https://www.verbix.com/dutch/verb/roepen');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  rerender(<LookupActions lexeme={{ ...lexeme, pos: 'noun' }} sense={sense} />);
  expect(screen.queryByRole('link', { name: 'Verbix 动词变位' })).not.toBeInTheDocument();
});

it('五个 AI 入口使用对应官网，并区分链接预填和复制粘贴', () => {
  render(<LookupActions lexeme={lexeme} sense={sense} />);
  expect(screen.queryByRole('button', { name: '复制词条' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '复制提问' })).not.toBeInTheDocument();
  for (const [name, url] of [
    ['ChatGPT', 'https://chatgpt.com/'],
    ['Gemini', 'https://gemini.google.com/app'],
    ['Claude', 'https://claude.ai/new'],
    ['千问', 'https://www.qianwen.com/'],
    ['豆包', 'https://www.doubao.com/chat/'],
  ]) {
    const link = screen.getByRole('link', { name: `问 ${name}` });
    const destination = new URL(link.getAttribute('href')!);
    expect(destination.origin + destination.pathname).toBe(url);
    expect(destination.searchParams.get('q')).toBe(['ChatGPT', 'Claude'].includes(name) ? aiWordPrompt(lexeme, sense.examples) : null);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(screen.getAllByText('需粘贴')).toHaveLength(3);
  const translation = screen.getByRole('link', { name: 'Google 翻译：例句' });
  expect(new URL(translation.getAttribute('href')!).searchParams.get('text')).toBe(sense.examples[0].nl);
  for (const [label, text] of [['单词', lexeme.lemma], ['例句', sense.examples[0].nl]]) {
    const link = screen.getByRole('link', { name: `DeepL 翻译：${label}` });
    const destination = new URL(link.getAttribute('href')!);
    expect(destination.origin + destination.pathname).toBe('https://www.deepl.com/translator');
    expect(decodeURIComponent(destination.hash.slice('#nl/zh/'.length))).toBe(text);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

it('Gemini、千问、豆包自动复制当前语境，ChatGPT 和 Claude 使用链接预填', async () => {
  render(<LookupActions lexeme={lexeme} sense={sense} />);
  for (const name of ['Gemini', '千问', '豆包']) {
    expect(fireEvent.click(screen.getByRole('link', { name: `问 ${name}` }))).toBe(true);
    await screen.findByText(`提问已复制，${name} 需要在输入框中粘贴发送。`);
    const prompt = writeText.mock.lastCall![0] as string;
    expect(prompt).toContain('roepen');
    expect(prompt).toContain(sense.examples[0].nl);
    expect(prompt).not.toContain(sense.examples[0].zh);
  }

  for (const name of ['ChatGPT', 'Claude']) {
    expect(fireEvent.click(screen.getByRole('link', { name: `问 ${name}` }))).toBe(true);
    await screen.findByText(`提问将自动带入 ${name}。`);
  }
  expect(writeText).toHaveBeenCalledTimes(3);
});
