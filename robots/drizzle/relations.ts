import { relations } from "drizzle-orm/relations";
import { users, orders, resources, trades, holdings } from "fakemarket-common/db/schema";

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	resource: one(resources, {
		fields: [orders.resourceId],
		references: [resources.id]
	}),
	trades_buyOrderId: many(trades, {
		relationName: "trades_buyOrderId_orders_id"
	}),
	trades_sellOrderId: many(trades, {
		relationName: "trades_sellOrderId_orders_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
	holdings: many(holdings),
}));

export const resourcesRelations = relations(resources, ({many}) => ({
	orders: many(orders),
	trades: many(trades),
	holdings: many(holdings),
}));

export const tradesRelations = relations(trades, ({one}) => ({
	order_buyOrderId: one(orders, {
		fields: [trades.buyOrderId],
		references: [orders.id],
		relationName: "trades_buyOrderId_orders_id"
	}),
	order_sellOrderId: one(orders, {
		fields: [trades.sellOrderId],
		references: [orders.id],
		relationName: "trades_sellOrderId_orders_id"
	}),
	resource: one(resources, {
		fields: [trades.resourceId],
		references: [resources.id]
	}),
}));

export const holdingsRelations = relations(holdings, ({one}) => ({
	user: one(users, {
		fields: [holdings.userId],
		references: [users.id]
	}),
	resource: one(resources, {
		fields: [holdings.resourceId],
		references: [resources.id]
	}),
}));
