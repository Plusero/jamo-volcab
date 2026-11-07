import { useEffect, useState } from 'react';

type SpeechErrorCode = SpeechSynthesisErrorCode | 'start-timeout' | 'ended-before-start';
type SpeechState = 'started' | 'ended';
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

// 保持当前语句的引用，直到播放结束、出错或被下一次点击取代。
let activeSpeech: { utterance: SpeechSynthesisUtterance; dispose: () => boolean } | null = null;

/** 从语音列表里挑荷兰语：nl-NL 优先，其次 nl-BE，再其次任何 nl 开头的。找不到返回 null。 */
export function pickDutchVoice(voices: SpeechSynthesisVoice[], preferredURI?: string | null): SpeechSynthesisVoice | null {
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => !!preferredURI && v.voiceURI === preferredURI && lang(v).startsWith('nl'))
    ?? voices.find((v) => lang(v) === 'nl-nl')
    ?? voices.find((v) => lang(v) === 'nl-be')
    ?? voices.find((v) => lang(v).startsWith('nl'))
    ?? null
  );
}

/** 设备提供的荷兰语语音；列表会在下载语音后发生变化。 */
export function useDutchVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('nl')));
    update();
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

/** 优先使用用户选择；该语音在当前设备不存在时仍可使用自动选择。 */
export function useDutchVoice(preferredURI?: string | null): SpeechSynthesisVoice | null {
  return pickDutchVoice(useDutchVoices(), preferredURI);
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
  let started = false;

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
    started = true;
    window.clearTimeout(startTimer);
    onState?.('started');
  };
  utterance.onend = () => {
    if (!dispose()) return;
    if (started) onState?.('ended');
    else onError('ended-before-start');
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
      if (code === 'start-timeout') {
        setError('浏览器在 8 秒内没有开始朗读（start-timeout）。可在网站「设置 → 发音」中选择其他荷兰语语音试听。');
      } else if (code === 'ended-before-start') {
        setError('浏览器只报告结束，未报告开始（ended-before-start）。可在网站「设置 → 发音」中选择其他荷兰语语音试听。');
      } else {
        setError(`朗读失败（${code}）。请检查系统荷兰语语音和音频输出。`);
      }
    }, (state) => setStatus(state === 'started' ? '浏览器报告已开始朗读。' : '浏览器已依次报告开始和结束；这不能确认实际有声音。'));
  }
  return { play, error, status };
}
