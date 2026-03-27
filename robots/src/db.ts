import { drizzle } from 'drizzle-orm/node-postgres';
import { users, orders, resources, holdings } from '../drizzle/schema';
import { and, eq, ne, sql, asc } from 'drizzle-orm';
import * as DbTypes from './dbTypes';

export const db = drizzle('postgres://admin:pass123@localhost:5432/fakemarket');
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];



export async function getOrdersByResourceIdTypeAndStatus(
    resourceId: string,
    type: DbTypes.OrderType,
    status: DbTypes.OrderStatus
) : Promise<DbTypes.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.resourceId, resourceId),
            eq(orders.type, type),
            eq(orders.status, status)
        ));
}

export async function getResourcesByUserId(userId: string) : Promise<DbTypes.Holding[]> {
    return await db
        .select()
        .from(holdings)
        .where(and(
            eq(holdings.userId, userId),
            ne(holdings.resourceId, DbTypes.RESOURCE_ID_USD)
        ));
}

export async function getUsersByType(userType: DbTypes.UserType) : Promise<DbTypes.User[]> {
    return await db.select().from(users).where(eq(users.type, userType));
}

export async function getUsers() : Promise<DbTypes.User[]> {
    return await db.select().from(users);
}


export async function addOrder(order: DbTypes.Order) : Promise<DbTypes.Order> {
    const [addedOrder] = await db.insert(orders).values(order).returning();
    return addedOrder;
}
