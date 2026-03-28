const { OrderStatus, OrderType, UserType } = require('fakemarket-common/public');

console.log('API using fakemarket-common', {
  orderTypes: Object.values(OrderType),
  openStatus: OrderStatus.OPEN,
  robotType: UserType.ROBOT,
});
