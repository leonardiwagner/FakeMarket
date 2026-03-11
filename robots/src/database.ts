import { Pool, PoolClient } from "pg";

const DATABASE_URL="postgres://admin:pass123@localhost:5432/fakemarket"


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let client:PoolClient;

function getPool() : Promise<PoolClient> {
    return new Promise((resolve,reject) => {
        if(client){
            return resolve(client)
        }

        pool.connect((error, poolClient) => {
            if(error) {
                return reject(error)
            }

            if(poolClient) {
                console.log("Connected to PostgreSQL");
                client = poolClient;
                return resolve(client);
            }
            
            return reject("Database pool is empty!")
        });
    })
}

export default {
    getPool: getPool
}