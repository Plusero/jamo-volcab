import { z } from 'zod';

/*
 * 领域类型。Zod schema 只在边界使用：导入备份（BackupFile）和构建词库（Vocab）。
 * 系统内部直接信任这些类型。
 */

export const Rating = z.enum(['Again', 'Hard', 'Good', 'Easy']);
export type Rating = z.infer<typeof Rating>;

/** ts-fsrs 卡片的 JSON 形式：Date 字段存为 `<字段名>Ms` 毫秒。 */
export const FsrsState = z.record(z.string(), z.union([z.number(), z.string(), z.null()]));
export type FsrsState = z.infer<typeof FsrsState>;

/* ------------------------------- 用户数据 ------------------------------- */

export const Card = z.object({
  senseId: z.string(),
  fsrs: FsrsState,
  dueAtMs: z.number(),
  suspended: z.boolean(),
});
export type Card = z.infer<typeof Card>;

export const ReviewLog = z.object({
  id: z.number().int(),
  senseId: z.string(),
  rating: Rating,
  reviewedAtMs: z.number(),
  /** 评分前的卡片；新卡为 null。用于撤销。 */
  before: Card.nullable(),
});
export type ReviewLog = z.infer<typeof ReviewLog>;

/** 当天第一次打开时固定的到期旧卡数 D。新词额度由它和当前设置算出，所以改设置立即生效。 */
export const DayPlan = z.object({
  dayKey: z.string(),
  dueCount: z.number().int(),
});
export type DayPlan = z.infer<typeof DayPlan>;

export const Note = z.object({ senseId: z.string(), text: z.string(), starred: z.boolean() });
export type Note = z.infer<typeof Note>;

export const Settings = z.object({
  dailyTarget: z.number().int().min(0),
  newLimit: z.number().int().min(0),
  timeZone: z.string(),
  dayBoundaryHour: z.number().int().min(0).max(23),
  easyButton: z.boolean(),
  speechRate: z.enum(['normal', 'slow']),
  theme: z.enum(['system', 'light', 'dark']),
  lastExportAtMs: z.number().nullable(),
});
export type Settings = z.infer<typeof Settings>;

export const BackupFile = z.object({
  format: z.literal('dutch-vocab-backup'),
  formatVersion: z.literal(1),
  createdAt: z.string(),
  data: z.object({
    cards: z.array(Card),
    reviewLogs: z.array(ReviewLog),
    // 旧版备份里的 { dayKey, newQuota } 也接受，恢复时丢弃（当天计划会自动重建）
    dayPlans: z.array(z.union([DayPlan, z.object({ dayKey: z.string(), newQuota: z.number() })])),
    notes: z.array(Note),
    settings: Settings.nullable(),
  }),
});
export type BackupFile = z.infer<typeof BackupFile>;

/* --------------------------------- 词库 --------------------------------- */

export const Lexeme = z.object({
  id: z.string(),
  lemma: z.string().min(1),
  pos: z.string(),
  article: z.enum(['de', 'het', 'de/het']).optional(),
  plural: z.string().optional(),
  verbForms: z.object({
    past: z.string(),
    pastParticiple: z.string(),
    aux: z.enum(['hebben', 'zijn', 'hebben/zijn']),
  }).optional(),
});
export type Lexeme = z.infer<typeof Lexeme>;

export const Sense = z.object({
  id: z.string(),
  lexemeId: z.string(),
  zh: z.string().min(1),
  examples: z.array(z.object({ nl: z.string().min(1), zh: z.string().min(1) })).min(1),
  collocations: z.array(z.string()).optional(),
  topics: z.array(z.string()),
  level: z.string(),
  review: z.enum(['draft', 'reviewed']),
  retired: z.literal(true).optional(),
});
export type Sense = z.infer<typeof Sense>;

/** public/vocabulary/vocab.json；senses 的顺序即新词学习顺序。 */
export const Vocab = z.object({
  version: z.string(),
  lexemes: z.array(Lexeme),
  senses: z.array(Sense),
});
export type Vocab = z.infer<typeof Vocab>;
