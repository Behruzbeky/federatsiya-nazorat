-- Federatsiya Nazorat — Supabase (PostgreSQL) schema, stage 2 (after concept approval).
-- Mirrors the demo data model in js/data.js. Money is stored in whole so'm (bigint).

create extension if not exists pgcrypto with schema extensions;

-- ---------- Organisation hierarchy ----------
create type org_type as enum ('center', 'region', 'society');
create table organizations (
  id          text primary key,                 -- 'CENTER', 'R10', 'R10-S1'
  type        org_type not null,
  parent_id   text references organizations(id),
  name_uz     text not null, name_ru text, name_en text,
  bank_account text unique,
  created_at  timestamptz default now()
);
create table support_groups (
  id          text primary key,                 -- 'R10-S1-G1'
  society_id  text not null references organizations(id),
  number      int not null,
  head_member_id text
);

-- ---------- Users & roles (minimal-privilege, SoD) ----------
create type app_role as enum ('head', 'fin', 'region', 'chair', 'acc', 'group', 'auditor', 'admin');
create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        app_role not null,
  scope_org   text references organizations(id),      -- null = republic
  scope_group text references support_groups(id),
  mfa_required boolean default true
);

-- ---------- Members ----------
create type member_status as enum ('active', 'suspended', 'transferred', 'left');
create table members (
  id          text primary key,                 -- 'FN-000123'
  full_name   text not null,
  doc_no      text not null,
  joined_on   date not null,
  order_ref   text not null,                    -- admission order
  society_id  text not null references organizations(id),
  group_id    text references support_groups(id),
  status      member_status not null default 'active',
  phone       text,
  unique (full_name, doc_no)                    -- duplicate guard
);
create table member_events (                    -- admission / transfer / suspension / exit, with documents
  id bigserial primary key, member_id text references members(id), kind text not null,
  happened_on date not null, document_ref text not null, created_by uuid references profiles(user_id), created_at timestamptz default now()
);
create table benefits (
  id bigserial primary key, member_id text references members(id), kind text not null, discount numeric(4,3) not null,
  valid_from date not null, valid_to date, document_ref text
);

-- ---------- Tariffs & versioned allocation rules ----------
create table tariffs (
  id text primary key, monthly bigint not null, entry bigint not null,
  valid_from date not null, valid_to date, decision_ref text not null
);
create table allocation_rules (
  id text, version text, source text not null,   -- society | regionDirect | regionOther | regionFromSocieties | restricted
  basis text not null, valid_from date not null, valid_to date,
  parts jsonb,                                   -- [["region",20],["center",10],["society",60],["groups",10]]; null = not allocable
  primary key (id, version)
);

-- ---------- Charges, bank receipts, allocations ----------
create table charges (
  id bigserial primary key, member_id text references members(id), period date not null, kind text not null,
  tariff_id text references tariffs(id), amount bigint not null, discount bigint default 0,
  unique (member_id, period, kind)
);
create type receipt_status as enum ('matched', 'unclear', 'duplicate');
create table bank_transactions (
  id text primary key,                           -- bank operation id => one payment is never counted twice
  booked_on date not null, amount bigint not null check (amount > 0),
  payer text, account text, purpose text,
  society_id text references organizations(id),
  status receipt_status not null default 'unclear',
  source_kind text not null default 'society',   -- drives the allocation rule
  allocated boolean not null default false,      -- re-allocation guard
  imported_by uuid references profiles(user_id), imported_at timestamptz default now()
);
create table payments (                          -- bank money matched to members' charges
  id bigserial primary key, transaction_id text references bank_transactions(id), member_id text references members(id),
  charge_id bigint references charges(id), amount bigint not null
);
create table allocations (
  id bigserial primary key, transaction_id text not null references bank_transactions(id),
  rule_id text not null, rule_version text not null, direction text not null,
  pct numeric(5,2) not null, amount bigint not null, calculated_at timestamptz default now(),
  foreign key (rule_id, rule_version) references allocation_rules(id, version)
);

-- ---------- Transfer obligations ----------
create type obligation_status as enum ('pending', 'ordered', 'done', 'doneLate', 'partial', 'unconfirmed', 'overdue');
create table obligations (
  id text primary key, from_org text references organizations(id), to_org text references organizations(id),
  period date not null, rule_id text not null, pct numeric(5,2) not null, amount bigint not null,
  due_on date not null,                          -- n-th working day of next month
  paid bigint not null default 0, status obligation_status not null default 'pending'
);
create table payment_orders (
  id text primary key, obligation_id text references obligations(id), issued_on date not null, amount bigint not null,
  created_by uuid references profiles(user_id)
);
create table bank_confirmations (
  id bigserial primary key, obligation_id text references obligations(id), transaction_ref text not null, confirmed_on date not null,
  amount bigint not null, confirmed_by uuid references profiles(user_id)
);
-- Identity columns are stamped server-side from auth.uid(); clients cannot spoof them.
create or replace function stamp_created_by() returns trigger language plpgsql set search_path = '' as $$
begin new.created_by := auth.uid(); return new; end $$;
create trigger trg_order_author before insert on payment_orders for each row execute function stamp_created_by();
create trigger trg_event_author before insert on member_events for each row execute function stamp_created_by();
create or replace function stamp_imported_by() returns trigger language plpgsql set search_path = '' as $$
begin new.imported_by := auth.uid(); return new; end $$;
create trigger trg_import_author before insert on bank_transactions for each row execute function stamp_imported_by();

-- separation of duties: whoever issued the order cannot confirm it
create or replace function enforce_sod() returns trigger language plpgsql set search_path = '' as $$
begin
  new.confirmed_by := auth.uid();
  if exists (select 1 from public.payment_orders p where p.obligation_id = new.obligation_id and p.created_by = new.confirmed_by) then
    raise exception 'Separation of duties: order author cannot confirm the payment';
  end if;
  return new;
end $$;
create trigger trg_sod before insert on bank_confirmations for each row execute function enforce_sod();

-- ---------- Support groups funds, registers, calendar ----------
create table group_expenses (
  id bigserial primary key, group_id text references support_groups(id), spent_on date not null, title text not null,
  amount bigint not null, document_ref text                      -- null => flagged as undocumented
);
create table register_submissions (
  id bigserial primary key, org_id text references organizations(id), period date not null, due_on date not null,
  submitted_at timestamptz, version int not null default 1, file_path text
);
create table holidays (day date primary key, title text);

-- ---------- Notifications / tasks ----------
create table tasks (
  id bigserial primary key, kind text not null, object_ref text not null, assignee_role app_role not null,
  escalation_level int not null default 1, opened_at timestamptz default now(), measures text, closed_at timestamptz, closed_by uuid
);

-- ---------- Audit log (append-only, written only by the server) ----------
create table audit_log (
  id bigserial primary key, at timestamptz not null default now(), user_id uuid, kind text not null,
  object_ref text, basis text, payload jsonb, ip inet,
  prev_hash text, hash text                                   -- hash chain makes tampering detectable
);
revoke insert, update, delete, truncate on audit_log from anon, authenticated;
create or replace function audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger trg_audit_immutable before update or delete on audit_log for each row execute function audit_immutable();
create or replace function write_audit(p_kind text, p_object text, p_basis text, p_payload jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_prev text;
begin
  select hash into v_prev from public.audit_log order by id desc limit 1;
  insert into public.audit_log (user_id, kind, object_ref, basis, payload, prev_hash, hash)
  values (auth.uid(), p_kind, p_object, p_basis, p_payload, v_prev,
          encode(extensions.digest(coalesce(v_prev, '') || coalesce(auth.uid()::text, '') || p_kind || coalesce(p_object, '') || now()::text, 'sha256'), 'hex'));
end $$;
revoke all on function write_audit(text, text, text, jsonb) from public, anon;
grant execute on function write_audit(text, text, text, jsonb) to authenticated;

-- ---------- Row-level security ----------
-- RLS on EVERY table; anon gets nothing; access requires a profile and MFA (aal2).
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

create or replace function my_role() returns app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.user_id = auth.uid() $$;
create or replace function my_group() returns text language sql stable security definer set search_path = '' as $$
  select p.scope_group from public.profiles p where p.user_id = auth.uid() $$;
create or replace function mfa_ok() returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;
-- republic-wide only for explicit central roles; no profile => no access
create or replace function is_republic() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.scope_org is null and p.role in ('head', 'fin', 'auditor', 'admin')) $$;
create or replace function in_scope(org text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.mfa_ok() and (public.is_republic() or exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.scope_org is not null
      and (org = p.scope_org or exists (select 1 from public.organizations o where o.id = org and o.parent_id = p.scope_org)))) $$;

-- profiles: read own row only; changes only via an admin RPC (no client insert/update/delete)
create policy profiles_self on profiles for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on profiles from authenticated;

create policy org_read on organizations for select to authenticated using (mfa_ok() and my_role() is not null);
create policy groups_read on support_groups for select to authenticated using (in_scope(society_id));
create policy rules_read on allocation_rules for select to authenticated using (mfa_ok() and my_role() is not null);
create policy tariffs_read on tariffs for select to authenticated using (mfa_ok() and my_role() is not null);
create policy holidays_read on holidays for select to authenticated using (mfa_ok() and my_role() is not null);

-- group heads see only their own group; expose doc_no/phone to group/auditor roles only via a restricted view
create policy members_read on members for select to authenticated using (
  in_scope(society_id) and (my_role() <> 'group' or group_id = my_group()));
create policy events_read on member_events for select to authenticated using (exists (select 1 from members m where m.id = member_id));
create policy benefits_read on benefits for select to authenticated using (exists (select 1 from members m where m.id = member_id));
create policy charges_read on charges for select to authenticated using (exists (select 1 from members m where m.id = member_id));
create policy bank_read on bank_transactions for select to authenticated using (in_scope(society_id) and my_role() <> 'group');
create policy payments_read on payments for select to authenticated using (exists (select 1 from bank_transactions b where b.id = transaction_id));
create policy alloc_read on allocations for select to authenticated using (exists (select 1 from bank_transactions b where b.id = transaction_id));
create policy obligations_read on obligations for select to authenticated using (in_scope(from_org) or in_scope(to_org));
create policy orders_read on payment_orders for select to authenticated using (exists (select 1 from obligations o where o.id = obligation_id));
create policy conf_read on bank_confirmations for select to authenticated using (exists (select 1 from obligations o where o.id = obligation_id));
create policy expenses_read on group_expenses for select to authenticated using (exists (select 1 from support_groups g where g.id = group_id));
create policy registers_read on register_submissions for select to authenticated using (in_scope(org_id));
create policy tasks_read on tasks for select to authenticated using (mfa_ok() and (my_role() = assignee_role or is_republic()));
create policy audit_read on audit_log for select to authenticated using (mfa_ok() and my_role() in ('auditor', 'admin', 'fin'));

-- writes: accountants/finance enter data, approvers confirm; always in scope and with MFA
create policy bank_insert on bank_transactions for insert to authenticated with check (in_scope(society_id) and my_role() in ('acc', 'fin'));
create policy orders_insert on payment_orders for insert to authenticated with check (my_role() in ('acc', 'fin') and exists (select 1 from obligations o where o.id = obligation_id));
create policy conf_insert on bank_confirmations for insert to authenticated with check (my_role() in ('fin', 'chair', 'region', 'head') and exists (select 1 from obligations o where o.id = obligation_id));
-- Supabase dashboard: disable public sign-ups and require MFA enrolment for all staff.
