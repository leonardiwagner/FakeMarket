import { getUsersByType, getResourcesByUserId } from './db'
import { getOrders, getPrices } from './repositories/orderRepository';
import { getUserHoldings, getUserMoney } from './repositories/holdingsRepository';
import * as DbTypes from './dbTypes';
import * as OrderService from './services/orderService';

function getRobotOrderDecision(userMoney: number, userHoldingsQuantity: number, latestOrdersToBuy: DbTypes.Order[], latestOrdersToSell: DbTypes.Order[], latestSoldPrices: { amount: number, price: number }[]): { isBuy: boolean, price: number } {
    let highestBuy = 0;
    let lowestSell = 0;
    let soldPriceTotal = 0;
    let soldAmountTotal = 0;

    for (const order of latestOrdersToBuy) {
        const price = Number(order.price);
        if (price > highestBuy) {
            highestBuy = price;
        }
    }

    for (const order of latestOrdersToSell) {
        const price = Number(order.price);
        if (lowestSell === 0 || price < lowestSell) {
            lowestSell = price;
        }
    }

    for (const soldPrice of latestSoldPrices) {
        const price = soldPrice.price;
        soldPriceTotal += price * soldPrice.amount;
        soldAmountTotal += soldPrice.amount;
    }

    const weightedSoldPrice = soldAmountTotal > 0 ? soldPriceTotal / soldAmountTotal : 0;
    const bestMarketPrice =
        weightedSoldPrice ||
        (highestBuy > 0 && lowestSell > 0 ? (highestBuy + lowestSell) / 2 : 0) ||
        highestBuy ||
        lowestSell ||
        1;

    const spread = highestBuy > 0 && lowestSell > 0 && lowestSell > highestBuy
        ? lowestSell - highestBuy
        : Math.max(bestMarketPrice * 0.02, 0.01);
    const priceStep = Math.max(Math.min(spread * 0.25, bestMarketPrice * 0.03), 0.01);

    const canBuy = userMoney >= Math.max(highestBuy, bestMarketPrice * 0.5, 0.01);
    const canSell = userHoldingsQuantity > 0;

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

    if (!canBuy && canSell) {
        buyScore = 0;
    } else if (canBuy && !canSell) {
        buyScore = 1;
    } else if (!canBuy && !canSell) {
        return { isBuy: true, price: Number(bestMarketPrice.toFixed(2)) };
    }

    buyScore += (Math.random() - 0.5) * 0.3;
    const isBuy = buyScore >= 0.5;

    const jitter = (Math.random() - 0.5) * priceStep;
    let targetPrice = bestMarketPrice;

    if (isBuy) {
        targetPrice = highestBuy > 0
            ? highestBuy + Math.max(priceStep * 0.15, 0.01) + jitter
            : bestMarketPrice - priceStep * 0.5 + jitter;
        targetPrice = Math.min(targetPrice, userMoney);
        if (lowestSell > 0) {
            targetPrice = Math.min(targetPrice, lowestSell - 0.01);
        }
    } else {
        targetPrice = lowestSell > 0
            ? lowestSell - Math.max(priceStep * 0.15, 0.01) + jitter
            : bestMarketPrice + priceStep * 0.5 + jitter;
        if (highestBuy > 0) {
            targetPrice = Math.max(targetPrice, highestBuy + 0.01);
        }
    }

    targetPrice = Math.max(Math.min(targetPrice, userMoney > 0 ? userMoney : targetPrice), 0.01);

    return {
        isBuy,
        price: Number(targetPrice.toFixed(2)),
    };
}

async function getUserHoldingsForResource(userId: string, resourceId: string): Promise<number> {
    const [holding]= await getUserHoldings(userId, resourceId);
    if(holding){
        return holding.quantity;
    }

    return 0;
}

export async function generateOrders() {
    // TODO get the robot users and generate orders for them
    const robotUsers = getUsersByType(DbTypes.UserType.ROBOT);

    for(const robotUser of await robotUsers) {
        const resources = await getResourcesByUserId(robotUser.id);
        for(const resource of resources) {
            const latestOrdersToBuy = await getOrders({ resourceId: resource.resourceId, orderType: DbTypes.OrderType.BUY, orderStatus: DbTypes.OrderStatus.OPEN });
            const latestOrdersToSell = await getOrders({ resourceId: resource.resourceId, orderType: DbTypes.OrderType.SELL, orderStatus: DbTypes.OrderStatus.OPEN });
            const latestSoldPrices = await getPrices(resource.resourceId, DbTypes.OrderType.BUY, DbTypes.OrderStatus.OPEN);
            const userHoldingsQuantity = await getUserHoldingsForResource(robotUser.id, resource.resourceId);
            const userMoney = await getUserMoney(robotUser.id);
            
            const decision = getRobotOrderDecision(
                userMoney,
                userHoldingsQuantity,
                latestOrdersToBuy,
                latestOrdersToSell,
                latestSoldPrices,
            );

            if(decision.isBuy){
                console.log("TODO buy order");
            } else {
                OrderService.createSellOrder(robotUser.id, resource.resourceId, Math.min(userHoldingsQuantity, 5), decision.price);
                console.log("TODO sell order");
            }


            
        }
    }

    // TODO get the latest market price of the resources

    // TODO get recent trades to determine the price trend

    // TODO check current open sell prices to determine if we should place buy orders or sell orders


}
