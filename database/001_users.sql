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

INSERT INTO public.users(email, password, type) VALUES ('admin@fakemarket.com', 'pass123', 'admin');
INSERT INTO public.users(email, password, type) VALUES ('samara@fakemarket.com', 'pass123', 'robot');
INSERT INTO public.users(email, password, type) VALUES ('patrick@fakemarket.com', 'pass123', 'robot');
INSERT INTO public.users(email, password, type) VALUES ('marta@fakemarket.com', 'pass123', 'robot');
INSERT INTO public.users(email, password, type) VALUES ('james@fakemarket.com', 'pass123', 'robot');
INSERT INTO public.users(email, password, type) VALUES ('philip@fakemarket.com', 'pass123', 'robot');

create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,  
  
  constraint resources_name_uq unique (name)
);

INSERT INTO public.resources(name) VALUES ('oil');
INSERT INTO public.resources(name) VALUES ('gold');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  resource_id uuid not null references resources(id) on delete restrict,
  
  type text not null,
  status text not null default 'PENDING',
  quantity integer not null,
  price numeric(20,4) not null,
  has_price_limit boolean not null default true,

  created timestamptz not null default now(),
  processed timestamptz
);

insert into public.orders (user_id, resource_id, type, quantity, price)
values (
  (select id from public.users where email = 'samara@fakemarket.com'),
  (select id from public.resources where name = 'oil'),
  'sell',
  1000,
  10.5
);

insert into public.orders (user_id, resource_id, type, quantity, price)
values (
  (select id from public.users where email = 'patrick@fakemarket.com'),
  (select id from public.resources where name = 'gold'),
  'sell',
  500,
  15.1
 );
