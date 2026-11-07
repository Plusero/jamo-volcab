// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { speak } from '../../src/platform/speech';
import { WordFront } from '../../src/features/study/WordFront';

class Utterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
  constructor(public text: string) {}
}

const voice = { name: 'Xander', lang: 'nl-NL' } as SpeechSynthesisVoice;
const synth = {
  speaking: false, pending: false, paused: false,
  cancel: vi.fn(), resume: vi.fn(), speak: vi.fn<(utterance: Utterance) => void>(),
};

beforeEach(() => {
  synth.speaking = synth.pending = synth.paused = false;
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('在调用时立即提交荷兰语朗读，空闲时不取消队列', () => {
  speak('Goedemorgen!', voice, 'slow', vi.fn());
  expect(synth.speak).toHaveBeenCalledOnce();
  expect(synth.speak.mock.calls[0]![0]).toMatchObject({ text: 'Goedemorgen!', voice, lang: 'nl-NL', rate: 0.7 });
  expect(synth.cancel).not.toHaveBeenCalled();
});

it.each(['speaking', 'pending'] as const)('有旧语句 %s 时先取消，再提交新语句', (state) => {
  synth[state] = true;
  speak('fiets', voice, 'normal', vi.fn());
  expect(synth.cancel).toHaveBeenCalledOnce();
  expect(synth.cancel.mock.invocationCallOrder[0]).toBeLessThan(synth.speak.mock.invocationCallOrder[0]!);
});

it('暂停的合成器先恢复，再提交新语句', () => {
  synth.paused = true;
  speak('fiets', voice, 'normal', vi.fn());
  expect(synth.resume).toHaveBeenCalledOnce();
  expect(synth.resume.mock.invocationCallOrder[0]).toBeLessThan(synth.speak.mock.invocationCallOrder[0]!);
});

it('系统默认试听只指定荷兰语，不绑定 Xander', () => {
  speak('Goedemorgen!', null, 'normal', vi.fn());
  expect(synth.speak.mock.calls[0]![0]).toMatchObject({ voice: null, lang: 'nl-NL', rate: 1 });
});

it('播放错误向调用方报告，主动取消或打断不报错', () => {
  const onError = vi.fn();
  speak('fiets', voice, 'normal', onError);
  const utterance = synth.speak.mock.calls[0]![0];
  for (const error of ['canceled', 'interrupted', 'synthesis-failed']) {
    utterance.onerror!({ error } as SpeechSynthesisErrorEvent);
  }
  expect(onError.mock.calls).toEqual([['synthesis-failed']]);
});

it('单词与例句通过同一播放逻辑朗读，显示系统错误，再次点击清除旧错误', () => {
  render(<WordFront lexeme={{ id: 'fiets', lemma: 'fiets', pos: 'noun' }}
    examples={[{ nl: 'Ik heb een fiets.', zh: '我有一辆自行车。' }]}
    revealed={false} isNew voice={voice} rate="normal" />);
  synth.speak.mockImplementationOnce((utterance) => {
    utterance.onerror!({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
  });
  fireEvent.click(screen.getByRole('button', { name: '朗读单词' }));
  expect(synth.speak.mock.calls[0]![0].text).toBe('fiets');
  expect(screen.getByRole('alert')).toHaveTextContent('synthesis-failed');
  fireEvent.click(screen.getByRole('button', { name: '朗读例句' }));
  expect(synth.speak.mock.calls[1]![0].text).toBe('Ik heb een fiets.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
