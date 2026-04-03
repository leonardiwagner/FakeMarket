import type * as Models from 'fakemarket-common/models/models';


export function getRobotOrderDecision(
    userMoney: number,
    userHoldingsQuantity: number,
    latestOrdersToBuy: Models.Order[],
    latestOrdersToSell: Models.Order[],
    latestSoldTrades: Models.Trade[],
): { isBuy: boolean, price: number, quantity: number } {
    const bestBuyPrice = latestOrdersToBuy.reduce((highest, order) => Math.max(highest, order.price), 0);
    const bestSellPrice = latestOrdersToSell.reduce((lowest, order) => {
        if (lowest === 0) {
            return order.price;
        }

        return Math.min(lowest, order.price);
    }, 0);
    const lastSoldPrice = latestSoldTrades.length > 0
        ? latestSoldTrades[latestSoldTrades.length - 1].price
        : 0;
    const soldTradesTrend = (() => {
        if (latestSoldTrades.length < 2) {
            return 0;
        }

        let totalRelativeChange = 0;

        for (let index = 1; index < latestSoldTrades.length; index++) {
            const previousPrice = Math.max(1, latestSoldTrades[index - 1].price);
            totalRelativeChange += (latestSoldTrades[index].price - previousPrice) / previousPrice;
        }

        return totalRelativeChange / (latestSoldTrades.length - 1);
    })();

    const marketPrice = (() => {
        if (bestBuyPrice > 0 && bestSellPrice > 0) {
            return (bestBuyPrice + bestSellPrice) / 2;
        }

        if (lastSoldPrice > 0) {
            return lastSoldPrice;
        }

        if (bestSellPrice > 0) {
            return bestSellPrice;
        }

        if (bestBuyPrice > 0) {
            return bestBuyPrice;
        }

        return 100;
    })();

    const canBuy = userMoney >= marketPrice;
    const canSell = userHoldingsQuantity > 0;

    if (!canBuy && !canSell) {
        return { isBuy: true, price: roundPrice(marketPrice), quantity: 0 };
    }

    const buyBias = !canSell || (canBuy && userMoney > userHoldingsQuantity * marketPrice);
    const trendBias = Math.max(-0.2, Math.min(0.2, soldTradesTrend * 4));
    const buyProbability = Math.max(0.05, Math.min(0.95, (buyBias ? 0.65 : 0.35) + trendBias));
    const isBuy = canBuy && (!canSell || Math.random() < buyProbability);

    if (isBuy) {
        const priceAnchor = bestSellPrice > 0 ? bestSellPrice : marketPrice;
        const price = Math.max(1, roundPrice(priceAnchor * randomBetween(0.985, 1.015)));
        const maxAffordableQuantity = Math.floor(userMoney / price);
        const quantity = Math.max(1, Math.min(maxAffordableQuantity, randomInt(1, Math.max(1, Math.min(10, maxAffordableQuantity)))));

        return { isBuy: true, price, quantity };
    }

    const priceAnchor = bestBuyPrice > 0 ? bestBuyPrice : marketPrice;
    const price = Math.max(1, roundPrice(priceAnchor * randomBetween(0.985, 1.015)));
    const maxSellQuantity = Math.max(1, Math.floor(userHoldingsQuantity));
    const quantity = Math.max(1, Math.min(maxSellQuantity, randomInt(1, Math.max(1, Math.min(10, maxSellQuantity)))));

    return { isBuy: false, price, quantity };
}

function randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
    return Math.floor(randomBetween(min, max + 1));
}

function roundPrice(price: number): number {
    return Math.round(price);
}
