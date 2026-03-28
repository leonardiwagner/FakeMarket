import { db } from '../db';
import * as Models from '../models/Models';
import { insertOrder } from '../repositories/orderRepository';
import { removeHoldingQuantity } from '../repositories/holdingsRepository';

export async function createSellOrder(userId: string, resourceId: string, quantity: number, price: number): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction) => {
        const holding = await removeHoldingQuantity(dbTransaction, userId, resourceId, quantity);

        if (!holding) {
            throw new Models.InsufficientResourcesError();
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
    return await db.transaction(async (dbTransaction) => {
        const money = await removeHoldingQuantity(
            dbTransaction,
            userId,
            Models.RESOURCE_ID_USD,
            quantity * price,
        );

        if (!money) {
            throw new Models.InsufficientMoneyError();
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
