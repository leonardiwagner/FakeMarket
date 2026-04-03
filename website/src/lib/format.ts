export function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

export function formatDateTime(value: string) {
    const timestamp = new Date(value).getTime();
    const diffInSeconds = Math.round((timestamp - Date.now()) / 1000);

    const divisions = [
        { amount: 60, unit: 'second' as const },
        { amount: 60, unit: 'minute' as const },
        { amount: 24, unit: 'hour' as const },
        { amount: 7, unit: 'day' as const },
        { amount: 4.34524, unit: 'week' as const },
        { amount: 12, unit: 'month' as const },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' as const },
    ];

    let duration = diffInSeconds;

    for (const division of divisions) {
        if (Math.abs(duration) < division.amount) {
            return relativeTimeFormatter.format(Math.round(duration), division.unit);
        }

        duration /= division.amount;
    }

    return relativeTimeFormatter.format(Math.round(duration), 'year');
}
