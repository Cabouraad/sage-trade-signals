
"""
Monte Carlo robustness testing for strategies
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List
import random

def robustness_test(strategy_cls, data_df: pd.DataFrame, iters: int = 100, 
                   slippage_max: float = 0.003, gap_max: float = 0.001) -> bool:
    """
    Test strategy robustness using Monte Carlo simulation
    
    Args:
        strategy_cls: Strategy class to test
        data_df: Historical price data
        iters: Number of Monte Carlo iterations
        slippage_max: Maximum slippage to simulate
        gap_max: Maximum gap risk to simulate
    
    Returns:
        True if strategy passes robustness test
    """
    if len(data_df) < 50:  # Need sufficient data
        return False
    
    original_returns = []
    stressed_returns = []
    
    for i in range(iters):
        # Create stressed version of data
        stressed_df = apply_market_stress(data_df.copy(), slippage_max, gap_max)
        
        try:
            # Run strategy on original data
            original_result = run_strategy_simulation(strategy_cls, data_df)
            original_returns.append(original_result.get('total_return', 0))
            
            # Run strategy on stressed data
            stressed_result = run_strategy_simulation(strategy_cls, stressed_df)
            stressed_returns.append(stressed_result.get('total_return', 0))
            
        except Exception as e:
            # If strategy fails under stress, it's not robust
            return False
    
    # Calculate metrics
    original_mean = np.mean(original_returns)
    stressed_mean = np.mean(stressed_returns)
    
    # Strategy passes if:
    # 1. Still profitable under stress on average
    # 2. Doesn't lose more than 50% of original performance
    # 3. Has reasonable consistency (not too many extreme outliers)
    
    if stressed_mean <= 0:
        return False
    
    performance_retention = stressed_mean / original_mean if original_mean > 0 else 0
    if performance_retention < 0.5:
        return False
    
    # Check for extreme outliers (more than 3 std devs from mean)
    stressed_std = np.std(stressed_returns)
    outliers = sum(1 for r in stressed_returns if abs(r - stressed_mean) > 3 * stressed_std)
    if outliers > iters * 0.1:  # More than 10% outliers
        return False
    
    return True

def apply_market_stress(df: pd.DataFrame, slippage_max: float, gap_max: float) -> pd.DataFrame:
    """
    Apply various market stress factors to price data
    """
    stressed_df = df.copy()
    
    # Add random slippage to all prices
    for col in ['open', 'high', 'low', 'close']:
        if col in stressed_df.columns:
            slippage = np.random.uniform(0, slippage_max, len(stressed_df))
            direction = np.random.choice([-1, 1], len(stressed_df))
            stressed_df[col] = stressed_df[col] * (1 + slippage * direction)
    
    # Add occasional gaps (5% of days)
    gap_days = np.random.choice(len(stressed_df), int(len(stressed_df) * 0.05), replace=False)
    for day in gap_days:
        gap_size = np.random.uniform(0, gap_max)
        gap_direction = np.random.choice([-1, 1])
        
        # Apply gap to open price
        if day > 0:
            prev_close = stressed_df.iloc[day-1]['close']
            gap_amount = prev_close * gap_size * gap_direction
            stressed_df.iloc[day, stressed_df.columns.get_loc('open')] += gap_amount
    
    return stressed_df

def run_strategy_simulation(strategy_cls, data_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Simplified strategy simulation runner
    """
    # This is a placeholder - in real implementation, this would run the actual strategy
    # For now, return mock results based on data volatility
    
    returns = data_df['close'].pct_change().dropna()
    volatility = returns.std() * np.sqrt(252)  # Annualized volatility
    
    # Mock strategy performance based on market conditions
    base_return = np.random.normal(0.08, 0.15)  # 8% average with 15% std
    volatility_penalty = max(0, volatility - 0.2) * 0.5  # Penalize high volatility
    
    total_return = base_return - volatility_penalty
    
    return {
        'total_return': total_return,
        'volatility': volatility,
        'max_drawdown': np.random.uniform(0.05, 0.25)
    }
