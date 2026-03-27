import { and, eq, gte, sql } from 'drizzle-orm';
import { holdings } from '../../drizzle/schema';
import { db, type DbTransaction } from '../db';
import * as DbTypes from '../dbTypes';

export async function getUserHoldings(userId: string, resourceId?: string): Promise<DbTypes.Holding[]> {
    return await db
        .select()
        .from(holdings)
        .where(
            and(
                eq(holdings.userId, userId),
                resourceId ? eq(holdings.resourceId, resourceId) : undefined,
            ),
        );
}

export async function getUserMoney(userId: string): Promise<number> {
    const [holding] = await db
        .select()
        .from(holdings)
        .where(
            and(
                eq(holdings.userId, userId),
                eq(holdings.resourceId, DbTypes.RESOURCE_ID_USD),
            ),
        );

    return holding ? holding.quantity : 0;
}

export async function updateHoldingQuantity(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<DbTypes.Holding> {
    const [holding] = await dbTransaction
        .update(holdings)
        .set({
            quantity: sql`${holdings.quantity} + ${quantity}`,
            updated: sql`now()`,
        })
        .where(
            and(
                eq(holdings.userId, userId),
                eq(holdings.resourceId, resourceId),
            ),
        )
        .returning();

    return holding;
}

export async function updateUserMoney(
    dbTransaction: DbTransaction,
    userId: string,
    amount: number,
): Promise<DbTypes.Holding> {
    return await updateHoldingQuantity(dbTransaction, userId, DbTypes.RESOURCE_ID_USD, amount);
}

export async function removeHoldingQuantity(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<DbTypes.Holding | undefined> {
    const [holding] = await dbTransaction
        .update(holdings)
        .set({
            quantity: sql`${holdings.quantity} - ${quantity}`,
            updated: sql`now()`,
        })
        .where(
            and(
                eq(holdings.userId, userId),
                eq(holdings.resourceId, resourceId),
                gte(holdings.quantity, quantity),
            ),
        )
        .returning();

    return holding;
}
