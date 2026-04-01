import { pgTable, index, unique, uuid, text, timestamp, foreignKey, integer, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	type: text().default('user').notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("users_email_uq").on(table.email),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	type: text().notNull(),
	status: text().default('pending').notNull(),
	quantity: integer().notNull(),
	quantityProcessed: integer("quantity_processed").default(0).notNull(),
	price: integer().notNull(),
	hasPriceLimit: boolean("has_price_limit").default(true).notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processed: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "orders_resource_id_fkey"
		}).onDelete("restrict"),
]);

export const resources = pgTable("resources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("resources_name_uq").on(table.name),
]);

export const trades = pgTable("trades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	buyOrderId: uuid("buy_order_id").notNull(),
	sellOrderId: uuid("sell_order_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	quantity: integer().notNull(),
	price: integer().notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("trades_resource_id_executed_at_idx").using("btree", table.resourceId.asc().nullsLast().op("timestamptz_ops"), table.created.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.buyOrderId],
			foreignColumns: [orders.id],
			name: "trades_buy_order_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.sellOrderId],
			foreignColumns: [orders.id],
			name: "trades_sell_order_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "trades_resource_id_fkey"
		}).onDelete("restrict"),
]);

export const holdings = pgTable("holdings", {
	userId: uuid("user_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	quantity: integer().default(0).notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "holdings_user_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "holdings_resource_id_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.userId, table.resourceId], name: "holdings_pk"}),
]);
