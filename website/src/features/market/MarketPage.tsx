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
import { Button } from 'react-aria-components';
import { Line } from 'react-chartjs-2';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { liveToggled } from './marketSlice';
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

export function MarketPage() {
    useMarketStream();

    const dispatch = useAppDispatch();
    const { snapshot, status, error, connectionStatus, isLive } = useAppSelector((state) => state.market);

    const chartSeries = new Map<string, { label: string; borderColor: string; backgroundColor: string; data: Array<{ x: number; y: number }> }>();

    snapshot?.trades.forEach((trade) => {
        if (!chartSeries.has(trade.resourceId)) {
            const color = CHART_COLORS[chartSeries.size % CHART_COLORS.length];
            chartSeries.set(trade.resourceId, {
                label: trade.resourceName,
                borderColor: color,
                backgroundColor: `${color}33`,
                data: [],
            });
        }

        chartSeries.get(trade.resourceId)!.data.push({
            x: new Date(trade.created).getTime(),
            y: trade.price,
        });
    });

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
                    <Button className="toggle-button" onPress={() => dispatch(liveToggled())}>
                        {isLive ? 'Pause live updates' : 'Resume live updates'}
                    </Button>
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
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot?.sellOrders.map((order) => (
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
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {snapshot?.buyOrders.map((order) => (
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
                    {snapshot?.log.map((entry) => (
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
