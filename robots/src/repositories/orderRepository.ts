import { desc, eq, sql, asc, and } from 'drizzle-orm';
import { orders } from '../../drizzle/schema';
import { db, type DbTransaction } from '../db';
import * as DbTypes from '../dbTypes';

export async function insertOrder(
    tx: DbTransaction,
    userId: string,
    resourceId: string,
    type: DbTypes.OrderType,
    price: number,
    quantity: number,
): Promise<DbTypes.Order> {
    const [order] = await tx
        .insert(orders)
        .values({
            userId,
            resourceId,
            type,
            price,
            quantity,
            status: DbTypes.OrderStatus.OPEN,
        })
        .returning();

    return order;
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
        orderType?: DbTypes.OrderType;
        orderStatus?: DbTypes.OrderStatus;
        quantity?: number;
        sortDirection?: 'asc' | 'desc';
    } = {},
): Promise<DbTypes.Order[]> {
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

export async function getPrices(
    resourceId: string,
    orderType: DbTypes.OrderType,
    orderStatus: DbTypes.OrderStatus,
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
            eq(orders.status, orderStatus)
            ),
        )
        .groupBy(orders.price)
        .orderBy(sortDirection === 'desc' ? desc(orders.price) : asc(orders.price))
        .limit(quantity);
}
