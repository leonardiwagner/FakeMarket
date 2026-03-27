import { db } from '../db';
import * as DbTypes from '../dbTypes';
import { insertOrder } from '../repositories/orderRepository';
import { removeHoldingQuantity } from '../repositories/holdingsRepository';

export async function createSellOrder(userId: string, resourceId: string, quantity: number, price: number): Promise<DbTypes.Order> {
    return await db.transaction(async (dbTransaction) => {
        const holding = await removeHoldingQuantity(dbTransaction, userId, resourceId, quantity);

        if (!holding) {
            throw new Error('User does not have enough resources to sell');
        }

        return await insertOrder(
            dbTransaction,
            userId,
            resourceId,
            DbTypes.OrderType.SELL,
            price,
            quantity,
        );
    });
}
