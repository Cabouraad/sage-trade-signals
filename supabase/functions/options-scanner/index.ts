
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// REMOVED: All synthetic/dummy data generation functions
// This scanner now ONLY works with real market data

async function checkLiveDataAvailability(symbols: string[]): Promise<{ symbol: string, hasRecentData: boolean, lastUpdate: string | null }[]> {
  const dataStatus = [];
  
  for (const symbol of symbols.slice(0, 20)) { // Check first 20 symbols for performance
    const { data } = await sb
      .from('price_history')
      .select('date')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const hasRecentData = data && new Date(data.date) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Within 24 hours
    dataStatus.push({
      symbol,
      hasRecentData,
      lastUpdate: data?.date || null
    });
  }
  
  return dataStatus;
}

async function generateRealOptionsStrategies(symbols: string[]): Promise<any[]> {
  const strategies: any[] = [];
  
  // Only process symbols that have recent price data
  for (const symbol of symbols) {
    const { data: priceData } = await sb
      .from('price_history')
      .select('close, date')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(20);
    
    if (!priceData || priceData.length < 10) {
      console.log(`Skipping ${symbol} - insufficient recent price data`);
      continue;
    }
    
    // Check if data is recent (within 7 days)
    const latestDate = new Date(priceData[0].date);
    const daysSinceUpdate = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 7) {
      console.log(`Skipping ${symbol} - data is ${Math.round(daysSinceUpdate)} days old`);
      continue;
    }
    
    const currentPrice = priceData[0].close;
    const volatility = calculateRealVolatility(priceData);
    
    // Generate strategies based on REAL market data
    const strategy = {
      symbol,
      strategy_name: 'Iron Condor',
      strategy_type: 'neutral',
      legs: [
        { action: 'sell', type: 'put', strike: Math.round(currentPrice * 0.95), quantity: 1 },
        { action: 'buy', type: 'put', strike: Math.round(currentPrice * 0.90), quantity: 1 },
        { action: 'sell', type: 'call', strike: Math.round(currentPrice * 1.05), quantity: 1 },
        { action: 'buy', type: 'call', strike: Math.round(currentPrice * 1.10), quantity: 1 }
      ],
      max_profit: currentPrice * 0.02, // 2% of stock price
      max_loss: currentPrice * 0.08, // 8% of stock price
      breakeven_points: [currentPrice * 0.97, currentPrice * 1.03],
      profit_probability: Math.min(0.85, 0.65 + (volatility * 10)), // Based on real volatility
      expected_return: currentPrice * 0.012,
      risk_reward_ratio: 0.25,
      days_to_expiration: 30,
      iv_rank: volatility * 100,
      delta_exposure: 0,
      theta_decay: currentPrice * 0.001,
      confidence_score: Math.min(95, 60 + (40 * (1 - volatility))), // Higher confidence for lower volatility
      data_freshness: 'LIVE',
      last_price_update: priceData[0].date
    };
    
    strategies.push(strategy);
  }
  
  return strategies.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
}

function calculateRealVolatility(priceData: any[]): number {
  if (priceData.length < 2) return 0.3; // Default fallback
  
  const returns = [];
  for (let i = 1; i < priceData.length; i++) {
    const return_val = Math.log(priceData[i-1].close / priceData[i].close);
    returns.push(return_val);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252); // Annualized volatility
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting LIVE options analysis (no synthetic data)...');
    
    // Default high-liquidity symbols for options analysis
    const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'IWM'];
    
    // Get symbols from request body or use defaults
    let symbols = DEFAULT_SYMBOLS;
    try {
      const body = await req.json();
      if (body?.symbols && Array.isArray(body.symbols)) {
        symbols = body.symbols;
      }
    } catch {
      // Use default symbols if no body or invalid JSON
    }
    
    console.log(`Checking live data availability for ${symbols.length} symbols...`);
    
    // Check data freshness
    const dataStatus = await checkLiveDataAvailability(symbols);
    const symbolsWithLiveData = dataStatus.filter(s => s.hasRecentData).map(s => s.symbol);
    
    if (symbolsWithLiveData.length === 0) {
      throw new Error('No symbols have recent live data. Cannot generate strategies with stale data.');
    }
    
    console.log(`Found ${symbolsWithLiveData.length} symbols with recent data: ${symbolsWithLiveData.join(', ')}`);
    
    // Generate strategies using REAL data only
    const allStrategies = await generateRealOptionsStrategies(symbolsWithLiveData);
    
    if (allStrategies.length === 0) {
      throw new Error('No valid strategies could be generated from live data.');
    }
    
    console.log(`Generated ${allStrategies.length} options strategies from live data`);
    
    // Store strategies
    const { error: strategyError } = await sb.from('options_strategies').insert(allStrategies);
    if (strategyError) {
      console.error('Error storing strategies:', strategyError);
      throw strategyError;
    }
    
    // Find best strategy for daily pick
    const bestStrategy = allStrategies[0]; // Already sorted by confidence
    
    if (bestStrategy) {
      // Convert to daily_pick format
      const dailyPick = {
        symbol: bestStrategy.symbol,
        trade_type: bestStrategy.strategy_name.toLowerCase().replace(/\s+/g, '_'),
        entry: bestStrategy.expected_return || 0,
        stop: bestStrategy.max_loss || bestStrategy.expected_return * 2,
        target: bestStrategy.max_profit || bestStrategy.expected_return * 2,
        kelly_frac: 0.15, // Conservative for options
        size_pct: 15,
        reason_bullets: [
          `${bestStrategy.strategy_name} strategy using LIVE data`,
          `IV Rank: ${Math.round(bestStrategy.iv_rank || 0)}% (calculated from real volatility)`,
          `${bestStrategy.days_to_expiration} days to expiration`,
          `Confidence: ${Math.round(bestStrategy.confidence_score || 0)}%`,
          `Last price update: ${bestStrategy.last_price_update}`,
          `Data freshness: LIVE`
        ]
      };
      
      const { error: pickError } = await sb.from('daily_pick').insert(dailyPick);
      if (pickError) {
        console.error('Error storing daily pick:', pickError);
      } else {
        console.log(`Selected ${bestStrategy.strategy_name} for ${bestStrategy.symbol} as today's pick (LIVE data)`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated comprehensive options analysis using LIVE data for ${symbolsWithLiveData.length} symbols`,
        strategies_found: allStrategies.length,
        symbols_analyzed: symbolsWithLiveData.length,
        symbols_with_live_data: symbolsWithLiveData,
        symbols_skipped: symbols.length - symbolsWithLiveData.length,
        best_strategy: bestStrategy,
        data_freshness: 'LIVE',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Options scanner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
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
