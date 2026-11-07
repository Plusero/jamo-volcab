import { CEFR_LEVELS } from '../../domain/types';
import type { CefrAssessment } from '../../domain/types';
import styles from './WordDetailPage.module.css';

export function CefrDetails({ assessment }: { assessment: CefrAssessment }) {
  return (
    <details className={`card ${styles.cefr}`}>
      <summary>CEFR 分级依据（NT2Lex）</summary>
      <p>
        首次出现：{assessment.first_occurrence_level ?? '暂无'}；
        建议等级：{assessment.suggested_level ?? '无'}；
        最终等级：{assessment.final_level ?? '暂无'}。
        建议等级需人工复核，不会自动采用。
      </p>
      <p className="muted">可靠性复核使用工程启发式阈值，并非官方验证的标准。下表保留原始 F、D，— 表示缺失。</p>
      {assessment.raw.map((row, index) => (
        <table key={index}>
          <caption>{row.word} · {row.tag}</caption>
          <thead><tr><th scope="col">等级</th><th scope="col">F</th><th scope="col">D</th></tr></thead>
          <tbody>
            {CEFR_LEVELS.map((level) => (
              <tr key={level}><th scope="row">{level}</th><td>{row.F[level] ?? '—'}</td><td>{row.D[level] ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      ))}
    </details>
  );
}
