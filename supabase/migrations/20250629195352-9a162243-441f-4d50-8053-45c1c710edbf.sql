
-- 1. Create new tables for unusual options activity
CREATE TABLE public.uoa_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ts TIMESTAMPTZ NOT NULL,
  symbol TEXT NOT NULL,
  expiry DATE NOT NULL,
  strike NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'put')),
  contracts INTEGER NOT NULL,
  traded_iv NUMERIC,
  option_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create dark pool activity table
CREATE TABLE public.dark_pool_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  dollar_volume NUMERIC NOT NULL,
  shares BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create macro state table
CREATE TABLE public.macro_state (
  snapshot_ts TIMESTAMPTZ PRIMARY KEY,
  vix NUMERIC,
  move NUMERIC,
  dxy NUMERIC,
  risk_regime TEXT CHECK (risk_regime IN ('risk_on', 'risk_off', 'neutral'))
);

-- 4. Alter daily_pick table to add new columns
ALTER TABLE public.daily_pick 
ADD COLUMN size_pct NUMERIC,
ADD COLUMN kelly_fraction NUMERIC,
ADD COLUMN uoa_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN dark_pool_flag BOOLEAN DEFAULT FALSE;

-- Enable Row Level Security on new tables
ALTER TABLE public.uoa_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dark_pool_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables (public read access)
CREATE POLICY "Anyone can read uoa events" ON public.uoa_events FOR SELECT USING (true);
CREATE POLICY "Service role can manage uoa events" ON public.uoa_events FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read dark pool activity" ON public.dark_pool_activity FOR SELECT USING (true);
CREATE POLICY "Service role can manage dark pool activity" ON public.dark_pool_activity FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read macro state" ON public.macro_state FOR SELECT USING (true);
CREATE POLICY "Service role can manage macro state" ON public.macro_state FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_uoa_events_symbol_event_ts ON public.uoa_events(symbol, event_ts DESC);
CREATE INDEX idx_uoa_events_contracts ON public.uoa_events(contracts DESC);
CREATE INDEX idx_dark_pool_activity_symbol_date ON public.dark_pool_activity(symbol, trade_date DESC);
CREATE INDEX idx_dark_pool_activity_dollar_volume ON public.dark_pool_activity(dollar_volume DESC);
CREATE INDEX idx_macro_state_snapshot_ts ON public.macro_state(snapshot_ts DESC);
