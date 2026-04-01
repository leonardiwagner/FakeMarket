import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as DatabaseService from 'fakemarket-common/services/databaseService';
import * as Constants from 'fakemarket-common/models/constants';
import { DbTransaction } from 'fakemarket-common';

async function processOrders(): Promise<void> {
    return DatabaseService.executeTransaction(async (dbTransaction: DbTransaction) => {
      const buyOrder = await OrderRepository.getTheNextBuyOrderToProcess(dbTransaction);

      const sellOrder = await OrderRepository.getTheNextSellOrderToProcess(dbTransaction, buyOrder.resourceId, buyOrder.price, buyOrder.quantity);

      console.log("Processing the following buy order:", buyOrder.id);
      if(!sellOrder) {
        console.log("No selling orders for the asked price!");

        await OrderRepository.update(dbTransaction, buyOrder.id, { processed: new Date().toISOString()});
        return
      }   


  })
}

async function start(): Promise<void> {
  await processOrders();
  start();
}

start()
