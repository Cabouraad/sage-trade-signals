
-- 1. Create new table for pattern signals
CREATE TABLE public.pattern_signal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  scan_date DATE NOT NULL,
  pattern TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add only the new columns to daily_pick (kelly_fraction already exists)
ALTER TABLE public.daily_pick 
ADD COLUMN reason_bullets TEXT[];

-- Enable Row Level Security on new table
ALTER TABLE public.pattern_signal ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pattern_signal (public read access)
CREATE POLICY "Anyone can read pattern signals" ON public.pattern_signal FOR SELECT USING (true);
CREATE POLICY "Service role can manage pattern signals" ON public.pattern_signal FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_pattern_signal_symbol_date ON public.pattern_signal(symbol, scan_date DESC);
CREATE INDEX idx_pattern_signal_confidence ON public.pattern_signal(confidence DESC);
CREATE INDEX idx_pattern_signal_pattern ON public.pattern_signal(pattern);

-- Create unique constraint to prevent duplicate patterns for same symbol on same date
CREATE UNIQUE INDEX idx_pattern_signal_unique ON public.pattern_signal(symbol, scan_date, pattern);
