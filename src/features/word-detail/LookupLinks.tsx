import type { Lexeme, Sense } from '../../domain/types';
import { copyText, googleTranslateUrl, VAN_DALE_URL } from '../../platform/dictionary-links';
import styles from './WordDetailPage.module.css';

/** 查词外链。名词传 lemma（不带冠词）。 */
export function LookupLinks({ lexeme, sense }: { lexeme: Lexeme; sense: Sense }) {
  return (
    <section className="card">
      <h2>查词</h2>
      <div className={styles.links}>
        <a className={styles.link} target="_blank" rel="noopener noreferrer" href={googleTranslateUrl(lexeme.lemma)}>Google 翻译</a>
        <a className={styles.link} target="_blank" rel="noopener noreferrer" href={googleTranslateUrl(sense.examples[0]!.nl)}>翻译例句</a>
        <a className={styles.link} target="_blank" rel="noopener noreferrer" href={VAN_DALE_URL}>Van Dale（需登录）</a>
        <button className="btn" onClick={() => void copyText(lexeme.lemma)}>复制词条</button>
      </div>
    </section>
  );
}
