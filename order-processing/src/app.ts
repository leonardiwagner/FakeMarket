import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as TradeRepository from 'fakemarket-common/repositories/tradeRepository';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as DatabaseService from 'fakemarket-common/services/databaseService';
import { DbTransaction } from 'fakemarket-common';
import { processOrder } from './services/processOrderService';

async function findSellOrderToFulfillBuyOrder(dbTransaction: DbTransaction, buyOrder: OrderRepository.Order): Promise<OrderRepository.Order> {
  if(buyOrder.quantity > 0) {
    const sellOrder = await OrderRepository.getTheNextSellOrderToProcess(dbTransaction, buyOrder.resourceId, buyOrder.price, buyOrder.quantity);
    const updatedBuyOrder = await processOrder(dbTransaction, buyOrder, sellOrder);
    if(updatedBuyOrder){
      console.log(`Done a trade for order: ${buyOrder.id}`);
      return await findSellOrderToFulfillBuyOrder(dbTransaction, updatedBuyOrder!);
    }
    
  }

  return buyOrder;
}

async function processOrders(): Promise<void> {
    return DatabaseService.executeTransaction(async (dbTransaction: DbTransaction) => {
      const buyOrder = await OrderRepository.getTheNextBuyOrderToProcess(dbTransaction);

      if(!buyOrder) {
        console.log("No buying orders to process!");
        return
      }

      await findSellOrderToFulfillBuyOrder(dbTransaction, buyOrder);
      
      console.log(`Finished processing buy order ${buyOrder.id}`);
      
        
  })
}

async function start(): Promise<void> {
  await processOrders();
  start();
}

start()
