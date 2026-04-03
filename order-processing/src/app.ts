import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as TradeRepository from 'fakemarket-common/repositories/tradeRepository';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as DatabaseService from 'fakemarket-common/services/databaseService';
import * as Models from 'fakemarket-common/models/models';
import * as Constants from 'fakemarket-common/models/constants';
import { DbTransaction } from 'fakemarket-common';
import { processOrder } from './services/processOrderService';

async function fullfillOrder(dbTransaction: DbTransaction, order: Models.Order): Promise<Models.Order | undefined> {
  if(order.quantity <= 0){
    return
  }

  if(order.type === Constants.OrderType.BUY){
    const sellOrder = await OrderRepository.getMatchingSellOrderFromBuyOrder(dbTransaction, order);
    if(!sellOrder) {
      await OrderRepository.update(dbTransaction, order.id, { processed: new Date().toISOString() })
      console.log("No sell order matching the buy order")
      return
    }
    return await processOrder(dbTransaction, order, sellOrder);
  } else {
    const buyOrder = await OrderRepository.getMatchingBuyOrderFromSellOrder(dbTransaction, order);
    if(!buyOrder) {
      console.log("No buy order matching the sell order")
      await OrderRepository.update(dbTransaction, order.id, { processed: new Date().toISOString() })
      return
    }
    return await processOrder(dbTransaction, buyOrder, order);
  }
}

async function processOrders(): Promise<boolean> {
    return DatabaseService.executeTransaction(async (dbTransaction: DbTransaction) => {
      const order = await OrderRepository.getTheNextOrderToProcess(dbTransaction);

      if(!order) {
        console.log("No orders to process!");
        return false;
      }

      await fullfillOrder(dbTransaction, order);
      
      console.log(`Finished processing order ${order.id}`);
      return true;
        
  })
}

async function start(): Promise<void> {
  const hasMoreOrdersToProcess = await processOrders();
  if(hasMoreOrdersToProcess) {
    start();
  } else{
    console.log("No more orders to process, waiting for new orders...");
    setTimeout(start, 5000);
  }
}

start()
