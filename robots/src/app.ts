import { User,getUsers} from './db'




console.log("IAII")

getUsers().then((users: User[]) => console.log("users", users))

