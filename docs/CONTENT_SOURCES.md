# 内容来源与许可

## 来源

登记在 `content/sources/sources.json`，`npm run content:fetch` 下载并校验 SHA-256（不一致即报错）。原始文件不进仓库（见 `.gitignore`）。

| id | 名称 | 角色 | 版本 | 许可证 |
|---|---|---|---|---|
| `nt2lex-cgn-v01` | NT2Lex 基础版（CGN 词性） | 主参考 | v01 | CC BY-NC-SA 4.0 |
| `nt2lex-cgn-odwn-v01` | NT2Lex 扩展版（CGN+ODWN 词义） | 多义词交叉核对，不参与参考集 | v01 | CC BY-NC-SA 4.0 |

- 基础版
  - URL：https://cental.uclouvain.be/cefrlex/static/resources/nl/NT2Lex-CGN-v01.tsv
  - SHA-256：`0acae87e65a6ceb4237dcf23c5576488338570f3431ac52e159b6fce9e1a0515`
  - 15227 行
- 扩展版
  - URL：https://cental.uclouvain.be/cefrlex/static/resources/nl/NT2Lex-CGN+ODWN-v01.tsv
  - SHA-256：`37dc6b6e208d271e07283c082b3bf78ca07e28cc005ca445f52e6cd4ee0bc5b5`
  - 17743 行
- 下载页：https://cental.uclouvain.be/cefrlex/nt2lex/download/
- 获取日期：2026-11-07
- 许可证全文：https://creativecommons.org/licenses/by-nc-sa/4.0/

### 引用

Tack, A., François, T., Desmet, P. & Fairon, C. (2018). NT2Lex: A CEFR-Graded Lexical Resource for Dutch as a Foreign Language Linked to Open Dutch WordNet. In Proceedings of the Thirteenth Workshop on Innovative Use of NLP for Building Educational Applications (pp. 137-146).

## 参考集规则（`reference-set-b1-v1`）

CEFR 没有官方穷尽的荷兰语 B1 词表。本项目承诺的是：完整覆盖一份冻结的「B1 及以下」参考清单，并公开版本和排除理由；不声称覆盖「官方 B1 全部词汇」。

`npm run content:normalize` 从基础版生成 `content/manifests/reference-set-b1-v1.json`（先校验 SHA-256）：

1. 候选：`F@A1`、`F@A2`、`F@B1` 任一大于 0 的行。
2. 词性：单 token 取 CGN 大类（N 名词、WW 动词、ADJ 形容词、BW 副词、VZ 介词、VG 连词、VNW 代词、TW 数词、LID 冠词、TSW 感叹词、SPEC special）；多 token 一律 `phrase`。
3. lemma：NFC、去首尾空格、折叠空格；非 SPEC 条目转小写（`Tante` 与 `tante` 合并）。
4. 按 (lemma, pos) 去重，A1/A2/B1 词频相加，原始 tag 保留在 `tags`。
5. 排除并写明理由，全部列在 `excluded`：数字/括号占位符（如 `[[:digit:]]+-jarig`、`parkeerplaats(en)`）、无字母、词与 tag token 数不一致、单字母（代词 `u` 保留）、SPEC 多词专有名词、与正常词性同形的 SPEC 标注噪声（`in`、`op`）。单词形 SPEC（月份、星期、节日）保留。
6. 条目 ID 为 `ref-<slug>-<pos>`，重复即报错。词数以脚本输出为准。

覆盖账本 `content/coverage/b1-ledger.jsonl` 逐条记录每个参考项是 `included`（指向词义）还是 `excluded`（带理由）；`npm run content:coverage -- --strict` 要求 `missing = 0` 且无错误。

## 完整 A1–C1 参考集（`all-v1`）

`npm run content:normalize` 同时生成 `content/manifests/reference-set-all-v1.json`：全部 15,227 行按既有词形/词性规则规范化为 15,120 项，其中 15,034 项进入编写清单，86 项因占位符、无字母、切词标注问题或专名噪声等被逐项排除。包含 B2、C1，初始等级为 A1 → C1 中首次 F > 0 的等级；缺失频次在本清单中计为 0，但 CEFR 原始证据仍以 null 保留缺失。

完整清单按 `SFI@TOTAL` 的既有排名排列，保留各级原始计数之和及来源标签；所有 B1 参考项继续使用原 ID，原 B1 清单内容保持不变。新增的中文释义、自然例句和词形由 GPT-6 Luna 子代理编写，统一标记为草稿；NT2Lex 数据不含这些中文内容。来源词形/词性错误、专名等可在账本中进一步逐项排除，不能因为生僻或难写而排除。

`npm run content:coverage -- --all --strict` 检查完整清单没有遗漏、重复账本或未知词义；默认命令仍检查冻结 B1 清单。构建保留现有词条及词义 ID，沿用 A1+A2+B1 频次的新词排序，不更改用户 IndexedDB 或 SRS 卡片记录。纯 B2/C1 新词在该排序中的计数为 0，其间按完整 SFI 词频排名排列，避免按编写者的分片顺序分组。

## 教材词频排名

`npm run content:normalize` 同时生成 `content/manifests/nt2lex-frequency-v1.json`，供词库构建时写入 `Lexeme.textbookFrequencyRank`。

- 将 NT2Lex 基础版全部 15,227 条原始词条按 `SFI@TOTAL` 从高到低排列，名次从 1 开始；包含 B2/C1 条目以及参考集排除的行，不按当前收录词库重新编号。
- 分数相同时保持原始 TSV 行顺序，依次编号。
- 按参考集相同的词形规范化和词性规则匹配；同一 `(lemma, pos)` 对应多行时取最高名次，不相加 SFI。同词不同词性分别排名。
- 未匹配到 NT2Lex 条目的词显示「暂无」。排名越小表示在该教材语料中越常见，不代表通用口语词频。
- 学习卡片、词库列表和词条详情显示相同排名。新词学习顺序仍按 A1+A2+B1 出现次数排列。

## CEFR 首次出现与可靠性复核

词库构建使用 NT2Lex 的 A1 → A2 → B1 → B2 → C1 数据：

1. 第一个 `F@LEVEL > 0` 的等级保存为 `first_occurrence_level`，并默认作为 `final_level`。
2. 若该等级同一原始行的 `F ≥ min_frequency` 且 `D > min_dispersion`，标为 `reliable`，`suggested_level` 为 `null`。
3. 否则向更高等级寻找第一个同时满足条件的等级，保存为 `suggested_level` 并标记 `needs_review`。`final_level` 仍使用首次出现等级，建议不会自动采用。
4. 若各等级均不满足，标记 `insufficient_evidence`，建议为 `null`，最终等级仍为首次出现等级。所有 F 缺失或不大于 0 时，首次与最终等级均为 `null`。

阈值配置在 `content/sources/cefr-config.json`，默认为 `min_frequency: 2`、`min_dispersion: 0`，即 **F ≥ 2、D > 0**。这是工程启发式，并非官方验证的分级标准。修改配置后运行 `npm run content:build` 即可生效，不要求重新下载或规范化原始数据。

`npm run content:normalize` 生成 `content/manifests/nt2lex-cefr-v1.json`，保留来源 SHA-256、生成时的阈值、四个分级字段，以及逐行的原始词形、标签和五个等级的 F、D。按现有 `(lemma, pos)` 规则合并时，首次出现取任一行的最早等级；可靠性要求同一行的 F、D 同时满足阈值，不将不同记录的证据相加或拼接。

缺失标记 `-`、空值、`NA`、`N/A` 保存为 `null`；真实 0 原样保留，缺失的 D 不能通过可靠性复核。来源中的极小负浮点 D 也原样保留，并按实际数值参与比较，不截断或四舍五入。

构建时按当前阈值从原始 F、D 重新计算，将结果保存到 `Lexeme.cefr`，并将有效的 `final_level` 写入发布词库的 `Sense.level`；当前阈值保存到词库顶层 `cefr_thresholds`。未匹配来源或无首次出现证据时，保留已有词义等级。人工编写的源文件、词条/词义 ID、新词顺序和 SRS 数据不变，无需迁移用户数据库。词条详情可展开查看分级字段和原始 F、D，待复核与证据不足会在等级旁标记。

## 许可边界

- 代码许可证与数据许可证是两回事。仓库代码的许可证不会改变 NT2Lex 数据的许可证；从 NT2Lex 衍生的参考集（`reference-set-b1-v1.json`）、词频排名、CEFR 证据清单和覆盖账本继承 CC BY-NC-SA 4.0（署名、非商业、相同方式共享），发布时必须署名上面的引用并注明已做修改。
- 词义、中文释义、例句由本项目自行撰写，不来自 NT2Lex；其版权和许可证单独声明。
- NC（非商业）数据不能直接用于将来的商业版本。若要商业化，必须先取得 NT2Lex 作者的新授权，或换用许可证允许的来源重新生成参考集。这里只做记录，不在代码里设限。
- 原始 TSV 默认不随仓库公开，只保留下载地址和 SHA-256。
