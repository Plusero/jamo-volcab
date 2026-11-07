import { AppDb } from '../../src/data/db';
import { saveSettings } from '../../src/application/settings';

/** 2026-06-10 11:00 Amsterdam，学习日 2026-06-10 */
export const T0 = Date.UTC(2026, 5, 10, 9, 0, 0);
export const MIN = 60_000;
export const DAY = 86_400_000;
export const SENSES = Array.from({ length: 100 }, (_, i) => `s-${i}`);

export async function newDb(settings: { dailyTarget?: number; newLimit?: number } = {}): Promise<AppDb> {
  const db = new AppDb(`test-${crypto.randomUUID()}`);
  await saveSettings(db, { timeZone: 'Europe/Amsterdam', dailyTarget: 60, newLimit: 20, ...settings });
  return db;
}
