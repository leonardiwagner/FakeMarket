import * as Models from 'fakemarket-common';

export function getRobotOrderDecision(
    userMoney: number,
    userHoldingsQuantity: number,
    latestOrdersToBuy: Models.Order[],
    latestOrdersToSell: Models.Order[],
    latestSoldPrices: { amount: number, price: number }[],
): { isBuy: boolean, price: number, quantity: number } {
    const bestBuyPrice = latestOrdersToBuy.reduce((highest, order) => Math.max(highest, order.price), 0);
    const bestSellPrice = latestOrdersToSell.reduce((lowest, order) => {
        if (lowest === 0) {
            return order.price;
        }

        return Math.min(lowest, order.price);
    }, 0);
    const lastSoldPrice = latestSoldPrices.length > 0
        ? latestSoldPrices[latestSoldPrices.length - 1].price
        : 0;

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
    const isBuy = canBuy && (!canSell || Math.random() < (buyBias ? 0.65 : 0.35));

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
