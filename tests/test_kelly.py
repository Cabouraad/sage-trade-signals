
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from risk.kelly import calc_kelly

def test_kelly_cap():
    """Test that Kelly fraction is properly capped"""
    assert calc_kelly(0.6, 2) <= 0.25

def test_kelly_basic():
    """Test basic Kelly calculation"""
    result = calc_kelly(0.55, 1.8)
    expected = 0.55 - (0.45 / 1.8)  # win_rate - (1-win_rate)/payoff
    assert abs(result - expected) < 0.001

def test_kelly_edge_cases():
    """Test Kelly edge cases"""
    # Zero win rate should return 0
    assert calc_kelly(0.0, 2.0) == 0
    
    # Negative Kelly should return 0
    assert calc_kelly(0.3, 1.0) == 0

if __name__ == "__main__":
    test_kelly_cap()
    test_kelly_basic()
    test_kelly_edge_cases()
    print("All Kelly tests passed!")
