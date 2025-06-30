
-- Create comprehensive options trading tables
CREATE TABLE IF NOT EXISTS public.tradeable_symbols (
  symbol TEXT PRIMARY KEY,
  company_name TEXT,
  exchange TEXT,
  sector TEXT,
  market_cap BIGINT,
  avg_volume BIGINT,
  options_available BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced options data table
CREATE TABLE IF NOT EXISTS public.options_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  strike_price NUMERIC NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
  bid NUMERIC,
  ask NUMERIC,
  volume INTEGER,
  open_interest INTEGER,
  implied_volatility NUMERIC,
  delta NUMERIC,
  gamma NUMERIC,
  theta NUMERIC,
  vega NUMERIC,
  rho NUMERIC,
  theoretical_price NUMERIC,
  intrinsic_value NUMERIC,
  time_value NUMERIC,
  last_trade_price NUMERIC,
  last_trade_time TIMESTAMP WITH TIME ZONE,
  data_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, expiration_date, strike_price, option_type, data_timestamp)
);

-- Unusual options activity tracking
CREATE TABLE IF NOT EXISTS public.unusual_options_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  strike_price NUMERIC NOT NULL,
  option_type TEXT NOT NULL,
  volume INTEGER NOT NULL,
  avg_volume INTEGER,
  volume_ratio NUMERIC,
  premium_paid NUMERIC,
  underlying_price NUMERIC,
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  unusual_score NUMERIC,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Options strategy recommendations
CREATE TABLE IF NOT EXISTS public.options_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  legs JSONB NOT NULL, -- Array of option legs
  max_profit NUMERIC,
  max_loss NUMERIC,
  breakeven_points NUMERIC[],
  profit_probability NUMERIC,
  expected_return NUMERIC,
  risk_reward_ratio NUMERIC,
  days_to_expiration INTEGER,
  iv_rank NUMERIC,
  delta_exposure NUMERIC,
  theta_decay NUMERIC,
  confidence_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market volatility and sentiment data
CREATE TABLE IF NOT EXISTS public.market_volatility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  implied_volatility_30d NUMERIC,
  historical_volatility_30d NUMERIC,
  iv_percentile NUMERIC,
  iv_rank NUMERIC,
  skew NUMERIC,
  term_structure JSONB,
  vix_correlation NUMERIC,
  earnings_announcement DATE,
  dividend_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_options_chain_symbol_exp ON public.options_chain(symbol, expiration_date);
CREATE INDEX IF NOT EXISTS idx_options_chain_volume ON public.options_chain(volume DESC);
CREATE INDEX IF NOT EXISTS idx_uoa_symbol_date ON public.unusual_options_activity(symbol, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_symbol ON public.options_strategies(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_volatility_symbol ON public.market_volatility(symbol, updated_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.tradeable_symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unusual_options_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_volatility ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (service role manages writes)
CREATE POLICY "Public read access" ON public.tradeable_symbols FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON public.tradeable_symbols FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.options_chain FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON public.options_chain FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.unusual_options_activity FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON public.unusual_options_activity FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.options_strategies FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON public.options_strategies FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.market_volatility FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON public.market_volatility FOR ALL USING (auth.role() = 'service_role');
