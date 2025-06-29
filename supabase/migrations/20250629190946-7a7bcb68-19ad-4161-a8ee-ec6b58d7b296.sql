
-- Create symbols table
CREATE TABLE public.symbols (
  symbol TEXT PRIMARY KEY
);

-- Create price_history table with composite primary key
CREATE TABLE public.price_history (
  symbol TEXT NOT NULL REFERENCES public.symbols(symbol) ON DELETE CASCADE,
  date DATE NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume BIGINT NOT NULL,
  PRIMARY KEY (symbol, date)
);

-- Create option_history table with composite primary key
CREATE TABLE public.option_history (
  symbol TEXT NOT NULL REFERENCES public.symbols(symbol) ON DELETE CASCADE,
  expiry DATE NOT NULL,
  strike NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'put')),
  iv NUMERIC,
  oi INTEGER,
  close NUMERIC,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (symbol, expiry, strike, type, date)
);

-- Create daily_pick table for strategy results
CREATE TABLE public.daily_pick (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  strategy TEXT NOT NULL,
  symbol TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  sharpe_ratio NUMERIC NOT NULL,
  expected_return NUMERIC,
  risk_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pick ENABLE ROW LEVEL SECURITY;

-- RLS Policies for symbols (public read access)
CREATE POLICY "Anyone can read symbols" ON public.symbols FOR SELECT USING (true);
CREATE POLICY "Service role can manage symbols" ON public.symbols FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for price_history (public read access)
CREATE POLICY "Anyone can read price history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Service role can manage price history" ON public.price_history FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for option_history (public read access)
CREATE POLICY "Anyone can read option history" ON public.option_history FOR SELECT USING (true);
CREATE POLICY "Service role can manage option history" ON public.option_history FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for daily_pick (user-specific access)
CREATE POLICY "Users can view their own daily picks" ON public.daily_pick FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily picks" ON public.daily_pick FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage daily picks" ON public.daily_pick FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_price_history_symbol_date ON public.price_history(symbol, date DESC);
CREATE INDEX idx_option_history_symbol_expiry ON public.option_history(symbol, expiry, date DESC);
CREATE INDEX idx_daily_pick_user_date ON public.daily_pick(user_id, date DESC);
