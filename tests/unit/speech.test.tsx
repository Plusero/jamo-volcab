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
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  constructor(public text: string) {}
}

const voice = { name: 'Xander', lang: 'nl-NL' } as SpeechSynthesisVoice;
const synth = {
  speaking: false, pending: false, paused: false,
  cancel: vi.fn(), resume: vi.fn(), speak: vi.fn<(utterance: Utterance) => void>(),
};

beforeEach(() => {
  vi.useFakeTimers();
  synth.speaking = synth.pending = synth.paused = false;
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});

afterEach(() => {
  synth.speak.mock.calls.at(-1)?.[0].onend?.();
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
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

it.each(['canceled', 'interrupted', 'synthesis-failed'] as const)('播放错误 %s 只在非主动中断时报告', (error) => {
  const onError = vi.fn();
  speak('fiets', voice, 'normal', onError);
  const utterance = synth.speak.mock.calls[0]![0];
  utterance.onerror!({ error } as SpeechSynthesisErrorEvent);
  expect(onError.mock.calls).toEqual(error === 'synthesis-failed' ? [[error]] : []);
  vi.advanceTimersByTime(8000);
  expect(onError.mock.calls).toEqual(error === 'synthesis-failed' ? [[error]] : []);
});

it('没有任何开始或错误事件时，超时后停止队列并报告启动失败', () => {
  const onError = vi.fn();
  speak('fiets', voice, 'normal', onError);
  vi.advanceTimersByTime(8000);
  expect(synth.cancel).toHaveBeenCalledOnce();
  expect(onError).toHaveBeenCalledExactlyOnceWith('start-timeout');
});

it('收到开始事件后取消启动超时检测，完整保留长例句的播放', () => {
  const onError = vi.fn();
  const onState = vi.fn();
  speak('Ik heb een fiets.', voice, 'normal', onError, onState);
  const utterance = synth.speak.mock.calls[0]![0];
  utterance.onstart!();
  vi.advanceTimersByTime(20000);
  expect(onError).not.toHaveBeenCalled();
  expect(synth.cancel).not.toHaveBeenCalled();
  utterance.onend!();
  expect(onState.mock.calls).toEqual([['started'], ['ended']]);
});

it('新语句取代旧语句后，旧事件和旧计时器不影响新播放', () => {
  const oldError = vi.fn();
  const newError = vi.fn();
  speak('fiets', voice, 'normal', oldError);
  const oldUtterance = synth.speak.mock.calls[0]![0];
  vi.advanceTimersByTime(4000);
  speak('boek', voice, 'normal', newError);
  oldUtterance.onstart!();
  oldUtterance.onend!();
  oldUtterance.onerror!({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
  vi.advanceTimersByTime(4000);
  expect(oldError).not.toHaveBeenCalled();
  expect(newError).not.toHaveBeenCalled();
  vi.advanceTimersByTime(4000);
  expect(newError).toHaveBeenCalledExactlyOnceWith('start-timeout');
});

it('支持 AudioSession 时使用 playback，在结束后还原原来的类型', () => {
  const audioSession = { type: 'auto' };
  vi.stubGlobal('navigator', { audioSession });
  speak('fiets', voice, 'normal', vi.fn());
  expect(audioSession.type).toBe('playback');
  synth.speak.mock.calls[0]![0].onend!();
  expect(audioSession.type).toBe('auto');
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
