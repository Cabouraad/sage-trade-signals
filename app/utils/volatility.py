
import pandas as pd

def atr(df, n=14):
    """Calculate Average True Range"""
    high = df.high
    low = df.low
    close = df.close
    
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)
    
    return tr.rolling(n).mean().iloc[-1]
