# Flashud — Premium Fashion Ecommerce Platform

A full-stack fashion ecommerce platform with a customer-facing storefront and a separate admin dashboard, both powered by Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Routing | React Router v6 |
| Deployment | Render (Static Sites) |

---

## Project Structure

```
flashud_orgin/
├── user/               # Customer-facing storefront (port 5174)
│   ├── public/
│   │   ├── Images/     # Local product images (fallback for Supabase)
│   │   └── hero_vid/   # Local hero videos (fallback for Supabase)
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── lib/        # Supabase client, auth context, media resolver
│       └── pages/      # Home, Shop, Product, Cart, Checkout, Account
│
├── admin/              # Admin dashboard (port 5173)
│   └── src/
│       ├── components/ # Admin UI components
│       └── pages/      # Products, Orders, Customers, Settings, etc.
│
├── SUPABASE_SETUP.md   # All database SQL — run this to set up Supabase
├── render.yaml         # Render deployment blueprint (both apps)
└── .gitignore
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd flashud_orgin
```

### 2. Set up environment variables

Create a `.env` file in **both** `user/` and `admin/` directories:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_MOCK_SUPABASE=false
```

> Get these from your Supabase dashboard → **Settings → API**.

### 3. Set up the database

Run all SQL blocks in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) in your Supabase **SQL Editor** in order.

### 4. Install dependencies & start dev servers

```bash
# User storefront
cd user
npm install
npm run dev        # http://localhost:5174

# Admin dashboard (new terminal)
cd admin
npm install
npm run dev        # http://localhost:5173
```

---

## Features

### User Storefront
- Product catalog with category filtering
- Product detail page with image gallery
- Persistent shopping cart (synced with Supabase)
- Wishlist
- Coupon / discount codes at checkout
- Manual UPI payment flow with QR code display
- Payment screenshot upload & UTR reference submission
- Order history in account page
- Local media fallback (serves images/videos from `public/` folder before fetching from Supabase)

### Admin Dashboard
- Product management (create, edit, archive, upload images)
- Order management with status updates & admin messaging
- Customer management
- Category & banner management
- Coupon management
- Sales analytics
- App settings (store info, payment UPI details, SEO)

---

## Deployment on Render

Both apps deploy as separate **Static Sites** from this single repo.

### One-click via Blueprint

1. Push this repo to GitHub
2. Go to [render.com → Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance**
3. Connect your GitHub repo — Render detects `render.yaml` and sets up both sites automatically
4. Set the environment variables when prompted:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_USE_MOCK_SUPABASE` | `false` |

### Manual setup

| Setting | User Storefront | Admin Panel |
|---|---|---|
| Root Directory | `user` | `admin` |
| Build Command | `npm install && npm run build` | `npm install && npm run build` |
| Publish Directory | `dist` | `dist` |
| Rewrite Rule | `/* → /index.html` | `/* → /index.html` |

---

## Media — Local Fallback

Images and videos are served from the local `public/` folder if the filename matches, otherwise fetched from Supabase Storage. To use local assets:

- **Images** → place in `user/public/Images/<filename>`
- **Videos** → place in `user/public/hero_vid/<filename>`

The filename must match what is stored in the Supabase URL.

---

## Database

All SQL (schema, RLS policies, migrations) is documented in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

| Section | Contents |
|---|---|
| §1 Core Schema | All table definitions |
| §2 RLS Policies | Row Level Security for all tables |
| §3 Settings Table | App config key-value store |
| §4 Payment Migration | Adds payment columns to orders |
| §5 Storage Buckets | product-images & payment-proofs |
| §6 Env Config | Environment variable reference |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `VITE_USE_MOCK_SUPABASE` | ✅ | Set to `false` for live DB |

---

## License

Private — all rights reserved.
