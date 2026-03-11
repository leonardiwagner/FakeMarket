import { drizzle } from 'drizzle-orm/node-postgres';
import { users, orders } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const db = drizzle('postgres://admin:pass123@localhost:5432/fakemarket');

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;

export enum UserType {
    ADMIN = 'admin',
    USER = 'user',
    ROBOT = 'robot'
}


export async function getUsersByType(userType: UserType) : Promise<User[]> {
    return await db.select().from(users).where(eq(users.type, userType));
}

export async function getUsers() : Promise<User[]> {
    return await db.select().from(users);
}


export async function addOrder(order: Order) : Promise<Order> {
    const [addedOrder] = await db.insert(orders).values(order).returning();
    return addedOrder;
}
