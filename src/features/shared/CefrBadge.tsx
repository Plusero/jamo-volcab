import type { CefrAssessment } from '../../domain/types';
import styles from './CefrBadge.module.css';

export function CefrBadge({ assessment }: { assessment?: CefrAssessment }) {
  const needsReview = assessment?.review_status === 'needs_review';
  const insufficient = assessment?.review_status === 'insufficient_evidence';
  const title = needsReview
    ? `建议等级 ${assessment.suggested_level} 尚未采用，当前使用首次出现等级。可在详情中查看分级依据。`
    : 'NT2Lex 首次出现等级；可靠性复核使用工程启发式阈值。可在详情中查看分级依据。';

  return (
    <span className={`${styles.badge} ${needsReview || insufficient ? styles.review : ''}`}
      title={assessment ? title : '暂无匹配的 NT2Lex 分级数据。'}>
      <strong>CEFR {assessment?.final_level ?? '暂无'}</strong>
      {needsReview && <span>待复核</span>}
      {insufficient && <span>证据不足</span>}
    </span>
  );
}
