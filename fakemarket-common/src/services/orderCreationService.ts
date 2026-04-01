import { OrderRepository } from '../repositories/orderRepository';

export const OrderCreationService = {
    createSellOrder: OrderRepository.createSellOrder,
    createBuyOrder: OrderRepository.createBuyOrder,
};
