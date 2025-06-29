
# TradeSage Enhanced Engine

This directory contains the enhanced Python trading engine with advanced risk management, pattern recognition, and systematic position sizing.

## New Features

### 1. Kelly Criterion Position Sizing (`risk/kelly.py`)
- Calculates optimal position sizes based on historical win rates and payoff ratios
- Includes safety caps to prevent over-leveraging
- Supports fractional Kelly for more conservative approaches

### 2. Monte Carlo Robustness Testing (`risk/monte_carlo.py`)
- Tests strategy performance under various market stress scenarios
- Simulates slippage, gap risk, and other execution challenges
- Filters out strategies that don't perform well under stress

### 3. Advanced Volatility Measures (`utils/volatility.py`)
- ATR (Average True Range) calculation for dynamic stop losses
- Historical volatility with multiple calculation methods  
- GARCH-like volatility estimation
- Realized volatility from high-frequency data

### 4. Chart Pattern Recognition (`pattern_scan.py`)
- CNN-based pattern recognition (currently using mock model)
- Generates 100x100 OHLC charts for analysis
- Stores high-confidence patterns in database
- Supports patterns: inverse H&S, cup & handle, ascending triangle, etc.

### 5. Enhanced Exit Strategies (`backtests/exit_engines.py`)
- ATR-based stops and targets (1 ATR stop, 2 ATR target)
- Percentage-based exits
- Volatility-adjusted position sizing
- Flexible exit engine framework

### 6. Comprehensive Ranking System (`rank.py`)
- Multiple strategy integration (momentum, mean reversion, breakout)
- Risk regime filtering based on SPY volatility
- Correlation-based diversification checks
- Kelly-weighted strategy scoring
- Robustness testing integration

## Risk Regime Classification

The system automatically determines market regimes based on SPY 30-day historical volatility:

- **Risk On**: Volatility < 1.2% (favorable for momentum/breakout strategies)
- **Neutral**: Volatility 1.2% - 2.0% (suitable for most strategies)  
- **Risk Off**: Volatility > 2.0% (favors mean reversion strategies)

## Position Sizing Logic

1. Calculate historical win rate and payoff ratio from backtesting
2. Apply Kelly criterion with 25% maximum allocation cap
3. Adjust for current volatility environment
4. Apply regime-based scaling factors
5. Final position size as percentage of equity

## Pattern Recognition

The system scans for these technical patterns:
- Inverse Head and Shoulders
- Cup and Handle
- Ascending Triangle
- Bull Flag
- Double Bottom
- Falling Wedge

Patterns with confidence ≥ 0.70 are stored and influence strategy selection.

## Database Integration

All calculations integrate with Supabase tables:
- `pattern_signal`: Stores detected chart patterns
- `daily_pick`: Enhanced with Kelly sizing and reasoning
- `price_history`: Source data for all calculations
- `macro_state`: Market regime information

## Testing

Run unit tests with:
```bash
python test_kelly.py
```

## Model Retraining

To replace the chart pattern CNN model:
1. Train your TensorFlow/Keras model
2. Save as `models/chart_cnn.h5`
3. Ensure input shape is (100, 100, 3) for RGB images
4. Output should be pattern probabilities

The current implementation uses a mock model for demonstration purposes.

## API Endpoints

- `POST /pattern_scan`: Scan symbols for chart patterns
- `POST /rank`: Enhanced strategy ranking with all features

## Configuration

No external API keys required - all analysis uses stored Supabase data only.
