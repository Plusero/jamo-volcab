import { describe, expect, it } from 'vitest';
import { aiWordPrompt, deeplTranslateUrl, googleTranslateUrl, verbixDutchUrl } from '../../src/platform/dictionary-links';
import { pickDutchVoice } from '../../src/platform/speech';

const SAMPLES = ['beslissing', 'één', "'s ochtends", 'zich zorgen maken', 'a & b ? c # d + e'];

it('Verbix 链接带入动词原形，保留变音符号和反身结构', () => {
  for (const verb of ['roepen', 'beïnvloeden', 'zich herinneren']) {
    const url = new URL(verbixDutchUrl(verb));
    expect(url.origin).toBe('https://www.verbix.com');
    expect(url.pathname.startsWith('/dutch/verb/')).toBe(true);
    expect(decodeURIComponent(url.pathname.slice('/dutch/verb/'.length))).toBe(verb);
  }
});

it('DeepL 链接指定荷兰语到中文，保留特殊字符及换行', () => {
  const text = "één / 's ochtends & café? # +\nGoedemorgen!";
  const url = new URL(deeplTranslateUrl(text));
  expect(url.origin + url.pathname).toBe('https://www.deepl.com/translator');
  const [source, target, encoded] = url.hash.slice(1).split('/');
  expect([source, target]).toEqual(['nl', 'zh']);
  expect(decodeURIComponent(encoded)).toBe(text);
  expect(url.search).toBe('');
});

it('AI 提问包含词条和全部荷兰语语境，不带入现成的中文答案', () => {
  const prompt = aiWordPrompt({ lemma: "'s ochtends", pos: 'phrase' }, [
    { nl: "'s Ochtends drink ik koffie.", zh: '这个中文答案不应复制' },
    { nl: 'Zij werkt alleen in de ochtend.', zh: '另一个中文答案' },
  ]);
  expect(prompt).toContain("'s ochtends");
  expect(prompt).toContain("1. 's Ochtends drink ik koffie.");
  expect(prompt).toContain('2. Zij werkt alleen in de ochtend.');
  expect(prompt).toContain('请用中文解释');
  expect(prompt).not.toContain('这个中文答案不应复制');
  expect(prompt).not.toContain('另一个中文答案');
});

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
  it('使用用户选中的荷兰语语音；该语音不在当前设备上时自动选择', () => {
    const nl = { ...voice('nl-NL'), voiceURI: 'xander' };
    const be = { ...voice('nl-BE'), voiceURI: 'ellen' };
    const en = { ...voice('en-US'), voiceURI: 'english' };
    expect(pickDutchVoice([nl, be, en], 'ellen')).toBe(be);
    expect(pickDutchVoice([nl, be, en], 'missing')).toBe(nl);
    expect(pickDutchVoice([nl, be, en], 'english')).toBe(nl);
  });

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
