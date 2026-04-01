import { db, type DbTransaction } from '../db/client';

export async function executeTransaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
    return await db.transaction(callback);
}
