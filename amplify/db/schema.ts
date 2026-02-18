import { integer, pgTable, varchar, text } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
});

export const vendorsTable = pgTable("vendors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  vendor_name: varchar({ length: 255 }),
});

export const comparisonGroupsTable = pgTable("comparison_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => usersTable.id, { onDelete: "cascade" }),
  price_alert: integer().default(0), //using integer as we are storing price in cents.
});

export const comparisonProductsTable = pgTable("comparison_products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_id: integer().references(() => productsTable.id),
  group: integer().references(() => comparisonGroupsTable.id, {
    onDelete: "cascade",
  }),
});

export const productsTable = pgTable("products", {
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
