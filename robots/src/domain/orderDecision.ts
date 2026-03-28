import * as Models from 'fakemarket-common';


type MarketSnapshot = {
    highestBuy: number;
    lowestSell: number;
    bestMarketPrice: number;
    spread: number;
    priceStep: number;
};

function getHighestBuy(latestOrdersToBuy: Models.Order[]): number {
    let highestBuy = 0;

    for (const order of latestOrdersToBuy) {
        const price = Number(order.price);
        if (price > highestBuy) {
            highestBuy = price;
        }
    }

    return highestBuy;
}

function getLowestSell(latestOrdersToSell: Models.Order[]): number {
    let lowestSell = 0;

    for (const order of latestOrdersToSell) {
        const price = Number(order.price);
        if (lowestSell === 0 || price < lowestSell) {
            lowestSell = price;
        }
    }

    return lowestSell;
}

function getWeightedSoldPrice(latestSoldPrices: { amount: number, price: number }[]): number {
    let soldPriceTotal = 0;
    let soldAmountTotal = 0;

    for (const soldPrice of latestSoldPrices) {
        soldPriceTotal += soldPrice.price * soldPrice.amount;
        soldAmountTotal += soldPrice.amount;
    }

    return soldAmountTotal > 0 ? soldPriceTotal / soldAmountTotal : 0;
}

function getMarketSnapshot(
    latestOrdersToBuy: Models.Order[],
    latestOrdersToSell: Models.Order[],
    latestSoldPrices: { amount: number, price: number }[],
): MarketSnapshot {
    const highestBuy = getHighestBuy(latestOrdersToBuy);
    const lowestSell = getLowestSell(latestOrdersToSell);
    const weightedSoldPrice = getWeightedSoldPrice(latestSoldPrices);

    // Prefer recent executed prices, then fall back to the live book, then a safe floor.
    const bestMarketPrice =
        weightedSoldPrice ||
        (highestBuy > 0 && lowestSell > 0 ? (highestBuy + lowestSell) / 2 : 0) ||
        highestBuy ||
        lowestSell ||
        1;

    // When the book is incomplete, synthesize a minimum spread so the robot still places useful orders.
    const spread = highestBuy > 0 && lowestSell > 0 && lowestSell > highestBuy
        ? lowestSell - highestBuy
        : Math.max(bestMarketPrice * 0.02, 0.01);
    const priceStep = Math.max(Math.min(spread * 0.25, bestMarketPrice * 0.03), 0.01);

    return { highestBuy, lowestSell, bestMarketPrice, spread, priceStep };
}

function getBuyScore(
    userMoney: number,
    userHoldingsQuantity: number,
    market: MarketSnapshot,
): { buyScore: number, canBuy: boolean, canSell: boolean } {
    const { highestBuy, lowestSell, bestMarketPrice } = market;
    const canBuy = userMoney >= Math.max(highestBuy, bestMarketPrice * 0.5, 0.01);
    const canSell = userHoldingsQuantity > 0;

    // The score starts neutral, then we nudge it based on inventory, cash and market shape.
    let buyScore = 0.5;

    if (!canSell) {
        buyScore += 0.35;
    }
    if (userHoldingsQuantity >= 5) {
        buyScore -= 0.25;
    } else if (userHoldingsQuantity === 0) {
        buyScore += 0.15;
    }
    if (userMoney < bestMarketPrice) {
        buyScore -= 0.35;
    } else if (userMoney > bestMarketPrice * 10) {
        buyScore += 0.1;
    }
    if (highestBuy > 0 && lowestSell > 0 && highestBuy / lowestSell > 0.98) {
        buyScore += 0.05;
    }

    return { buyScore, canBuy, canSell };
}

function getTargetPrice(
    isBuy: boolean,
    userMoney: number,
    market: MarketSnapshot,
): number {
    const { highestBuy, lowestSell, bestMarketPrice, priceStep } = market;
    const jitter = (Math.random() - 0.5) * priceStep;
    let targetPrice = bestMarketPrice;

    if (isBuy) {
        // Buy just above the best bid when possible, but avoid crossing the best ask.
        targetPrice = highestBuy > 0
            ? highestBuy + Math.max(priceStep * 0.15, 0.01) + jitter
            : bestMarketPrice - priceStep * 0.5 + jitter;
        targetPrice = Math.min(targetPrice, userMoney);
        if (lowestSell > 0) {
            targetPrice = Math.min(targetPrice, lowestSell - 0.01);
        }
    } else {
        // Sell just below the best ask when possible, but stay above the best bid.
        targetPrice = lowestSell > 0
            ? lowestSell - Math.max(priceStep * 0.15, 0.01) + jitter
            : bestMarketPrice + priceStep * 0.5 + jitter;
        if (highestBuy > 0) {
            targetPrice = Math.max(targetPrice, highestBuy + 0.01);
        }
    }

    return Math.max(Math.min(targetPrice, userMoney > 0 ? userMoney : targetPrice), 0.01);
}

function getOrderQuantity(
    isBuy: boolean,
    userMoney: number,
    userHoldingsQuantity: number,
    roundedPrice: number,
    market: MarketSnapshot,
): number {
    const { highestBuy, lowestSell, bestMarketPrice, spread } = market;
    const hasTightSpread = highestBuy > 0 && lowestSell > 0 && lowestSell - highestBuy <= bestMarketPrice * 0.03;
    const spreadRatio = bestMarketPrice > 0 ? spread / bestMarketPrice : 0;

    // Tight spreads and wide relative spreads both justify being a little more aggressive with size.
    const aggressionMultiplier = Math.min(2.5, 1 + spreadRatio * 8 + (hasTightSpread ? 0.2 : 0));

    if (isBuy) {
        const affordableQuantity = roundedPrice > 0 ? Math.floor(userMoney / roundedPrice) : 0;
        const baseBuyQuantity = userHoldingsQuantity === 0 ? 2 : userHoldingsQuantity < 3 ? 1.5 : 1;
        return Math.floor(Math.min(affordableQuantity, Math.max(1, baseBuyQuantity * aggressionMultiplier)));
    }

    const baseSellQuantity = userHoldingsQuantity >= 5 ? 2 : 1;
return Math.floor(Math.min(userHoldingsQuantity, Math.max(1, baseSellQuantity * aggressionMultiplier)));
}

export function getRobotOrderDecision(
    userMoney: number,
    userHoldingsQuantity: number,
    latestOrdersToBuy: Models.Order[],
    latestOrdersToSell: Models.Order[],
    latestSoldPrices: { amount: number, price: number }[],
): { isBuy: boolean, price: number, quantity: number } {
    const market = getMarketSnapshot(latestOrdersToBuy, latestOrdersToSell, latestSoldPrices);
    const { bestMarketPrice } = market;
    let { buyScore, canBuy, canSell } = getBuyScore(userMoney, userHoldingsQuantity, market);

    // Hard constraints always beat the heuristic score.
    if (!canBuy && canSell) {
        buyScore = 0;
    } else if (canBuy && !canSell) {
        buyScore = 1;
    } else if (!canBuy && !canSell) {
        return { isBuy: true, price: Math.max(1, Math.round(bestMarketPrice)), quantity: 0 };
    }

    // Small randomness keeps multiple robots from behaving identically in the same market.
    buyScore += (Math.random() - 0.5) * 0.3;
    const isBuy = buyScore >= 0.5;
    const targetPrice = getTargetPrice(isBuy, userMoney, market);
    const roundedPrice = Math.max(1, Math.round(targetPrice));
    const quantity = getOrderQuantity(isBuy, userMoney, userHoldingsQuantity, roundedPrice, market);

    if(isBuy){
        console.log(`Decided to BUY at price ${roundedPrice} with quantity ${quantity} (score: ${buyScore.toFixed(2)}, money: ${userMoney}, holdings: ${userHoldingsQuantity})`);
    }

    return {
        isBuy,
        price: roundedPrice,
        quantity: Math.max(0, quantity),
    };
}
