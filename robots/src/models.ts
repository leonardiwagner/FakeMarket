import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(), 
    email: text('email').notNull().unique(), 
    password: text('password').notNull(), 
    type: text('type').notNull().default(false), 
    created: timestamp('created', { withTimezone: true }).notNull().defaultNow(), 
    updated: timestamp('updated', { withTimezone: true }).notNull().defaultNow()
});