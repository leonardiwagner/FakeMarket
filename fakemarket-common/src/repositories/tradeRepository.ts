import { type DbTransaction } from '../db/client';
import { trades } from '../db/schema';
import type * as Models from '../models/models';

export async function add(
    tx: DbTransaction,
    buyOrderId: string,
    sellOrderId: string,
    resourceId: string,
    quantity: number,
    price: number,
): Promise<Models.Trade> {
    const [trade] = await tx
        .insert(trades)
        .values({
            buyOrderId,
            sellOrderId,
            resourceId,
            quantity,
            price,
        })
        .returning();

    return trade;
}
