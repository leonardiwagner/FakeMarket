import { and, eq, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { holdings } from '../db/schema';
import * as Constants from '../models/constants';
import * as Errors from '../models/errors';
import type * as Models from '../models/models';

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
                eq(holdings.resourceId, Constants.RESOURCE_ID_USD),
            ),
        );

    if (!holding) {
        throw new Errors.MoneyHoldingNotFoundError();
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



export const getResourcesByUserId = getUserHoldings;
