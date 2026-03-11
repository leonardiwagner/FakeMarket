import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  dbCredentials: {
    url: 'postgres://admin:pass123@localhost:5432/fakemarket',
  },
});