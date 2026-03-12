import { User,UserType,getUsers, getUsersByType} from './db'

async function generateOrders() {
    // TODO get the robot users and generate orders for them
    const robotUsers = getUsersByType(UserType.ROBOT);

    // TODO get robot resources amount

    // TODO get the latest market price of the resources

    // TODO get recent trades to determine the price trend

    // TODO check current open sell prices to determine if we should place buy orders or sell orders


}



