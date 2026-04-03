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
import { useAppSelector } from '../../app/hooks';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { MarketOrderEntry } from './marketTypes';
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

export function MarketPage() {
    useMarketStream();

    const { snapshot, status, error, connectionStatus } = useAppSelector((state) => state.market);

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

    return (
        <main className="page-shell">
            <section className="hero-card">
                <div className="hero-copy">
                    <p className="eyebrow">Public market board</p>
                    <h1>FakeMarket live exchange</h1>
                    <p className="hero-text">
                        Real-time pricing, active listings, and the most recent completed trades across every resource in the system.
                    </p>
                </div>

                <div className="status-panel">
                    <div className="status-chip">
                        <span className={`status-dot status-dot-${connectionStatus}`} />
                        <span>{connectionStatus}</span>
                    </div>
                </div>
            </section>

            <section className="stats-grid">
                {snapshot?.resources.map((resource) => (
                    <article key={resource.resourceId} className="stat-card">
                        <span className="stat-label">{resource.resourceName}</span>
                        <strong className="stat-value">
                            {resource.latestTradePrice === null ? 'No trades yet' : formatCurrency(resource.latestTradePrice)}
                        </strong>
                    </article>
                ))}
            </section>

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
