# 进度

更新：2026-11-07

## 步骤状态

| 步骤 | 状态 | 说明 |
|---|---|---|
| S1 骨架 | ✅ | domain / data / application 层、单元与集成测试 |
| S2 学习闭环 | ✅ | 今日页、学习页 |
| S3 备份与查词 | ✅ | 导出（分享/下载）、导入（校验 → 确认 → 事务替换）、Google/Van Dale、发音、词条详情 |
| S4 B1 词库 | 🟡 词频前 3000 项已完成，总覆盖 27.2% | 见下文 |
| S5 其余页面 | ✅ | 词库搜索筛选、统计、设置 |
| S6 上线 | 🟡 | PWA、Pages workflow 已写；尚未推送部署；iPhone 实机未测 |

## 已运行的检查

- `npm run typecheck`、`npm run lint`：通过
- `npm test`：24 通过；`npm run test:integration`：10 通过
- `npm run content:validate` / `content:build`：通过（2962 词条 / 3337 词义，vocab.json 1.4 MB）
- `npx playwright test --project=desktop-chrome`：主流程（学习 → 刷新 → 导出 → 清库后导入）通过
- 320px 宽度下各页面无横向溢出（截图人工查看）
- **未运行**：Playwright iPhone/WebKit 项目（本机没装 WebKit）、iPhone 实机检查（计划 §10 清单全部未做）

## B1 词库（S4）

- 参考集 `content/manifests/reference-set-b1-v1.json`：NT2Lex 15227 行 → 候选 11215 → 去重 11118 → 排除 66 → **需覆盖 11052 项**
- **已完成：按 A1+A2+B1 词频排序的前 3000 项**——包含 2935 项、排除 65 项（每项都有理由，多为词性标注错误、专有名词、语料噪声），missing 0
  - 来源：`batch-001`…`batch-028`（由 Sonnet 子 agent 按 `content/work/GUIDE.md` 编写）+ `sample.json` 中对上参考项的 238 项
  - `extra.json`：6 个因词性标错被排除、但实际常用的感叹词/问候语（goedemiddag、hè、jawel、jazeker、tja、proost），不计入覆盖
- 总覆盖：3003 / 11052（27.2%）；全部词义 `review: draft`，**尚未人工审核**
- 新词学习顺序由 `content:build` 按参考项词频排序
- 继续：`npm run content:batches -- 6000` 生成下一段批次（编号从 batch-029 起），按同样流程编写

## 已知问题 / 待人工核对

- 需人工核对：
  - 名词/动词的形式按词义不同时（如 `scheppen` schepte/schiep、`blad` bladeren/bladen），schema 只能存一组，另一组写在中文释义里
  - 少量 hebben/zijn、复数取舍由 agent 判断（各批次报告中已列出）
  - 样例词库：`vergeten` 等动词的 hebben/zijn；`ziekte` 复数取 `ziekten`；反身动词的词形写法（`herinnerde zich`）——schema 里没有专门的反身标记。
- 参考集里有少量两字母名词（`pa`、`wc`、`tv`、`cd` 等），需要在账本里逐个决定收录或排除。
- 主 JS 包超过 500 kB（Vite 警告），暂不处理。
- 还没有 README。
