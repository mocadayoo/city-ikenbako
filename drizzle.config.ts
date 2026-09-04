import type { Config } from "drizzle-kit";

export default {
  schema: "./infrastructure/db/schema.ts",
  out: "./infrastructure/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost/city_ikenbako",
  },
} satisfies Config;
