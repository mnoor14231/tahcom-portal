# Supabase Environment Setup

The frontend now depends on Supabase for authentication, tasks, and notifications. Configure the client before running the app.

## 1. Create a Supabase project
- Visit https://supabase.com/dashboard and create a project.
- Copy the **Project URL** and the **anon public API key** from Project Settings → API.

## 2. Add environment variables
Create/Update an `.env` file at the project root (same folder as `package.json`) and add:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional: point the frontend at the Express API (defaults to same origin)
VITE_API_BASE_URL=https://your-backend-domain
```

Restart `npm run dev` after changes so Vite picks up the new values.

For production (Vercel, Netlify, etc.), define the same variables in the host’s dashboard.

## 3. Provision database tables
Run the following SQL in the Supabase SQL Editor to create the tables consumed by the app. The script keeps the existing `profiles` table and adds the new columns required by the UI.

```sql
-- departments
create table if not exists public.departments (
  id text primary key,
  code text unique not null,
  name text not null,
  manager_user_id uuid references auth.users on delete set null,
  status text not null default 'active',
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

-- kpis
create table if not exists public.kpis (
  id text primary key,
  department_code text not null references departments(code) on delete cascade,
  name text not null,
  description text,
  unit text not null,
  target numeric not null,
  current_value numeric not null,
  owner_user_id uuid references auth.users on delete set null,
  last_updated timestamptz not null default timezone('utc', now())
);

-- kpi history
create table if not exists public.kpi_history (
  id text primary key,
  kpi_id text not null references kpis(id) on delete cascade,
  timestamp timestamptz not null default timezone('utc', now()),
  user_id uuid references auth.users on delete set null,
  field text not null,
  old_value text,
  new_value text
);

-- extend profiles with specialty column if it is missing
alter table public.profiles
  add column if not exists specialty text;

-- ensure the username is unique for email-style logins
create unique index if not exists profiles_username_idx on public.profiles (username);
```

> **Tip:** If you already ran the earlier migration script, the `profiles`, `tasks`, `activities`, `notifications`, and `push_subscriptions` tables will exist – the statements above are idempotent.

## 4. Row level security policies
Enable RLS and add policies so admins can manage organization data while other users can only see their departments.

```sql
alter table public.departments enable row level security;
alter table public.kpis enable row level security;
alter table public.kpi_history enable row level security;

-- Helpers for role checks (stored in policies)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'admin'
  );
$$;

create or replace function public.department_codes_for_user()
returns text[] language sql stable as $$
  select array_remove(array[department_code], null)
  from public.profiles
  where id = auth.uid()::text;
$$;

-- departments
create policy "departments_admin_full"
  on public.departments
  using (public.is_admin())
  with check (public.is_admin());

create policy "departments_read_by_role"
  on public.departments
  for select
  using (
    public.is_admin()
    or code = any(public.department_codes_for_user())
  );

-- kpis
create policy "kpis_admin_full"
  on public.kpis
  using (public.is_admin())
  with check (public.is_admin());

create policy "kpis_department_members_read"
  on public.kpis
  for select
  using (
    public.is_admin()
    or department_code = any(public.department_codes_for_user())
  );

-- KPI history (read-only outside admin)
create policy "kpi_history_admin_full"
  on public.kpi_history
  using (public.is_admin())
  with check (public.is_admin());

create policy "kpi_history_read"
  on public.kpi_history
  for select
  using (
    public.is_admin()
    or kpi_id in (
      select id from public.kpis where department_code = any(public.department_codes_for_user())
    )
  );
```

Adjust the policies if you need stricter controls (e.g. allowing managers to edit only their own department rows).

## 5. Service role endpoint for user provisioning
To allow admins to create new accounts from the dashboard, store the Supabase **service role key** in `server/.env` as `SUPABASE_SERVICE_ROLE_KEY` and add the Supabase project URL as `SUPABASE_URL`. The Express server exposes `/api/admin/users` once the service key is configured.

Example `.env` snippet for `server/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
SUPABASE_USERNAME_DOMAIN=tahcom.local
```

After restarting the server, admin flows in the UI will call this endpoint to create managed users with the required `require_password_change` flag.

## 6. Seed initial users
Use the Supabase Auth dashboard or the SQL API to insert the initial accounts (admin, managers, members) and make sure the matching rows exist in `public.profiles`. The UI expects the seeded admin to have username `admin` with a temporary password (e.g. `1234`) and `require_password_change = true`. **The in-app provisioning flow will also assign `1234` as the temporary password** unless you customize the backend.

## 7. Optional: Edge Function service role
If you plan to send push notifications or run server-side jobs, create a Supabase Edge Function and store its Service Role key securely on the server. The frontend should continue using the anon key only.

