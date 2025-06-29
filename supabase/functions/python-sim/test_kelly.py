
"""
Unit tests for Kelly criterion calculation
"""
import pytest
import numpy as np
from risk.kelly import calc_kelly, fractional_kelly

def test_calc_kelly_basic():
    """Test basic Kelly calculation"""
    # Win rate 60%, payoff ratio 1.5:1
    win_rate = 0.6
    payoff = 1.5
    
    kelly = calc_kelly(win_rate, payoff)
    
    # Expected: (1.5 * 0.6 - 0.4) / 1.5 = 0.333...
    expected = (payoff * win_rate - (1 - win_rate)) / payoff
    
    assert abs(kelly - expected) < 0.001

def test_calc_kelly_edge_cases():
    """Test Kelly calculation edge cases"""
    # Zero win rate
    assert calc_kelly(0.0, 1.5) == 0.0
    
    # 100% win rate (impossible)
    assert calc_kelly(1.0, 1.5) == 0.0
    
    # Negative payoff
    assert calc_kelly(0.6, -1.0) == 0.0
    
    # Zero payoff
    assert calc_kelly(0.6, 0.0) == 0.0

def test_calc_kelly_capped():
    """Test Kelly fraction capping"""
    # Very high win rate and payoff should be capped at 25%
    kelly = calc_kelly(0.9, 10.0, cap=0.25)
    assert kelly <= 0.25

def test_fractional_kelly():
    """Test fractional Kelly calculation"""
    win_rate = 0.6
    payoff = 2.0
    
    full_kelly = calc_kelly(win_rate, payoff)
    half_kelly = fractional_kelly(win_rate, payoff, fraction=0.5)
    
    assert abs(half_kelly - full_kelly * 0.5) < 0.001

if __name__ == "__main__":
    # Run tests
    test_calc_kelly_basic()
    test_calc_kelly_edge_cases()
    test_calc_kelly_capped()
    test_fractional_kelly()
    print("All Kelly tests passed!")
