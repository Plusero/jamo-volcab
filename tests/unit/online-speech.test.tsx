// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { googleSpeechUrl, playOnlineSpeech, stopOnlineSpeech } from '../../src/platform/online-speech';
import { WordFront } from '../../src/features/study/WordFront';
import { PrefsSettings } from '../../src/features/settings/PrefsSettings';
import { useApp, type AppState } from '../../src/app/AppContext';
import { DEFAULT_SETTINGS } from '../../src/application/settings';

vi.mock('../../src/app/AppContext', () => ({ useApp: vi.fn() }));

class AudioMock {
  static instances: AudioMock[] = [];
  src = '';
  preload = '';
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  constructor() { AudioMock.instances.push(this); }
}

beforeEach(() => {
  AudioMock.instances = [];
  vi.stubGlobal('Audio', AudioMock);
  vi.stubGlobal('speechSynthesis', undefined);
});

afterEach(() => {
  cleanup();
  stopOnlineSpeech();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('在线 URL 保留特殊字符，指定荷兰语和正常／慢速', () => {
  const text = "'s ochtends & café + één? #";
  for (const rate of ['normal', 'slow'] as const) {
    const url = new URL(googleSpeechUrl(text, rate));
    expect(url.origin + url.pathname).toBe('https://translate.google.com/translate_tts');
    expect(url.searchParams.get('q')).toBe(text);
    expect(url.searchParams.get('tl')).toBe('nl');
    expect(url.searchParams.get('ttsspeed')).toBe(rate === 'slow' ? '0.24' : '1');
  }
  expect(() => googleSpeechUrl('a'.repeat(201), 'normal')).toThrow(RangeError);
});

it('在点击调用期间直接启动媒体播放，事件驱动播放状态', () => {
  const onState = vi.fn();
  const onError = vi.fn();
  playOnlineSpeech('Goedemorgen!', 'normal', onError, onState);
  const audio = AudioMock.instances[0]!;
  expect(audio.play).toHaveBeenCalledOnce();
  expect(audio.preload).toBe('none');
  expect(onState).not.toHaveBeenCalled();
  audio.onplaying!();
  audio.onended!();
  expect(onState.mock.calls).toEqual([['playing'], ['ended']]);
  expect(onError).not.toHaveBeenCalled();
  expect(audio.src).toBe('');
});

it('连续点击停止旧音频；旧请求的迟到事件和拒绝不影响新播放', async () => {
  const oldError = vi.fn();
  const newError = vi.fn();
  const onState = vi.fn();
  let rejectOld!: (reason: Error) => void;
  // 在构造后、play 执行前安排一个未完成的请求。
  vi.stubGlobal('Audio', class extends AudioMock {
    constructor() {
      super();
      this.play = vi.fn<() => Promise<void>>(() => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
    }
  });
  playOnlineSpeech('fiets', 'normal', oldError, vi.fn());
  const old = AudioMock.instances[0]!;
  const oldEnded = old.onended!;
  vi.stubGlobal('Audio', AudioMock);
  playOnlineSpeech('boek', 'normal', newError, onState);
  expect(old.pause).toHaveBeenCalledOnce();
  expect(old.src).toBe('');
  oldEnded();
  rejectOld(new DOMException('interrupted', 'AbortError'));
  await Promise.resolve();
  AudioMock.instances[1]!.onplaying!();
  expect(oldError).not.toHaveBeenCalled();
  expect(newError).not.toHaveBeenCalled();
  expect(onState.mock.calls).toEqual([['playing']]);
});

it('播放权限拒绝会显示错误，而不是报告播放结束', async () => {
  vi.stubGlobal('Audio', class extends AudioMock {
    constructor() {
      super();
      this.play = vi.fn<() => Promise<void>>(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    }
  });
  const onError = vi.fn();
  const onState = vi.fn();
  playOnlineSpeech('fiets', 'normal', onError, onState);
  await Promise.resolve();
  expect(onError).toHaveBeenCalledWith('浏览器阻止了播放，请再次点击喇叭。');
  expect(onState).not.toHaveBeenCalled();
});

it('没有系统语音也可播放单词和例句，网络错误可见，离开卡片停止播放', () => {
  const { unmount } = render(<WordFront lexeme={{ id: 'fiets', lemma: 'fiets', article: 'de', pos: 'noun' }}
    examples={[{ nl: 'Ik heb een fiets.', zh: '我有一辆自行车。' }]}
    revealed={false} isNew voice={null} rate="normal" speechMode="online" />);
  fireEvent.click(screen.getByRole('button', { name: '朗读单词' }));
  expect(new URL(AudioMock.instances[0]!.src).searchParams.get('q')).toBe('de fiets');
  act(() => AudioMock.instances[0]!.onerror!());
  expect(screen.getByRole('alert')).toHaveTextContent('在线发音加载失败');
  fireEvent.click(screen.getByRole('button', { name: '朗读例句' }));
  const current = AudioMock.instances[1]!;
  expect(new URL(current.src).searchParams.get('q')).toBe('Ik heb een fiets.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  unmount();
  expect(current.pause).toHaveBeenCalledOnce();
  expect(current.src).toBe('');
});

it('新设置和旧设置默认设备语音，用户仍可选择在线发音', () => {
  expect(DEFAULT_SETTINGS.speechMode).toBe('system');
  const { speechMode: _mode, ...legacySettings } = DEFAULT_SETTINGS;
  const updateSettings = vi.fn();
  vi.mocked(useApp).mockReturnValue({ settings: legacySettings, updateSettings } as unknown as AppState);
  const { rerender } = render(<PrefsSettings />);
  expect(screen.getByRole('radio', { name: '设备语音' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: '在线发音（Google）' }));
  expect(updateSettings).toHaveBeenCalledWith({ speechMode: 'online' });
  vi.mocked(useApp).mockReturnValue({ settings: { ...legacySettings, speechMode: 'online' }, updateSettings } as unknown as AppState);
  rerender(<PrefsSettings />);
  expect(screen.getByRole('radio', { name: '在线发音（Google）' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '试听在线发音' }));
  expect(AudioMock.instances[0]!.play).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('radio', { name: '设备语音' }));
  expect(updateSettings).toHaveBeenCalledWith({ speechMode: 'system' });
  vi.mocked(useApp).mockReturnValue({ settings: { ...legacySettings, speechMode: 'system' }, updateSettings } as unknown as AppState);
  rerender(<PrefsSettings />);
  expect(screen.getByRole('radio', { name: '设备语音' })).toBeChecked();
  expect(AudioMock.instances[0]!.pause).toHaveBeenCalledOnce();
});
