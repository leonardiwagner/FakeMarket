-- schema setup
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

-- resources
create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  constraint resources_name_uq unique (name)
);

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
  processed timestamptz,
  deleted timestamptz
);

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
