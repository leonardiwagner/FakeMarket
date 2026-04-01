import { and, eq, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { holdings } from '../db/schema';
import * as Constants from '../models/constants';
import * as Errors from '../models/errors';
import type * as Models from '../models/models';

async function getUserHoldings(userId: string, resourceId?: string): Promise<Models.Holding[]> {
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

async function getUserMoney(userId: string): Promise<number> {
    const [holding] = await db
        .select()
        .from(holdings)
        .where(
            and(
                eq(holdings.userId, userId),
                eq(holdings.resourceId, Constants.RESOURCE_ID_USD),
            ),
        );

    if (!holding) {
        throw new Errors.MoneyHoldingNotFoundError();
    }

    return holding.quantity;
}

async function updateHoldingQuantity(
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

async function addOrUpdateUserHolding(
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
            quantity,
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

async function upsertHoldingQuantity(
    dbTransaction: DbTransaction,
    userId: string,
    resourceId: string,
    quantity: number,
): Promise<Models.Holding> {
    const [existingHolding] = await dbTransaction
        .select()
        .from(holdings)
        .where(
            and(
                eq(holdings.userId, userId),
                eq(holdings.resourceId, resourceId),
            ),
        )
        .limit(1);

    if (existingHolding) {
        return await updateHoldingQuantity(dbTransaction, userId, resourceId, quantity);
    }

    return await addOrUpdateUserHolding(dbTransaction, userId, resourceId, quantity);
}

async function updateUserMoney(
    dbTransaction: DbTransaction,
    userId: string,
    amount: number,
): Promise<Models.Holding> {
    return await updateHoldingQuantity(dbTransaction, userId, Constants.RESOURCE_ID_USD, amount);
}

export const HoldingsRepository = {
    getUserHoldings,
    getResourcesByUserId: getUserHoldings,
    getUserMoney,
    updateHoldingQuantity,
    addOrUpdateUserHolding,
    upsertHoldingQuantity,
    updateUserMoney,
};
