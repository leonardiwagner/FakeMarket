import { and, asc, desc, eq, or } from 'drizzle-orm';
import { db } from 'fakemarket-common/db/client';
import { holdings, orders, resources, trades, users } from 'fakemarket-common/db/schema';
import * as Constants from 'fakemarket-common/models/constants';
import type {
    MarketLogEntry,
    MarketOrderEntry,
    MarketResourceSummary,
    MarketSnapshot,
    MarketTradePoint,
    MarketUserSummary,
} from '../types/market';

const DEFAULT_TRADE_LIMIT = 200;
const DEFAULT_ORDER_LIMIT = 200;
const DEFAULT_LOG_LIMIT = 40;
const ADMIN_EMAIL = 'admin@fakemarket.com';

export async function getMarketSnapshot(resourceId?: string): Promise<MarketSnapshot> {
    const [adminUser, resourceRows, recentTrades, sellOrders, buyOrders, log] = await Promise.all([
        getAdminUserSummary(),
        getResources(resourceId),
        getRecentTrades(resourceId, DEFAULT_TRADE_LIMIT),
        getLatestOrders(Constants.OrderType.SELL, resourceId, DEFAULT_ORDER_LIMIT),
        getLatestOrders(Constants.OrderType.BUY, resourceId, DEFAULT_ORDER_LIMIT),
        getRecentTradeLog(resourceId, DEFAULT_LOG_LIMIT),
    ]);

    const latestTradePriceByResourceId = new Map<string, number>();

    for (const trade of recentTrades) {
        if (!latestTradePriceByResourceId.has(trade.resourceId)) {
            latestTradePriceByResourceId.set(trade.resourceId, trade.price);
        }
    }

    const resourcesWithSummary: MarketResourceSummary[] = resourceRows.map((resource) => ({
        resourceId: resource.resourceId,
        resourceName: resource.resourceName,
        latestTradePrice: latestTradePriceByResourceId.get(resource.resourceId) ?? null,
    }));

    return {
        generatedAt: new Date().toISOString(),
        adminUser,
        resources: resourcesWithSummary,
        trades: [...recentTrades].reverse(),
        sellOrders,
        buyOrders,
        log,
    };
}

async function getResources(resourceId?: string): Promise<Array<{ resourceId: string; resourceName: string }>> {
    return await db
        .select({
            resourceId: resources.id,
            resourceName: resources.name,
        })
        .from(resources)
        .where(resourceId ? eq(resources.id, resourceId) : undefined)
        .orderBy(asc(resources.name));
}

async function getAdminUserSummary(): Promise<MarketUserSummary> {
    const [adminHolding] = await db
        .select({
            email: users.email,
            money: holdings.quantity,
            reservedMoney: holdings.quantityReserved,
        })
        .from(users)
        .innerJoin(holdings, and(
            eq(holdings.userId, users.id),
            eq(holdings.resourceId, Constants.RESOURCE_ID_USD),
        ))
        .where(eq(users.email, ADMIN_EMAIL))
        .limit(1);

    if (!adminHolding) {
        throw new Error(`Admin user ${ADMIN_EMAIL} not found.`);
    }

    return adminHolding;
}

async function getRecentTrades(resourceId: string | undefined, limit: number): Promise<MarketTradePoint[]> {
    return await db
        .select({
            id: trades.id,
            resourceId: trades.resourceId,
            resourceName: resources.name,
            quantity: trades.quantity,
            price: trades.price,
            created: trades.created,
        })
        .from(trades)
        .innerJoin(resources, eq(trades.resourceId, resources.id))
        .where(resourceId ? eq(trades.resourceId, resourceId) : undefined)
        .orderBy(desc(trades.created))
        .limit(limit);
}

async function getLatestOrders(
    orderType: Constants.OrderType,
    resourceId: string | undefined,
    limit: number,
): Promise<MarketOrderEntry[]> {
    const query = db
        .select({
            id: orders.id,
            resourceId: orders.resourceId,
            resourceName: resources.name,
            quantity: orders.quantity,
            price: orders.price,
            created: orders.created,
        })
        .from(orders)
        .innerJoin(resources, eq(orders.resourceId, resources.id))
        .where(
            and(
                resourceId ? eq(orders.resourceId, resourceId) : undefined,
                eq(orders.type, orderType),
                or(
                    eq(orders.status, Constants.OrderStatus.OPEN),
                    eq(orders.status, Constants.OrderStatus.PARTIAL),
                ),
            ),
        );

    if (orderType === Constants.OrderType.SELL) {
        return await query
            .orderBy(asc(orders.price), desc(orders.created))
            .limit(limit);
    }

    return await query
        .orderBy(desc(orders.price), desc(orders.created))
        .limit(limit);
}

async function getRecentTradeLog(resourceId: string | undefined, limit: number): Promise<MarketLogEntry[]> {
    return await db
        .select({
            id: trades.id,
            resourceId: trades.resourceId,
            resourceName: resources.name,
            buyerUserId: users.id,
            buyerLabel: users.email,
            quantity: trades.quantity,
            price: trades.price,
            created: trades.created,
        })
        .from(trades)
        .innerJoin(resources, eq(trades.resourceId, resources.id))
        .innerJoin(orders, eq(trades.buyOrderId, orders.id))
        .innerJoin(users, eq(orders.userId, users.id))
        .where(resourceId ? eq(trades.resourceId, resourceId) : undefined)
        .orderBy(desc(trades.created))
        .limit(limit);
}
