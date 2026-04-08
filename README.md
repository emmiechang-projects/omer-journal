# ספירת העומר — Count the Omer

A 49-day spiritual journal from Passover to Shavuot, guided by the sefirot, moon phases, and daily mantras.

## Quick Deploy (20 minutes)

### 1. Set up Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **SQL Editor** → click **New Query**
3. Copy the entire contents of `supabase/schema.sql` and paste it in
4. Click **Run** — you should see "Success"
5. Go to **Authentication** → **Providers** → make sure **Email** is enabled
6. Go to **Settings** → **API** and copy:
   - Project URL (looks like `https://xxxxx.supabase.co`)
   - `anon` `public` key

### 2. Set up GitHub (3 min)

1. Go to [github.com](https://github.com) and create an account (or log in)
2. Click **New Repository** → name it `omer-journal` → keep it public → **Create**
3. On your computer, open Terminal and run:

```bash
cd omer-journal
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/omer-journal.git
git push -u origin main
```

### 3. Deploy on Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New** → **Project**
3. Import your `omer-journal` repo from GitHub
4. Before clicking Deploy, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Wait ~2 minutes — you'll get a live URL like `omer-journal.vercel.app`

### 4. Configure Supabase Auth redirect (2 min)

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g., `https://omer-journal.vercel.app`)
3. Add to **Redirect URLs**: `https://omer-journal.vercel.app/**`

### 5. Optional: Custom domain

In Vercel → your project → **Settings** → **Domains** → add your domain (e.g., `counttheomer.com`)

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 14** — React framework
- **Supabase** — Auth + Postgres database
- **Tailwind CSS** — Styling
- **Vercel** — Hosting

## Made by

A tech founder in SF, for fun. [Say hi on LinkedIn](https://www.linkedin.com/in/emmie).
