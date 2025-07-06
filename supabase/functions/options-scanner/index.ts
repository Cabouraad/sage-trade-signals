// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkLiveDataAvailability } from './data-validation.ts'
import { calculateRealVolatility, identifyMarketRegime } from './market-analysis.ts'
import { backtestStrategy } from './backtesting.ts'
import { generateOptimalStrategy } from './strategy-generators.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function generateProfitableOptionsStrategies(symbols: string[]): Promise<any[]> {
  const strategies: any[] = [];
  
  for (const symbol of symbols) {
    const { data: priceData } = await sb
      .from('price_history')
      .select('close, date, high, low')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(90); // Need more data for backtesting
    
    if (!priceData || priceData.length < 60) {
      console.log(`Skipping ${symbol} - insufficient historical data for backtesting`);
      continue;
    }
    
    const latestDate = new Date(priceData[0].date);
    const hoursOld = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
    
    // STRICT data freshness check - ONLY accept data within 24 hours
    if (hoursOld > 24) {
      console.log(`Skipping ${symbol} - data is ${Math.round(hoursOld)} hours old (exceeds 24hr limit)`);
      continue;
    }
    
    const currentPrice = priceData[0].close;
    const volatility = calculateRealVolatility(priceData);
    const marketRegime = identifyMarketRegime(priceData, volatility);
    
    // Generate strategy based on market regime and volatility
    const strategy = generateOptimalStrategy(symbol, currentPrice, volatility, marketRegime, priceData[0].date);
    
    if (!strategy) continue;
    
    // BACKTEST THE STRATEGY
    const backtestResults = await backtestStrategy(symbol, priceData, strategy);
    
    // STRICT QUALITY FILTERS - Only accept strategies that pass backtesting
    const passesBacktest = backtestResults.winRate >= 0.65 && backtestResults.totalTrades >= 5;
    const hasGoodRiskReward = strategy.risk_reward_ratio >= 2.0; // Minimum 2:1 reward-to-risk
    const hasHighConfidence = strategy.expected_profit_probability >= 0.70;
    
    if (passesBacktest && hasGoodRiskReward && hasHighConfidence) {
      // Update strategy with backtest results
      strategy.backtest_win_rate = backtestResults.winRate;
      strategy.backtest_trades = backtestResults.totalTrades;
      strategy.backtest_avg_profit = backtestResults.avgProfit;
      strategy.backtest_avg_loss = backtestResults.avgLoss;
      strategy.backtest_validated = true;
      
      strategies.push(strategy);
      console.log(`✓ ${symbol} strategy passed validation: ${Math.round(backtestResults.winRate * 100)}% win rate, ${strategy.risk_reward_ratio.toFixed(2)}:1 R/R`);
    } else {
      console.log(`✗ ${symbol} strategy failed validation: WinRate=${Math.round(backtestResults.winRate * 100)}%, R/R=${strategy.risk_reward_ratio.toFixed(2)}, Trades=${backtestResults.totalTrades}`);
    }
  }
  
  // Sort by expected value (win rate * avg profit - (1-win rate) * avg loss)
  return strategies.sort((a, b) => {
    const aExpectedValue = a.backtest_win_rate * a.backtest_avg_profit - (1 - a.backtest_win_rate) * a.backtest_avg_loss;
    const bExpectedValue = b.backtest_win_rate * b.backtest_avg_profit - (1 - b.backtest_win_rate) * b.backtest_avg_loss;
    return bExpectedValue - aExpectedValue;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting STRICT live options analysis - NO STALE DATA ALLOWED');
    
    // VALIDATE API KEYS FIRST
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY') || Deno.env.get('AV_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_KEY');
    
    if (!alphaVantageKey && !finnhubKey) {
      console.error('CRITICAL: No market data API keys configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Market data API keys not configured. Cannot fetch live data without valid API keys.',
          required_keys: ['ALPHA_VANTAGE_API_KEY', 'FINNHUB_KEY'],
          instruction: 'Configure at least one API key in Supabase secrets',
          data_freshness: 'FAILED',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`API Keys configured: AV=${!!alphaVantageKey}, Finnhub=${!!finnhubKey}`);
    
    const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'IWM'];
    
    let symbols = DEFAULT_SYMBOLS;
    try {
      const body = await req.json();
      if (body?.symbols && Array.isArray(body.symbols)) {
        symbols = body.symbols;
      }
    } catch {
      // Use default symbols
    }
    
    console.log(`Analyzing market conditions for ${symbols.length} symbols...`);
    
    const dataStatus = await checkLiveDataAvailability(symbols);
    const symbolsWithRecentData = dataStatus.filter(s => s.hasRecentData && s.currentPrice).map(s => s.symbol);
    
    if (symbolsWithRecentData.length === 0) {
      console.error('CRITICAL: No symbols have data within 24-hour freshness requirement for live trading');
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No live market data available within 24-hour freshness requirement. Cannot generate safe options trades with stale data.',
          symbols_checked: symbols.length,
          data_freshness: 'FAILED',
          requirement: 'Data must be <24 hours old for live options trading',
          api_keys_needed: 'Configure ALPHA_VANTAGE_API_KEY or FINNHUB_KEY in Supabase secrets',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Found ${symbolsWithRecentData.length} symbols with recent data for analysis`);
    
    const allStrategies = await generateProfitableOptionsStrategies(symbolsWithRecentData);
    
    if (allStrategies.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No backtested strategies passed validation criteria (min 65% win rate, 2:1 reward-to-risk, 70% confidence).',
          symbols_analyzed: symbolsWithRecentData.length,
          validation_criteria: {
            min_win_rate: '65%',
            min_risk_reward: '2.0:1',
            min_confidence: '70%',
            min_backtest_trades: 5
          },
          data_freshness: 'LIVE',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Generated ${allStrategies.length} profitable options strategies from live data`);
    
    // Filter for only high-quality strategies
    const qualityStrategies = allStrategies.filter(s => 
      s.risk_reward_ratio >= 0.4 && 
      s.expected_profit_probability >= 0.60 &&
      s.confidence_score >= 70
    );
    
    const strategiesToStore = qualityStrategies.length > 0 ? qualityStrategies : allStrategies.slice(0, 5);
    
    const { error: strategyError } = await sb.from('options_strategies').insert(strategiesToStore);
    if (strategyError) {
      console.error('Error storing strategies:', strategyError);
      throw strategyError;
    }
    
    const bestStrategy = strategiesToStore[0];
    
    if (bestStrategy) {
      const dailyPick = {
        symbol: bestStrategy.symbol,
        trade_type: bestStrategy.strategy_name.toLowerCase().replace(/\s+/g, '_'),
        entry: bestStrategy.expected_return || 0,
        stop: bestStrategy.max_loss || bestStrategy.expected_return * 2,
        target: bestStrategy.max_profit || bestStrategy.expected_return * 3,
        kelly_frac: Math.min(0.20, bestStrategy.risk_reward_ratio * 0.5), // Conservative Kelly sizing
        size_pct: Math.min(20, bestStrategy.risk_reward_ratio * 50),
        reason_bullets: [
          `${bestStrategy.strategy_name} - ${bestStrategy.strategy_type} strategy`,
          `Risk/Reward: ${bestStrategy.risk_reward_ratio.toFixed(2)}:1 (${Math.round(bestStrategy.expected_profit_probability * 100)}% win rate)`,
          `IV Rank: ${Math.round(bestStrategy.iv_rank || 0)}% (optimal for strategy type)`,
          `Max Profit: $${bestStrategy.max_profit} | Max Loss: $${bestStrategy.max_loss}`,
          `Confidence: ${Math.round(bestStrategy.confidence_score || 0)}% (recent market data)`,
          `Data age: ${bestStrategy.last_price_update}`
        ]
      };
      
      const { error: pickError } = await sb.from('daily_pick').insert(dailyPick);
      if (pickError) {
        console.error('Error storing daily pick:', pickError);
      } else {
        console.log(`Selected profitable ${bestStrategy.strategy_name} for ${bestStrategy.symbol}`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${strategiesToStore.length} high-quality options strategies with improved risk/reward profiles`,
        strategies_found: strategiesToStore.length,
        symbols_analyzed: symbolsWithRecentData.length,
        symbols_with_recent_data: symbolsWithRecentData,
        best_strategy: bestStrategy,
        avg_risk_reward_ratio: strategiesToStore.reduce((sum, s) => sum + s.risk_reward_ratio, 0) / strategiesToStore.length,
        avg_win_probability: strategiesToStore.reduce((sum, s) => sum + s.expected_profit_probability, 0) / strategiesToStore.length,
        data_freshness: 'LIVE',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Improved options scanner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        stack: error.stack,
        data_freshness: 'FAILED',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
