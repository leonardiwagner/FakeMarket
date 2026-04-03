import { useEffect, useState, type FormEvent } from 'react';
import 'chartjs-adapter-date-fns';
import {
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { API_BASE_URL, fetchMarketSnapshot } from './marketSlice';
import type { MarketOrderEntry, MarketTradePoint } from './marketTypes';
import { useMarketStream } from './useMarketStream';

ChartJS.register(
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
);

const CHART_COLORS = [
    '#f97316',
    '#0f766e',
    '#1d4ed8',
    '#c2410c',
    '#b91c1c',
    '#7c3aed',
    '#047857',
    '#be123c',
];

const MAX_BOOK_ROWS = 5;
const MAX_LOG_ROWS = 5;
const MAX_CHART_POINTS = 10;
const CHART_WINDOW_MINUTES = 10;

type ChartPoint = {
    x: number;
    y: number;
    tradeCount: number;
};

type ResourceTrend = {
    direction: 'up' | 'down' | 'flat';
    percentChange: number;
};

type TradeSide = 'buy' | 'sell';

function toMinuteTimestamp(value: string) {
    const date = new Date(value);
    date.setSeconds(0, 0);
    return date.getTime();
}

function groupOrdersByPrice(orders: MarketOrderEntry[], side: 'sell' | 'buy') {
    const groupedOrders = new Map<string, MarketOrderEntry>();

    for (const order of orders) {
        const key = `${order.resourceId}:${order.price}`;
        const existingOrder = groupedOrders.get(key);

        if (!existingOrder) {
            groupedOrders.set(key, { ...order });
            continue;
        }

        existingOrder.quantity += order.quantity;

        if (new Date(order.created).getTime() > new Date(existingOrder.created).getTime()) {
            existingOrder.created = order.created;
        }
    }

    const groupedList = Array.from(groupedOrders.values());

    groupedList.sort((left, right) => {
        if (left.price !== right.price) {
            return side === 'sell' ? left.price - right.price : right.price - left.price;
        }

        return new Date(right.created).getTime() - new Date(left.created).getTime();
    });

    return groupedList.slice(0, MAX_BOOK_ROWS);
}

function getAvatarDataUri(email: string) {
    const initials = email.slice(0, 2).toUpperCase();
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
            <rect width="72" height="72" rx="20" fill="#f97316" />
            <circle cx="36" cy="28" r="14" fill="#fed7aa" />
            <path d="M18 62c4-11 14-17 18-17s14 6 18 17" fill="#fed7aa" />
            <text x="36" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#7c2d12">${initials}</text>
        </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getResourceTrendById(trades: MarketTradePoint[]) {
    const latestTradesByResource = new Map<string, number[]>();

    for (let index = trades.length - 1; index >= 0; index--) {
        const trade = trades[index];
        const prices = latestTradesByResource.get(trade.resourceId) ?? [];

        if (prices.length < 2) {
            prices.push(trade.price);
            latestTradesByResource.set(trade.resourceId, prices);
        }
    }

    const trends = new Map<string, ResourceTrend>();

    latestTradesByResource.forEach((prices, resourceId) => {
        if (prices.length < 2 || prices[1] === 0) {
            trends.set(resourceId, { direction: 'flat', percentChange: 0 });
            return;
        }

        const [latestPrice, previousPrice] = prices;
        const percentChange = ((latestPrice - previousPrice) / previousPrice) * 100;

        if (percentChange > 0) {
            trends.set(resourceId, { direction: 'up', percentChange });
            return;
        }

        if (percentChange < 0) {
            trends.set(resourceId, { direction: 'down', percentChange });
            return;
        }

        trends.set(resourceId, { direction: 'flat', percentChange: 0 });
    });

    return trends;
}

function formatPercentage(value: number) {
    return `${Math.abs(value).toFixed(1)}%`;
}

export function MarketPage() {
    useMarketStream();

    const dispatch = useAppDispatch();
    const { snapshot, status, error, connectionStatus } = useAppSelector((state) => state.market);
    const adminUser = snapshot?.adminUser;
    const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);
    const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
    const [selectedTradeResourceId, setSelectedTradeResourceId] = useState('');
    const [tradeQuantity, setTradeQuantity] = useState('1');
    const [tradePrice, setTradePrice] = useState('1000');
    const [tradeSubmitStatus, setTradeSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [tradeMessage, setTradeMessage] = useState('');

    const chartSeries = new Map<string, { label: string; borderColor: string; backgroundColor: string; data: ChartPoint[] }>();
    const minuteBuckets = new Map<string, { resourceId: string; resourceName: string; minuteTimestamp: number; totalPrice: number; tradeCount: number }>();
    const chartWindowStart = Date.now() - (CHART_WINDOW_MINUTES * 60 * 1000);
    snapshot?.trades.forEach((trade) => {
        const minuteTimestamp = toMinuteTimestamp(trade.created);
        const bucketKey = `${trade.resourceId}:${minuteTimestamp}`;
        const existingBucket = minuteBuckets.get(bucketKey);

        if (existingBucket) {
            existingBucket.totalPrice += trade.price;
            existingBucket.tradeCount += 1;
        } else {
            minuteBuckets.set(bucketKey, {
                resourceId: trade.resourceId,
                resourceName: trade.resourceName,
                minuteTimestamp,
                totalPrice: trade.price,
                tradeCount: 1,
            });
        }
    });

    const bucketsByResourceId = new Map<string, Array<{ resourceId: string; resourceName: string; minuteTimestamp: number; totalPrice: number; tradeCount: number }>>();

    Array.from(minuteBuckets.values()).forEach((bucket) => {
        const resourceBuckets = bucketsByResourceId.get(bucket.resourceId) ?? [];
        resourceBuckets.push(bucket);
        bucketsByResourceId.set(bucket.resourceId, resourceBuckets);
    });

    Array.from(bucketsByResourceId.entries()).forEach(([, resourceBuckets]) => {
        const sortedBuckets = resourceBuckets
            .sort((left, right) => left.minuteTimestamp - right.minuteTimestamp);

        const bucketsInWindow = sortedBuckets.filter((bucket) => bucket.minuteTimestamp >= chartWindowStart);
        const backfillCount = Math.max(0, MAX_CHART_POINTS - bucketsInWindow.length);
        const backfillBuckets = backfillCount > 0
            ? sortedBuckets
                .filter((bucket) => bucket.minuteTimestamp < chartWindowStart)
                .slice(-backfillCount)
            : [];

        [...backfillBuckets, ...bucketsInWindow]
            .slice(-MAX_CHART_POINTS)
            .forEach((bucket) => {
            if (!chartSeries.has(bucket.resourceId)) {
                const color = CHART_COLORS[chartSeries.size % CHART_COLORS.length];
                chartSeries.set(bucket.resourceId, {
                    label: bucket.resourceName,
                    borderColor: color,
                    backgroundColor: `${color}33`,
                    data: [],
                });
            }

            chartSeries.get(bucket.resourceId)!.data.push({
                x: bucket.minuteTimestamp,
                y: bucket.totalPrice / bucket.tradeCount,
                tradeCount: bucket.tradeCount,
            });
        });
    });

    const topSellOrders = groupOrdersByPrice(snapshot?.sellOrders ?? [], 'sell');
    const topBuyOrders = groupOrdersByPrice(snapshot?.buyOrders ?? [], 'buy');
    const latestLogEntries = (snapshot?.log ?? []).slice(0, MAX_LOG_ROWS);
    const resourceTrends = getResourceTrendById(snapshot?.trades ?? []);
    const tradeResources = snapshot?.tradeResources ?? [];
    const visibleResources = (snapshot?.resources ?? []).filter((resource) => resource.resourceName !== 'usd');
    const selectedTradeResource = tradeResources.find((resource) => resource.resourceId === selectedTradeResourceId) ?? tradeResources[0];
    const quantityValue = Math.max(0, Number(tradeQuantity) || 0);
    const priceValue = Math.max(0, Number(tradePrice) || 0);
    const computedTotalPrice = quantityValue * priceValue;
    const computedRemainingResources = Math.max(0, (selectedTradeResource?.adminAvailableQuantity ?? 0) - quantityValue);

    useEffect(() => {
        if (!selectedTradeResourceId && tradeResources.length > 0) {
            setSelectedTradeResourceId(tradeResources[0].resourceId);
        }
    }, [selectedTradeResourceId, tradeResources]);

    async function handleTradeSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!selectedTradeResource) {
            return;
        }

        setTradeSubmitStatus('submitting');
        setTradeMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/orders/${tradeSide}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resourceId: selectedTradeResource.resourceId,
                    quantity: quantityValue,
                    price: priceValue,
                }),
            });
            const payload = await response.json() as { message?: string };

            if (!response.ok) {
                throw new Error(payload.message ?? 'Unable to place the order.');
            }

            setTradeSubmitStatus('success');
            setTradeMessage(`${tradeSide === 'buy' ? 'Buy' : 'Sell'} order placed for ${selectedTradeResource.resourceName}.`);
            void dispatch(fetchMarketSnapshot());
        } catch (submitError) {
            setTradeSubmitStatus('error');
            setTradeMessage(submitError instanceof Error ? submitError.message : 'Unable to place the order.');
        }
    }

    return (
        <main className="page-shell">
            <section className="user-bar">
                <div className="user-profile">
                    {adminUser ? <img className="user-avatar" src={getAvatarDataUri(adminUser.email)} alt={adminUser.email} /> : null}
                    <div>
                        <p className="eyebrow">Logged user</p>
                        <h1 className="user-email">{adminUser?.email ?? 'admin@fakemarket.com'}</h1>
                    </div>
                </div>

                <div className="user-meta">
                    <div className="user-balance-card">
                        <span className="user-balance-label">Money</span>
                        <strong className="user-balance-value">
                            {adminUser ? formatCurrency(adminUser.money) : '--'}
                        </strong>
                    </div>
                    <div className="user-balance-card">
                        <span className="user-balance-label">Reserved money</span>
                        <strong className="user-balance-value">
                            {adminUser ? formatCurrency(adminUser.reservedMoney) : '--'}
                        </strong>
                    </div>
                    <div className="status-chip">
                        <span className={`status-dot status-dot-${connectionStatus}`} />
                        <span>{connectionStatus}</span>
                    </div>
                </div>
            </section>

            <section className="stats-grid">
                {visibleResources.map((resource) => (
                    <article key={resource.resourceId} className="stat-card">
                        <span className="stat-label">{resource.resourceName}</span>
                        <strong className="stat-value">
                            {resource.latestTradePrice === null ? 'No trades yet' : formatCurrency(resource.latestTradePrice)}
                        </strong>
                        {resource.latestTradePrice !== null ? (
                            <span className={`stat-trend stat-trend-${resourceTrends.get(resource.resourceId)?.direction ?? 'flat'}`}>
                                <span className="stat-trend-arrow">
                                    {resourceTrends.get(resource.resourceId)?.direction === 'up'
                                        ? '↑'
                                        : resourceTrends.get(resource.resourceId)?.direction === 'down'
                                            ? '↓'
                                            : '→'}
                                </span>
                                <span>{formatPercentage(resourceTrends.get(resource.resourceId)?.percentChange ?? 0)}</span>
                            </span>
                        ) : null}
                    </article>
                ))}
                <article className="stat-card trade-card">
                    <span className="stat-label">Quick action</span>
                    <strong className="stat-value">Trade now</strong>
                    <button
                        type="button"
                        className="trade-now-button"
                        onClick={() => setIsTradePanelOpen((currentValue) => !currentValue)}
                    >
                        {isTradePanelOpen ? 'Hide order form' : 'Open order form'}
                    </button>
                </article>
            </section>

            {isTradePanelOpen ? (
                <section className="panel trade-panel">
                    <div className="panel-header">
                        <div>
                            <p className="panel-kicker">{tradeSide === 'buy' ? 'Buy order' : 'Sell order'}</p>
                            <h2>Trade gold or oil</h2>
                        </div>
                    </div>

                    <form className="trade-form" onSubmit={handleTradeSubmit}>
                        <label className="trade-field">
                            <span className="trade-field-label">Order type</span>
                            <select
                                value={tradeSide}
                                onChange={(event) => setTradeSide(event.target.value as TradeSide)}
                            >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </label>

                        <label className="trade-field">
                            <span className="trade-field-label">Resource</span>
                            <select
                                value={selectedTradeResource?.resourceId ?? ''}
                                onChange={(event) => setSelectedTradeResourceId(event.target.value)}
                            >
                                {tradeResources.map((resource) => (
                                    <option key={resource.resourceId} value={resource.resourceId}>
                                        {resource.resourceName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="trade-field">
                            <span className="trade-field-label">Quantity</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={tradeQuantity}
                                onChange={(event) => setTradeQuantity(event.target.value)}
                            />
                        </label>

                        <label className="trade-field">
                            <span className="trade-field-label">Price</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={tradePrice}
                                onChange={(event) => setTradePrice(event.target.value)}
                            />
                        </label>

                        <label className="trade-field trade-field-readonly">
                            <span className="trade-field-label">{tradeSide === 'buy' ? 'Total price' : 'Remaining resources'}</span>
                            <input
                                type="text"
                                readOnly
                                value={tradeSide === 'buy'
                                    ? formatCurrency(computedTotalPrice)
                                    : String(computedRemainingResources)}
                            />
                        </label>

                        <button type="submit" className="trade-submit-button" disabled={tradeSubmitStatus === 'submitting'}>
                            {tradeSubmitStatus === 'submitting'
                                ? 'Placing order...'
                                : `Place ${tradeSide} order`}
                        </button>
                    </form>

                    {tradeMessage ? (
                        <p className={tradeSubmitStatus === 'error' ? 'error-banner' : 'trade-success-banner'}>
                            {tradeMessage}
                        </p>
                    ) : null}
                </section>
            ) : null}

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="panel-kicker">Trade chart</p>
                        <h2>Recent prices by resource</h2>
                    </div>
                    {snapshot?.generatedAt ? (
                        <p className="panel-meta">Updated {formatDateTime(snapshot.generatedAt)}</p>
                    ) : null}
                </div>

                {status === 'loading' && !snapshot ? <p className="placeholder">Loading market snapshot...</p> : null}
                {error ? <p className="error-banner">{error}</p> : null}
                {!snapshot?.trades.length ? (
                    <p className="placeholder">Trades will appear here as soon as orders are executed.</p>
                ) : (
                    <div className="chart-shell">
                        <Line
                            data={{
                                datasets: Array.from(chartSeries.values()),
                            }}
                            options={{
                                responsive: true,
                                animation: false,
                                interaction: {
                                    mode: 'nearest',
                                    intersect: false,
                                },
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            color: '#dbe7f2',
                                        },
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                const point = context.raw as ChartPoint;
                                                return `${context.dataset.label}: ${formatCurrency(point.y)} (${point.tradeCount} trades)`;
                                            },
                                        },
                                    },
                                },
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            tooltipFormat: 'PPpp',
                                        },
                                        ticks: {
                                            color: '#8ea7bb',
                                        },
                                        grid: {
                                            color: 'rgba(142, 167, 187, 0.12)',
                                        },
                                    },
                                    y: {
                                        ticks: {
                                            color: '#8ea7bb',
                                        },
                                        grid: {
                                            color: 'rgba(142, 167, 187, 0.12)',
                                        },
                                    },
                                },
                            }}
                        />
                    </div>
                )}
            </section>

            <section className="table-grid">
                <article className="panel">
                    <div className="panel-header">
                        <div>
                            <p className="panel-kicker">Sell side</p>
                            <h2>Latest listings to sell</h2>
                        </div>
                    </div>

                    <table className="market-table">
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Latest</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSellOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.resourceName}</td>
                                    <td>{order.quantity}</td>
                                    <td>{formatCurrency(order.price)}</td>
                                    <td>{formatDateTime(order.created)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </article>

                <article className="panel">
                    <div className="panel-header">
                        <div>
                            <p className="panel-kicker">Buy side</p>
                            <h2>Latest listings to buy</h2>
                        </div>
                    </div>

                    <table className="market-table">
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Latest</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topBuyOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.resourceName}</td>
                                    <td>{order.quantity}</td>
                                    <td>{formatCurrency(order.price)}</td>
                                    <td>{formatDateTime(order.created)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </article>
            </section>

            <section className="panel">
                <div className="panel-header">
                    <div>
                        <p className="panel-kicker">Trade tape</p>
                        <h2>Latest executions</h2>
                    </div>
                </div>

                <div className="log-list">
                    {latestLogEntries.map((entry) => (
                        <p key={entry.id} className="log-entry">
                            <span className="log-user">{entry.buyerLabel}</span> bought <span>{entry.quantity}</span> item(s) of{' '}
                            <span>{entry.resourceName}</span> for <span>{formatCurrency(entry.price)}</span> at{' '}
                            <span>{formatDateTime(entry.created)}</span>.
                        </p>
                    ))}
                </div>
            </section>
        </main>
    );
}
