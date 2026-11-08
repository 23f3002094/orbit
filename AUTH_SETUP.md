# Orbit account setup

Orbit uses Supabase Auth for email/password accounts. The FastAPI API verifies the Supabase access token before it reads or writes a task, so one user cannot access another user's plans or focus sessions.

## 1. Create the Supabase project

1. Create a project at [Supabase](https://supabase.com).
2. In **Authentication → Providers**, keep Email enabled.
3. In **Authentication → URL Configuration**, add `http://localhost:3000` as the Site URL while developing. Add your Vercel URL later.
4. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key). Never expose the service-role key.

## 2. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env.local` and fill in the Supabase values:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

The `NEXT_PUBLIC_` values are intentionally browser-visible. They identify the Supabase project; they do not grant database admin access.

## 3. Configure the backend

Add these values to `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/orbit
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For deployment, replace `DATABASE_URL` with the hosted PostgreSQL connection string and add the Vercel frontend URL to `CORS_ORIGINS`.

## 4. Apply the schema and run Orbit

```powershell
cd backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

Visit `http://localhost:3000`. Orbit redirects to `/login`; create an account and confirm the email if Supabase email confirmation is enabled.

## Existing local tasks

Tasks created before accounts were added have no `user_id`. They are intentionally hidden from account users rather than being exposed to the first person who signs up. After you create your own account, we can assign those old records to your account through a one-time, explicit migration.
