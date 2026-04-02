import { DbTransaction } from 'fakemarket-common';
import * as Constants from 'fakemarket-common/models/constants';
import type * as Models from 'fakemarket-common/models/models';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as TradeRepository from 'fakemarket-common/repositories/tradeRepository';
import { calculateItemsToBuyFromSellingOrder } from './tradeResourcesQuantityCalculator';
import { TradeResourcesQuantity } from '../models/tradeResourcesQuantity';

export async function processOrder(
    dbTransaction: DbTransaction,
    buyOrder: Models.Order,
    sellOrder: Models.Order | undefined,
): Promise<Models.Order | undefined> {

    if (!sellOrder) {
        console.log("No selling orders for the asked price!");

        await OrderRepository.update(dbTransaction, buyOrder.id, { processed: new Date().toISOString() });
        return;
    }

    const tradeResourceQuantity =
        calculateItemsToBuyFromSellingOrder(buyOrder, sellOrder);

    await TradeRepository.add(
        dbTransaction,
        buyOrder.id,
        sellOrder.id,
        buyOrder.resourceId,
        tradeResourceQuantity.quantityToBuy,
        sellOrder.price,
    );

    const updatedBuyOrder = await OrderRepository.update(dbTransaction, buyOrder.id, {
        quantity: tradeResourceQuantity.quantityToBuyRemaining,
        quantityProcessed: buyOrder.quantityProcessed + tradeResourceQuantity.quantityToBuy,
        status: tradeResourceQuantity.quantityToBuyRemaining === 0 ? Constants.OrderStatus.EXECUTED : Constants.OrderStatus.PARTIAL,
        processed: new Date().toISOString(),
    });

    await OrderRepository.update(dbTransaction, sellOrder.id, {
        quantity: tradeResourceQuantity.quantityToSellRemaining,
        quantityProcessed: sellOrder.quantityProcessed + tradeResourceQuantity.quantityToBuy,
        status: tradeResourceQuantity.quantityToSellRemaining === 0 ? Constants.OrderStatus.EXECUTED : Constants.OrderStatus.PARTIAL,
    });

    const orderTotalPrice = tradeResourceQuantity.quantityToBuy * sellOrder.price;
    const reservedBuyOrderPrice = tradeResourceQuantity.quantityToBuy * buyOrder.price;

    // Update holdings of the buyer
    await HoldingsRepository.updateHoldingQuantity(dbTransaction, buyOrder.userId, buyOrder.resourceId, tradeResourceQuantity.quantityToBuy, 0);
    await HoldingsRepository.updateHoldingQuantity(dbTransaction, buyOrder.userId, Constants.RESOURCE_ID_USD, -orderTotalPrice, -reservedBuyOrderPrice);
    
    // Update holdings of the seller
    await HoldingsRepository.updateHoldingQuantity(dbTransaction, sellOrder.userId, sellOrder.resourceId, -tradeResourceQuantity.quantityToBuy, -tradeResourceQuantity.quantityToBuy);
    await HoldingsRepository.updateHoldingQuantity(dbTransaction, sellOrder.userId, Constants.RESOURCE_ID_USD, orderTotalPrice, 0);

    return updatedBuyOrder;
}
