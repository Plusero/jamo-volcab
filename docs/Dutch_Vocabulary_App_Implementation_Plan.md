# 荷兰语背单词 Web App：实施计划 v2.1

> 2026-11-07。项目名 `Dutch Vocab`，仓库 `dutch-vocab`，IndexedDB 名 `dutch-vocab-local`（不改）。

## 0. 目标

一个给自己用的荷兰语背单词网页：简体中文界面，参考墨墨的学习闭环（先回忆、再揭晓、按记忆反馈、FSRS 安排复习）。部署在 GitHub Pages，没有后端、没有登录。进度存在 IndexedDB，可以导出、导入 JSON 备份。B1 词库按冻结的参考清单完整覆盖。业务逻辑用纯 TypeScript 写，以后可以接原生 App。

**不做**：账号、云同步、多设备合并、支付、社区、在线 AI，也不复制墨墨的品牌和内容。

代码和词库是两条独立的交付线，两条都完成才算完成。计划没写到的细节自己按常理决定，不必来回问。每完成一步就更新 `docs/PROGRESS.md`。

## 1. 原则：Let it crash

单用户、单设备、能从备份恢复，所以：

- **只在边界校验**：导入的备份文件和构建时的词库源文件用 Zod `.parse()` 校验，不合法直接抛错。进入系统的数据信任 TS 类型，不再层层检查。
- **不写防御性 try/catch、重试或降级链**。只在顶层设一个 ErrorBoundary，加 `window.onerror` / `unhandledrejection`，显示错误和「刷新」「导出备份」两个按钮。刷新后状态从 IndexedDB 重新推导。
- **原子性交给 Dexie 事务**：一次评分的写入放在一个事务里，失败就整体回滚。
- **只考虑单标签页**：不做乐观锁、epoch 或幂等 ID，后写的覆盖先写的。提交评分期间禁用按钮，防止双击。
- **可选功能缺了就隐藏按钮**，比如没有荷兰语语音、不支持分享。
- **脚本遇到坏数据就以非零状态退出**。数据库升级只用 Dexie 的 `version()`，升级失败就报错，从备份恢复。

## 2. 技术与结构

React + TS + Vite、HashRouter、CSS Modules、Dexie、`ts-fsrs` v6、Zod（只用在边界）、`vite-plugin-pwa`（prompt 更新）、Vitest + fake-indexeddb、Playwright（只测一条主流程）。Node 24，依赖锁定在 `package-lock.json`。

```text
src/features/     React 页面，不直接写数据库
src/application/  study（学习）、backup（备份）、vocab（词库加载与搜索）、notes（备注）
src/domain/       纯 TS：类型与 schema、learning-day、study-plan、scheduler，不引用 React/Dexie/window
src/data/db.ts    Dexie 数据库
src/platform/     语音、文件、查词链接
```

当前时间用 `now: number` 参数传进来，测试时可以固定。

## 3. 页面

| 页面 | 内容 |
|---|---|
| 今日 | 到期数、剩余新词额度、今日复习次数、开始学习；距上次导出超过 7 天时提醒备份 |
| 学习 | 正面显示荷兰语（名词带 de/het）和发音按钮 → 显示答案 → 中文义、例句、词形与搭配、备注、查词链接 → 评分。可以撤销、暂停、收藏、跳过（只在本页面状态里跳过） |
| 词库 | 搜索、按词性/主题/状态筛选、分页 |
| 词条详情 | 全部词义、例句、词形、来源、备注 |
| 统计 | 每日新学数、复习次数、到期分布，数据都来自复习日志 |
| 设置 | 每日目标、新词上限、时区、发音、主题、导出/导入、词库版本与来源 |

界面要求：最窄适配 320px，触摸区域不小于 44px，避开 iPhone 底部安全区；评分按钮要有文字；快捷键为空格揭晓、1–4 评分。默认值：每日目标 60，新词上限 20，学习日 04:00 切换，时区取设备时区。

## 4. 调度

| 按钮 | FSRS |
|---|---|
| 忘记 | Again（揭晓前没想起来；揭晓后才觉得眼熟也算） |
| 模糊 | Hard |
| 认识 | Good |
| 轻松（在设置里开启） | Easy |

- 用 ts-fsrs v6 的 `DefaultScheduler` → `newCard` / `review`，关闭 fuzz。卡片保存库返回的全部字段，日期转成毫秒，另存一个 `dueAtMs` 用作索引。
- **每日计划**：当天第一次打开时记下 D（学习日结束前到期的旧卡数）并保存，之后刷新不会重算。新词额度 `min(新词上限, max(0, 每日目标 − D))` 每次按当前设置计算，所以改设置立即生效。
- **出题顺序**：已到期的学习/重学卡 → 今天到期的复习卡 → 新词（按词库顺序取还没有卡的词义）。积压超过目标时新词额度为 0。当前没有可学的卡但稍后还有时，显示「稍后还有 X 张」。
- **学习日**：时间存 UTC 毫秒；按设置里的 IANA 时区和本地 04:00 用日历计算学习日，不直接减 24 小时，这样夏令时也正确。
- **撤销**：每条日志保存评分前的卡片 `before`（新卡为 `null`）。撤销最后一条时，删掉这条日志并还原卡片；如果是新卡就删掉卡片，额度会因为日志减少而自然退回。

## 5. 数据

**词库**：静态文件 `public/vocabulary/vocab.json`，由 SW 预缓存，启动时读进内存，不进 IndexedDB，也不进备份。词义 ID 一旦生成就不变；已发布的词义不删除，只标记 `retired`。

```ts
Lexeme = { id, lemma, pos, article?, plural?, verbForms?: { past, pastParticiple, aux } }
Sense  = { id, lexemeId, zh, examples: { nl, zh }[], collocations?, topics, level, review: 'draft' | 'reviewed', retired? }
```

**用户数据（Dexie）**：

| 表 | 字段 |
|---|---|
| `cards` | `senseId`（主键）、`fsrs`、`dueAtMs`、`suspended` |
| `reviewLogs` | 自增 `id`、`senseId`、`rating`、`reviewedAtMs`、`before` |
| `dayPlans` | `dayKey`、`dueCount`（D；额度按当前设置现算，已引入的新卡数由当天 `before = null` 的日志算出） |
| `notes` | `senseId`、`text`、`starred` |
| `settings` | 单行设置，包含 `lastExportAtMs` |

## 6. B1 词库

CEFR 没有官方穷尽的荷兰语 B1 词表。本项目的承诺是：**完整覆盖一份冻结的「B1 及以下」参考清单，并公开版本和排除理由**，不写「官方 B1 全部词汇」。

1. 下载 NT2Lex 基础版（CC BY-NC-SA 4.0），记录 URL 和 SHA-256（`content/sources/sources.json`）。
2. 先看真实的 TSV 表头再写解析器；取 A1/A2/B1 任一等级词频大于 0 的条目，按 lemma + 词性去重。
3. 排除噪声条目，每条写明理由。冻结为 `content/manifests/reference-set-b1-v1.json`，词数以脚本输出为准。
4. 每个词义必须有：词形、词性、中文义、例句和译文；名词加冠词和复数，动词加过去式、过去分词和助动词。多义词拆开，固定表达整体收录。
5. 覆盖账本 `content/coverage/ledger/*.jsonl`（每批一个文件），每行记 `{ referenceId, status: included | excluded, senseIds | excludeReason }`，验收标准是 `missing = 0`。
6. 释义可以由 agent 起草，但 `review` 字段要如实标注。人工抽检重点看 de/het、不规则动词、可分动词，以及例句和词义是否对应；发现系统性错误就整批返工。
7. `docs/CONTENT_SOURCES.md` 写清来源、许可证和署名。NC 数据不能直接用于将来的商业版本，这里只需记录下来。

```bash
npm run content:fetch      # 下载并校验 hash
npm run content:normalize  # 生成候选集
npm run content:validate   # Zod 校验 + 唯一 ID + 必需字段
npm run content:coverage   # 输出 coverage-report.md 和 missing-items.csv
npm run content:build      # 生成 public/vocabulary/vocab.json
```

## 7. 查词、发音、备份

- **Google 翻译**：`https://translate.google.com/?` + `URLSearchParams({ sl: 'nl', tl: 'zh-CN', text, op: 'translate' })`。名词传 lemma（不带冠词），例句传原句。
- **Van Dale**：免费版已于 2025-12-10 停止服务。按钮链接 `https://zoeken.vandale.nl/`，写明「需登录」，旁边放「复制词条」按钮，不编造深链。
- 外链用 `<a target="_blank" rel="noopener noreferrer">`，返回应用时页面状态不变。
- **发音**：`speechSynthesis`，监听 `voiceschanged`，优先 `nl-NL`，其次 `nl-BE`；找不到就隐藏按钮。播放前先 `cancel()`，提供正常/慢速两档。
- **备份**：`{ format: 'dutch-vocab-backup', formatVersion: 1, createdAt, data: { cards, reviewLogs, dayPlans, notes, settings } }`
  - 导出：只读事务读出所有表，支持 `canShare` 时用分享，否则下载；写入 `lastExportAtMs`。
  - 导入：`BackupFile.parse()` → 确认框（显示时间、数量，提示会覆盖本机数据）→ 一个事务里清空再写入 → 刷新页面。失败时事务回滚，原有数据不变。
  - 换设备：导出再导入，不做合并。

## 8. 离线与部署

- PWA 预缓存应用外壳和 `vocab.json`，`scope` / `start_url` 设为 `/dutch-vocab/`。启动时调用一次 `navigator.storage.persist()`。
- Vite `base: '/dutch-vocab/'`，资源用 `import.meta.env.BASE_URL` 拼路径。
- 一个 Actions workflow：`npm ci` → typecheck → lint → test → test:integration → content:validate → build → 在 main 分支部署 Pages（权限 `pages: write`、`id-token: write`）。
- 不加追踪，不用 `dangerouslySetInnerHTML`。

## 9. 步骤

| 步骤 | 内容 | 完成标准 |
|---|---|---|
| S1 | 骨架：db、scheduler、study、backup 和测试 | typecheck、测试通过 |
| S2 | 用约 200 个样例词义做学习页和今日页 | 评分 → 刷新 → 能接着学 |
| S3 | 备份界面、查词、发音、词条详情 | 导出、导入往返通过 |
| S4（可与 S2–S3 并行） | NT2Lex 参考集 + 全量词义 | `missing = 0`，排除项都有理由 |
| S5 | 词库、统计、设置页面 | 数字来自真实记录 |
| S6 | PWA、Pages CI、iPhone 实机检查 | 线上可用，断网刷新仍能学习 |

## 10. 测试与完成

**自动化测试**：
- 学习日：04:00 分界、夏令时
- 每日计划：额度公式；积压时为 0；刷新后不会增长
- 调度：评分映射正确；序列化往返后结果一致
- 评分与撤销：一次评分写入一张卡和一条日志；撤销后卡片和额度都还原
- 备份：往返一致；坏文件抛错，原有数据不变
- `content:validate` 通过
- E2E：在 `/dutch-vocab/` 子路径下学一张卡 → 刷新 → 导出 → 导入

**iPhone 实机检查**：主屏幕模式、导出到「文件」再导入、查词后返回、发音、断网冷启动。

**完成**：线上地址可用；学习闭环、备份往返（包括 iPhone）通过；B1 `missing = 0`；`CONTENT_SOURCES.md` 写好；README 说明如何学习、备份和换设备。交付状态如实说明，例如「词库尚缺 X 项」或「iPhone 导入未实测」。

## 11. 参考

[NT2Lex](https://cental.uclouvain.be/cefrlex/nt2lex/download/) · [CEFR RLD](https://www.coe.int/en/web/common-european-framework-reference-languages/reference-level-descriptions) · [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) · [Dexie transaction](https://dexie.org/docs/Dexie/Dexie.transaction()) · [Van Dale 停止说明](https://www.vandale.nl/pages/het-gratis-onlinewoordenboek-is-gestopt) · [Vite 部署](https://vite.dev/guide/static-deploy.html#github-pages) · [vite-plugin-pwa](https://vite-pwa-org.netlify.app/guide/prompt-for-update) · [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
