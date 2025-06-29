
-- Add unique constraints to fix the ON CONFLICT errors
ALTER TABLE price_history ADD CONSTRAINT price_history_symbol_date_unique UNIQUE (symbol, date);
ALTER TABLE news_sentiment ADD CONSTRAINT news_sentiment_symbol_headline_date_unique UNIQUE (symbol, headline, date);
ALTER TABLE pattern_signal ADD CONSTRAINT pattern_signal_symbol_scan_date_pattern_unique UNIQUE (symbol, scan_date, pattern);
ALTER TABLE daily_pick ADD CONSTRAINT daily_pick_date_unique UNIQUE (date);

-- Ensure symbols table has unique constraint
ALTER TABLE symbols ADD CONSTRAINT symbols_symbol_unique UNIQUE (symbol);
