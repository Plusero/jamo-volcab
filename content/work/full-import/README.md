# NT2Lex 全量编写任务

完整来源：NT2Lex-CGN-v01，15,227 原始行；规范化为 15,120 个 `(lemma, pos)`，其中 15,034 个参考项及 86 个带原因的噪声排除项。

`shard-1.json` 至 `shard-5.json` 是本次增量编写的互斥任务清单，共 12,030 项；不包括已编写或已明确排除的参考项。既有 `tja` 词卡在 `full-existing.jsonl` 中补上来源映射，保留原词义 ID。

五个编写子代理均使用 GPT-6 Luna。每条新内容包含中文释义、荷兰语例句、中文例句翻译，以及适用的名词/动词形式；所有新增词义均为 `review: draft`，未经人工审校。来源词形/词性错误或专名等可以逐项排除，必须写具体原因，不因生僻或难写而排除。

`compile.py` 将子代理编写的紧凑输入编译为既有 `content/curated/full-sN-NNN.json` 和 `content/coverage/ledger/full-sN-NNN.jsonl`，不覆盖已有文件。最终校验以这两个目录为准；任务切片与编译器仅供后续补写、追溯和复现编写过程。

```bash
npm run content:validate
npm run content:coverage -- --all --strict
npm run content:coverage -- --strict
npm run content:build
```
