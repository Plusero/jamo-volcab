import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { searchSenses } from '../../application/vocab';
import type { Card } from '../../domain/types';
import { posLabel } from '../shared/word';
import { TextbookFrequency } from '../shared/TextbookFrequency';
import { CefrBadge } from '../shared/CefrBadge';
import styles from './LibraryPage.module.css';
import { useAsync } from '../../app/useAsync';

const PAGE_SIZE = 50;
type StateFilter = 'all' | 'new' | 'learning' | 'suspended';
const STATE_OPTIONS: [StateFilter, string][] = [
  ['all', '全部'], ['new', '未学'], ['learning', '学习中'], ['suspended', '已暂停'],
];

function stateOf(card: Card | undefined): Exclude<StateFilter, 'all'> {
  if (!card) return 'new';
  return card.suspended ? 'suspended' : 'learning';
}
const STATE_LABEL = { new: '未学', learning: '学习中', suspended: '已暂停' } as const;

export function LibraryPage() {
  const { db, vocab } = useApp();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState('');
  const [topic, setTopic] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const [page, setPage] = useState(0);

  const loadCards = useCallback(async () => new Map((await db.cards.toArray()).map((c) => [c.senseId, c])), [db]);
  const [cards] = useAsync(loadCards);

  const { posList, topicList } = useMemo(() => {
    const posSet = new Set<string>();
    const topicSet = new Set<string>();
    for (const l of vocab.lexemeById.values()) posSet.add(l.pos);
    for (const s of vocab.senseById.values()) s.topics.forEach((t) => topicSet.add(t));
    return { posList: [...posSet].sort(), topicList: [...topicSet].sort() };
  }, [vocab]);

  const rows = useMemo(() => {
    if (!cards) return [];
    const all = searchSenses(vocab, { q, pos: pos || undefined, topic: topic || undefined }, 0, Infinity).rows;
    return state === 'all' ? all : all.filter((r) => stateOf(cards.get(r.sense.id)) === state);
  }, [vocab, cards, q, pos, topic, state]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  // 筛选变化时回到第一页
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  return (
    <div>
      <div className={styles.header}>
        <h1>词库</h1>
        <div className="muted">共 {vocab.senseOrder.length} 个词义 · 已开始学习 {cards ? cards.size : '…'} 个</div>
      </div>

      <div className={styles.filters}>
        <input
          type="search" placeholder="搜索荷兰语或中文" aria-label="搜索"
          value={q} onChange={(e) => reset(setQ)(e.target.value)}
        />
        <div className={styles.selects}>
          <select aria-label="词性" value={pos} onChange={(e) => reset(setPos)(e.target.value)}>
            <option value="">全部词性</option>
            {posList.map((p) => <option key={p} value={p}>{posLabel(p)}</option>)}
          </select>
          <select aria-label="主题" value={topic} onChange={(e) => reset(setTopic)(e.target.value)}>
            <option value="">全部主题</option>
            {topicList.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="学习状态" value={state} onChange={(e) => reset(setState)(e.target.value as StateFilter)}>
            {STATE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
      </div>

      <ul className={styles.list}>
        {visible.map(({ sense, lexeme }) => {
          const st = stateOf(cards?.get(sense.id));
          return (
            <li key={sense.id}>
              <Link to={`/word/${sense.id}`} className={styles.item}>
                <span className={styles.main}>
                  <div className={styles.lemma}>{lexeme.article ? `${lexeme.article} ` : ''}{lexeme.lemma}</div>
                  <div className={styles.zh}>{sense.zh}</div>
                  <CefrBadge assessment={lexeme.cefr} />
                  <div className={styles.frequency}><TextbookFrequency rank={lexeme.textbookFrequencyRank} /></div>
                </span>
                <span className={`${styles.badge} ${styles[st]}`}>{STATE_LABEL[st]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {cards && rows.length === 0 && <p className="muted">没有符合条件的词</p>}

      <div className={styles.pager}>
        <button className="btn" disabled={current === 0} onClick={() => setPage(current - 1)}>上一页</button>
        <span className="muted">共 {rows.length} 条 · {current + 1}/{pageCount}</span>
        <button className="btn" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>下一页</button>
      </div>
    </div>
  );
}
