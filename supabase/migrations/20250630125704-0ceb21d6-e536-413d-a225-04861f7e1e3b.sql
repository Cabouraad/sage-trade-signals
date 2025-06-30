
-- SQL helpers for the TypeScript edge function
-- a) list all symbols with ≥60 rows
CREATE OR REPLACE FUNCTION list_symbols_with_history()
RETURNS TABLE(symbol text) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT ph.symbol FROM price_history ph
               GROUP BY ph.symbol HAVING COUNT(*) >= 60;
END$$;

-- b) dev-only seeder (90 dummy days for 5 mega-caps)
CREATE OR REPLACE FUNCTION seed_stub_data() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  start_date date := CURRENT_DATE - 89;
  symbols text[] := ARRAY['AAPL','MSFT','NVDA','TSLA','AMZN'];
  s text;
  d int;
  price numeric;
BEGIN
  IF (SELECT COUNT(*) FROM price_history) > 0 THEN RETURN; END IF;
  FOREACH s IN ARRAY symbols LOOP
    FOR d IN 0..89 LOOP
      price := 100 + random()*20;
      INSERT INTO price_history(symbol,date,open,high,low,close,volume)
      VALUES (s, start_date+d, price, price*1.01, price*0.99, price, 1000000)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END$$;
