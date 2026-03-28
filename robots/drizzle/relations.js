"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdingsRelations = exports.tradesRelations = exports.resourcesRelations = exports.usersRelations = exports.ordersRelations = void 0;
const relations_1 = require("drizzle-orm/relations");
const schema_1 = require("fakemarket-common/db/schema");
exports.ordersRelations = (0, relations_1.relations)(schema_1.orders, ({ one, many }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.orders.userId],
        references: [schema_1.users.id]
    }),
    resource: one(schema_1.resources, {
        fields: [schema_1.orders.resourceId],
        references: [schema_1.resources.id]
    }),
    trades_buyOrderId: many(schema_1.trades, {
        relationName: "trades_buyOrderId_orders_id"
    }),
    trades_sellOrderId: many(schema_1.trades, {
        relationName: "trades_sellOrderId_orders_id"
    }),
}));
exports.usersRelations = (0, relations_1.relations)(schema_1.users, ({ many }) => ({
    orders: many(schema_1.orders),
    holdings: many(schema_1.holdings),
}));
exports.resourcesRelations = (0, relations_1.relations)(schema_1.resources, ({ many }) => ({
    orders: many(schema_1.orders),
    trades: many(schema_1.trades),
    holdings: many(schema_1.holdings),
}));
exports.tradesRelations = (0, relations_1.relations)(schema_1.trades, ({ one }) => ({
    order_buyOrderId: one(schema_1.orders, {
        fields: [schema_1.trades.buyOrderId],
        references: [schema_1.orders.id],
        relationName: "trades_buyOrderId_orders_id"
    }),
    order_sellOrderId: one(schema_1.orders, {
        fields: [schema_1.trades.sellOrderId],
        references: [schema_1.orders.id],
        relationName: "trades_sellOrderId_orders_id"
    }),
    resource: one(schema_1.resources, {
        fields: [schema_1.trades.resourceId],
        references: [schema_1.resources.id]
    }),
}));
exports.holdingsRelations = (0, relations_1.relations)(schema_1.holdings, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.holdings.userId],
        references: [schema_1.users.id]
    }),
    resource: one(schema_1.resources, {
        fields: [schema_1.holdings.resourceId],
        references: [schema_1.resources.id]
    }),
}));
