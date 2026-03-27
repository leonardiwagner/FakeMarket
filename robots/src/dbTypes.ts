import { users, orders, resources, holdings } from '../drizzle/schema';

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Holding = typeof holdings.$inferSelect;

export enum UserType {
    ADMIN = 'admin',
    USER = 'user',
    ROBOT = 'robot'
}

export enum OrderType {
    SELL = 'sell',
    BUY = 'buy',
}

export enum OrderStatus {
    OPEN = 'open',
    EXECUTED = 'executed',
}

export const RESOURCE_ID_USD = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0';
