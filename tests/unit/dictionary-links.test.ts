import { describe, expect, it } from 'vitest';
import { googleTranslateUrl } from '../../src/platform/dictionary-links';
import { pickDutchVoice } from '../../src/platform/speech';

const SAMPLES = ['beslissing', 'één', "'s ochtends", 'zich zorgen maken', 'a & b ? c # d + e'];

describe('googleTranslateUrl', () => {
  it.each(SAMPLES)('原样保留文本并带上语言参数: %s', (text) => {
    const url = new URL(googleTranslateUrl(text));
    expect(url.origin + url.pathname).toBe('https://translate.google.com/');
    expect(url.searchParams.get('text')).toBe(text);
    expect(url.searchParams.get('sl')).toBe('nl');
    expect(url.searchParams.get('tl')).toBe('zh-CN');
    expect(url.searchParams.get('op')).toBe('translate');
  });

  it('传入 en 时目标语言为英文', () => {
    expect(new URL(googleTranslateUrl('één', 'en')).searchParams.get('tl')).toBe('en');
  });
});

function voice(lang: string): SpeechSynthesisVoice {
  return { lang, name: lang } as SpeechSynthesisVoice;
}

describe('pickDutchVoice', () => {
  it('nl-NL 优先于 nl-BE 和其他 nl 语音', () => {
    const be = voice('nl-BE');
    const nl = voice('nl-NL');
    expect(pickDutchVoice([voice('nl-DE'), be, nl])).toBe(nl);
  });

  it('没有 nl-NL 时用 nl-BE', () => {
    const be = voice('nl-BE');
    expect(pickDutchVoice([voice('en-US'), voice('nl-DE'), be])).toBe(be);
  });

  it('只有其他 nl 开头的语音时也能用', () => {
    const other = voice('nl');
    expect(pickDutchVoice([voice('en-GB'), other])).toBe(other);
  });

  it('接受 nl_NL 写法', () => {
    const nl = voice('nl_NL');
    expect(pickDutchVoice([voice('nl-BE'), nl])).toBe(nl);
  });

  it('没有荷兰语语音时返回 null', () => {
    expect(pickDutchVoice([voice('en-US'), voice('zh-CN')])).toBeNull();
    expect(pickDutchVoice([])).toBeNull();
  });
});
