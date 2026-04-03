import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '../db/client';
import { orders } from '../db/schema';
import * as Constants from '../models/constants';
import * as Errors from '../models/errors';
import type * as Models from '../models/models';
import * as HoldingsRepository from './holdingsRepository';

export async function add(
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

export async function update(
    tx: DbTransaction,
    orderId: string,
    changes: Partial<Omit<Models.Order, 'id' | 'userId' | 'resourceId' | 'type' | 'created'>>,
): Promise<Models.Order | undefined> {
    const [order] = await tx
        .update(orders)
        .set(changes)
        .where(eq(orders.id, orderId))
        .returning();

    return order;
}

export async function get(
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

export async function createSellOrder(
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

export async function createBuyOrder(
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


export async function getTheNextBuyOrderToProcess(
    dbTransaction: DbTransaction
): Promise<Models.Order | undefined> {
    const [nextOrder] = await dbTransaction
        .select()
        .from(orders)
        .where(
            and(
                or(
                    eq(orders.status, Constants.OrderStatus.OPEN),
                    eq(orders.status, Constants.OrderStatus.PARTIAL)
                ),
                eq(orders.type, Constants.OrderType.BUY),
            ),
        )
        // oldest order without processing, or oldest processed order, to ensure fairness in order processing
        .orderBy(
            sql`${orders.processed} asc nulls first`,
            asc(orders.created),
        )
        .limit(1)
        .for('update', { skipLocked: true })

    return nextOrder;
}

export async function getTheNextSellOrderToProcess(
    dbTransaction: DbTransaction,
    resourceId: string,
    maxPrice: number,
    requiredQuantity: number,
): Promise<Models.Order | undefined> {
    const [nextOrder] = await dbTransaction
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.type, Constants.OrderType.SELL),
                eq(orders.resourceId, resourceId),
                or(
                    eq(orders.status, Constants.OrderStatus.OPEN),
                    eq(orders.status, Constants.OrderStatus.PARTIAL),
                ),
                lte(orders.price, maxPrice),
                gte(orders.quantity, requiredQuantity),
            ),
        )
        .orderBy(
            asc(orders.price),
            desc(orders.quantity),
            desc(orders.created),
        )
        .limit(1)
        .for('update', { skipLocked: true });

    return nextOrder;
}

export async function getBestLockedMatchingSellOrder(
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

export async function getBestLockedMatchingBuyOrder(
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
