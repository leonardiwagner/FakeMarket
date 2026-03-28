import { db, type DbTransaction } from '../db/client';
import { InsufficientMoneyError, InsufficientResourcesError } from '../errors';
import * as Models from '../models';
import { removeHoldingQuantity } from '../repositories/holdingsRepository';
import { insertOrder } from '../repositories/orderRepository';

export async function createSellOrder(userId: string, resourceId: string, quantity: number, price: number): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        const holding = await removeHoldingQuantity(dbTransaction, userId, resourceId, quantity);

        if (!holding) {
            throw new InsufficientResourcesError();
        }

        return await insertOrder(
            dbTransaction,
            userId,
            resourceId,
            Models.OrderType.SELL,
            price,
            quantity,
        );
    });
}

export async function createBuyOrder(userId: string, resourceId: string, quantity: number, price: number): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        const money = await removeHoldingQuantity(
            dbTransaction,
            userId,
            Models.RESOURCE_ID_USD,
            quantity * price,
        );

        if (!money) {
            throw new InsufficientMoneyError();
        }

        return await insertOrder(
            dbTransaction,
            userId,
            resourceId,
            Models.OrderType.BUY,
            price,
            quantity,
        );
    });
}
