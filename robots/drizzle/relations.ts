import { relations } from "drizzle-orm/relations";
import { users, orders, resources, trades } from "./schema";

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	resource: one(resources, {
		fields: [orders.resourceId],
		references: [resources.id]
	}),
	trades_orderIdSeller: many(trades, {
		relationName: "trades_orderIdSeller_orders_id"
	}),
	trades_orderIdBuyer: many(trades, {
		relationName: "trades_orderIdBuyer_orders_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
}));

export const resourcesRelations = relations(resources, ({many}) => ({
	orders: many(orders),
}));

export const tradesRelations = relations(trades, ({one}) => ({
	order_orderIdSeller: one(orders, {
		fields: [trades.orderIdSeller],
		references: [orders.id],
		relationName: "trades_orderIdSeller_orders_id"
	}),
	order_orderIdBuyer: one(orders, {
		fields: [trades.orderIdBuyer],
		references: [orders.id],
		relationName: "trades_orderIdBuyer_orders_id"
	}),
}));