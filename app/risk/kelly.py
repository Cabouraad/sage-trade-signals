
def calc_kelly(win_rate, payoff, cap=0.25):
    """Calculate Kelly fraction for position sizing"""
    k = win_rate - (1 - win_rate) / payoff
    return max(0, min(k, cap))
