import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
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
  paymentMethod: text('payment_method'),
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

// Better-auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  name: text('name').notNull(),
  image: text('image'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  identifier: text('identifier').notNull(),
});
