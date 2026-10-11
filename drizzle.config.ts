import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (see .env.example)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
