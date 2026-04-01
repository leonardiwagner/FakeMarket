import * as OrderRepository from 'fakemarket-common/repositories/orderRepository';
import * as TradeRepository from 'fakemarket-common/repositories/tradeRepository';
import * as HoldingsRepository from 'fakemarket-common/repositories/holdingsRepository';
import * as DatabaseService from 'fakemarket-common/services/databaseService';
import * as Constants from 'fakemarket-common/models/constants';
import { DbTransaction } from 'fakemarket-common';
import { calculateItemsToBuyFromSellingOrder } from './services/tradeResourcesQuantityCalculator';

async function processOrders(): Promise<void> {
    return DatabaseService.executeTransaction(async (dbTransaction: DbTransaction) => {
      const buyOrder = await OrderRepository.getTheNextBuyOrderToProcess(dbTransaction);

      if(!buyOrder) {
        console.log("No buying orders to process!");
        return
      }

      const sellOrder = await OrderRepository.getTheNextSellOrderToProcess(dbTransaction, buyOrder.resourceId, buyOrder.price, buyOrder.quantity);

      console.log("Processing the following buy order:", buyOrder.id);
      if(!sellOrder) {
        console.log("No selling orders for the asked price!");

        await OrderRepository.update(dbTransaction, buyOrder.id, { processed: new Date().toISOString()});
        return
      }   

      const { quantityToBuy, quantityToBuyRemaining, quantityToSellRemaining } = calculateItemsToBuyFromSellingOrder(buyOrder, sellOrder);

      await TradeRepository.add(dbTransaction, buyOrder.id, sellOrder.id, buyOrder.resourceId, quantityToBuy, sellOrder.price);

      const buyOrderUpdate = {
        quantity: quantityToBuyRemaining,
        quantityProcessed: buyOrder.quantityProcessed + quantityToBuy,
        status: quantityToBuyRemaining === 0 ? Constants.OrderStatus.EXECUTED : Constants.OrderStatus.PARTIAL,
        processed: new Date().toISOString(),
      }

      await OrderRepository.update(dbTransaction, buyOrder.id, buyOrderUpdate);

      const sellOrderUpdate = {
        quantity: quantityToSellRemaining,
        quantityProcessed: sellOrder.quantityProcessed + quantityToBuy,
        status: quantityToSellRemaining === 0 ? Constants.OrderStatus.EXECUTED : Constants.OrderStatus.PARTIAL,
      }

      await OrderRepository.update(dbTransaction, sellOrder.id, sellOrderUpdate);
      
      const orderTotalPrice = quantityToBuy * sellOrder.price;

      // update buyer holdings: add resource, remove money
      await HoldingsRepository.updateHoldingQuantity(dbTransaction, buyOrder.userId, buyOrder.resourceId, quantityToBuy);
      await HoldingsRepository.updateHoldingQuantity(dbTransaction, buyOrder.userId, Constants.RESOURCE_ID_USD, -orderTotalPrice);

      // update seller holdings: remove resource, add money
      await HoldingsRepository.updateHoldingQuantity(dbTransaction, sellOrder.userId, sellOrder.resourceId, -quantityToBuy);
      await HoldingsRepository.updateHoldingQuantity(dbTransaction, sellOrder.userId, Constants.RESOURCE_ID_USD, orderTotalPrice);
    
        
  })
}

async function start(): Promise<void> {
  await processOrders();
  start();
}

start()
