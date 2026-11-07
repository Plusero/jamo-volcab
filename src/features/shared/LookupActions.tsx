import { useState } from 'react';
import type { Lexeme, Sense } from '../../domain/types';
import { aiWordPrompt, copyText, deeplTranslateUrl, googleTranslateUrl, VAN_DALE_URL, verbixDutchUrl } from '../../platform/dictionary-links';
import styles from './LookupActions.module.css';

const AI_SERVICES = [
  { name: 'ChatGPT', href: 'https://chatgpt.com/', logo: styles.openai, prefill: true },
  { name: 'Gemini', href: 'https://gemini.google.com/app', logo: styles.gemini, prefill: false },
  { name: 'Claude', href: 'https://claude.ai/new', logo: styles.claude, prefill: true },
  { name: '千问', href: 'https://www.qianwen.com/', logo: styles.qwen, prefill: false },
  { name: '豆包', href: 'https://www.doubao.com/chat/', logo: styles.doubao, prefill: false },
];

export function LookupActions({ lexeme, sense }: { lexeme: Lexeme; sense: Sense }) {
  const [message, setMessage] = useState('');
  const [, setCrash] = useState();
  const prompt = aiWordPrompt(lexeme, sense.examples);

  function askAI(service: (typeof AI_SERVICES)[number]) {
    if (service.prefill) {
      setMessage(`提问将自动带入 ${service.name}。`);
      return;
    }
    void copyText(prompt)
      .then(() => setMessage(`提问已复制，${service.name} 需要在输入框中粘贴发送。`))
      .catch((error: unknown) => setCrash(() => { throw error; }));
  }

  return (
    <div className={styles.actions}>
      <div className={styles.lookupGrid}>
        <a className={styles.action} href={googleTranslateUrl(lexeme.lemma)} target="_blank" rel="noopener noreferrer" aria-label="Google 翻译：单词" title="用 Google 翻译单词">
          <span className={`${styles.logo} ${styles.google}`} aria-hidden="true" /><span>翻译单词</span>
        </a>
        <a className={styles.action} href={googleTranslateUrl(sense.examples[0].nl)} target="_blank" rel="noopener noreferrer" aria-label="Google 翻译：例句" title="用 Google 翻译例句">
          <span className={`${styles.logo} ${styles.google}`} aria-hidden="true" /><span>翻译例句</span>
        </a>
        <a className={styles.action} href={deeplTranslateUrl(lexeme.lemma)} target="_blank" rel="noopener noreferrer" aria-label="DeepL 翻译：单词" title="用 DeepL 将单词翻译成中文">
          <span className={`${styles.logo} ${styles.deepl}`} aria-hidden="true" /><span>DeepL 单词</span>
        </a>
        <a className={styles.action} href={deeplTranslateUrl(sense.examples[0].nl)} target="_blank" rel="noopener noreferrer" aria-label="DeepL 翻译：例句" title="用 DeepL 将例句翻译成中文">
          <span className={`${styles.logo} ${styles.deepl}`} aria-hidden="true" /><span>DeepL 例句</span>
        </a>
        <a className={styles.action} href={VAN_DALE_URL} target="_blank" rel="noopener noreferrer" title="Van Dale 在线词典（需登录）">
          <span className={`${styles.logo} ${styles.book}`} aria-hidden="true" /><span>Van Dale<small className={styles.secondary}>需登录</small></span>
        </a>
        {lexeme.pos === 'verb' && (
          <a className={styles.action} href={verbixDutchUrl(lexeme.lemma)} target="_blank" rel="noopener noreferrer" aria-label="Verbix 动词变位" title={`查看 ${lexeme.lemma} 的荷兰语动词变位`}>
            <span className={`${styles.logo} ${styles.book}`} aria-hidden="true" /><span>Verbix<small className={styles.secondary}>动词变位</small></span>
          </a>
        )}
      </div>
      <strong>问 AI</strong>
      <div className={styles.aiGrid} role="group" aria-label="询问 AI">
        {AI_SERVICES.map((service) => (
          <a key={service.name} className={styles.action} href={service.prefill ? `${service.href}?${new URLSearchParams({ q: prompt })}` : service.href} target="_blank" rel="noopener noreferrer" onClick={() => askAI(service)} aria-label={`问 ${service.name}`} title={service.prefill ? `打开 ${service.name} 并自动带入提问` : `打开 ${service.name}，提问会复制到剪贴板，需手动粘贴`}>
            <span className={`${styles.logo} ${service.logo}`} aria-hidden="true" /><span>{service.name}{!service.prefill && <small className={styles.secondary}>需粘贴</small>}</span>
          </a>
        ))}
      </div>
      <p className={styles.notice} role="status">{message || 'ChatGPT、Claude 自动带入提问；Gemini、千问、豆包会复制提问，需手动粘贴。'}</p>
    </div>
  );
}
