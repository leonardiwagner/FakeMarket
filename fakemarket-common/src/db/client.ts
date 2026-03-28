import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://admin:pass123@localhost:5432/fakemarket';

export const db: ReturnType<typeof drizzle> = drizzle(DATABASE_URL, {
    logger: false,
    schema,
});

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
