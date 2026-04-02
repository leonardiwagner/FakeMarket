-- reset database
drop schema public cascade;
create schema public;

-- users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password text not null,
  type text not null default 'user',

  created timestamptz not null default now(),
  updated timestamptz not null default now(),

  constraint users_email_uq unique (email)
);

create index users_type_idx on users(type);

insert into public.users (id, email, password, type) values
  ('11111111-1111-1111-1111-111111111111', 'admin@fakemarket.com',   'pass123', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'samara@fakemarket.com',  'pass123', 'robot'),
  ('33333333-3333-3333-3333-333333333333', 'patrick@fakemarket.com', 'pass123', 'robot'),
  ('44444444-4444-4444-4444-444444444444', 'marta@fakemarket.com',   'pass123', 'robot'),
  ('55555555-5555-5555-5555-555555555555', 'james@fakemarket.com',   'pass123', 'robot'),
  ('66666666-6666-6666-6666-666666666666', 'kevin@fakemarket.com',   'pass123', 'robot');

-- resources
create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  constraint resources_name_uq unique (name)
);

insert into public.resources (id, name) values
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'usd'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'oil'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gold');

-- orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  resource_id uuid not null references resources(id) on delete restrict,

  type text not null,
  status text not null default 'pending',
  quantity integer not null,
  quantity_processed integer not null default 0,
  price integer not null,
  has_price_limit boolean not null default true,

  created timestamptz not null default now(),
  processed timestamptz
);

-- initial seed of resources via sell orders
insert into public.orders (
  id, user_id, resource_id, type, status, quantity, quantity_processed, price
) values
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sell', 'executed', 100000, 100000, 1000),
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sell', 'executed', 100000, 100000, 1500);

-- initial seed of buy orders to create some trades and populate the trade history
insert into public.orders (
  id, user_id, resource_id, type, status, quantity, quantity_processed, price
) values
  ('20000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'buy',  'executed', 100, 100, 1000),
  ('20000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'buy',  'executed', 100, 100, 1000),
  ('20000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'buy',  'executed', 100, 100, 1000),
  ('20000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'buy',  'executed', 100, 100, 1000),
  ('20000000-0000-0000-0000-000000000005', '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'buy',  'executed', 100, 100, 1000);

-- trades
create table trades (
  id uuid primary key default gen_random_uuid(),

  buy_order_id uuid not null references orders(id) on delete restrict,
  sell_order_id uuid not null references orders(id) on delete restrict,

  resource_id uuid not null references resources(id) on delete restrict,

  quantity integer not null,
  price integer not null,

  created timestamptz not null default now()
);

create index trades_resource_id_executed_at_idx on trades(resource_id, created desc);

-- initial trades to determine the initial market price of the resources
insert into public.trades (
  id, sell_order_id, buy_order_id, resource_id, quantity, price
) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1000),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1000),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1000),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1000),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1000);

-- holdings table that tracks the quantity of each resource held by each user
create table holdings (
    user_id uuid not null references users(id) on delete restrict,
    resource_id uuid not null references resources(id) on delete restrict,
    quantity integer not null default 0,
    quantity_reserved integer not null default 0,

    created timestamptz not null default now(),
    updated timestamptz not null default now(),

    constraint holdings_pk primary key (user_id, resource_id)
);

insert into holdings (user_id, resource_id, quantity) values
  -- update the holdings of the robot users for oil based on the executed buy orders
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),
  ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100),

  -- add USD dollars to the robot users so they can place buy orders
  ('22222222-2222-2222-2222-222222222222', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 10000),
  ('33333333-3333-3333-3333-333333333333', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 10000),
  ('44444444-4444-4444-4444-444444444444', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 10000),
  ('55555555-5555-5555-5555-555555555555', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 10000),
  ('66666666-6666-6666-6666-666666666666', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 10000);