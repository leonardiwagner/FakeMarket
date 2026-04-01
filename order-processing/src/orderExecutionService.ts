import * as Models from 'fakemarket-common';
import { RESOURCE_ID_USD } from 'fakemarket-common';
import { db, type DbTransaction } from 'fakemarket-common';
import * as HoldingsRepository from 'fakemarket-common/HoldingsRepository';
import * as OrderRepository from 'fakemarket-common/OrderRepository';
import * as TradeRepository from 'fakemarket-common/TradeRepository';

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

    await TradeRepository.insertTrade(
        tx,
        buyOrder.id,
        sellOrder.id,
        buyOrder.resourceId,
        tradedQuantity,
        tradePrice,
    );

    await HoldingsRepository.upsertHoldingQuantity(tx, buyOrder.userId, buyOrder.resourceId, tradedQuantity);
    await HoldingsRepository.upsertHoldingQuantity(tx, sellOrder.userId, RESOURCE_ID_USD, tradeValue);

    if (buyerRefund > 0) {
        await HoldingsRepository.upsertHoldingQuantity(tx, buyOrder.userId, RESOURCE_ID_USD, buyerRefund);
    }

    const updatedBuyOrder = await OrderRepository.applyOrderExecution(tx, buyOrder, tradedQuantity);
    const updatedSellOrder = await OrderRepository.applyOrderExecution(tx, sellOrder, tradedQuantity);

    return {
        buyOrder: updatedBuyOrder,
        sellOrder: updatedSellOrder,
    };
}

export async function processNextOpenOrder(): Promise<number> {
    return await db.transaction(async (tx: DbTransaction) => {
        const nextOrder = await OrderRepository.getNextOpenOrderForProcessing(tx);

        if (!nextOrder) {
            return 0;
        }

        const matchingOrder = nextOrder.type === Models.OrderType.BUY
            ? await OrderRepository.getBestLockedMatchingSellOrder(tx, nextOrder)
            : await OrderRepository.getBestLockedMatchingBuyOrder(tx, nextOrder);

        if (!matchingOrder) {
            return 0;
        }

        const result = nextOrder.type === Models.OrderType.BUY
            ? await settleTrade(tx, nextOrder, matchingOrder)
            : await settleTrade(tx, matchingOrder, nextOrder);

        return result ? 1 : 0;
    });
}
