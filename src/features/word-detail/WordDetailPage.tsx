import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { posLabel } from '../shared/word';
import { TextbookFrequency } from '../shared/TextbookFrequency';
import { CefrBadge } from '../shared/CefrBadge';
import { CefrDetails } from './CefrDetails';
import { LearningPanel } from './LearningPanel';
import { LookupLinks } from './LookupLinks';
import { SenseBlock } from './SenseBlock';
import styles from './WordDetailPage.module.css';

export function WordDetailPage() {
  const { senseId } = useParams();
  const { vocab } = useApp();
  const sense = senseId ? vocab.senseById.get(senseId) : undefined;
  const lexeme = sense && vocab.lexemeById.get(sense.lexemeId);
  const siblings = useMemo(
    () => lexeme ? [...vocab.senseById.values()].filter((s) => s.lexemeId === lexeme.id && (!s.retired || s.id === sense.id)) : [],
    [vocab, lexeme],
  );

  if (!sense || !lexeme) return <p>未找到</p>;
  const vf = lexeme.verbForms;

  return (
    <div className={styles.page}>
      <Link to="/library" className={styles.back}>← 词库</Link>
      <header>
        <h1 className={styles.title}>{lexeme.article ? `${lexeme.article} ` : ''}{lexeme.lemma}</h1>
        <CefrBadge assessment={lexeme.cefr} />
        <p className={styles.forms}>
          {posLabel(lexeme.pos)}
          {lexeme.plural && ` · 复数 ${lexeme.plural}`}
          {vf && ` · ${vf.past} / ${vf.pastParticiple}（${vf.aux}）`}
        </p>
        <TextbookFrequency rank={lexeme.textbookFrequencyRank} />
      </header>
      {lexeme.cefr && <CefrDetails assessment={lexeme.cefr} />}
      {siblings.map((s) => <SenseBlock key={s.id} sense={s} current={s.id === sense.id} />)}
      <LearningPanel key={sense.id} senseId={sense.id} />
      <LookupLinks lexeme={lexeme} sense={sense} />
    </div>
  );
}
