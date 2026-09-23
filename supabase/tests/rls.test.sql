begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

insert into auth.users (id, email)
values
    ('00000000-0000-0000-0000-000000000001', 'tenant-a@example.test'),
    ('00000000-0000-0000-0000-000000000002', 'tenant-b@example.test');

insert into public.profiles (id, full_name, email)
values
    ('00000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a@example.test'),
    ('00000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b@example.test');

insert into public.clients (id, user_id, name)
values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Client A'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Client B');

insert into public.transactions (
    id, user_id, client_id, description, amount, date, type
)
values
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Revenue A', 10, current_date, 'receita'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Revenue B', 20, current_date, 'receita');

insert into public.appointments (
    id, user_id, client_id, title, date
)
values
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Appointment A', now()),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Appointment B', now());

select ok(
    exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_no_overlapping_times'
          and contype = 'x'
    ),
    'appointments reject overlapping intervals'
);
select throws_like(
    $$insert into public.appointments (
          id, user_id, client_id, title, date
      ) values (
          '30000000-0000-0000-0000-000000000003',
          '00000000-0000-0000-0000-000000000001',
          '10000000-0000-0000-0000-000000000001',
          'Overlapping appointment',
          now()
      )$$,
    '%violates exclusion constraint%',
    'database closes the appointment conflict race'
);

insert into public.availability (
    id, tenant_id, weekday, start_time, end_time
)
values
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, '09:00', '17:00'),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 2, '09:00', '17:00');

select is(
    (select relrowsecurity from pg_class where oid = 'public.clients'::regclass),
    true,
    'clients has RLS enabled'
);
select is(
    (select relrowsecurity from pg_class where oid = 'public.transactions'::regclass),
    true,
    'transactions has RLS enabled'
);
select is(
    (select relrowsecurity from pg_class where oid = 'public.appointments'::regclass),
    true,
    'appointments has RLS enabled'
);
select is(
    (select relrowsecurity from pg_class where oid = 'public.availability'::regclass),
    true,
    'availability has RLS enabled'
);

set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000001',
    true
);

select results_eq(
    $$select user_id::text from public.clients order by user_id$$,
    array['00000000-0000-0000-0000-000000000001']::text[],
    'tenant A sees only its clients'
);
select results_eq(
    $$select user_id::text from public.transactions order by user_id$$,
    array['00000000-0000-0000-0000-000000000001']::text[],
    'tenant A sees only its transactions'
);
select results_eq(
    $$select user_id::text from public.appointments order by user_id$$,
    array['00000000-0000-0000-0000-000000000001']::text[],
    'tenant A sees only its appointments'
);
select results_eq(
    $$select tenant_id::text from public.availability order by tenant_id$$,
    array['00000000-0000-0000-0000-000000000001']::text[],
    'tenant A sees only its availability'
);

select throws_ok(
    $$insert into public.clients (user_id, name)
      values ('00000000-0000-0000-0000-000000000002', 'Cross tenant')$$,
    '42501',
    'new row violates row-level security policy for table "clients"',
    'tenant A cannot insert a client for tenant B'
);

reset role;
set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '00000000-0000-0000-0000-000000000002',
    true
);

select results_eq(
    $$select user_id::text from public.clients order by user_id$$,
    array['00000000-0000-0000-0000-000000000002']::text[],
    'tenant B sees only its clients'
);
select results_eq(
    $$select user_id::text from public.transactions order by user_id$$,
    array['00000000-0000-0000-0000-000000000002']::text[],
    'tenant B sees only its transactions'
);
select results_eq(
    $$select user_id::text from public.appointments order by user_id$$,
    array['00000000-0000-0000-0000-000000000002']::text[],
    'tenant B sees only its appointments'
);
select results_eq(
    $$select tenant_id::text from public.availability order by tenant_id$$,
    array['00000000-0000-0000-0000-000000000002']::text[],
    'tenant B sees only its availability'
);

reset role;
set local role anon;
select throws_ok(
    $$select * from public.clients$$,
    '42501',
    'permission denied for table clients',
    'anonymous users cannot read clients'
);

reset role;
select is(
    has_function_privilege(
        'authenticated',
        'public.increment_usage_counter(uuid,text,text,integer)',
        'execute'
    ),
    false,
    'authenticated cannot execute privileged counter RPC'
);
select is(
    has_function_privilege(
        'service_role',
        'public.increment_usage_counter(uuid,text,text,integer)',
        'execute'
    ),
    true,
    'service role can execute privileged counter RPC'
);

set local role service_role;
select is(
    public.reserve_stripe_webhook_event('evt_test_cycle02', 'invoice.paid'),
    true,
    'first Stripe event reservation succeeds'
);
select is(
    public.reserve_stripe_webhook_event('evt_test_cycle02', 'invoice.paid'),
    false,
    'duplicate Stripe event reservation is ignored'
);
update public.stripe_webhook_events
set status = 'failed'
where id = 'evt_test_cycle02';
select is(
    public.reserve_stripe_webhook_event('evt_test_cycle02', 'invoice.paid'),
    true,
    'failed Stripe event may be retried'
);

reset role;
select is(
    (
        select count(*)::integer
        from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in (
              'update_updated_at',
              'increment_usage_counter',
              'queue_expiration_notifications',
              'auto_downgrade_expired_subscriptions',
              'reserve_stripe_webhook_event'
          )
          and proconfig @> array['search_path=""']::text[]
    ),
    5,
    'all application functions pin an empty search_path'
);

select has_index(
    'public',
    'transactions',
    'idx_transactions_client_id',
    'transactions client FK is indexed'
);
select has_index(
    'public',
    'appointments',
    'idx_appointments_client_id',
    'appointments client FK is indexed'
);
select has_index(
    'public',
    'whatsapp_messages',
    'idx_whatsapp_messages_client_id',
    'WhatsApp client FK is indexed'
);

select * from finish();
rollback;
