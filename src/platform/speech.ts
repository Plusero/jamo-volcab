import { useEffect, useState } from 'react';

type SpeechErrorCode = SpeechSynthesisErrorCode | 'start-timeout';
type SpeechState = 'started' | 'ended';
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

// 保持当前语句的引用，直到播放结束、出错或被下一次点击取代。
let activeSpeech: { utterance: SpeechSynthesisUtterance; dispose: () => boolean } | null = null;

/** 从语音列表里挑荷兰语：nl-NL 优先，其次 nl-BE，再其次任何 nl 开头的。找不到返回 null。 */
export function pickDutchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => lang(v) === 'nl-nl')
    ?? voices.find((v) => lang(v) === 'nl-be')
    ?? voices.find((v) => lang(v).startsWith('nl'))
    ?? null
  );
}

/** 当前可用的荷兰语语音；语音列表异步加载，所以要监听 voiceschanged。没有语音时返回 null，界面隐藏发音按钮。 */
export function useDutchVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoice(pickDutchVoice(synth.getVoices()));
    update();
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, []);
  return voice;
}

/** 同步在点击事件中朗读；voice 为 null 时由系统按 nl-NL 选择语音。 */
export function speak(text: string, voice: SpeechSynthesisVoice | null, rate: 'normal' | 'slow', onError: (code: SpeechErrorCode) => void, onState?: (state: SpeechState) => void): void {
  const synth = window.speechSynthesis;
  activeSpeech?.dispose();
  if (synth.speaking || synth.pending) synth.cancel();
  if (synth.paused) synth.resume();

  const audioSession = (navigator as AudioSessionNavigator).audioSession;
  const previousSessionType = audioSession?.type;
  if (audioSession) audioSession.type = 'playback';

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang.replace('_', '-') ?? 'nl-NL';
  utterance.rate = rate === 'slow' ? 0.7 : 1;

  function dispose(): boolean {
    if (activeSpeech?.utterance !== utterance) return false;
    window.clearTimeout(startTimer);
    activeSpeech = null;
    if (audioSession) audioSession.type = previousSessionType!;
    return true;
  }

  const startTimer = window.setTimeout(() => {
    if (!dispose()) return;
    synth.cancel();
    onError('start-timeout');
  }, 8000);
  utterance.onstart = () => {
    if (activeSpeech?.utterance !== utterance) return;
    window.clearTimeout(startTimer);
    onState?.('started');
  };
  utterance.onend = () => {
    if (dispose()) onState?.('ended');
  };
  utterance.onerror = (event) => {
    if (!dispose()) return;
    // 点击另一段内容会主动打断旧语句，不属于播放故障。
    if (event.error !== 'canceled' && event.error !== 'interrupted') onError(event.error);
  };
  activeSpeech = { utterance, dispose };
  synth.speak(utterance);
}

/** 页面内显示系统报告的朗读错误；不自动重试或更换语音。 */
export function useSpeak() {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  function play(text: string, voice: SpeechSynthesisVoice | null, rate: 'normal' | 'slow') {
    setError('');
    setStatus('正在请求朗读…');
    speak(text, voice, rate, (code) => {
      setStatus('');
      setError(code === 'start-timeout'
        ? '浏览器在 8 秒内没有开始朗读（start-timeout）。请在设备的语音设置中试听荷兰语语音，确认已下载且能播放。'
        : `朗读失败（${code}）。请检查系统荷兰语语音和音频输出。`);
    }, (state) => setStatus(state === 'started' ? '浏览器报告已开始朗读。' : '浏览器报告朗读已结束。'));
  }
  return { play, error, status };
}
