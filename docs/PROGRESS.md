# 进度

更新：2026-11-07

## 完整 NT2Lex 导入：完成

- 范围：NT2Lex-CGN-v01 全部 15,227 原始行，覆盖 A1–C1。
- 规范化为 15,120 个词形/词性键：15,034 个参考项、86 个带原因的基础噪声排除项。
- 全部 15,034 个参考项已处理，覆盖率 100%，遗漏 0、错误 0；其中 14,099 项对应词卡，935 项在账本中逐项说明来源错误、专名等排除原因。
- 五个 GPT-6 Luna 子代理完成全部 12,030 项增量任务：新增 11,160 个词条/词义，另有 870 项具体排除原因。
- 当前发布词库：**14,122 个词条、14,497 个词义**（含既有补充词条）；所有词义均为 `draft`，未经人工语言审校。
- 词库版本：`20261107-61103682`；生成的 vocab.json 为 9,790,816 字节（约 9.8 MB）。
- 原有词条/词义 ID 保留；未更改用户数据库或 SRS 卡片记录。原 B1 清单保持不变，覆盖率同为 100%。
- 新词继续按 A1+A2+B1 频次排列；纯 B2/C1 词在末段按完整教材词频排名排列。

## 相关检查

- `node --import tsx scripts/content-normalize.ts`：通过，生成完整 A1–C1 清单。
- `node --import tsx scripts/content-validate.ts`：通过。
- `node --import tsx scripts/content-coverage.ts --all --strict`：15,034 / 15,034，missing 0、errors 0。
- `node --import tsx scripts/content-coverage.ts --strict`：11,052 / 11,052，missing 0、errors 0。
- `node --import tsx scripts/content-build.ts`：通过。
- `npx vitest run --project unit tests/unit/full-reference.test.ts`：2 项通过。
- `npx vitest run --project integration tests/integration/study.test.ts`：9 项通过，包含扩充词库后保留已有卡片、日志及备注的测试。
- `npm run lint`、`npm run build`（含类型检查）：通过。
- 完整发布数据在本机 Node 下读取、解析及索引约 76 ms；全词库搜索中位数约 1.8 ms、P95 约 2.3 ms。该测量不代表浏览器或手机实测。
- CI 已加入完整参考集的严格覆盖检查。

## 未验证事项

- 浏览器 E2E 本轮未运行；此前本地预览服务受执行环境端口权限限制。iPhone 实机未测。
- 中文释义、名词/动词形式和例句仍需人工语言审校；结构及覆盖检查通过不代表语言内容已审定。
- 主 JS 包仍有大于 500 kB 的既有 Vite 构建提示。
