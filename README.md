
# TradeSage - AI-Powered Trading System

A comprehensive trading system that combines technical analysis, risk management, and AI-driven stock selection to generate daily trading recommendations.

## Features

- **Automated Daily Rankings**: Uses SMA crossover strategy with ATR-based risk management
- **Kelly Criterion Position Sizing**: Optimal position sizing based on historical win rates
- **Real-time Dashboard**: View today's pick, trade history, and system performance
- **Supabase Integration**: Secure data storage and edge function processing
- **Python Analytics Engine**: Advanced technical analysis and risk calculations

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd tradesage

# 2. Install dependencies
npm install
pip install -r requirements.txt

# 3. Setup Supabase locally (optional)
supabase start

# 4. Apply database migrations
supabase db reset

# 5. Seed some sample data (optional)
python -m app.tools.seed_dummy --symbols AAPL MSFT

# 6. Run ranking engine once
python -m app.rank pick_trade

# 7. Start development server
npm run dev
```

## Architecture

### Frontend (React/TypeScript)
- **Dashboard**: Main overview with today's pick and system status
- **Trade History**: Historical performance tracking
- **System Tests**: Connectivity and data validation

### Backend (Supabase Edge Functions)
- **daily-job**: Scheduled job runner (runs at 1 PM EST weekdays)
- **rank-runner**: Core ranking algorithm implementation
- **python-sim**: Advanced analytics and pattern recognition

### Database Schema
- **price_history**: OHLCV stock data
- **daily_pick**: Generated trade recommendations
- **option_history**: Options data (future use)
- **pattern_signal**: AI pattern recognition results

## Trading Strategy

The system uses a simple but effective approach:

1. **Signal Generation**: 20/50 SMA crossover detection
2. **Risk Management**: ATR-based stop losses and targets (2:1 R/R)
3. **Position Sizing**: Kelly Criterion with 25% maximum allocation
4. **Universe**: Focus on liquid large-cap stocks (AAPL, MSFT, NVDA, TSLA, AMZN)

## API Integration

- **Alpha Vantage**: Primary stock data source
- **Supabase**: Database and serverless functions
- **No external dependencies**: Fully self-contained system

## Testing

```bash
# Run Python tests
pytest tests/ -v

# Run full CI pipeline locally
npm run build
npm run type-check
```

## Deployment

The system is designed to run on Supabase with automatic edge function deployment:

1. Connect your repository to Supabase
2. Configure environment variables
3. Deploy edge functions automatically
4. Set up cron job for daily execution

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://...
ALPHA_VANTAGE_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This system is for educational and research purposes only. Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.
