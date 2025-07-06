-- Add backtesting validation fields to options_strategies table
ALTER TABLE public.options_strategies 
ADD COLUMN backtest_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN backtest_win_rate NUMERIC,
ADD COLUMN backtest_trades INTEGER,
ADD COLUMN backtest_avg_profit NUMERIC,
ADD COLUMN backtest_avg_loss NUMERIC;