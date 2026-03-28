import { db, type DbTransaction } from '../db/client';
import * as Models from '../models';
import { RESOURCE_ID_USD } from '../constants';
import { applyOrderExecution, getOpenBuyOrdersForResource, getOpenOrderResourceIds, getOpenSellOrdersForResource } from '../repositories/orderRepository';
import { insertTrade } from '../repositories/tradeRepository';
import { upsertHoldingQuantity } from '../repositories/holdingsRepository';

type MutableOrder = Models.Order;

function canOrdersMatch(buyOrder: Models.Order, sellOrder: Models.Order): boolean {
    return buyOrder.resourceId === sellOrder.resourceId && buyOrder.price >= sellOrder.price;
}

async function settleTrade(
    tx: DbTransaction,
    buyOrder: MutableOrder,
    sellOrder: MutableOrder,
): Promise<{ buyOrder: MutableOrder, sellOrder: MutableOrder, tradedQuantity: number } | null> {
    if (!canOrdersMatch(buyOrder, sellOrder)) {
        return null;
    }

    const tradedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    if (tradedQuantity <= 0) {
        return null;
    }

    const tradePrice = sellOrder.price;
    const tradeValue = tradedQuantity * tradePrice;
    const buyerRefund = tradedQuantity * Math.max(0, buyOrder.price - tradePrice);

    await insertTrade(
        tx,
        buyOrder.id,
        sellOrder.id,
        buyOrder.resourceId,
        tradedQuantity,
        tradePrice,
    );

    await upsertHoldingQuantity(tx, buyOrder.userId, buyOrder.resourceId, tradedQuantity);
    await upsertHoldingQuantity(tx, sellOrder.userId, RESOURCE_ID_USD, tradeValue);

    if (buyerRefund > 0) {
        await upsertHoldingQuantity(tx, buyOrder.userId, RESOURCE_ID_USD, buyerRefund);
    }

    const updatedBuyOrder = await applyOrderExecution(tx, buyOrder, tradedQuantity);
    const updatedSellOrder = await applyOrderExecution(tx, sellOrder, tradedQuantity);

    return {
        buyOrder: updatedBuyOrder,
        sellOrder: updatedSellOrder,
        tradedQuantity,
    };
}

export async function processOpenOrdersForResource(resourceId: string): Promise<number> {
    return await db.transaction(async (tx: DbTransaction) => {
        const buyOrders = await getOpenBuyOrdersForResource(resourceId);
        const sellOrders = await getOpenSellOrdersForResource(resourceId);

        let buyIndex = 0;
        let sellIndex = 0;
        let processedTrades = 0;

        while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
            const currentBuyOrder = buyOrders[buyIndex];
            const currentSellOrder = sellOrders[sellIndex];

            if (!canOrdersMatch(currentBuyOrder, currentSellOrder)) {
                break;
            }

            const result = await settleTrade(tx, currentBuyOrder, currentSellOrder);
            if (!result) {
                break;
            }

            processedTrades += 1;
            buyOrders[buyIndex] = result.buyOrder;
            sellOrders[sellIndex] = result.sellOrder;

            if (result.buyOrder.quantity === 0) {
                buyIndex += 1;
            }

            if (result.sellOrder.quantity === 0) {
                sellIndex += 1;
            }
        }

        return processedTrades;
    });
}

export async function processAllOpenOrders(): Promise<number> {
    const resourceIds = await getOpenOrderResourceIds();
    let processedTrades = 0;

    for (const resourceId of resourceIds) {
        processedTrades += await processOpenOrdersForResource(resourceId);
    }

    return processedTrades;
}
