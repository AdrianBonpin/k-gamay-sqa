CREATE TABLE "delivery_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" real NOT NULL,
	"image_url" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"menu_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"price_at_order" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"promo_code" text,
	"discount" real DEFAULT 0,
	"delivery_address_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"code" text PRIMARY KEY NOT NULL,
	"discount" real NOT NULL,
	"description" text NOT NULL,
	"expires_at" timestamp,
	"max_uses" integer,
	"max_per_user" integer,
	"first_order_only" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"menu_id" integer NOT NULL,
	"stars" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_id_menu_items_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_delivery_addresses_id_fk" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."delivery_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_menu_id_menu_items_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_menu_unique" ON "ratings" USING btree ("user_id","menu_id");--> statement-breakpoint
CREATE INDEX "ratings_menu_idx" ON "ratings" USING btree ("menu_id");