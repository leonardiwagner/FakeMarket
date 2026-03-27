"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_kit_1 = require("drizzle-kit");
exports.default = (0, drizzle_kit_1.defineConfig)({
    dialect: 'postgresql',
    out: './drizzle',
    dbCredentials: {
        url: 'postgres://admin:pass123@localhost:5432/fakemarket',
    },
});
