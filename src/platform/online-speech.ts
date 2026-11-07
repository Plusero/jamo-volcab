type PlaybackState = 'playing' | 'ended';

let activePlayback: { audio: HTMLAudioElement; stop: () => void } | null = null;

/** Google 翻译兼容接口；单次文本最多 200 字符，不是有稳定性承诺的公开 API。 */
export function googleSpeechUrl(text: string, rate: 'normal' | 'slow'): string {
  if (text.length > 200) throw new RangeError('在线发音每次最多支持 200 个字符。');
  const params = new URLSearchParams({
    ie: 'UTF-8', client: 'tw-ob', tl: 'nl', q: text,
    total: '1', idx: '0', textlen: String(text.length),
    ttsspeed: rate === 'slow' ? '0.24' : '1',
  });
  return `https://translate.google.com/translate_tts?${params}`;
}

export function stopOnlineSpeech(): void {
  activePlayback?.stop();
}

/** 在点击事件内直接调用 play()，由媒体元素加载在线音频，保留 Safari 的用户手势。 */
export function playOnlineSpeech(
  text: string,
  rate: 'normal' | 'slow',
  onError: (message: string) => void,
  onState: (state: PlaybackState) => void,
): () => void {
  const url = googleSpeechUrl(text, rate);
  stopOnlineSpeech();
  const audio = new Audio();
  audio.preload = 'none';
  // 使用普通跨域媒体加载，不设置 crossOrigin，也不先 fetch 后等待再播放。
  audio.src = url;

  function stop() {
    if (activePlayback?.audio !== audio) return;
    activePlayback = null;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  function fail(message: string) {
    if (activePlayback?.audio !== audio) return;
    stop();
    onError(message);
  }

  audio.onplaying = () => {
    if (activePlayback?.audio === audio) onState('playing');
  };
  audio.onended = () => {
    if (activePlayback?.audio !== audio) return;
    stop();
    onState('ended');
  };
  audio.onerror = () => fail('在线发音加载失败。请检查网络；Google 翻译兼容服务也可能暂时不可用或限流。');
  activePlayback = { audio, stop };
  void audio.play().catch((error: unknown) => {
    fail(error instanceof DOMException && error.name === 'NotAllowedError'
      ? '浏览器阻止了播放，请再次点击喇叭。'
      : '在线发音播放失败，请检查网络后重试。');
  });
  return stop;
}
