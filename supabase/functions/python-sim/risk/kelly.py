
"""
Kelly Criterion calculator for position sizing
"""
import math

def calc_kelly(win_rate: float, payoff: float, cap: float = 0.25) -> float:
    """
    Calculate Kelly fraction for position sizing
    
    Args:
        win_rate: Historical win rate (0-1)
        payoff: Average win / Average loss ratio
        cap: Maximum fraction to risk (default 25%)
    
    Returns:
        Kelly fraction capped at specified maximum
    """
    if win_rate <= 0 or win_rate >= 1:
        return 0.0
    
    if payoff <= 0:
        return 0.0
    
    # Kelly formula: f* = (bp - q) / b
    # Where b = payoff ratio, p = win rate, q = loss rate (1-p)
    loss_rate = 1 - win_rate
    kelly_fraction = (payoff * win_rate - loss_rate) / payoff
    
    # Ensure non-negative and apply cap
    kelly_fraction = max(0, kelly_fraction)
    kelly_fraction = min(kelly_fraction, cap)
    
    return round(kelly_fraction, 4)

def fractional_kelly(win_rate: float, payoff: float, fraction: float = 0.5, cap: float = 0.25) -> float:
    """
    Calculate fractional Kelly for more conservative sizing
    
    Args:
        win_rate: Historical win rate (0-1)
        payoff: Average win / Average loss ratio
        fraction: Fraction of full Kelly to use (default 50%)
        cap: Maximum fraction to risk
    
    Returns:
        Fractional Kelly position size
    """
    full_kelly = calc_kelly(win_rate, payoff, cap)
    return round(full_kelly * fraction, 4)
