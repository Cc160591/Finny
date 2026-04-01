# Finny

Personal finance app built with Next.js 16, Prisma, and PostgreSQL. Tracks transactions, budgets, goals, and assets. Integrates with Tink for bank account connection and OpenAI for AI-powered chat insights.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (hosted on Railway)
- **ORM**: Prisma
- **Auth**: NextAuth v5
- **UI**: Tailwind CSS v4, shadcn/ui, Recharts
- **Integrations**: Tink (open banking), OpenAI

## Features

- Transactions, categories, budgets, goals, assets tracking
- Bank account connection via Tink Link
- AI chat assistant (OpenAI)
- Dashboard with charts and summaries
- Portfolio tracking with Yahoo Finance

## Local Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

3. Required environment variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
TINK_CLIENT_ID="..."
TINK_CLIENT_SECRET="..."
```

4. Run Prisma migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

5. Start the dev server:

```bash
npm run dev
```

## Deploy (Railway)

The app is deployed on [Railway](https://railway.app) with a PostgreSQL plugin attached.

### Steps to deploy from scratch

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway will set `DATABASE_URL` automatically
3. Add a **service** pointing to this GitHub repo
4. Set the following environment variables in Railway:

```env
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-railway-domain.up.railway.app
OPENAI_API_KEY=...
TINK_CLIENT_ID=...
TINK_CLIENT_SECRET=...
```

5. Railway will run `npm run build` (`prisma generate && next build`) and `npm start` automatically via the `package.json` scripts.

6. Run migrations once after the first deploy:

```bash
npx prisma migrate deploy
```

Or add it to the build command: `prisma migrate deploy && prisma generate && next build`.

## Database

Schema is managed with Prisma. To create a new migration locally:

```bash
npx prisma migrate dev --name description
```

To apply migrations in production:

```bash
npx prisma migrate deploy
```
