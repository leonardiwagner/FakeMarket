import { and, eq, gte, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { holdings } from '../db/schema';
import { MoneyHoldingNotFoundError } from '../errors';
import * as Models from '../models';

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

    if (!holding) {
        throw new MoneyHoldingNotFoundError();
    }

    return holding.quantity;
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

export async function addOrUpdateUserHolding(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<Models.Holding> {
    const [holding] = await dbTransaction
        .insert(holdings)
        .values({
            userId,
            resourceId,
            quantity
        })
        .onConflictDoUpdate({
            target: [holdings.userId, holdings.resourceId],
            set: {
                quantity,
                updated: sql`now()`,
            },
        })
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
