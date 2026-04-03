import * as OrderDecision from './orderDecision';
import * as Constants from 'fakemarket-common/models/constants';
import * as Errors from 'fakemarket-common/models/errors';
import type * as Models from 'fakemarket-common/models/models';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as OrderService from 'fakemarket-common/services/orderService';
import { log } from 'node:console';

async function getUserHoldingsForResource(userId: string, resourceId: string): Promise<number> {
    const [holding]= await HoldingsRepository.getUserHoldings(userId, resourceId);
    if(holding){
        return holding.quantity;
    }

    return 0;
}

async function generateOrdersFromUserHoldings(robotUser: Models.User, holding: Models.Holding) : Promise<Models.Order> {
    const latestOrdersToBuy = await OrderRepository.get({ resourceId: holding.resourceId, orderType: Constants.OrderType.BUY, orderStatus: Constants.OrderStatus.OPEN });
    const latestOrdersToSell = await OrderRepository.get({ resourceId: holding.resourceId, orderType: Constants.OrderType.SELL, orderStatus: Constants.OrderStatus.OPEN });
    const latestSoldPrices = await OrderRepository.getLatest(holding.resourceId, Constants.OrderType.BUY, Constants.OrderStatus.OPEN);
    const userHoldingsQuantity = await getUserHoldingsForResource(robotUser.id, holding.resourceId);
    const userMoney = await HoldingsRepository.getUserMoney(robotUser.id);
    
    const decision = OrderDecision.getRobotOrderDecision(
        userMoney,
        userHoldingsQuantity,
        latestOrdersToBuy,
        latestOrdersToSell,
        latestSoldPrices,
    );

    if(decision.isBuy){
        if (decision.quantity <= 0) {
            log(`The decision for buy has 0 quantity.`);
            return Promise.resolve(null as any);
        }

        try {
            return await OrderService.createBuyOrderAndReserveMoney(robotUser.id, holding.resourceId, decision.quantity, decision.price);
        } catch (error: any) {
            log(`Failed to create buy order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
            throw error;
        }
    } else {
        if (decision.quantity <= 0) {
            log(`The decision for sell has 0 quantity.`);
            return Promise.resolve(null as any);
        }

        try {
           return await OrderService.createSellOrderAndReserveHolding(robotUser.id, holding.resourceId, decision.quantity, decision.price);
        } catch (error: any) {
            log(`Failed to create sell order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
            throw error;
        }
    }
}

export async function generatedOrdersForUser(user: Models.User) : Promise<Models.Order[]> {
    
    const holdings = (await HoldingsRepository.getUserHoldings(user.id))
        .filter(holding => holding.resourceId !== Constants.RESOURCE_ID_USD);

    return await Promise.all(holdings.map(holding => generateOrdersFromUserHoldings(user, holding)));
}


