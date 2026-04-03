
import * as Constants from 'fakemarket-common/models/constants';
import * as Models from 'fakemarket-common/models/models';
import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as OrderService from 'fakemarket-common/services/orderService';

export async function cancelOldOrdersFromUser(userId: string, secondsAgo: number): Promise<Models.Order[]> {
    const cutoffTimestamp = Date.now() - (secondsAgo * 1000);
    
    const openOrders = await OrderRepository.get({
        userId,
        orderStatus: Constants.OrderStatus.OPEN,
        quantity: 1000,
    });

    const oldOpenOrders = openOrders.filter((order) => (
        new Date(order.created).getTime() < cutoffTimestamp
    ));

   return await Promise.all(
        oldOpenOrders.map((order) => OrderService.cancelOrder(order.id)),
    );
}
