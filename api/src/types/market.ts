export type MarketResourceSummary = {
    resourceId: string;
    resourceName: string;
    latestTradePrice: number | null;
};

export type MarketTradePoint = {
    id: string;
    resourceId: string;
    resourceName: string;
    quantity: number;
    price: number;
    created: string;
};

export type MarketOrderEntry = {
    id: string;
    resourceId: string;
    resourceName: string;
    quantity: number;
    price: number;
    created: string;
};

export type MarketLogEntry = {
    id: string;
    resourceId: string;
    resourceName: string;
    buyerUserId: string;
    buyerLabel: string;
    quantity: number;
    price: number;
    created: string;
};

export type MarketSnapshot = {
    generatedAt: string;
    resources: MarketResourceSummary[];
    trades: MarketTradePoint[];
    sellOrders: MarketOrderEntry[];
    buyOrders: MarketOrderEntry[];
    log: MarketLogEntry[];
};
