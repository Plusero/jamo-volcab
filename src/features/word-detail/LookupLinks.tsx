import type { Lexeme, Sense } from '../../domain/types';
import { LookupActions } from '../shared/LookupActions';

/** 查词外链。名词传 lemma（不带冠词）。 */
export function LookupLinks({ lexeme, sense }: { lexeme: Lexeme; sense: Sense }) {
  return (
    <section className="card">
      <h2>查词</h2>
      <LookupActions key={sense.id} lexeme={lexeme} sense={sense} />
    </section>
  );
}
