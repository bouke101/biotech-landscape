-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type company_stage as enum (
  'Stealth', 'Pre-seed', 'Seed', 'Series A', 'Series B',
  'Series C', 'Series D+', 'Public', 'Acquired'
);

create type business_model as enum ('B2B', 'B2C', 'Licensing', 'Platform', 'Mixed');

create type investor_type as enum (
  'VC', 'CVC', 'Family Office', 'Government', 'Accelerator', 'Angel', 'PE'
);

create type deal_type as enum (
  'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C',
  'Series D+', 'Grant', 'IPO', 'M&A', 'Convertible'
);

create type currency as enum ('USD', 'EUR', 'GBP');

-- ─────────────────────────────────────────────
-- COMPANIES
-- ─────────────────────────────────────────────
create table companies (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  founded_year          smallint,
  hq_city               text,
  hq_country            text,
  hq_region             text,
  sectors               text[] not null default '{}',
  technology_platform   text,
  stage                 company_stage,
  employees_approx      int,
  total_funding_usd     numeric(15,0),
  latest_valuation_usd  numeric(15,0),
  key_products          text,
  business_model        business_model,
  partnerships          text,
  ceo                   text,
  cso                   text,
  cto                   text,
  website               text,
  notes                 text,
  on_watchlist          boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index companies_fts on companies
  using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(technology_platform,'')));
create index companies_sectors_idx on companies using gin(sectors);
create index companies_stage_idx   on companies (stage);
create index companies_region_idx  on companies (hq_region);

-- ─────────────────────────────────────────────
-- INVESTORS
-- ─────────────────────────────────────────────
create table investors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  investor_type       investor_type,
  hq_country          text,
  hq_region           text,
  focus_sectors       text[] not null default '{}',
  focus_stages        text[] not null default '{}',
  geographic_focus    text[] not null default '{}',
  fund_size_usd       numeric(15,0),
  typical_check_min   numeric(12,0),
  typical_check_max   numeric(12,0),
  notable_portfolio   text[],
  key_partners        text,
  co_investment_pref  text,
  website             text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index investors_sectors_idx on investors using gin(focus_sectors);
create index investors_geo_idx     on investors using gin(geographic_focus);

-- ─────────────────────────────────────────────
-- DEALS
-- ─────────────────────────────────────────────
create table deals (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete set null,
  company_name    text not null,
  deal_type       deal_type not null,
  amount          numeric(15,0),
  currency        currency not null default 'EUR',
  amount_usd      numeric(15,0),
  deal_date       date not null,
  lead_investors  text[],
  co_investors    text[],
  valuation_pre   numeric(15,0),
  valuation_post  numeric(15,0),
  use_of_funds    text,
  source_url      text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index deals_company_idx on deals (company_id);
create index deals_date_idx    on deals (deal_date desc);
create index deals_type_idx    on deals (deal_type);

-- ─────────────────────────────────────────────
-- TRENDS
-- ─────────────────────────────────────────────
create table trends (
  id                  uuid primary key default gen_random_uuid(),
  theme               text not null,
  slug                text not null unique,
  related_sectors     text[] not null default '{}',
  geographic_momentum text,
  key_companies       text[],
  key_investors       text[],
  timeline_stage      text,
  evidence            text,
  analysis_note       text,
  published           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index trends_sectors_idx on trends using gin(related_sectors);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on companies
  for each row execute function update_updated_at();
create trigger set_updated_at before update on investors
  for each row execute function update_updated_at();
create trigger set_updated_at before update on deals
  for each row execute function update_updated_at();
create trigger set_updated_at before update on trends
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table companies enable row level security;
alter table investors  enable row level security;
alter table deals      enable row level security;
alter table trends     enable row level security;

create policy "auth_all" on companies for all to authenticated using (true) with check (true);
create policy "auth_all" on investors  for all to authenticated using (true) with check (true);
create policy "auth_all" on deals      for all to authenticated using (true) with check (true);
create policy "auth_all" on trends     for all to authenticated using (true) with check (true);

create policy "anon_read" on companies for select to anon using (true);
create policy "anon_read" on investors  for select to anon using (true);
create policy "anon_read" on deals      for select to anon using (true);
create policy "anon_read" on trends     for select to anon using (published = true);
