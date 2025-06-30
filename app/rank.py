
import os
import datetime
import psycopg2
import pandas as pd
import logging
import sys
from risk.kelly import calc_kelly
from utils.volatility import atr

# Set up logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')

UNIVERSE = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]

def sma_cross(df: pd.DataFrame, short=20, long=50) -> bool:
    """Check if short SMA is above long SMA (bullish signal)"""
    if len(df) < long:
        return False
    return df.close.rolling(short).mean().iloc[-1] > df.close.rolling(long).mean().iloc[-1]

def latest_candles(conn, sym, window=200):
    """Fetch latest price data for a symbol"""
    sql = """SELECT date, open, high, low, close FROM price_history
             WHERE symbol=%s ORDER BY date DESC LIMIT %s"""
    df = pd.read_sql(sql, conn, params=(sym, window))
    return df.sort_values("date").reset_index(drop=True)

def pick_trade(conn):
    """Find the best trade opportunity from the universe"""
    picks = []
    
    for sym in UNIVERSE:
        try:
            logging.info(f"Analyzing {sym}...")
            df = latest_candles(conn, sym)
            
            if len(df) < 60:
                logging.info(f"{sym}: Not enough data ({len(df)} candles)")
                continue
                
            if not sma_cross(df):
                logging.info(f"{sym}: No SMA crossover signal")
                continue
                
            entry = float(df.close.iloc[-1])
            tr_atr = atr(df, 14)
            stop = entry - tr_atr
            target = entry + 2 * tr_atr
            kelly = calc_kelly(0.55, 1.8)
            
            pick = {
                'symbol': sym,
                'entry': entry,
                'stop': stop,
                'target': target,
                'kelly_frac': kelly,
                'size_pct': round(kelly * 100, 1),
                'trade_type': 'long_stock',
                'reason_bullets': [
                    "20/50 SMA cross-over",
                    f"ATR-based target (ATR ≈ {tr_atr:.2f})",
                    f"Kelly size {round(kelly * 100, 1)}%"
                ]
            }
            
            picks.append(pick)
            logging.info(f"✓ {sym} qualified: Kelly={kelly:.3f}, Entry=${entry:.2f}")
            
        except Exception as e:
            logging.error(f"Error processing {sym}: {e}")
            continue
    
    if not picks:
        logging.warning("No qualifying picks found")
        return None
        
    best_pick = max(picks, key=lambda x: x["kelly_frac"])
    logging.info(f"Best pick: {best_pick['symbol']} with Kelly {best_pick['kelly_frac']:.3f}")
    return best_pick

def main():
    """Main entry point for the ranking engine"""
    logging.info("Starting ranking engine...")
    
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        logging.info("Database connected successfully")
        
        pick = pick_trade(conn)
        
        if not pick:
            logging.warning("No suitable trade candidates found")
            return
        
        # Insert the pick into database
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO daily_pick
                    (symbol, trade_type, entry, stop, target,
                     kelly_frac, size_pct, reason_bullets)
                    VALUES (%(symbol)s, %(trade_type)s, %(entry)s, %(stop)s,
                            %(target)s, %(kelly_frac)s, %(size_pct)s,
                            %(reason_bullets)s)
                """, pick)
        
        logging.info(f"✓ Successfully stored daily pick: {pick['symbol']}")
        conn.close()
        
    except Exception as e:
        logging.exception("Rank failed")
        raise

if __name__ == "__main__":
    try:
        main()
        logging.info("rank.py finished OK")
    except Exception as e:
        logging.exception("Rank failed")
        raise
