
-- Create news_sentiment table
CREATE TABLE public.news_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL REFERENCES public.symbols(symbol) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  sentiment_score NUMERIC,
  published_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.news_sentiment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_sentiment (public read access)
CREATE POLICY "Anyone can read news sentiment" ON public.news_sentiment FOR SELECT USING (true);
CREATE POLICY "Service role can manage news sentiment" ON public.news_sentiment FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_news_sentiment_symbol_date ON public.news_sentiment(symbol, date DESC);
CREATE INDEX idx_news_sentiment_published_at ON public.news_sentiment(published_at DESC);
