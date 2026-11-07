import { useEffect, useState } from 'react';

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

/** 朗读。先取消队列里的旧语句，慢速为 0.7 倍速。 */
export function speak(text: string, voice: SpeechSynthesisVoice, rate: 'normal' | 'slow'): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = rate === 'slow' ? 0.7 : 1;
  speechSynthesis.speak(utterance);
}
