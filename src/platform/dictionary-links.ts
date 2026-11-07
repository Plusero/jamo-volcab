import type { Lexeme, Sense } from '../domain/types';

/** Google 翻译链接：荷兰语 → 简体中文（默认）或英文。 */
export function googleTranslateUrl(text: string, tl: 'zh-CN' | 'en' = 'zh-CN'): string {
  return `https://translate.google.com/?${new URLSearchParams({ sl: 'nl', tl, text, op: 'translate' })}`;
}

/** DeepL 网页翻译链接：荷兰语 → 简体中文。 */
export function deeplTranslateUrl(text: string): string {
  return `https://www.deepl.com/translator#nl/zh/${encodeURIComponent(text)}`;
}

/** Verbix 当前荷兰语动词的变位页面。 */
export function verbixDutchUrl(verb: string): string {
  return `https://www.verbix.com/dutch/verb/${encodeURIComponent(verb)}`;
}

/** Van Dale 首页。免费版已停止服务，需登录，不做深链。 */
export const VAN_DALE_URL = 'https://zoeken.vandale.nl/';

/** 生成只包含当前词条与荷兰语语境的提问。 */
export function aiWordPrompt(lexeme: Pick<Lexeme, 'lemma' | 'pos'>, examples: Sense['examples']): string {
  return [
    '我是中文母语者，正在学习荷兰语。',
    `请用中文解释词条「${lexeme.lemma}」（词性：${lexeme.pos}）在以下语境中的含义、语法和常见搭配，并给出新的荷兰语例句及中文翻译。`,
    '',
    '语境例句：',
    ...examples.map((example, index) => `${index + 1}. ${example.nl}`),
  ].join('\n');
}

/** 将提问复制到剪贴板。 */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
