import { integer, pgTable, varchar, text, pgSchema } from "drizzle-orm/pg-core";

export const schemaName = process.env.DB_SCHEMA || "public"; //Use the current dev's schema name if defined otherwise fall back to public (prod should only be only a public schema)
export const currentSchema = pgSchema(schemaName);
export const usersTable = currentSchema.table("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
});

export const vendorsTable = currentSchema.table("vendors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  vendor_name: varchar({ length: 255 }),
});

export const comparisonGroupsTable = currentSchema.table("comparison_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => usersTable.id, { onDelete: "cascade" }),
  price_alert: integer().default(0), //using integer as we are storing price in cents.
});

export const comparisonProductsTable = currentSchema.table(
  "comparison_products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    product_id: integer().references(() => productsTable.id),
    group: integer().references(() => comparisonGroupsTable.id, {
      onDelete: "cascade",
    }),
  },
);

export const productsTable = currentSchema.table("products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_name: text().notNull(),
  price: integer().notNull(),
  vendor_id: integer()
    .references(() => vendorsTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  url: text().notNull(),
});
