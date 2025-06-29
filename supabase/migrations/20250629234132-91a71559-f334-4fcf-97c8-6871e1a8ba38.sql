
-- Migration 000_init.sql: Initialize core trading system tables

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS daily_pick CASCADE;
DROP TABLE IF EXISTS option_history CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS pattern_signal CASCADE;

-- Create price_history table for stock candles
CREATE TABLE price_history (
    symbol text NOT NULL,
    date date NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    volume bigint NOT NULL,
    PRIMARY KEY (symbol, date)
);

-- Create option_history table for option candles
CREATE TABLE option_history (
    symbol text NOT NULL,
    expiry date NOT NULL,
    strike numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('call', 'put')),
    date date NOT NULL,
    close numeric,
    iv numeric,
    oi integer,
    PRIMARY KEY (symbol, expiry, strike, type, date)
);

-- Create daily_pick table for final trade recommendations
CREATE TABLE daily_pick (
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

-- Create pattern_signal table for AI pattern recognition
CREATE TABLE pattern_signal (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol text NOT NULL,
    scan_date date NOT NULL,
    pattern text NOT NULL,
    confidence numeric NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_price_history_symbol_date ON price_history(symbol, date DESC);
CREATE INDEX idx_option_history_symbol_date ON option_history(symbol, date DESC);
CREATE INDEX idx_daily_pick_pick_ts ON daily_pick(pick_ts DESC);
CREATE INDEX idx_pattern_signal_scan_date ON pattern_signal(scan_date DESC);

-- Add some sample data if tables are empty (for testing)
INSERT INTO price_history (symbol, date, open, high, low, close, volume) VALUES
('AAPL', '2025-06-27', 230.00, 235.50, 228.75, 234.12, 50000000),
('AAPL', '2025-06-26', 228.50, 232.00, 227.25, 230.75, 45000000),
('MSFT', '2025-06-27', 420.00, 425.75, 418.50, 423.25, 25000000),
('MSFT', '2025-06-26', 415.25, 422.00, 414.75, 420.50, 28000000),
('NVDA', '2025-06-27', 890.00, 895.25, 885.50, 892.75, 35000000),
('NVDA', '2025-06-26', 885.75, 892.00, 882.25, 888.50, 40000000)
ON CONFLICT (symbol, date) DO NOTHING;
