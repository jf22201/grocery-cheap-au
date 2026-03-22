CREATE SCHEMA IF NOT EXISTS main;
--> statement-breakpoint
CREATE TABLE "main"."comparison_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main"."comparison_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255),
	"user_id" integer,
	"price_alert" integer DEFAULT 0,
	"alert_armed" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "main"."comparison_products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main"."comparison_products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer,
	"group" integer
);
--> statement-breakpoint
CREATE TABLE "main"."latest_prices" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"price" integer NOT NULL,
	"date_recorded" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "main"."prices" (
	"product_id" integer NOT NULL,
	"date_recorded" date NOT NULL,
	"price" integer NOT NULL,
	CONSTRAINT "prices_product_id_date_recorded_pk" PRIMARY KEY("product_id","date_recorded")
);
--> statement-breakpoint
CREATE TABLE "main"."products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main"."products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_name" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"url" text NOT NULL,
	"vendor_product_id" text
);
--> statement-breakpoint
CREATE TABLE "main"."users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main"."users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cognito_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "main"."vendors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "main"."vendors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vendor_name" varchar(255) NOT NULL,
	"vendor_slug" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "main"."comparison_groups" ADD CONSTRAINT "comparison_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "main"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."comparison_products" ADD CONSTRAINT "comparison_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "main"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."comparison_products" ADD CONSTRAINT "comparison_products_group_comparison_groups_id_fk" FOREIGN KEY ("group") REFERENCES "main"."comparison_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."latest_prices" ADD CONSTRAINT "latest_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "main"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "main"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "main"."vendors"("id") ON DELETE cascade ON UPDATE no action;