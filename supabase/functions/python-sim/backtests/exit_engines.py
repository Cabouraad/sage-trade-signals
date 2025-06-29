
"""
Exit strategy engines for backtesting
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple
from ..utils.volatility import atr

class ExitEngine:
    """Base class for exit strategies"""
    
    def __init__(self, name: str):
        self.name = name
    
    def calculate_exits(self, entry_price: float, entry_date: str, 
                       data: pd.DataFrame, position_type: str = 'long') -> Dict[str, float]:
        """
        Calculate stop loss and target prices
        
        Args:
            entry_price: Entry price for the trade
            entry_date: Entry date
            data: Price data DataFrame
            position_type: 'long' or 'short'
        
        Returns:
            Dictionary with 'stop_loss' and 'target' prices
        """
        raise NotImplementedError("Subclasses must implement calculate_exits")

class ATRStopTarget(ExitEngine):
    """ATR-based stop loss and target calculation"""
    
    def __init__(self, atr_stop_multiplier: float = 1.0, atr_target_multiplier: float = 2.0):
        super().__init__("ATR Stop Target")
        self.atr_stop_multiplier = atr_stop_multiplier
        self.atr_target_multiplier = atr_target_multiplier
    
    def calculate_exits(self, entry_price: float, entry_date: str, 
                       data: pd.DataFrame, position_type: str = 'long') -> Dict[str, float]:
        """
        Calculate ATR-based stops and targets
        
        ATR Stop Target logic:
        - Stop loss: entry ± 1 ATR (default)
        - Target: entry ± 2 ATR (default)
        - For longs: stop below entry, target above
        - For shorts: stop above entry, target below
        """
        try:
            # Calculate ATR
            atr_values = atr(data, period=14)
            
            # Find the ATR value closest to entry date
            data_with_date = data.copy()
            if 'date' not in data_with_date.columns:
                data_with_date['date'] = data_with_date.index
            
            entry_datetime = pd.to_datetime(entry_date)
            date_diffs = abs(pd.to_datetime(data_with_date['date']) - entry_datetime)
            closest_idx = date_diffs.idxmin()
            
            current_atr = atr_values.iloc[closest_idx] if not pd.isna(atr_values.iloc[closest_idx]) else atr_values.dropna().iloc[-1]
            
            if pd.isna(current_atr) or current_atr <= 0:
                # Fallback to percentage-based stops
                return self._percentage_fallback(entry_price, position_type)
            
            # Calculate stops and targets based on position type
            if position_type.lower() == 'long':
                stop_loss = entry_price - (current_atr * self.atr_stop_multiplier)
                target = entry_price + (current_atr * self.atr_target_multiplier)
            else:  # short
                stop_loss = entry_price + (current_atr * self.atr_stop_multiplier)
                target = entry_price - (current_atr * self.atr_target_multiplier)
            
            return {
                'stop_loss': round(float(stop_loss), 2),
                'target': round(float(target), 2),
                'atr_used': round(float(current_atr), 2)
            }
            
        except Exception as e:
            print(f"Error calculating ATR exits: {e}")
            return self._percentage_fallback(entry_price, position_type)
    
    def _percentage_fallback(self, entry_price: float, position_type: str) -> Dict[str, float]:
        """Fallback to percentage-based stops if ATR calculation fails"""
        stop_pct = 0.02  # 2% stop
        target_pct = 0.04  # 4% target (2:1 R/R)
        
        if position_type.lower() == 'long':
            stop_loss = entry_price * (1 - stop_pct)
            target = entry_price * (1 + target_pct)
        else:
            stop_loss = entry_price * (1 + stop_pct)
            target = entry_price * (1 - target_pct)
        
        return {
            'stop_loss': round(stop_loss, 2),
            'target': round(target, 2),
            'atr_used': 0.0
        }

class PercentageStopTarget(ExitEngine):
    """Percentage-based stop loss and target calculation"""
    
    def __init__(self, stop_pct: float = 0.02, target_pct: float = 0.04):
        super().__init__("Percentage Stop Target")
        self.stop_pct = stop_pct
        self.target_pct = target_pct
    
    def calculate_exits(self, entry_price: float, entry_date: str, 
                       data: pd.DataFrame, position_type: str = 'long') -> Dict[str, float]:
        """Calculate percentage-based stops and targets"""
        
        if position_type.lower() == 'long':
            stop_loss = entry_price * (1 - self.stop_pct)
            target = entry_price * (1 + self.target_pct)
        else:
            stop_loss = entry_price * (1 + self.stop_pct)
            target = entry_price * (1 - self.target_pct)
        
        return {
            'stop_loss': round(stop_loss, 2),
            'target': round(target, 2)
        }

class VolatilityStopTarget(ExitEngine):
    """Volatility-adjusted stop loss and target calculation"""
    
    def __init__(self, vol_multiplier: float = 1.5, target_multiplier: float = 2.5):
        super().__init__("Volatility Stop Target")
        self.vol_multiplier = vol_multiplier
        self.target_multiplier = target_multiplier
    
    def calculate_exits(self, entry_price: float, entry_date: str, 
                       data: pd.DataFrame, position_type: str = 'long') -> Dict[str, float]:
        """Calculate volatility-adjusted stops and targets"""
        
        try:
            # Calculate recent volatility
            returns = data['close'].pct_change().dropna()
            recent_vol = returns.tail(20).std()  # 20-day volatility
            
            if pd.isna(recent_vol) or recent_vol <= 0:
                recent_vol = 0.02  # 2% fallback
            
            # Calculate stops based on volatility
            vol_stop = entry_price * recent_vol * self.vol_multiplier
            vol_target = entry_price * recent_vol * self.target_multiplier
            
            if position_type.lower() == 'long':
                stop_loss = entry_price - vol_stop
                target = entry_price + vol_target
            else:
                stop_loss = entry_price + vol_stop
                target = entry_price - vol_target
            
            return {
                'stop_loss': round(float(stop_loss), 2),
                'target': round(float(target), 2),
                'volatility_used': round(float(recent_vol), 4)
            }
            
        except Exception as e:
            print(f"Error calculating volatility exits: {e}")
            # Fallback to percentage method
            fallback_engine = PercentageStopTarget()
            return fallback_engine.calculate_exits(entry_price, entry_date, data, position_type)

def get_exit_engine(engine_type: str = 'atr') -> ExitEngine:
    """
    Factory function to get exit engine by type
    
    Args:
        engine_type: Type of exit engine ('atr', 'percentage', 'volatility')
    
    Returns:
        ExitEngine instance
    """
    if engine_type.lower() == 'atr':
        return ATRStopTarget()
    elif engine_type.lower() == 'percentage':
        return PercentageStopTarget()
    elif engine_type.lower() == 'volatility':
        return VolatilityStopTarget()
    else:
        return ATRStopTarget()  # Default to ATR
