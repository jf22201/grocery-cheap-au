import {
  integer,
  pgTable,
  varchar,
  text,
  pgSchema,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
//NOTE: vendor ids hardcoded here due to rarely changing on DB, make sure to if changes arise.
export const VENDOR_IDS: Record<string, number> = {
  woolworths: 1,
  coles: 2,
};
const currentSchema = process.env.DB_SCHEMA
  ? pgSchema(process.env.DB_SCHEMA)
  : pgSchema("public"); //dynamically choose between dev schema if defined or fallback to prod schema (main)
export const usersTable = currentSchema.table("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(), //This is the DB internal primary key for each user
  cognito_user_id: varchar({ length: 255 }).notNull(), //This is the userid from cognito
  email: varchar({ length: 255 }).notNull(),
});

export const vendorsTable = currentSchema.table("vendors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  vendor_name: varchar({ length: 255 }).notNull(),
  vendor_slug: varchar({ length: 255 }).notNull(),
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
  vendor_id: integer()
    .references(() => vendorsTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  url: text().notNull(),
});

export const pricesTable = currentSchema.table(
  "prices",
  {
    product_id: integer()
      .references(() => productsTable.id, { onDelete: "cascade" })
      .notNull(),
    date_recorded: date().notNull(),
    price: integer(),
  },
  (table) => [primaryKey({ columns: [table.product_id, table.date_recorded] })],
);
