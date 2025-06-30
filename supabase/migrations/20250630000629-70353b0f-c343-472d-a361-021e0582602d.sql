
-- Migration 001_assert_tables.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS price_history(
  symbol text NOT NULL,
  date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL,
  PRIMARY KEY(symbol, date)
);

CREATE TABLE IF NOT EXISTS daily_pick(
  pick_ts timestamptz DEFAULT now() PRIMARY KEY,
  symbol text NOT NULL,
  trade_type text NOT NULL,
  entry numeric NOT NULL,
  stop numeric NOT NULL,
  target numeric NOT NULL,
  kelly_frac numeric,
  size_pct numeric,
  reason_bullets text[]
);
