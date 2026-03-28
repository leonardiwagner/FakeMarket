import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { orders } from '../db/schema';
import * as Models from '../models';

export async function insertOrder(
    tx: DbTransaction,
    userId: string,
    resourceId: string,
    type: Models.OrderType,
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
            status: Models.OrderStatus.OPEN,
        })
        .returning();

    return order;
}

export async function addOrder(order: Models.Order): Promise<Models.Order> {
    const [addedOrder] = await db.insert(orders).values(order).returning();
    return addedOrder;
}

export async function getOrders(
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
        orderType?: Models.OrderType;
        orderStatus?: Models.OrderStatus;
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

export async function getOrdersByResourceIdTypeAndStatus(
    resourceId: string,
    type: Models.OrderType,
    status: Models.OrderStatus,
): Promise<Models.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, resourceId),
                eq(orders.type, type),
                eq(orders.status, status),
            ),
        );
}

export async function getPrices(
    resourceId: string,
    orderType: Models.OrderType,
    orderStatus: Models.OrderStatus,
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

export async function getOpenOrderResourceIds(): Promise<string[]> {
    const openOrders = await db
        .selectDistinct({
            resourceId: orders.resourceId,
        })
        .from(orders)
        .where(eq(orders.status, Models.OrderStatus.OPEN));

    return openOrders.map((order) => order.resourceId);
}

export async function getOpenBuyOrdersForResource(resourceId: string): Promise<Models.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, resourceId),
                eq(orders.type, Models.OrderType.BUY),
                eq(orders.status, Models.OrderStatus.OPEN),
            ),
        )
        .orderBy(desc(orders.price), asc(orders.created));
}

export async function getOpenSellOrdersForResource(resourceId: string): Promise<Models.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.resourceId, resourceId),
                eq(orders.type, Models.OrderType.SELL),
                eq(orders.status, Models.OrderStatus.OPEN),
            ),
        )
        .orderBy(asc(orders.price), asc(orders.created));
}

export async function applyOrderExecution(
    tx: DbTransaction,
    order: Models.Order,
    processedQuantity: number,
): Promise<Models.Order> {
    const nextQuantity = Math.max(0, order.quantity - processedQuantity);
    const nextProcessedQuantity = order.quantityProcessed + processedQuantity;
    const [updatedOrder] = await tx
        .update(orders)
        .set({
            quantity: nextQuantity,
            quantityProcessed: nextProcessedQuantity,
            status: nextQuantity === 0 ? Models.OrderStatus.EXECUTED : Models.OrderStatus.OPEN,
            updated: sql`now()`,
        })
        .where(eq(orders.id, order.id))
        .returning();

    return updatedOrder;
}
