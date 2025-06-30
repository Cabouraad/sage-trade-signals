
# TradeSage - AI-Powered Trading System

A comprehensive trading system that combines technical analysis, risk management, and AI-driven stock selection to generate daily trading recommendations.

## Features

- **Automated Daily Rankings**: Uses SMA crossover strategy with ATR-based risk management
- **Kelly Criterion Position Sizing**: Optimal position sizing based on historical win rates
- **Real-time Dashboard**: View today's pick, trade history, and system performance
- **Supabase Integration**: Secure data storage and edge function processing
- **TypeScript Analytics Engine**: Advanced technical analysis and risk calculations

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd tradesage

# 2. Install dependencies
npm install
pip install -r requirements.txt

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your actual values

# 4. Setup Supabase locally (optional)
supabase start

# 5. Apply database migrations
supabase db reset

# 6. Seed some sample data (REQUIRED for development)
python -m app.tools.seed_stub

# 7. Test the ranking engine
supabase functions invoke rank-runner --no-verify-jwt

# 8. Start development server
npm run dev
```

## Development Workflow

### After applying any database changes:

1. `supabase start`  
2. `python -m app.tools.seed_stub` (one-time - creates 90 days of dummy price data)  
3. `supabase functions invoke rank-runner --no-verify-jwt` → logs should display picked symbol  
4. Refresh the dashboard ⇒ today's trade appears

If picks still don't show, inspect **edge-function logs** in Supabase dashboard for `rank-runner` execution details.

### Running the ranker by hand
```bash
supabase functions invoke rank-runner --no-verify-jwt
```

## Architecture

### Frontend (React/TypeScript)
- **Dashboard**: Main overview with today's pick and system status
- **Trade History**: Historical performance tracking
- **System Tests**: Connectivity and data validation

### Backend (Supabase Edge Functions)
- **daily-job**: Scheduled job runner (runs at 1:05 PM EST weekdays)
- **rank-runner**: TypeScript-based ranking algorithm implementation
- **data-collector**: Alpha Vantage API integration for market data

### TypeScript Engine
- **rank-runner**: Core ranking algorithm with SMA crossover strategy
- **Kelly Criterion**: Position sizing calculations
- **ATR calculations**: Volatility-based risk management
- **Automated scheduling**: Cron-based daily execution

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
4. **Universe**: Dynamic universe based on symbols with ≥60 days of price history

## API Integration

- **Alpha Vantage**: Primary stock data source (free tier supported)
- **Supabase**: Database and serverless functions
- **No external dependencies**: Fully self-contained system

## Environment Setup

Make sure to set the following secrets in your Supabase project:

- `DATABASE_URL`: Your Supabase database connection string
- `AV_KEY`: Your Alpha Vantage API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Testing

```bash
# Test the ranking engine
supabase functions invoke rank-runner --no-verify-jwt

# Run full CI pipeline locally
npm run build
npm run type-check
```

## Deployment

The system is designed to run on Supabase with automatic edge function deployment:

1. Connect your repository to Supabase
2. Configure environment variables
3. Deploy edge functions automatically
4. Set up cron job for daily execution (runs at 09:05 ET weekdays)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
ALPHA_VANTAGE_KEY=demo
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY
```

## Troubleshooting

### No Picks Showing Up?

1. Check that you've seeded data: `python -m app.tools.seed_stub`
2. Verify the ranking engine runs: `supabase functions invoke rank-runner --no-verify-jwt`
3. Check Supabase edge function logs for errors
4. Ensure your timezone settings are correct (picks show for last 36 hours)

### Database Connection Issues?

- Verify your `DATABASE_URL` environment variable
- Check that Supabase is running: `supabase status`
- Confirm your database tables exist with the migration

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
