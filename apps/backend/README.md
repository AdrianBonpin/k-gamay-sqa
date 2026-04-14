# Food Delivery Backend

Node.js + Express + SQLite backend for the Simple Food Delivery App.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3` (file: `db.sqlite`)
- `bcrypt` password hashing
- `jsonwebtoken` (JWT) auth, 7-day expiry
- CORS enabled for `http://localhost:5173`
- `dotenv` for configuration

## Setup

```bash
cp .env.example .env
npm install
npm start        # production-ish
npm run dev      # node --watch
```

Server listens on `http://localhost:3001` by default. The SQLite database
(`db.sqlite`) and menu seed (12 items) are created automatically on first run.

## Environment

| Variable     | Description               | Default                  |
| ------------ | ------------------------- | ------------------------ |
| `JWT_SECRET` | Secret for signing tokens | dev fallback (set this!) |
| `PORT`       | HTTP port                 | `3001`                   |

## API

All JSON. Auth endpoints expect `Authorization: Bearer <token>` where indicated.

### Auth

| Method | Path               | Body                        | Response          |
| ------ | ------------------ | --------------------------- | ----------------- |
| POST   | `/api/auth/signup` | `{ email, password, name }` | `{ token, user }` |
| POST   | `/api/auth/login`  | `{ email, password }`       | `{ token, user }` |
| POST   | `/api/auth/logout` | —                           | `{ ok: true }`    |

Passwords must be >= 6 characters. Emails are normalized to lowercase.

### Menu

| Method | Path        | Response                                                 |
| ------ | ----------- | -------------------------------------------------------- |
| GET    | `/api/menu` | `[{ id, name, description, price, imageUrl, category }]` |

### Orders (auth required)

| Method | Path              | Body                                       | Response                                                            |
| ------ | ----------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| POST   | `/api/orders`     | `{ items: [{ menuId, qty }], promoCode? }` | `{ orderId, total, items, status, createdAt, promoCode, discount }` |
| GET    | `/api/orders`     | —                                          | List of the current user's orders (with items)                      |
| GET    | `/api/orders/:id` | —                                          | Single order (404 if not owned by the user)                         |

Order statuses: `pending`, `in_progress`, `delivered`.

### Promo

| Method | Path                  | Body       | Response                     |
| ------ | --------------------- | ---------- | ---------------------------- |
| POST   | `/api/promo/validate` | `{ code }` | `{ valid, discount, code? }` |

Built-in codes: `SAVE10` (10% off), `WELCOME` (15% off new users).

## Schema

- `users(id, email UNIQUE, passwordHash, name, createdAt)`
- `menu_items(id, name, description, price, imageUrl, category)`
- `orders(id, userId, total, status, createdAt)`
- `order_items(id, orderId, menuId, qty, priceAtOrder)`

## Error Handling

- `400` validation errors
- `401` missing / invalid / expired token, or bad credentials
- `404` resource not found
- `409` email already registered
- `500` unexpected server errors (logged)
