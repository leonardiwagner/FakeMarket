import * as UserRepository from 'fakemarket-common/repositories/userRepository';
import * as Constants from 'fakemarket-common/models/constants';



async function start() {
     const robotUsers = await UserRepository.getUsersByType(Constants.UserType.ROBOT);


}


start()
