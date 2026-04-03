import * as UserRepository from 'fakemarket-common/repositories/userRepository';
import * as Constants from 'fakemarket-common/models/constants';
import { cancelOldOrdersFromUser } from './domain/orderCancellation';
import { generatedOrdersForUser } from './domain/orderGenerator';



async function generateOrdersForRobots() {
     const robotUsers = await UserRepository.getUsersByType(Constants.UserType.ROBOT);
     console.log(`Starting ${robotUsers.length} robot users...`);

     for (let i=0; i < robotUsers.length; i++) {
          const user = robotUsers[i];
          console.log(`Processing robot [${i + 1}/${robotUsers.length}] ${user.email}...`);

          console.log(`Cancelling old orders for user ${user.email}...`);

          const cancelledOrders = await cancelOldOrdersFromUser(user.id, 60);

          console.log(`Cancelled ${cancelledOrders.length} old orders for user ${user.email}.`);

          console.log(`Generating new orders for user ${user.email}...`);

          const newOrders = await generatedOrdersForUser(user);

          console.log(`Generated ${newOrders.length} new orders for user ${user.email}.`);
     }
}

async function start() {
     await generateOrdersForRobots();
     setTimeout(start, 5000);
}

start()
