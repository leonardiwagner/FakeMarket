import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { orders } from '../db/schema';
import * as Constants from '../models/constants';
import * as Errors from '../models/errors';
import type * as Models from '../models/models';
import { HoldingsRepository } from './holdingsRepository';

async function add(
    tx: DbTransaction,
    userId: string,
    resourceId: string,
    type: Constants.OrderType,
    price: number,
    quantity: number,
): Promise<Models.Order> {
    const [order] = await tx
        .insert(orders)
        .values({
            userId,
            resourceId,
            type,
            price,
            quantity,
            status: Constants.OrderStatus.OPEN,
        })
        .returning();

    return order;
}

async function get(
    {
        resourceId,
        userId,
        orderType,
        orderStatus,
        quantity = 5,
        sortDirection = 'desc',
    }: {
        resourceId?: string;
        userId?: string;
        orderType?: Constants.OrderType;
        orderStatus?: Constants.OrderStatus;
        quantity?: number;
        sortDirection?: 'asc' | 'desc';
    } = {},
): Promise<Models.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(
            and(
                resourceId ? eq(orders.resourceId, resourceId) : undefined,
                userId ? eq(orders.userId, userId) : undefined,
                orderType ? eq(orders.type, orderType) : undefined,
                orderStatus ? eq(orders.status, orderStatus) : undefined,
            ),
        )
        .orderBy(sortDirection === 'asc' ? asc(orders.created) : desc(orders.created))
        .limit(quantity);
}

async function getLatest(
    resourceId: string,
    orderType: Constants.OrderType,
    orderStatus: Constants.OrderStatus,
    quantity: number = 5,
    sortDirection: 'asc' | 'desc' = 'asc',
): Promise<{ amount: number, price: number }[]> {
    return await db
        .select({
            amount: sql<number>`sum(orders.quantity)`,
            price: orders.price,
        })
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, resourceId),
                eq(orders.type, orderType),
                eq(orders.status, orderStatus),
            ),
        )
        .groupBy(orders.price)
        .orderBy(sortDirection === 'desc' ? desc(orders.price) : asc(orders.price))
        .limit(quantity);
}

async function createSellOrder(
    userId: string,
    resourceId: string,
    quantityToSell: number,
    price: number,
): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        const [holding] = await HoldingsRepository.getUserHoldings(userId, resourceId);

        if (!holding || holding.quantity < quantityToSell) {
            throw new Errors.InsufficientResourcesError();
        }

        return await add(
            dbTransaction,
            userId,
            resourceId,
            Constants.OrderType.SELL,
            price,
            quantityToSell,
        );
    });
}

async function createBuyOrder(
    userId: string,
    resourceId: string,
    quantity: number,
    price: number,
): Promise<Models.Order> {
    return await db.transaction(async (dbTransaction: DbTransaction) => {
        const money = await HoldingsRepository.getUserMoney(userId);
        const totalPrice = price * quantity;

        if (money < totalPrice) {
            throw new Errors.InsufficientMoneyError();
        }

        return await add(
            dbTransaction,
            userId,
            resourceId,
            Constants.OrderType.BUY,
            price,
            quantity,
        );
    });
}

async function applyOrderExecution(
    tx: DbTransaction,
    order: Models.Order,
    processedQuantity: number,
): Promise<Models.Order> {
    const nextProcessedQuantity = order.quantityProcessed + processedQuantity;
    const nextStatus = nextProcessedQuantity >= order.quantity
        ? Constants.OrderStatus.EXECUTED
        : Constants.OrderStatus.OPEN;

    const [updatedOrder] = await tx
        .update(orders)
        .set({
            quantityProcessed: nextProcessedQuantity,
            status: nextStatus,
            processed: sql`now()`,
        })
        .where(eq(orders.id, order.id))
        .returning();

    return updatedOrder;
}

async function getNextOpenOrderForProcessing(tx: DbTransaction): Promise<Models.Order | undefined> {
    const [nextOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.status, Constants.OrderStatus.OPEN))
        .orderBy(asc(orders.created))
        .limit(1);

    return nextOrder;
}

async function getBestLockedMatchingSellOrder(
    tx: DbTransaction,
    buyOrder: Models.Order,
): Promise<Models.Order | undefined> {
    const [matchingOrder] = await tx
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, buyOrder.resourceId),
                eq(orders.type, Constants.OrderType.SELL),
                eq(orders.status, Constants.OrderStatus.OPEN),
                lte(orders.price, buyOrder.price),
            ),
        )
        .orderBy(asc(orders.price), asc(orders.created))
        .limit(1);

    return matchingOrder;
}

async function getBestLockedMatchingBuyOrder(
    tx: DbTransaction,
    sellOrder: Models.Order,
): Promise<Models.Order | undefined> {
    const [matchingOrder] = await tx
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, sellOrder.resourceId),
                eq(orders.type, Constants.OrderType.BUY),
                eq(orders.status, Constants.OrderStatus.OPEN),
                gte(orders.price, sellOrder.price),
            ),
        )
        .orderBy(desc(orders.price), asc(orders.created))
        .limit(1);

    return matchingOrder;
}

export const OrderRepository = {
    add,
    get,
    getLatest,
    getOrders: get,
    getPrices: getLatest,
    getResourcesByUserId: HoldingsRepository.getUserHoldings,
    createSellOrder,
    createBuyOrder,
    applyOrderExecution,
    getNextOpenOrderForProcessing,
    getBestLockedMatchingSellOrder,
    getBestLockedMatchingBuyOrder,
};
