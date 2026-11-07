import type { Lexeme } from '../../domain/types';

/** 词性中文标签（取值见 scripts/content-normalize.ts 和 content/curated）；未知词性原样显示。 */
const POS_ZH: Record<string, string> = {
  noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词', preposition: '介词',
  conjunction: '连词', pronoun: '代词', numeral: '数词', article: '冠词',
  interjection: '感叹词', phrase: '短语', special: '专有名词',
};

export const posLabel = (pos: string) => POS_ZH[pos] ?? pos;

/** 显示形式：名词带冠词，de/het 两个都显示。 */
export const displayForm = (l: Lexeme) => (l.article ? `${l.article} ${l.lemma}` : l.lemma);

/** 朗读形式：de/het 只读第一个冠词。 */
export const spokenForm = (l: Lexeme) => (l.article ? `${l.article.split('/')[0]} ${l.lemma}` : l.lemma);

export const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
