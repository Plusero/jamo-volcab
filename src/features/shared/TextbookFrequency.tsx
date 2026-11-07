type Props = { rank?: number };

export function TextbookFrequency({ rank }: Props) {
  return (
    <span className="muted" title="NT2Lex 全部词条按 SFI@TOTAL 从高到低排列；数字越小，教材中越常见。">
      教材词频排名：{rank === undefined ? '暂无' : `第 ${rank.toLocaleString('zh-CN')} 名`}
    </span>
  );
}
