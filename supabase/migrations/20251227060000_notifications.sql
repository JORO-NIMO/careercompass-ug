-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean default false,
  channel text[] default array['in_app'],
  metadata jsonb,
  created_at timestamp with time zone default now(),
  sent_at timestamp with time zone,
  push_sent boolean default false
);

-- Notification preferences table
create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  channel text not null,
  type text not null,
  enabled boolean default true,
  created_at timestamp with time zone default now()
);

-- Push subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamp with time zone default now()
);

-- Notification events table
create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references notifications(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null, -- delivered, opened, clicked, push_sent, push_failed
  timestamp timestamp with time zone default now()
);