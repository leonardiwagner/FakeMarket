import {
    db,
    type DbTransaction,
} from 'fakemarket-common/db/client';
import * as Constants from 'fakemarket-common/models/constants';
import type * as Models from 'fakemarket-common/models/models';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as TradeRepository from 'fakemarket-common/repositories/tradeRepository';

type MutableOrder = Models.Order;

function canOrdersMatch(buyOrder: Models.Order, sellOrder: Models.Order): boolean {
    return buyOrder.resourceId === sellOrder.resourceId && buyOrder.price >= sellOrder.price;
}

async function settleTrade(
    tx: DbTransaction,
    buyOrder: MutableOrder,
    sellOrder: MutableOrder,
): Promise<{ buyOrder: MutableOrder, sellOrder: MutableOrder } | null> {
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

    await TradeRepository.TradeRepository.insertTrade(
        tx,
        buyOrder.id,
        sellOrder.id,
        buyOrder.resourceId,
        tradedQuantity,
        tradePrice,
    );

    await HoldingsRepository.HoldingsRepository.upsertHoldingQuantity(tx, buyOrder.userId, buyOrder.resourceId, tradedQuantity);
    await HoldingsRepository.HoldingsRepository.upsertHoldingQuantity(tx, sellOrder.userId, Constants.RESOURCE_ID_USD, tradeValue);

    if (buyerRefund > 0) {
        await HoldingsRepository.HoldingsRepository.upsertHoldingQuantity(tx, buyOrder.userId, Constants.RESOURCE_ID_USD, buyerRefund);
    }

    const updatedBuyOrder = await OrderRepository.OrderRepository.applyOrderExecution(tx, buyOrder, tradedQuantity);
    const updatedSellOrder = await OrderRepository.OrderRepository.applyOrderExecution(tx, sellOrder, tradedQuantity);

    return {
        buyOrder: updatedBuyOrder,
        sellOrder: updatedSellOrder,
    };
}

export async function processNextOpenOrder(): Promise<number> {
    return await db.transaction(async (tx: DbTransaction) => {
        const nextOrder = await OrderRepository.OrderRepository.getNextOpenOrderForProcessing(tx);

        if (!nextOrder) {
            return 0;
        }

        const matchingOrder = nextOrder.type === Constants.OrderType.BUY
            ? await OrderRepository.OrderRepository.getBestLockedMatchingSellOrder(tx, nextOrder)
            : await OrderRepository.OrderRepository.getBestLockedMatchingBuyOrder(tx, nextOrder);

        if (!matchingOrder) {
            return 0;
        }

        const result = nextOrder.type === Constants.OrderType.BUY
            ? await settleTrade(tx, nextOrder, matchingOrder)
            : await settleTrade(tx, matchingOrder, nextOrder);

        return result ? 1 : 0;
    });
}
