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

## 许可边界

- 代码许可证与数据许可证是两回事。仓库代码的许可证不会改变 NT2Lex 数据的许可证；从 NT2Lex 衍生的参考集（`reference-set-b1-v1.json`）和覆盖账本继承 CC BY-NC-SA 4.0（署名、非商业、相同方式共享），发布时必须署名上面的引用并注明已做修改。
- 词义、中文释义、例句由本项目自行撰写，不来自 NT2Lex；其版权和许可证单独声明。
- NC（非商业）数据不能直接用于将来的商业版本。若要商业化，必须先取得 NT2Lex 作者的新授权，或换用许可证允许的来源重新生成参考集。这里只做记录，不在代码里设限。
- 原始 TSV 默认不随仓库公开，只保留下载地址和 SHA-256。
