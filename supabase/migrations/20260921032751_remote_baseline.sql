-- Declarative baseline of the verified remote public schema.
-- Do not push until the documented remote baseline procedure is reviewed.

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    email text not null,
    phone text default '',
    business_name text default '',
    plan text not null default 'free'
        constraint profiles_plan_check check (plan in ('free', 'pro')),
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text,
    subscription_status text not null default 'active'
        check (subscription_status in ('active', 'past_due', 'canceled', 'trialing')),
    subscription_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.clients (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    phone text default '',
    email text default '',
    notes text default '',
    archived boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    client_id uuid references public.clients(id) on delete set null,
    description text not null,
    amount numeric(12, 2) not null,
    date date not null,
    type text not null check (type in ('receita', 'despesa')),
    category text default '',
    status text not null default 'pendente'
        check (status in ('pago', 'pendente', 'atrasado')),
    payment_method text default '',
    recurring boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.appointments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    client_id uuid references public.clients(id) on delete set null,
    title text not null,
    date timestamptz not null,
    duration_minutes integer not null default 60,
    status text not null default 'pendente'
        check (status in ('confirmado', 'pendente', 'cancelado', 'concluido')),
    notes text default '',
    created_at timestamptz not null default now()
);

create table public.ai_conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    agent_type text not null check (agent_type in ('finance', 'whatsapp')),
    message text not null,
    response text not null,
    created_at timestamptz not null default now()
);

create table public.whatsapp_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    client_id uuid references public.clients(id) on delete set null,
    direction text not null check (direction in ('incoming', 'outgoing')),
    message text not null,
    status text not null default 'sent',
    created_at timestamptz not null default now()
);

create table public.usage_counters (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    metric text not null,
    period text not null default 'all',
    current_value integer not null default 0,
    updated_at timestamptz not null default now(),
    unique (user_id, metric, period)
);

create table public.notifications_outbox (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    channel text not null default 'email',
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'failed', 'skipped')),
    payload jsonb not null default '{}'::jsonb,
    scheduled_for timestamptz not null default now(),
    sent_at timestamptz,
    error_message text,
    created_at timestamptz not null default now()
);

create table public.availability (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.profiles(id) on delete cascade,
    weekday integer not null check (weekday between 0 and 6),
    start_time time not null,
    end_time time not null,
    slot_duration integer not null default 30 check (slot_duration > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, weekday)
);

create table public.stripe_webhook_events (
    id text primary key,
    event_type text not null,
    status text not null default 'processing'
        check (status in ('processing', 'processed', 'failed')),
    processed_at timestamptz,
    error_message text,
    created_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions(user_id, date);
create index idx_transactions_user_type on public.transactions(user_id, type);
create index idx_appointments_user_date on public.appointments(user_id, date);
create index idx_clients_user_name on public.clients(user_id, name);
create index idx_whatsapp_messages_user on public.whatsapp_messages(user_id, created_at);
create index idx_ai_conversations_user on public.ai_conversations(user_id, created_at);
create index idx_usage_counters_user_metric
    on public.usage_counters(user_id, metric, period);
create index idx_notifications_outbox_pending
    on public.notifications_outbox(status, scheduled_for)
    where status = 'pending';
create index idx_notifications_outbox_user
    on public.notifications_outbox(user_id, created_at desc);
create index idx_availability_tenant_weekday
    on public.availability(tenant_id, weekday);
create index idx_stripe_webhook_events_status_created
    on public.stripe_webhook_events(status, created_at desc);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.transactions enable row level security;
alter table public.appointments enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.usage_counters enable row level security;
alter table public.notifications_outbox enable row level security;
alter table public.availability enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "Users can view own profile"
    on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);
create policy "Users can view own clients"
    on public.clients for all using (auth.uid() = user_id);
create policy "Users can manage own transactions"
    on public.transactions for all using (auth.uid() = user_id);
create policy "Users can manage own appointments"
    on public.appointments for all using (auth.uid() = user_id);
create policy "Users can view own AI conversations"
    on public.ai_conversations for all using (auth.uid() = user_id);
create policy "Users can view own WhatsApp messages"
    on public.whatsapp_messages for all using (auth.uid() = user_id);
create policy "Users can view own usage counters"
    on public.usage_counters for select using (auth.uid() = user_id);
create policy "Users can view own notifications"
    on public.notifications_outbox for select using (auth.uid() = user_id);
create policy "Users can manage own availability"
    on public.availability for all using (auth.uid() = tenant_id);

create function public.update_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute function public.update_updated_at();
create trigger availability_updated_at
    before update on public.availability
    for each row execute function public.update_updated_at();

create function public.increment_usage_counter(
    p_user_id uuid,
    p_metric text,
    p_period text default 'all',
    p_delta integer default 1
)
returns integer
language plpgsql
security definer
as $function$
declare
    new_value integer;
begin
    insert into usage_counters (user_id, metric, period, current_value)
    values (p_user_id, p_metric, p_period, p_delta)
    on conflict (user_id, metric, period)
    do update set
        current_value = usage_counters.current_value + p_delta,
        updated_at = now()
    returning current_value into new_value;
    return new_value;
end;
$function$;

create function public.queue_expiration_notifications()
returns integer
language plpgsql
security definer
as $function$
declare
    notif_count integer := 0;
    rec record;
begin
    for rec in
        select p.id as user_id, p.email, p.full_name, p.plan,
               p.subscription_expires_at
        from profiles p
        where p.subscription_status = 'active'
          and p.plan = 'pro'
          and p.subscription_expires_at is not null
          and p.subscription_expires_at::date =
              (current_date + interval '5 days')::date
          and not exists (
              select 1 from notifications_outbox n
              where n.user_id = p.id
                and n.type = 'EXPIRATION_5_DAYS'
                and n.created_at::date = current_date
          )
    loop
        insert into notifications_outbox (
            user_id, type, channel, status, payload, scheduled_for
        ) values (
            rec.user_id,
            'EXPIRATION_5_DAYS',
            'email',
            'pending',
            jsonb_build_object(
                'email_to', rec.email,
                'name', rec.full_name,
                'plan', rec.plan,
                'expires_at', rec.subscription_expires_at
            ),
            now()
        );
        notif_count := notif_count + 1;
    end loop;
    return notif_count;
end;
$function$;

create function public.auto_downgrade_expired_subscriptions()
returns integer
language plpgsql
security definer
as $function$
declare
    downgrade_count integer;
begin
    update profiles
    set plan = 'free',
        subscription_status = 'canceled',
        stripe_subscription_id = null
    where plan = 'pro'
      and subscription_expires_at is not null
      and subscription_expires_at < now()
      and subscription_status = 'active';
    get diagnostics downgrade_count = row_count;
    return downgrade_count;
end;
$function$;

grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.clients to anon, authenticated, service_role;
grant all on table public.transactions to anon, authenticated, service_role;
grant all on table public.appointments to anon, authenticated, service_role;
grant all on table public.ai_conversations to anon, authenticated, service_role;
grant all on table public.whatsapp_messages to anon, authenticated, service_role;
grant all on table public.usage_counters to anon, authenticated, service_role;
grant all on table public.notifications_outbox to anon, authenticated, service_role;
grant all on table public.availability to anon, authenticated, service_role;

revoke all on table public.stripe_webhook_events from anon, authenticated;
grant select, insert, update, delete
    on table public.stripe_webhook_events to service_role;
