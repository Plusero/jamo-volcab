# 词义编写规范（批次任务）

给中文母语者学荷兰语用的 B1 词库。每个批次文件 `content/work/batch-NNN.json` 含约 100 个参考项（按词频降序），格式：

```json
{ "batch": "batch-001", "items": [{ "id": "ref-huis-noun", "lemma": "huis", "pos": "noun", "tags": ["N(soort)"], "freq": {...}, "level": "A1", "totalFreq": 812 }] }
```

## 每个批次要产出两个文件

1. **`content/curated/batch-NNN.json`**：`{ "lexemes": Lexeme[], "senses": Sense[] }`，类型见 `src/domain/types.ts`。
2. **`content/coverage/ledger/batch-NNN.jsonl`**：每个参考项一行，**一项都不能漏**：
   - `{"referenceId":"ref-huis-noun","status":"included","senseIds":["s-huis-noun-1"]}`
   - `{"referenceId":"ref-xyz-noun","status":"excluded","excludeReason":"中文理由"}`

## ID（必须严格遵守，这样各批次不会冲突）

- 词条：把参考项 id 的前缀 `ref-` 换成 `lx-`，例如 `ref-huis-noun` → `lx-huis-noun`。
- 词义：把 `ref-` 换成 `s-`，再加 `-1`、`-2`……，例如 `s-huis-noun-1`。
- 每个参考项对应**一个**词条；`lemma` 和 `pos` 照抄参考项，不要改（`special` 类的大写，如 `maandag`/`Kerstmis`，保持原样）。

## 词条字段

- **名词**：必须有 `article`（`de` / `het` / `de/het`）和 `plural`（标准复数；确实没有复数的不可数名词写 `"—"`）。
- **动词**：必须有 `verbForms`：`past` 单数过去式、`pastParticiple`、`aux`（`hebben` / `zijn` / `hebben/zijn`）。可分动词写成 `belde op` / `opgebeld`；不规则动词务必查准（zijn → was/geweest/zijn，hebben → had/gehad/hebben，gaan → ging/gegaan/zijn）。
- 其他词性不需要这些字段。

## 词义字段

- **拆分**：大多数词只写 1 个词义。只有 B1 学习者确实会遇到的、意思明显不同的用法才拆开，最多 3 个（如 `bank` 银行 / 长椅）。参考项 `tags` 里有多个子类时（如代词 `je` 同时是人称代词和物主代词），按子类拆。
- **`zh`**：简洁准确的中文释义，可用「；」并列近义译法，不堆砌。功能词写清用法，如「（定冠词，用于 de 词）」。
- **`examples`**：1–2 句自然、地道的荷兰语例句（A2–B1 难度，5–12 个词），必须用到这个词的**这个词义**；`zh` 是准确的中文翻译。不要用词典式的短语充当例句。
- **`collocations`**（可选）：常见搭配，格式 `"een beslissing nemen 做决定"`。
- **`topics`**：1–2 个，从这里选：日常、家庭、住房、饮食、购物、出行、工作、学习、健康、身体、时间、数量、天气、自然、社会、情感、交流、休闲、文化、语法。功能词用「语法」。
- **`level`**：照抄参考项的 `level`（A1/A2/B1）。
- **`review`**：一律 `"draft"`。
- 词义在 `senses` 数组中的顺序 = 批次文件中参考项的顺序（词频高的在前）。

## 排除

只有确实不值得做学习卡的才排除，并写中文理由，例如：语料切词或词形还原错误、专有名词、无意义的字母或缩写、语料噪声。**不要因为难写或是功能词就排除**——冠词、代词、介词都要收录，写好用法和例句。

## 自查

每写完一个批次：

1. `npm run content:validate`：只修自己批次文件里的问题；其他批次的报错不用管（别的 agent 正在写）。
2. `npm run content:coverage`：确认自己批次的参考项都已覆盖，`coverage-report.md` 的错误列表里没有自己批次的条目。
3. 不要运行 `content:build`，也不要改别人的文件。
