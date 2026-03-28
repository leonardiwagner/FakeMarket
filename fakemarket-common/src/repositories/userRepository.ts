import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import * as Models from '../models';

export async function getUsersByType(userType: Models.UserType): Promise<Models.User[]> {
    return await db.select().from(users).where(eq(users.type, userType));
}

export async function getUsers(): Promise<Models.User[]> {
    return await db.select().from(users);
}
