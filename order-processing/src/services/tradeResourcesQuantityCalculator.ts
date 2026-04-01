import * as Models from 'fakemarket-common/models/models';
import type { TradeResourcesQuantity } from '../models/tradeResourcesQuantity';

export function calculateItemsToBuyFromSellingOrder(
  buyOrder: Models.Order,
  sellOrder: Models.Order,
): TradeResourcesQuantity {
  if (sellOrder.quantity >= buyOrder.quantity) {
    return {
      quantityToBuy: buyOrder.quantity,
      quantityToBuyRemaining: 0,
      quantityToSellRemaining: sellOrder.quantity - buyOrder.quantity,
    };
  }

  return {
    quantityToBuy: sellOrder.quantity,
    quantityToBuyRemaining: buyOrder.quantity - sellOrder.quantity,
    quantityToSellRemaining: 0,
  };
}
