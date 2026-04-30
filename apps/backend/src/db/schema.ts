import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull(),
});

export const deliveryAddresses = pgTable('delivery_addresses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  totalCents: integer('total_cents').notNull(),
  status: text('status').notNull().default('pending'),
  promoCode: text('promo_code'),
  discount: real('discount').default(0),
  deliveryAddressId: integer('delivery_address_id').references(() => deliveryAddresses.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuId: integer('menu_id')
    .notNull()
    .references(() => menuItems.id),
  qty: integer('qty').notNull(),
  priceAtOrder: real('price_at_order').notNull(),
});

export const promos = pgTable('promos', {
  code: text('code').primaryKey(),
  discount: real('discount').notNull(),
  description: text('description').notNull(),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses'),
  maxPerUser: integer('max_per_user'),
  firstOrderOnly: integer('first_order_only').notNull().default(0),
});

export const ratings = pgTable(
  'ratings',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    menuId: integer('menu_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    stars: integer('stars').notNull(),
    review: text('review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userMenuUnique: uniqueIndex('ratings_user_menu_unique').on(table.userId, table.menuId),
    menuIdx: index('ratings_menu_idx').on(table.menuId),
  }),
);
