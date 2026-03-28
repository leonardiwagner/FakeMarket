import { processAllOpenOrders } from 'fakemarket-common';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = Number(
  process.env.ORDER_PROCESSING_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS
);

async function runProcessingCycle(): Promise<void> {
  const processedTrades = await processAllOpenOrders();
  console.log(`Processed ${processedTrades} trades.`);
}

async function start(): Promise<void> {
  await runProcessingCycle();

  setInterval(async () => {
    try {
      await runProcessingCycle();
    } catch (error) {
      console.error('Failed to process open orders.', error);
    }
  }, POLL_INTERVAL_MS);
}

start().catch((error: unknown) => {
  console.error('Order processing worker failed to start.', error);
  process.exit(1);
});
