
"""
Enhanced ranking system with Kelly sizing, regime filtering, and robustness testing
"""
import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from .risk.kelly import calc_kelly, fractional_kelly
from .risk.monte_carlo import robustness_test
from .utils.volatility import hist_vol, atr
from .backtests.exit_engines import ATRStopTarget
from .pattern_scan import scan_patterns
import asyncio

class Strategy:
    """Base strategy class"""
    def __init__(self, name: str, compatible_regimes: List[str] = None):
        self.name = name
        self.compatible_regimes = compatible_regimes or ['risk_on', 'neutral', 'risk_off']
    
    def generate_signal(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Generate trading signal from data"""
        raise NotImplementedError

class MomentumStrategy(Strategy):
    def __init__(self):
        super().__init__("momentum", ['risk_on', 'neutral'])
    
    def generate_signal(self, data: pd.DataFrame) -> Dict[str, Any]:
        if len(data) < 20:
            return {'signal': 0, 'confidence': 0}
        
        # Simple momentum: 10-day vs 20-day average
        short_ma = data['close'].rolling(10).mean().iloc[-1]
        long_ma = data['close'].rolling(20).mean().iloc[-1]
        current_price = data['close'].iloc[-1]
        
        momentum_score = (short_ma - long_ma) / long_ma
        signal_strength = min(1.0, abs(momentum_score) * 10)
        
        return {
            'signal': 1 if momentum_score > 0.02 else (-1 if momentum_score < -0.02 else 0),
            'confidence': signal_strength,
            'momentum_score': momentum_score
        }

class MeanReversionStrategy(Strategy):
    def __init__(self):
        super().__init__("mean_reversion", ['risk_off', 'neutral'])
    
    def generate_signal(self, data: pd.DataFrame) -> Dict[str, Any]:
        if len(data) < 20:
            return {'signal': 0, 'confidence': 0}
        
        # RSI-like mean reversion
        returns = data['close'].pct_change().dropna()
        recent_return = returns.tail(5).mean()
        long_term_return = returns.tail(20).mean()
        
        deviation = (recent_return - long_term_return) / returns.std()
        signal_strength = min(1.0, abs(deviation) / 2)
        
        # Contrarian signal
        return {
            'signal': -1 if deviation > 1 else (1 if deviation < -1 else 0),
            'confidence': signal_strength,
            'deviation_score': deviation
        }

class BreakoutStrategy(Strategy):
    def __init__(self):
        super().__init__("breakout", ['risk_on'])
    
    def generate_signal(self, data: pd.DataFrame) -> Dict[str, Any]:
        if len(data) < 20:
            return {'signal': 0, 'confidence': 0}
        
        # Bollinger Band breakout
        sma = data['close'].rolling(20).mean()
        std = data['close'].rolling(20).std()
        upper_band = sma + (2 * std)
        lower_band = sma - (2 * std)
        
        current_price = data['close'].iloc[-1]
        upper_break = (current_price - upper_band.iloc[-1]) / std.iloc[-1]
        lower_break = (lower_band.iloc[-1] - current_price) / std.iloc[-1]
        
        if upper_break > 0.1:
            return {'signal': 1, 'confidence': min(1.0, upper_break), 'breakout_type': 'upper'}
        elif lower_break > 0.1:
            return {'signal': -1, 'confidence': min(1.0, lower_break), 'breakout_type': 'lower'}
        else:
            return {'signal': 0, 'confidence': 0, 'breakout_type': 'none'}

def get_available_strategies() -> List[Strategy]:
    """Get list of available trading strategies"""
    return [
        MomentumStrategy(),
        MeanReversionStrategy(),
        BreakoutStrategy()
    ]

def determine_risk_regime(spy_data: pd.DataFrame) -> str:
    """
    Determine market risk regime based on SPY volatility
    No external API calls - uses only stored price data
    """
    try:
        if len(spy_data) < 30:
            return 'neutral'
        
        # Calculate 30-day historical volatility
        volatility = hist_vol(spy_data, window=30)
        
        # Risk regime classification
        if volatility < 0.012:  # 1.2%
            return 'risk_on'
        elif volatility <= 0.02:  # 2.0%
            return 'neutral'
        else:
            return 'risk_off'
            
    except Exception as e:
        print(f"Error determining risk regime: {e}")
        return 'neutral'

def calculate_correlation(symbol1_data: pd.DataFrame, symbol2_data: pd.DataFrame, window: int = 30) -> float:
    """Calculate 30-day Pearson correlation between two symbols"""
    try:
        # Align data by date and calculate returns
        returns1 = symbol1_data.set_index('date')['close'].pct_change().dropna()
        returns2 = symbol2_data.set_index('date')['close'].pct_change().dropna()
        
        # Get common dates
        common_dates = returns1.index.intersection(returns2.index)
        if len(common_dates) < window:
            return 0.0
        
        aligned_returns1 = returns1.loc[common_dates].tail(window)
        aligned_returns2 = returns2.loc[common_dates].tail(window)
        
        correlation = aligned_returns1.corr(aligned_returns2)
        return correlation if not pd.isna(correlation) else 0.0
        
    except Exception as e:
        print(f"Error calculating correlation: {e}")
        return 0.0

async def rank_strategies(symbols: List[str], supabase_client) -> Dict[str, Any]:
    """
    Enhanced strategy ranking with Kelly sizing, regime filtering, and robustness testing
    """
    strategies = get_available_strategies()
    candidates = []
    
    # Get SPY data for regime determination
    spy_response = await supabase_client.from('price_history')\
        .select('*')\
        .eq('symbol', 'SPY')\
        .order('date', desc=True)\
        .limit(60)\
        .execute()
    
    spy_data = pd.DataFrame(spy_response.data) if spy_response.data else pd.DataFrame()
    risk_regime = determine_risk_regime(spy_data) if not spy_data.empty else 'neutral'
    
    print(f"Current risk regime: {risk_regime}")
    
    # Get last 5 picks for diversification check
    recent_picks_response = await supabase_client.from('daily_pick')\
        .select('symbol')\
        .order('date', desc=True)\
        .limit(5)\
        .execute()
    
    recent_symbols = [pick['symbol'] for pick in recent_picks_response.data] if recent_picks_response.data else []
    
    for symbol in symbols:
        try:
            # Fetch price data
            response = await supabase_client.from('price_history')\
                .select('*')\
                .eq('symbol', symbol)\
                .order('date', desc=True)\
                .limit(100)\
                .execute()
            
            if not response.data or len(response.data) < 50:
                continue
            
            price_data = pd.DataFrame(response.data)
            price_data['date'] = pd.to_datetime(price_data['date'])
            price_data = price_data.sort_values('date')
            
            # Check diversification (correlation with recent picks)
            is_diversified = True
            for recent_symbol in recent_symbols:
                if recent_symbol == symbol:
                    continue
                    
                recent_response = await supabase_client.from('price_history')\
                    .select('*')\
                    .eq('symbol', recent_symbol)\
                    .order('date', desc=True)\
                    .limit(60)\
                    .execute()
                
                if recent_response.data:
                    recent_data = pd.DataFrame(recent_response.data)
                    recent_data['date'] = pd.to_datetime(recent_data['date'])
                    
                    correlation = calculate_correlation(price_data, recent_data, 30)
                    if correlation > 0.75:
                        print(f"Skipping {symbol} due to high correlation ({correlation:.2f}) with {recent_symbol}")
                        is_diversified = False
                        break
            
            if not is_diversified:
                continue
            
            # Test each strategy
            for strategy in strategies:
                # Check regime compatibility
                if risk_regime not in strategy.compatible_regimes:
                    continue
                
                # Generate signal
                signal_result = strategy.generate_signal(price_data)
                if signal_result['signal'] == 0 or signal_result['confidence'] < 0.3:
                    continue
                
                # Run robustness test
                try:
                    is_robust = robustness_test(strategy.__class__, price_data)
                    if not is_robust:
                        print(f"Strategy {strategy.name} failed robustness test for {symbol}")
                        continue
                except Exception as e:
                    print(f"Robustness test failed for {symbol}: {e}")
                    continue
                
                # Calculate historical win rate and payoff ratio (simplified)
                returns = price_data['close'].pct_change().dropna()
                positive_returns = returns[returns > 0]
                negative_returns = returns[returns < 0]
                
                win_rate = len(positive_returns) / len(returns) if len(returns) > 0 else 0.5
                avg_win = positive_returns.mean() if len(positive_returns) > 0 else 0.02
                avg_loss = abs(negative_returns.mean()) if len(negative_returns) > 0 else 0.02
                payoff_ratio = avg_win / avg_loss if avg_loss > 0 else 1.0
                
                # Calculate Kelly fraction
                kelly_fraction = calc_kelly(win_rate, payoff_ratio, cap=0.25)
                size_pct = round(kelly_fraction * 100, 1)
                
                if kelly_fraction < 0.01:  # Too small position
                    continue
                
                # Calculate entry, stop, and target using ATR
                exit_engine = ATRStopTarget()
                current_price = float(price_data['close'].iloc[-1])
                current_date = price_data['date'].iloc[-1].strftime('%Y-%m-%d')
                
                exits = exit_engine.calculate_exits(
                    entry_price=current_price,
                    entry_date=current_date,
                    data=price_data,
                    position_type='long' if signal_result['signal'] > 0 else 'short'
                )
                
                # Calculate expected return
                risk_amount = abs(current_price - exits['stop_loss']) / current_price
                reward_amount = abs(exits['target'] - current_price) / current_price
                expected_return = (win_rate * reward_amount) - ((1 - win_rate) * risk_amount)
                
                # Calculate Sharpe ratio (simplified)
                sharpe_ratio = expected_return / (returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
                
                # Get pattern signals for additional context
                pattern_response = await supabase_client.from('pattern_signal')\
                    .select('*')\
                    .eq('symbol', symbol)\
                    .eq('scan_date', date.today().isoformat())\
                    .order('confidence', desc=True)\
                    .limit(1)\
                    .execute()
                
                pattern_info = None
                if pattern_response.data:
                    pattern_info = pattern_response.data[0]
                
                # Generate reason bullets
                reason_bullets = []
                
                if pattern_info and pattern_info['confidence'] > 0.7:
                    reason_bullets.append(f"High-confidence {pattern_info['pattern'].replace('_', ' ')} pattern ({pattern_info['confidence']:.2f})")
                
                reason_bullets.append(f"Kelly sizing: {size_pct}% of equity")
                reason_bullets.append(f"ATR-based {reward_amount/risk_amount:.1f}:1 R/R ratio")
                reason_bullets.append(f"Market in {risk_regime.replace('_', ' ')} regime")
                reason_bullets.append("Low correlation with recent picks")
                
                # Add strategy-specific reasoning
                if 'momentum_score' in signal_result:
                    reason_bullets.append(f"Strong momentum signal ({signal_result['momentum_score']:.3f})")
                elif 'deviation_score' in signal_result:
                    reason_bullets.append(f"Mean reversion opportunity ({signal_result['deviation_score']:.2f} std dev)")
                elif 'breakout_type' in signal_result and signal_result['breakout_type'] != 'none':
                    reason_bullets.append(f"Bollinger Band {signal_result['breakout_type']} breakout")
                
                candidate = {
                    'symbol': symbol,
                    'strategy': strategy.name,
                    'entry_price': current_price,
                    'stop_loss': exits['stop_loss'],
                    'target_price': exits['target'],
                    'expected_return': expected_return,
                    'sharpe_ratio': sharpe_ratio,
                    'kelly_fraction': kelly_fraction,
                    'size_pct': size_pct,
                    'win_rate': win_rate,
                    'payoff_ratio': payoff_ratio,
                    'signal_confidence': signal_result['confidence'],
                    'risk_regime': risk_regime,
                    'reason_bullets': reason_bullets[:5],  # Limit to 5 bullets
                    'atr_used': exits.get('atr_used', 0),
                    'pattern_signal': pattern_info['pattern'] if pattern_info else None
                }
                
                candidates.append(candidate)
                
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            continue
    
    if not candidates:
        return {'message': 'No suitable candidates found', 'candidates': []}
    
    # Rank candidates by Sharpe ratio * Kelly fraction * signal confidence
    for candidate in candidates:
        candidate['composite_score'] = (
            candidate['sharpe_ratio'] * 
            candidate['kelly_fraction'] * 
            candidate['signal_confidence']
        )
    
    # Sort by composite score
    candidates.sort(key=lambda x: x['composite_score'], reverse=True)
    
    # Select the best candidate
    best_candidate = candidates[0]
    
    # Store the daily pick
    today = date.today().isoformat()
    
    await supabase_client.from('daily_pick').upsert({
        'date': today,
        'symbol': best_candidate['symbol'],
        'strategy': best_candidate['strategy'],
        'entry_price': best_candidate['entry_price'],
        'stop_loss': best_candidate['stop_loss'],
        'target_price': best_candidate['target_price'],
        'expected_return': best_candidate['expected_return'],
        'sharpe_ratio': best_candidate['sharpe_ratio'],
        'kelly_fraction': best_candidate['kelly_fraction'],
        'size_pct': best_candidate['size_pct'],
        'reason_bullets': best_candidate['reason_bullets']
    }, on_conflict='date').execute()
    
    return {
        'message': 'Enhanced ranking completed',
        'selected_pick': best_candidate,
        'total_candidates': len(candidates),
        'risk_regime': risk_regime
    }

# FastAPI endpoints would be added to the main container
async def rank_endpoint(symbols: List[str], supabase_client):
    """Ranking endpoint for FastAPI container"""
    return await rank_strategies(symbols, supabase_client)
