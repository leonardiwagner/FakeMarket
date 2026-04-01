import * as OrderDecision from './domain/orderDecision';
import * as Constants from 'fakemarket-common/models/constants';
import * as Errors from 'fakemarket-common/models/errors';
import type * as Models from 'fakemarket-common/models/models';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as UserRepository from 'fakemarket-common/repositories/userRepository';
import { log } from 'node:console';

async function getUserHoldingsForResource(userId: string, resourceId: string): Promise<number> {
    const [holding]= await HoldingsRepository.HoldingsRepository.getUserHoldings(userId, resourceId);
    if(holding){
        return holding.quantity;
    }

    return 0;
}

async function generateOrdersFromUserHoldings(robotUser: Models.User, holdings: Models.Holding[]) {
    for(const holding of holdings) {
            const latestOrdersToBuy = await OrderRepository.OrderRepository.get({ resourceId: holding.resourceId, orderType: Constants.OrderType.BUY, orderStatus: Constants.OrderStatus.OPEN });
            const latestOrdersToSell = await OrderRepository.OrderRepository.get({ resourceId: holding.resourceId, orderType: Constants.OrderType.SELL, orderStatus: Constants.OrderStatus.OPEN });
            const latestSoldPrices = await OrderRepository.OrderRepository.getLatest(holding.resourceId, Constants.OrderType.BUY, Constants.OrderStatus.OPEN);
            const userHoldingsQuantity = await getUserHoldingsForResource(robotUser.id, holding.resourceId);
            const userMoney = await HoldingsRepository.HoldingsRepository.getUserMoney(robotUser.id);
            
            const decision = OrderDecision.getRobotOrderDecision(
                userMoney,
                userHoldingsQuantity,
                latestOrdersToBuy,
                latestOrdersToSell,
                latestSoldPrices,
            );

            if(decision.isBuy){
                if (decision.quantity <= 0) {
                    log(`Skipping buy order for user ${robotUser.id} on resource ${holding.resourceId} due to non-positive quantity.`);
                    continue;
                }

                try {
                    await OrderRepository.OrderRepository.createBuyOrder(robotUser.id, holding.resourceId, decision.quantity, decision.price);
                } catch (error: any) {
                    log(`Failed to create buy order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
                    if (!(error instanceof Errors.InsufficientMoneyError)) {
                        throw error;
                    }

                    continue;
                }
            } else {
                if (decision.quantity <= 0) {
                    log(`Skipping sell order for user ${robotUser.id} on resource ${holding.resourceId} due to non-positive quantity.`);
                    continue;
                }

                try {
                    await OrderRepository.OrderRepository.createSellOrder(robotUser.id, holding.resourceId, decision.quantity, decision.price);
                } catch (error: any) {
                    log(`Failed to create sell order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
                    if (!(error instanceof Errors.InsufficientResourcesError)) {
                        throw error;
                    }

                    continue;
                }
            }
        }
}

async function generatedOrdersFromRobots(users: Models.User[]) {
    for(const robotUser of users) {
        // only oil for now
        const holdings = (await HoldingsRepository.HoldingsRepository.getUserHoldings(robotUser.id))
            .filter(holding => holding.resourceId === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        await generateOrdersFromUserHoldings(robotUser, holdings);
    }
}

async function generateOrdersFromInterval(robotUsers: Models.User[], ms: number) {
    console.log(`Generating orders for ${robotUsers.length} robot users...`);
    await generatedOrdersFromRobots(robotUsers)

    setTimeout(() => {
        generateOrdersFromInterval(robotUsers, ms);
    }, 5000);
}

export async function generateOrders() {
    // TODO get the robot users and generate orders for them
    const robotUsers = await UserRepository.UserRepository.getUsersByType(Constants.UserType.ROBOT);
    
    await generateOrdersFromInterval(robotUsers, 5000);
}
