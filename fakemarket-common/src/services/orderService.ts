import { and, eq } from 'drizzle-orm';
import { holdings } from '../db/schema';
import * as Constants from '../models/constants';
import * as Errors from '../models/errors';
import type * as Models from '../models/models';
import * as HoldingsRepository from '../repositories/holdingsRepository';
import * as OrderRepository from '../repositories/orderRepository';
import { executeTransaction } from './databaseService';

export async function createSellOrderAndReserveHolding(
    userId: string,
    resourceId: string,
    quantityToSell: number,
    price: number,
): Promise<Models.Order> {
    return await executeTransaction(async (tx) => {
        const userHoldings = await tx
            .select()
            .from(holdings)
            .where(
                and(
                    eq(holdings.userId, userId),
                ),
            )
            .for('update');

        const resourceHolding = userHoldings.find((holding) => holding.resourceId === resourceId);
        const moneyHolding = userHoldings.find((holding) => holding.resourceId === Constants.RESOURCE_ID_USD);

        if(!moneyHolding) {
            throw new Errors.MoneyHoldingNotFoundError();
        }

        if(!resourceHolding){
            throw new Errors.ResourceHoldingNotFoundError();
        }

        if (resourceHolding.quantity < quantityToSell) {
            throw new Errors.InsufficientResourcesError();
        }

        await HoldingsRepository.updateHoldingQuantity(tx, userId, resourceId, -quantityToSell, quantityToSell);

        return await OrderRepository.add(
            tx,
            userId,
            resourceId,
            Constants.OrderType.SELL,
            price,
            quantityToSell,
        );
    });
}

export async function createBuyOrderAndReserveMoney(
    userId: string,
    resourceId: string,
    quantityToBuy: number,
    price: number,
): Promise<Models.Order> {
    return await executeTransaction(async (tx) => {
        const [holding] = await tx
            .select()
            .from(holdings)
            .where(
                and(
                    eq(holdings.userId, userId),
                    eq(holdings.resourceId, Constants.RESOURCE_ID_USD),
                ),
            )
            .for('update');

        const totalPrice = quantityToBuy * price;

        if (!holding || holding.quantity < totalPrice) {
            throw new Errors.InsufficientMoneyError();
        }

        await HoldingsRepository.updateHoldingQuantity(tx, userId, Constants.RESOURCE_ID_USD, -totalPrice, totalPrice);

        return await OrderRepository.add(
            tx,
            userId,
            resourceId,
            Constants.OrderType.BUY,
            price,
            quantityToBuy,
        );
    });
}
