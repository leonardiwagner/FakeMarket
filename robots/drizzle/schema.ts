import { pgTable, unique, uuid, text, timestamp, numeric, foreignKey, integer, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	type: text().default('HUMAN').notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_uq").on(table.email),
]);

export const resources = pgTable("resources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	price: numeric({ precision: 20, scale:  2 }).notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	type: text().notNull(),
	status: text().default('PENDING').notNull(),
	quantity: integer().notNull(),
	price: numeric({ precision: 20, scale:  4 }).notNull(),
	hasPriceLimit: boolean("has_price_limit").default(true).notNull(),
	reservedAmount: numeric("reserved_amount", { precision: 20, scale:  2 }).notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processed: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
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

export const trades = pgTable("trades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderIdSeller: uuid("order_id_seller").notNull(),
	orderIdBuyer: uuid("order_id_buyer").notNull(),
	quantity: integer().notNull(),
	price: numeric({ precision: 20, scale:  2 }).notNull(),
	created: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderIdSeller],
			foreignColumns: [orders.id],
			name: "trades_order_id_seller_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.orderIdBuyer],
			foreignColumns: [orders.id],
			name: "trades_order_id_buyer_fkey"
		}).onDelete("restrict"),
]);
