# Dutch Vocab 荷兰语背单词

给中文母语者用的荷兰语背单词网页：先回忆、再揭晓、按记忆情况评分，FSRS 自动安排复习。学习记录只保存在你自己的浏览器里，没有账号，也没有服务器。

- 线上地址：`https://plusero.github.io/jamo-volcab/`（部署后可用，见「部署」）
- 词库：按 NT2Lex 冻结的 B1 参考清单编写，当前进度见 [docs/PROGRESS.md](docs/PROGRESS.md)

---

## 日常使用

### 学习

1. 打开「今日」，可以看到待复习数、今天还能学的新词数，以及今天已复习了多少。
2. 点「开始学习」。先看荷兰语，**在心里回忆意思**，然后点「显示答案」。
3. 按实际情况评分：

| 按钮 | 什么时候选 |
|---|---|
| 忘记 | 揭晓前没想起来。**揭晓后才觉得眼熟，也选这个** |
| 模糊 | 想起来了，但很吃力 |
| 认识 | 正常想起来了 |
| 轻松 | 一下就想起来（默认隐藏，在「设置」里开启） |

4. 评了「忘记」的卡，几分钟后会再出现。「今日」页上的「稍后还有 X 张」就是这些卡。

其他操作：

- **撤销**：撤回上一次评分。
- **跳过**：这一轮先不看这张卡，不影响它的复习安排。
- **暂停**：这张卡以后不再出现。可以在词条详情里恢复。
- **详情**：查看这个词的全部词义、词形、例句，也可以写备注、加收藏。

电脑上的快捷键：`空格` 显示答案，`1` `2` `3`（`4`）评分。

### 每天学多少

在「设置 → 学习」里调整，默认每日目标 60 张、新词上限 20 个。新词数会随复习量自动减少：复习越多，新词越少。当天第一次打开时额度就定下来了，之后刷新页面不会变。学习日在当地时间凌晨 4 点切换。

### 查词和发音

揭晓答案后、以及词条详情页里都有查词按钮：

- **Google 翻译**：查这个词，或者翻译例句。
- **Van Dale（需登录）**：Van Dale 的免费在线词典已经停止服务，这个按钮打开的是需要订阅的 Van Dale Online。先点「复制词条」，再到 Van Dale 里粘贴搜索。
- **🔊 发音**：使用设备自带的荷兰语语音。设备上没有荷兰语语音时，这个按钮不会显示。iPhone 可以在「设置 → 辅助功能 → 朗读内容 → 声音」里下载荷兰语语音。

---

## 备份与恢复（重要）

学习记录只存在当前浏览器里。清除浏览器数据、换手机、换浏览器都会让记录消失。**请定期导出备份**；超过 7 天没导出，「今日」页会提醒你。

### 导出

「设置 → 数据 → 导出备份」。

- iPhone：会弹出分享菜单，选「存储到文件」，保存到 iCloud Drive 或本机。
- 电脑：直接下载一个 `dutch-vocab-backup-时间.json` 文件。

备份文件只包含你的学习记录（进度、复习历史、备注、设置），不包含词库，所以很小。

### 导入

「设置 → 数据 → 导入备份」，选择备份文件。确认框里会显示备份时间和卡片数量。

> ⚠️ 导入会**覆盖本机现有的全部学习数据**，不会合并。如果本机也有新进度，请先导出一份。

如果文件损坏或格式不对，导入会直接报错，本机原有的数据不受影响。

### 换设备

同一时间只在一台设备上学习。要换设备时：

1. 在旧设备上导出备份。
2. 在新设备上打开网站，导入这份备份。
3. 之后就在新设备上学。

两台设备各自学过之后再导入，后导入的会覆盖先学的，**不会合并**。

---

## 在 iPhone 上使用

1. 用 Safari 打开网址。
2. 点分享按钮 → 「添加到主屏幕」。
3. 以后从主屏幕图标打开，体验接近原生 App，断网也能学习。

注意：**Safari 标签页和主屏幕图标里的数据可能是分开的。** 如果你先在 Safari 里学过，再添加到主屏幕，请在 Safari 里导出备份，然后在主屏幕版里导入。

## 更新应用

部署新版本后，应用底部会出现「有新版本」提示。点「更新」会立即刷新；点「稍后」，下次打开时再更新。更新不会影响学习记录。

## 出错了怎么办

| 情况 | 处理 |
|---|---|
| 出现「出错了」页面 | 先点「导出备份」保存一份，再点「刷新」。大多数问题刷新后就好了。如果反复出现，记下错误信息。 |
| 学习记录不见了 | 浏览器数据可能被清除了，或者你打开的是另一个浏览器、另一种模式（例如无痕模式、主屏幕版）。用最近的备份导入恢复。 |
| 无痕或隐私模式 | 关掉页面后记录可能不会保留，请用正常模式学习。 |
| 没有发音按钮 | 设备上没有荷兰语语音，见上文「查词和发音」。 |

---

## 部署（维护者）

网站托管在 GitHub Pages，由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建和发布。

**第一次部署**

1. 在 GitHub 仓库里打开 Settings → Pages，把 Source 设为 **GitHub Actions**。
2. 把代码推送到 `main` 分支。
3. 在 Actions 页面等 workflow 跑完。它会依次做类型检查、lint、测试和词库校验，再构建并发布。
4. 网址是 `https://<owner>.github.io/<仓库名>/`。

**之后**：每次推送到 `main` 都会自动发布。PR 只跑检查，不发布。

站点的子路径来自仓库名（workflow 里的 `BASE_PATH`）。如果使用自定义域名或 `<owner>.github.io` 根站点，把 `BASE_PATH` 改成 `/`。

> GitHub Pages 的站点是公开的，任何人都能打开。但每个人的学习记录只存在各自的浏览器里，别人看不到你的记录。

## 本地开发（维护者）

需要 Node.js 24。

```bash
npm ci                    # 安装依赖
npm run content:build     # 生成 public/vocabulary/vocab.json（第一次运行前必须执行）
npm run dev               # 开发服务器 → http://localhost:5173/dutch-vocab/

npm run typecheck         # 类型检查
npm run lint
npm test                  # 单元测试
npm run test:integration  # 集成测试（学习流程、备份）
npx playwright install chromium     # 第一次运行 E2E 前执行
npx playwright test --project=desktop-chrome   # E2E：学习 → 刷新 → 导出 → 导入
```

代码约定见 [实施计划](docs/Dutch_Vocabulary_App_Implementation_Plan.md) 第 1–2 节，要点是「let it crash」：只在导入文件、构建词库这两个边界做校验，不写防御性的 try/catch，所有错误统一交给顶层错误页处理。

## 词库维护（维护者）

词库源文件在 `content/curated/*.json`，构建时合并成 `public/vocabulary/vocab.json`。

### 继续编写下一批

```bash
npm run content:batches -- 6000   # 按词频取前 6000 项，把还没做的写成 content/work/batch-NNN.json
# 按 content/work/GUIDE.md 编写每个批次（可交给 AI agent），每批产出两个文件：
#   content/curated/batch-NNN.json           词条和词义
#   content/coverage/ledger/batch-NNN.jsonl  每个参考项一行：included 或 excluded + 理由
npm run content:validate          # 结构和必需字段检查
npm run content:coverage          # 生成 content/coverage/coverage-report.md 和 missing-items.csv
npm run content:build             # 生成 vocab.json（新词顺序按词频自动排序）
```

### 人工审核与修改

- 审核过的词义，把 `review` 从 `"draft"` 改成 `"reviewed"`。
- 可以随时修改释义、例句和词形，学习进度不受影响。
- **不要改 `id`**，也**不要删除已发布的词义**。学习记录是按词义 ID 关联的。不想要的词义，加上 `"retired": true`。
- 要在参考清单之外加词，放在 `content/curated/extra.json` 里，不计入覆盖率。

### 来源与许可

参考清单来自 NT2Lex（CC BY-NC-SA 4.0，**禁止商业用途**），详见 [docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md)。原始 TSV 不放进仓库，需要时运行 `npm run content:fetch` 下载，会自动校验 hash。

## 目录

```text
src/domain/        纯 TS：类型、学习日、调度（ts-fsrs）、每日计划
src/application/   学习、备份、词库、备注、设置
src/data/db.ts     IndexedDB（Dexie）：cards、reviewLogs、dayPlans、notes、settings
src/features/      各页面
src/platform/      查词链接、语音、文件分享
content/           词库源文件、参考清单、覆盖账本
scripts/           词库脚本（fetch / normalize / batches / validate / coverage / build）
tests/             unit、integration、e2e
docs/              实施计划、进度、内容来源
```
