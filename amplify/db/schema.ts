import {
  integer,
  pgTable,
  varchar,
  text,
  primaryKey,
  date,
  boolean,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(), //This is the DB internal primary key for each user
  cognito_user_id: varchar({ length: 255 }).notNull(), //This is the userid from cognito
  email: varchar({ length: 255 }).notNull(),
});

export const vendorsTable = pgTable("vendors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  vendor_name: varchar({ length: 255 }).notNull(),
  vendor_slug: varchar({ length: 255 }).notNull(),
});

export const comparisonGroupsTable = pgTable("comparison_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }),
  user_id: integer().references(() => usersTable.id, { onDelete: "cascade" }),
  price_alert: integer().default(0), //using integer as we are storing price in cents.
  alert_armed: boolean().notNull().default(true),
});

export const comparisonProductsTable = pgTable(
  "comparison_products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    product_id: integer().references(() => productsTable.id),
    group: integer().references(() => comparisonGroupsTable.id, {
      onDelete: "cascade",
    }),
  },
);

export const productsTable = pgTable("products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  product_name: text().notNull(),
  vendor_id: integer()
    .references(() => vendorsTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  url: text().notNull(),
  vendor_product_id: text(),
});

export const pricesTable = pgTable(
  "prices",
  {
    product_id: integer()
      .references(() => productsTable.id, { onDelete: "cascade" })
      .notNull(),
    date_recorded: date().notNull(),
    price: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.product_id, table.date_recorded] })],
);

export const latestPricesTable = pgTable("latest_prices", {
  product_id: integer()
    .references(() => productsTable.id, { onDelete: "cascade" })
    .primaryKey(),
  price: integer().notNull(),
  date_recorded: date().notNull().defaultNow(),
});
