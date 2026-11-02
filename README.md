# claude-supabase-hackathon-2026

**Mystery Number** is a realtime 2-player web game. The server picks a mystery number from 1 to 100, and the two players take turns guessing it. Each miss narrows the range of allowed guesses. The player who guesses the mystery number loses.

The repo is a pnpm monorepo: a React (Vite) frontend and a hosted Supabase backend.

```
apps/web/          React + TypeScript (Vite)
packages/shared/   Types shared across the repo: game state, channel events, generated DB types
supabase/          SQL migrations (+ CLI config)
```

## Prerequisites

- Node 22+ (`corepack enable pnpm` or `corepack prepare pnpm@10 --activate`)
- A Supabase project at [supabase.com](https://supabase.com/dashboard)

## Setup

```sh
pnpm install

# 1. Connect the CLI to your hosted project (one-time)
pnpm db:login                                   # opens the browser
pnpm db:link --project-ref <project-ref>        # asks for the database password

# 2. Apply the migrations in supabase/migrations
pnpm db:push

# 3. Point the app at the project
cp apps/web/.env.example apps/web/.env.local    # fill in URL + publishable key

pnpm dev                                        # http://localhost:5173
```

In the dashboard, also turn on **Authentication → Sign In / Providers → Allow anonymous sign-ins**. Players sign in anonymously, so the app won't work without it.

To play, open two browser windows (one normal and one private), create a match in one, and join it with the code in the other.

## How it works

| Concern | Mechanism | Where |
| --- | --- | --- |
| Guesses | `make_guess(match_id, guess)` RPC: validates the turn and range, narrows the range, decides the loser | migration `…_guess_number_game.sql` |
| Instant opponent updates | Broadcast `sync` on the private channel `match:<id>` | `useMatchChannel` |
| Who's connected | Presence on the same channel | `useMatchChannel` |
| Source of truth | `public.matches` row + Postgres Changes | `useMatch` |

The mystery number is stored in `match_secrets`, which clients can't read. It's copied into `matches.state` only when the game ends. Clients can't write to `matches` directly; every write goes through RPCs (`create_match`, `join_match`, `make_guess`). Only the match's two players can join its private Realtime channel, enforced by RLS on `realtime.messages`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the web app |
| `pnpm build` / `pnpm typecheck` / `pnpm lint` | Across all workspaces |
| `pnpm db:login` / `pnpm db:link --project-ref <ref>` | Connect the CLI to the hosted project |
| `pnpm db:migration <name>` | Create a new SQL migration |
| `pnpm db:push` | Apply pending migrations to the hosted project |
| `pnpm db:types` | Regenerate `packages/shared/src/database.types.ts` from the linked project |
