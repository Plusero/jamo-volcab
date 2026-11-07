import type { AppDb } from '../data/db';
import type { Note } from '../domain/types';

export async function getNote(db: AppDb, senseId: string): Promise<Note> {
  return (await db.notes.get(senseId)) ?? { senseId, text: '', starred: false };
}

export async function updateNote(db: AppDb, senseId: string, patch: Partial<Omit<Note, 'senseId'>>): Promise<void> {
  await db.notes.put({ ...(await getNote(db, senseId)), ...patch });
}
