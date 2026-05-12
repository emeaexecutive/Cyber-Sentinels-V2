# Cyber Sentinels V2

AI Trust Infrastructure for human, agent and content verification.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables from `.env.example`.
4. Set build command: `npm run build`.
5. Set output/root directory as the repository root.

## Supabase

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.

## Product thesis

Every AI agent, synthetic identity and high-risk digital interaction will need a trust passport before it receives permission.
