import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { getNote, updateNote } from '../../application/notes';
import { copyText, googleTranslateUrl, VAN_DALE_URL } from '../../platform/dictionary-links';
import type { Lexeme, Note, Sense } from '../../domain/types';
import { SpeakButton } from './SpeakButton';
import styles from './StudyPage.module.css';

type Props = {
  sense: Sense;
  lexeme: Lexeme;
  voice: SpeechSynthesisVoice | null;
  rate: 'normal' | 'slow';
};

/** 用 `key={sense.id}` 渲染，切换词义时状态自然重置。 */
export function WordBack({ sense, lexeme, voice, rate }: Props) {
  const forms = [
    lexeme.plural && `复数 ${lexeme.plural}`,
    lexeme.verbForms && `${lexeme.verbForms.past} · ${lexeme.verbForms.pastParticiple} · ${lexeme.verbForms.aux}`,
  ].filter(Boolean);

  return (
    <div className={`card ${styles.back}`}>
      <div className={styles.zh}>{sense.zh}</div>

      <ul className={styles.examples}>
        {sense.examples.map((ex) => (
          <li key={ex.nl}>
            <div className={styles.exNl}>
              <span>{ex.nl}</span>
              <SpeakButton text={ex.nl} voice={voice} rate={rate} label="朗读例句" small />
            </div>
            <div className="muted">{ex.zh}</div>
          </li>
        ))}
      </ul>

      {forms.length > 0 && <div className={styles.forms}>{forms.join('　')}</div>}
      {sense.collocations && sense.collocations.length > 0 && (
        <div className={styles.forms}>搭配：{sense.collocations.join(' / ')}</div>
      )}

      <NoteEditor senseId={sense.id} />

      <div className="row">
        <a className={styles.link} href={googleTranslateUrl(lexeme.lemma)} target="_blank" rel="noopener noreferrer">Google 翻译</a>
        <a className={styles.link} href={googleTranslateUrl(sense.examples[0].nl)} target="_blank" rel="noopener noreferrer">翻译例句</a>
        <a className={styles.link} href={VAN_DALE_URL} target="_blank" rel="noopener noreferrer">Van Dale（需登录）</a>
        <button type="button" className={styles.link} onClick={() => void copyText(lexeme.lemma)}>复制词条</button>
      </div>
    </div>
  );
}

function NoteEditor({ senseId }: { senseId: string }) {
  const { db } = useApp();
  const [note, setNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState('');
  const [, setCrash] = useState();

  useEffect(() => {
    getNote(db, senseId)
      .then((n) => { setNote(n); setDraft(n.text); })
      .catch((e: unknown) => setCrash(() => { throw e; }));
  }, [db, senseId]);

  async function save(patch: Partial<Omit<Note, 'senseId'>>) {
    await updateNote(db, senseId, patch);
    setNote((n) => n && { ...n, ...patch });
  }
  const onError = (e: unknown) => setCrash(() => { throw e; });

  return (
    <div className={styles.note}>
      <div className="row">
        <label htmlFor="note-text" className="muted">备注</label>
        <button type="button" className={styles.star} disabled={!note} aria-pressed={note?.starred ?? false}
          aria-label={note?.starred ? '取消收藏' : '收藏'}
          onClick={() => note && save({ starred: !note.starred }).catch(onError)}>
          {note?.starred ? '★' : '☆'}
        </button>
      </div>
      <textarea id="note-text" className={styles.textarea} rows={2} disabled={!note} value={draft}
        placeholder="写点自己的记忆线索…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (note && draft !== note.text) save({ text: draft }).catch(onError); }} />
    </div>
  );
}
