import { drizzle } from 'drizzle-orm/node-postgres';
import { users, orders, resources, holdings } from '../drizzle/schema';
import { and, eq, sql, asc } from 'drizzle-orm';
import * as Models from './models/Models';

export const db = drizzle('postgres://admin:pass123@localhost:5432/fakemarket', {
    logger: false,
});
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];



export async function getOrdersByResourceIdTypeAndStatus(
    resourceId: string,
    type: Models.OrderType,
    status: Models.OrderStatus
) : Promise<Models.Order[]> {
    return await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.resourceId, resourceId),
            eq(orders.type, type),
            eq(orders.status, status)
        ));
}

// TODO exclude USD resource from this query
export async function getResourcesByUserId(userId: string) : Promise<Models.Holding[]> {
    return await db
        .select()
        .from(holdings)
        .where(eq(holdings.userId, userId));
}

export async function getUsersByType(userType: Models.UserType) : Promise<Models.User[]> {
    return await db.select().from(users).where(eq(users.type, userType));
}

export async function getUsers() : Promise<Models.User[]> {
    return await db.select().from(users);
}


export async function addOrder(order: Models.Order) : Promise<Models.Order> {
    const [addedOrder] = await db.insert(orders).values(order).returning();
    return addedOrder;
}
