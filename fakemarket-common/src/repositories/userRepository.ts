import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import * as Constants from '../models/constants';
import type * as Models from '../models/models';

export async function getUsersByType(userType: Constants.UserType): Promise<Models.User[]> {
    return await db.select().from(users).where(eq(users.type, userType));
}

export async function getUserByEmail(email: string): Promise<Models.User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
}
