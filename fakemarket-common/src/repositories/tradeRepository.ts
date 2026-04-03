import { sql, eq, desc, asc } from 'drizzle-orm';
import { type DbTransaction, db } from '../db/client';
import { trades } from '../db/schema';
import type * as Models from '../models/models';

export async function add(
    tx: DbTransaction,
    buyOrderId: string,
    sellOrderId: string,
    resourceId: string,
    quantity: number,
    price: number,
): Promise<Models.Trade> {
    const [trade] = await tx
        .insert(trades)
        .values({
            buyOrderId,
            sellOrderId,
            resourceId,
            quantity,
            price,
        })
        .returning();

    return trade;
}

export async function getLatest(
    resourceId: string,
    quantity: number = 5,
    sortDirection: 'asc' | 'desc' = 'desc',
): Promise<Models.Trade[]> {
    return await db
        .select()
        .from(trades)
        .where(
            eq(trades.resourceId, resourceId)
        )
        .orderBy(sortDirection === 'desc' ? desc(trades.created) : asc(trades.created))
        .limit(quantity);
}