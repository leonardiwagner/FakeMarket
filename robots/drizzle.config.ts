import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: '../fakemarket-common/src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: 'postgres://admin:pass123@localhost:5432/fakemarket',
  },
});
