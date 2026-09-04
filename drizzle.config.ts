import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Set it in .env.local or the shell environment.");
}

export default {
  schema: "./infrastructure/db/schema.ts",
  out: "./infrastructure/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
