import { holdings, orders, resources, users } from '../db/schema';

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Trade = typeof import('../db/schema').trades.$inferSelect;

