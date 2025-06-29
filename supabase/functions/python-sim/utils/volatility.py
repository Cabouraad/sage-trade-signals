
"""
Volatility and risk measurement utilities
"""
import pandas as pd
import numpy as np

def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculate Average True Range (ATR)
    
    Args:
        df: DataFrame with 'high', 'low', 'close' columns
        period: ATR calculation period
    
    Returns:
        Series with ATR values
    """
    if not all(col in df.columns for col in ['high', 'low', 'close']):
        raise ValueError("DataFrame must have 'high', 'low', 'close' columns")
    
    # Calculate True Range components
    tr1 = df['high'] - df['low']  # Current high - current low
    tr2 = abs(df['high'] - df['close'].shift(1))  # Current high - previous close
    tr3 = abs(df['low'] - df['close'].shift(1))   # Current low - previous close
    
    # True Range is the maximum of the three components
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # ATR is the moving average of True Range
    atr_values = true_range.rolling(window=period).mean()
    
    return atr_values

def hist_vol(df: pd.DataFrame, window: int = 30) -> float:
    """
    Calculate historical volatility using log returns
    
    Args:
        df: DataFrame with 'close' column
        window: Rolling window for volatility calculation
    
    Returns:
        Annualized historical volatility
    """
    if 'close' not in df.columns:
        raise ValueError("DataFrame must have 'close' column")
    
    # Calculate log returns
    log_returns = np.log(df['close'] / df['close'].shift(1))
    
    # Calculate rolling standard deviation
    rolling_vol = log_returns.rolling(window=window).std()
    
    # Annualize (assuming 252 trading days)
    annualized_vol = rolling_vol.iloc[-1] * np.sqrt(252)
    
    return float(annualized_vol) if not np.isnan(annualized_vol) else 0.0

def garch_vol(df: pd.DataFrame, window: int = 252) -> float:
    """
    Simplified GARCH-like volatility estimate
    
    Args:
        df: DataFrame with 'close' column
        window: Lookback window
    
    Returns:
        GARCH-like volatility estimate
    """
    if 'close' not in df.columns or len(df) < window:
        return hist_vol(df, min(window, len(df) // 2))
    
    returns = df['close'].pct_change().dropna()
    
    # Simple EWMA volatility (like GARCH)
    alpha = 0.06  # Decay factor
    
    vol_estimate = 0
    for i, ret in enumerate(returns.tail(window)):
        weight = (1 - alpha) ** (len(returns.tail(window)) - i - 1)
        vol_estimate += weight * (ret ** 2)
    
    return np.sqrt(vol_estimate * 252)  # Annualize

def realized_vol(df: pd.DataFrame, freq: str = 'D') -> float:
    """
    Calculate realized volatility from high-frequency data
    
    Args:
        df: DataFrame with price data
        freq: Frequency for volatility calculation
    
    Returns:
        Realized volatility
    """
    # For daily data, use standard historical volatility
    if freq == 'D':
        return hist_vol(df)
    
    # For higher frequency, sum squared returns
    returns = df['close'].pct_change().dropna()
    realized_var = (returns ** 2).sum()
    
    # Scale to daily and annualize
    if freq == 'H':  # Hourly
        daily_var = realized_var * 24
    elif freq == 'M':  # Minute
        daily_var = realized_var * 24 * 60
    else:
        daily_var = realized_var
    
    return np.sqrt(daily_var * 252)

def vol_surface_point(df: pd.DataFrame, moneyness: float = 1.0, dte: int = 30) -> float:
    """
    Estimate implied volatility for a given moneyness and days to expiry
    This is a simplified model - in practice you'd use actual options data
    
    Args:
        df: Underlying price data
        moneyness: Strike/Spot ratio
        dte: Days to expiry
    
    Returns:
        Estimated implied volatility
    """
    base_vol = hist_vol(df)
    
    # Volatility smile/skew adjustments
    skew_adjustment = 0.05 * (1 - moneyness)  # Put skew
    term_adjustment = 0.02 * np.log(dte / 30)  # Term structure
    
    implied_vol = base_vol + skew_adjustment + term_adjustment
    
    return max(0.05, implied_vol)  # Floor at 5%
