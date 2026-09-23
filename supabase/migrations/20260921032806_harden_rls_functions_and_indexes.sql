-- Security and performance hardening applied after the verified baseline.

create extension if not exists btree_gist with schema extensions;

create index if not exists idx_transactions_client_id
    on public.transactions(client_id);
create index if not exists idx_appointments_client_id
    on public.appointments(client_id);
create index if not exists idx_whatsapp_messages_client_id
    on public.whatsapp_messages(client_id);

alter table public.appointments
    add constraint appointments_no_overlapping_times
    exclude using gist (
        user_id with =,
        tsrange(
            date at time zone 'UTC',
            (date at time zone 'UTC')
                + pg_catalog.make_interval(mins => duration_minutes),
            '[)'
        ) with &&
    )
    where (status <> 'cancelado');

alter table public.availability
    add constraint availability_valid_window
    check (end_time > start_time) not valid;
alter table public.availability
    validate constraint availability_valid_window;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
    new.updated_at = pg_catalog.now();
    return new;
end;
$function$;

create or replace function public.increment_usage_counter(
    p_user_id uuid,
    p_metric text,
    p_period text default 'all',
    p_delta integer default 1
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    new_value integer;
begin
    insert into public.usage_counters (
        user_id, metric, period, current_value
    )
    values (p_user_id, p_metric, p_period, p_delta)
    on conflict (user_id, metric, period)
    do update set
        current_value = public.usage_counters.current_value + p_delta,
        updated_at = pg_catalog.now()
    returning current_value into new_value;
    return new_value;
end;
$function$;

create or replace function public.reserve_stripe_webhook_event(
    p_event_id text,
    p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
    claimed boolean := false;
begin
    insert into public.stripe_webhook_events (
        id, event_type, status, processed_at, error_message
    )
    values (p_event_id, p_event_type, 'processing', null, null)
    on conflict (id) do update
    set event_type = excluded.event_type,
        status = 'processing',
        processed_at = null,
        error_message = null
    where public.stripe_webhook_events.status = 'failed';
    claimed := found;
    return claimed;
end;
$function$;

create or replace function public.queue_expiration_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    notif_count integer := 0;
    rec record;
begin
    for rec in
        select p.id as user_id, p.email, p.full_name, p.plan,
               p.subscription_expires_at
        from public.profiles as p
        where p.subscription_status = 'active'
          and p.plan = 'pro'
          and p.subscription_expires_at is not null
          and p.subscription_expires_at::date =
              (current_date + interval '5 days')::date
          and not exists (
              select 1
              from public.notifications_outbox as n
              where n.user_id = p.id
                and n.type = 'EXPIRATION_5_DAYS'
                and n.created_at::date = current_date
          )
    loop
        insert into public.notifications_outbox (
            user_id, type, channel, status, payload, scheduled_for
        ) values (
            rec.user_id,
            'EXPIRATION_5_DAYS',
            'email',
            'pending',
            pg_catalog.jsonb_build_object(
                'email_to', rec.email,
                'name', rec.full_name,
                'plan', rec.plan,
                'expires_at', rec.subscription_expires_at
            ),
            pg_catalog.now()
        );
        notif_count := notif_count + 1;
    end loop;
    return notif_count;
end;
$function$;

create or replace function public.auto_downgrade_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    downgrade_count integer;
begin
    update public.profiles
    set plan = 'free',
        subscription_status = 'canceled',
        stripe_subscription_id = null
    where plan = 'pro'
      and subscription_expires_at is not null
      and subscription_expires_at < pg_catalog.now()
      and subscription_status = 'active';
    get diagnostics downgrade_count = row_count;
    return downgrade_count;
end;
$function$;

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all tables in schema public from authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, business_name)
    on table public.profiles to authenticated;
grant select, insert, update, delete
    on table public.clients to authenticated;
grant select, insert, update, delete
    on table public.transactions to authenticated;
grant select, insert, update, delete
    on table public.appointments to authenticated;
grant select, insert, update, delete
    on table public.availability to authenticated;

grant all privileges on all tables in schema public to service_role;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);
create policy "Users can update own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can manage own clients"
    on public.clients for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own transactions" on public.transactions;
create policy "Users can manage own transactions"
    on public.transactions for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own appointments" on public.appointments;
create policy "Users can manage own appointments"
    on public.appointments for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own availability" on public.availability;
create policy "Users can manage own availability"
    on public.availability for all to authenticated
    using ((select auth.uid()) = tenant_id)
    with check ((select auth.uid()) = tenant_id);

drop policy if exists "Users can view own AI conversations"
    on public.ai_conversations;
create policy "Users can view own AI conversations"
    on public.ai_conversations for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own WhatsApp messages"
    on public.whatsapp_messages;
create policy "Users can view own WhatsApp messages"
    on public.whatsapp_messages for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own usage counters"
    on public.usage_counters;
create policy "Users can view own usage counters"
    on public.usage_counters for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own notifications"
    on public.notifications_outbox;
create policy "Users can view own notifications"
    on public.notifications_outbox for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "Service role manages Stripe webhook events"
    on public.stripe_webhook_events for all to service_role
    using (true)
    with check (true);

revoke execute on function public.update_updated_at()
    from public, anon, authenticated;
revoke execute on function public.increment_usage_counter(uuid, text, text, integer)
    from public, anon, authenticated;
revoke execute on function public.queue_expiration_notifications()
    from public, anon, authenticated;
revoke execute on function public.auto_downgrade_expired_subscriptions()
    from public, anon, authenticated;
revoke execute on function public.reserve_stripe_webhook_event(text, text)
    from public, anon, authenticated;

grant execute on function public.increment_usage_counter(uuid, text, text, integer)
    to service_role;
grant execute on function public.queue_expiration_notifications()
    to service_role;
grant execute on function public.auto_downgrade_expired_subscriptions()
    to service_role;
grant execute on function public.reserve_stripe_webhook_event(text, text)
    to service_role;

alter default privileges for role postgres in schema public
    revoke execute on functions from public;
