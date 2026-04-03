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

export type MarketUserSummary = {
    email: string;
    money: number;
    reservedMoney: number;
};

export type MarketTradeResource = {
    resourceId: string;
    resourceName: string;
    adminAvailableQuantity: number;
};

export type MarketUserOrder = {
    id: string;
    resourceId: string;
    resourceName: string;
    type: string;
    status: string;
    quantity: number;
    price: number;
    created: string;
};

export type MarketSnapshot = {
    generatedAt: string;
    adminUser: MarketUserSummary;
    tradeResources: MarketTradeResource[];
    userOrders: MarketUserOrder[];
    resources: MarketResourceSummary[];
    trades: MarketTradePoint[];
    sellOrders: MarketOrderEntry[];
    buyOrders: MarketOrderEntry[];
    log: MarketLogEntry[];
};
