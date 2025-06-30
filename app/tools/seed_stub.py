
import os
import psycopg2
import datetime as dt
import random

def main():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    today = dt.date.today()
    
    print("Seeding dummy price data...")
    
    for sym in ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]:
        print(f"Seeding {sym}...")
        base_price = 100 + random.random() * 100  # Random base price between 100-200
        
        for d in range(90):
            day = today - dt.timedelta(days=d)
            # Create realistic price movement
            price_change = (random.random() - 0.5) * 0.1  # +/- 5% max daily change
            price = base_price * (1 + price_change * (90 - d) / 90)  # Slight trend
            
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO price_history(symbol, date, open, high, low, close, volume)
                VALUES(%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING""",
                (sym, day, price, price * 1.02, price * 0.98, price, 1000000 + random.randint(0, 500000)))
            
        conn.commit()
    
    print("Dummy data seeded successfully!")
    conn.close()

if __name__ == "__main__": 
    main()
