import { and, eq, gte, sql } from 'drizzle-orm';
import { holdings } from '../../drizzle/schema';
import { db, type DbTransaction } from '../db';
import * as Models from '../models/Models';

export async function getUserHoldings(userId: string, resourceId?: string): Promise<Models.Holding[]> {
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
                eq(holdings.resourceId, Models.RESOURCE_ID_USD),
            ),
        );

    return holding ? holding.quantity : 0;
}

export async function updateHoldingQuantity(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<Models.Holding> {
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
): Promise<Models.Holding> {
    return await updateHoldingQuantity(dbTransaction, userId, Models.RESOURCE_ID_USD, amount);
}

export async function removeHoldingQuantity(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<Models.Holding | undefined> {
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
