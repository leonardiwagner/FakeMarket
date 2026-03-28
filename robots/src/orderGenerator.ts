import {
    createBuyOrder,
    createSellOrder,
    getOrders,
    getPrices,
    getResourcesByUserId,
    getUserHoldings,
    getUserMoney,
    getUsersByType,
} from 'fakemarket-common';
import { getRobotOrderDecision } from './domain/orderDecision';
import * as Models from 'fakemarket-common';
import { log } from 'node:console';

async function getUserHoldingsForResource(userId: string, resourceId: string): Promise<number> {
    const [holding]= await getUserHoldings(userId, resourceId);
    if(holding){
        return holding.quantity;
    }

    return 0;
}

async function generateOrdersFromUserHoldings(robotUser: Models.User, holdings: Models.Holding[]) {
    for(const holding of holdings) {
            const latestOrdersToBuy = await getOrders({ resourceId: holding.resourceId, orderType: Models.OrderType.BUY, orderStatus: Models.OrderStatus.OPEN });
            const latestOrdersToSell = await getOrders({ resourceId: holding.resourceId, orderType: Models.OrderType.SELL, orderStatus: Models.OrderStatus.OPEN });
            const latestSoldPrices = await getPrices(holding.resourceId, Models.OrderType.BUY, Models.OrderStatus.OPEN);
            const userHoldingsQuantity = await getUserHoldingsForResource(robotUser.id, holding.resourceId);
            const userMoney = await getUserMoney(robotUser.id);
            
            const decision = getRobotOrderDecision(
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
                    await createBuyOrder(robotUser.id, holding.resourceId, decision.quantity, decision.price);
                } catch (error: any) {
                    log(`Failed to create buy order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
                    if (!(error instanceof Models.InsufficientMoneyError)) {
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
                    await createSellOrder(robotUser.id, holding.resourceId, decision.quantity, decision.price);
                } catch (error: any) {
                    log(`Failed to create sell order for user ${robotUser.id} on resource ${holding.resourceId}: ${error.message}`);
                    if (!(error instanceof Models.InsufficientResourcesError)) {
                        throw error;
                    }

                    continue;
                }
            }
        }
}

async function generatedOrdersFromRobots(users: Models.User[]) {
    for(const robotUser of users) {
        const holdings = await getResourcesByUserId(robotUser.id);
        await generateOrdersFromUserHoldings(robotUser, holdings);
    }
}

async function generateOrdersFromInterval(robotUsers: Models.User[], ms: number) {
    console.log(`Generating orders for ${robotUsers.length} robot users...`);
    await generatedOrdersFromRobots(robotUsers)

    setInterval(async () => {
        generateOrdersFromInterval(robotUsers, ms);
    }, 5000);
}

export async function generateOrders() {
    // TODO get the robot users and generate orders for them
    const robotUsers = await getUsersByType(Models.UserType.ROBOT);
    
    await generateOrdersFromInterval(robotUsers, 5000);
}
