-- ============================================================
-- One Piece TCG Price API - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── CARDS ───────────────────────────────────────────────────────────────────
create table if not exists cards (
  id              uuid primary key default gen_random_uuid(),
  tcgplayer_id    integer unique not null,
  name            text not null,
  set_name        text not null default '',
  set_code        text not null default '',
  card_number     text not null default '',
  rarity          text not null default '',
  image_url       text,
  tcgplayer_url   text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_cards_tcgplayer_id on cards(tcgplayer_id);
create index if not exists idx_cards_name on cards using gin(to_tsvector('english', name));
create index if not exists idx_cards_set_code on cards(set_code);

-- ─── PRICE SNAPSHOTS ─────────────────────────────────────────────────────────
-- Each row = one scrape of TCGPlayer prices for a card
create table if not exists price_snapshots (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references cards(id) on delete cascade,
  market_price     numeric(10,2),
  low_price        numeric(10,2),
  mid_price        numeric(10,2),
  high_price       numeric(10,2),
  direct_low_price numeric(10,2),
  last_sale_price  numeric(10,2),
  scraped_at       timestamptz not null default now()
);

create index if not exists idx_snapshots_card_id on price_snapshots(card_id);
create index if not exists idx_snapshots_scraped_at on price_snapshots(scraped_at desc);

-- ─── SALE HISTORY ────────────────────────────────────────────────────────────
-- Individual completed sales scraped from TCGPlayer sales history
create table if not exists sale_history (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references cards(id) on delete cascade,
  sale_price  numeric(10,2) not null,
  sale_date   text not null,     -- stored as string to match TCGPlayer format
  condition   text not null default 'Near Mint',
  scraped_at  timestamptz not null default now(),
  unique (card_id, sale_date, sale_price)
);

create index if not exists idx_sales_card_id on sale_history(card_id);
create index if not exists idx_sales_sale_date on sale_history(sale_date desc);

-- ─── HELPER VIEWS ────────────────────────────────────────────────────────────

-- Latest price for each card
create or replace view latest_prices as
select distinct on (card_id)
  card_id,
  market_price,
  low_price,
  mid_price,
  high_price,
  direct_low_price,
  last_sale_price,
  scraped_at
from price_snapshots
order by card_id, scraped_at desc;

-- 7-day average price per card
create or replace view avg_prices_7d as
select
  card_id,
  round(avg(coalesce(market_price, mid_price)), 2) as avg_price,
  min(coalesce(market_price, mid_price))           as min_price,
  max(coalesce(market_price, mid_price))           as max_price,
  count(*)                                         as data_points
from price_snapshots
where scraped_at >= now() - interval '7 days'
group by card_id;

-- 30-day average price per card
create or replace view avg_prices_30d as
select
  card_id,
  round(avg(coalesce(market_price, mid_price)), 2) as avg_price,
  min(coalesce(market_price, mid_price))           as min_price,
  max(coalesce(market_price, mid_price))           as max_price,
  count(*)                                         as data_points
from price_snapshots
where scraped_at >= now() - interval '30 days'
group by card_id;

-- ─── USER PHYSICAL INVENTORY ──────────────────────────────────────────────────
-- Registro de cartas físicas que el usuario posee, cantidad y precio de compra
create table if not exists user_inventory (
  id              uuid primary key default gen_random_uuid(),
  card_id         uuid not null references cards(id) on delete cascade,
  quantity        integer not null default 1,
  purchase_price  numeric(10,2) not null default 0.00,
  condition       text not null default 'Near Mint',
  notes           text default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_user_inventory_card_id on user_inventory(card_id);
create index if not exists idx_user_inventory_created_at on user_inventory(created_at desc);

