import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
export const db = drizzle(process.env.DATABASE_URL!);
export const dbSchema = sql.identifier(process.env.DB_SCHEMA || "main");
