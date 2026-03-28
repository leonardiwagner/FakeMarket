import { holdings, orders, resources, users } from './db/schema';
export { OrderStatus, OrderType, RESOURCE_ID_USD, UserType } from './constants';

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
