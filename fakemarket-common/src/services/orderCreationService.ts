import { db, type DbTransaction } from '../db/client';
import { InsufficientMoneyError, InsufficientResourcesError } from '../errors';
import * as Models from '../models';
import * as OrderRepository from '../repositories/orderRepository';
import * as HoldingsRepository from '../repositories/holdingsRepository';

export async function createSellOrder(userId: string, resourceId: string, quantityToSell: number, price: number): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        const [holding] = await HoldingsRepository.getUserHoldings(userId, resourceId);

        if (!holding || holding.quantity < quantityToSell) {
            throw new InsufficientResourcesError();
        }

        return await OrderRepository.add(
            dbTransaction,
            userId,
            resourceId,
            Models.OrderType.SELL,
            price,
            quantityToSell,
        );
    });
}

export async function createBuyOrder(userId: string, resourceId: string, quantity: number, price: number): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        
        const money = await HoldingsRepository.getUserMoney(userId);

        const totalPrice = price * quantity;
        if ( money < totalPrice) {
            throw new InsufficientMoneyError();
        }

        return await OrderRepository.add(
            dbTransaction,
            userId,
            resourceId,
            Models.OrderType.BUY,
            price,
            quantity,
        );
    });
}
