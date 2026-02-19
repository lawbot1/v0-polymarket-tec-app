-- Profiles table - stores user profile data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  polymarket_wallet text,
  telegram_handle text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Tracked wallets - wallets user is following
create table if not exists public.tracked_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text not null,
  label text,
  alerts_enabled boolean default true,
  created_at timestamptz default now()
);

alter table public.tracked_wallets enable row level security;

create policy "tracked_wallets_select_own" on public.tracked_wallets for select using (auth.uid() = user_id);
create policy "tracked_wallets_insert_own" on public.tracked_wallets for insert with check (auth.uid() = user_id);
create policy "tracked_wallets_update_own" on public.tracked_wallets for update using (auth.uid() = user_id);
create policy "tracked_wallets_delete_own" on public.tracked_wallets for delete using (auth.uid() = user_id);

-- Unique constraint so user can't track same wallet twice
create unique index if not exists tracked_wallets_user_wallet_idx on public.tracked_wallets(user_id, wallet_address);

-- Followed traders - traders user has clicked Follow on
create table if not exists public.followed_traders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trader_address text not null,
  trader_name text,
  created_at timestamptz default now()
);

alter table public.followed_traders enable row level security;

create policy "followed_traders_select_own" on public.followed_traders for select using (auth.uid() = user_id);
create policy "followed_traders_insert_own" on public.followed_traders for insert with check (auth.uid() = user_id);
create policy "followed_traders_delete_own" on public.followed_traders for delete using (auth.uid() = user_id);

create unique index if not exists followed_traders_user_trader_idx on public.followed_traders(user_id, trader_address);

-- Notification settings
create table if not exists public.notification_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  large_trade_alerts boolean default true,
  new_market_alerts boolean default false,
  whale_alerts boolean default true,
  daily_digest boolean default false,
  weekly_report boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notification_settings enable row level security;

create policy "notif_select_own" on public.notification_settings for select using (auth.uid() = id);
create policy "notif_insert_own" on public.notification_settings for insert with check (auth.uid() = id);
create policy "notif_update_own" on public.notification_settings for update using (auth.uid() = id);
