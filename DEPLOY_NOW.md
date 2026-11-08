# Deploy Orbit now

Orbit needs three hosted services: Vercel for the Next.js frontend, Render for FastAPI, and Supabase for authentication plus PostgreSQL.

## 1. Push this repository to GitHub

Create a new empty GitHub repository named `orbit`, then run from the Orbit folder:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/orbit.git
git branch -M main
git push -u origin main
```

## 2. Use Supabase PostgreSQL for production data

In Supabase, open **Project Settings → Database → Connect** and copy the **Session pooler** connection string. This is secret: do not paste it into source code or chat.

Render expects SQLAlchemy's scheme, so change the beginning:

```text
postgresql://...
```

to:

```text
postgresql+psycopg://...
```

Keep any `sslmode=require` query parameter supplied by Supabase.

## 3. Deploy the FastAPI API on Render

1. Create a Render account and choose **New → Blueprint**.
2. Connect the GitHub `orbit` repository. Render reads `render.yaml` automatically.
3. Add these environment variables when Render asks:

```text
DATABASE_URL=<your converted Supabase session-pooler connection string>
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

4. Deploy. Render runs the Alembic migrations automatically before starting FastAPI.
5. Open `https://YOUR_RENDER_SERVICE.onrender.com/health`; it should return `{"status":"ok"}`. Copy this API URL.

## 4. Deploy the frontend on Vercel

1. In Vercel choose **Add New → Project** and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Add these environment variables:

```text
NEXT_PUBLIC_API_URL=https://YOUR_RENDER_SERVICE.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

4. Deploy and copy the Vercel URL, such as `https://orbit-yourname.vercel.app`.

## 5. Connect the three services

In Supabase **Authentication → URL Configuration**:

- Set Site URL to the Vercel URL.
- Add `https://YOUR_VERCEL_URL/**` to Redirect URLs.
- Keep `http://localhost:3000/**` for local development.

In Render, change `CORS_ORIGINS` to include the Vercel URL, then redeploy:

```text
http://localhost:3000,http://127.0.0.1:3000,https://YOUR_VERCEL_URL
```

Now sign up on the Vercel URL. A task created by one account is visible only to that account.

## Never publish these

- Supabase `service_role` key
- Supabase database password / DATABASE_URL
- Any `.env` file
