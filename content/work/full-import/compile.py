"""Compile one Luna-authored compact batch into existing curated/ledger formats.

Usage: python3 content/work/full-import/compile.py SHARD BATCH INPUT_JSON
Rows: [refId, zh, exampleNl, exampleZh, forms, topic(optional)]
forms: noun=[article, plural]; verb=[past, pastParticiple, aux]; other=null.
Explicit source noise only: [refId, {"exclude": "specific Chinese reason"}].
"""
import json
import sys
from pathlib import Path

shard, batch, input_path = sys.argv[1:]
items = json.loads(Path(f'content/work/full-import/shard-{shard}.json').read_text())['items']
by_id = {item['id']: item for item in items}
rows = json.loads(Path(input_path).read_text())
lexemes, senses, ledger = [], [], []
seen = set()
for row in rows:
    ref_id = row[0]
    assert ref_id in by_id and ref_id not in seen, ref_id
    seen.add(ref_id)
    item = by_id[ref_id]
    if isinstance(row[1], dict):
        reason = row[1]['exclude'].strip()
        assert reason
        ledger.append(dict(referenceId=ref_id, status='excluded', excludeReason=reason))
        continue
    _, zh, nl, example_zh, forms, *topics = row
    assert all(isinstance(s, str) and s.strip() for s in [zh, nl, example_zh]), ref_id
    lexeme_id = ref_id.replace('ref-', 'lx-', 1)
    sense_id = ref_id.replace('ref-', 's-', 1) + '-1'
    lexeme = dict(id=lexeme_id, lemma=item['lemma'], pos=item['pos'])
    if item['pos'] == 'noun':
        assert len(forms) == 2 and forms[0] in ['de', 'het', 'de/het'], ref_id
        lexeme.update(article=forms[0], plural=forms[1])
    elif item['pos'] == 'verb':
        assert len(forms) == 3 and forms[2] in ['hebben', 'zijn', 'hebben/zijn'], ref_id
        lexeme['verbForms'] = dict(past=forms[0], pastParticiple=forms[1], aux=forms[2])
    lexemes.append(lexeme)
    senses.append(dict(id=sense_id, lexemeId=lexeme_id, zh=zh,
                       examples=[dict(nl=nl, zh=example_zh)],
                       topics=topics or ['语法' if item['pos'] in ['article','pronoun','conjunction','preposition','numeral'] else '日常'],
                       level=item['level'], review='draft'))
    ledger.append(dict(referenceId=ref_id, status='included', senseIds=[sense_id]))
stem = f'full-s{shard}-{int(batch):03d}'
output = Path(f'content/curated/{stem}.json')
ledger_path = Path(f'content/coverage/ledger/{stem}.jsonl')
assert not output.exists() and not ledger_path.exists(), f'will not overwrite {stem}'
output.write_text(json.dumps(dict(lexemes=lexemes, senses=senses), ensure_ascii=False, indent=1) + '\n')
ledger_path.write_text(''.join(json.dumps(line, ensure_ascii=False) + '\n' for line in ledger))
print(f'{stem}: {len(rows)} accounted, {len(lexemes)} lexemes, {len(rows)-len(lexemes)} exclusions')
