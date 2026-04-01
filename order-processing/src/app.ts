import { processNextOpenOrder } from './orderExecutionService';

const POLL_INTERVAL_MS = 5000;

async function start(): Promise<void> {
  const processedTrades = await processNextOpenOrder();
  console.log(`Processed ${processedTrades} trades.`);

  setTimeout(start, POLL_INTERVAL_MS);
}

start()
