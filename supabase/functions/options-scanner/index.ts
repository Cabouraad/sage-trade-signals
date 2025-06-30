
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

// Black-Scholes calculations for theoretical pricing
function blackScholes(S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put'): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  function normalCDF(x: number): number {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  }
  
  function erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
  
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

// Calculate Greeks
function calculateGreeks(S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put') {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  function normalPDF(x: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  }
  
  function normalCDF(x: number): number {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  }
  
  function erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
  
  const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  const theta = type === 'call' 
    ? (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365
    : (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  const vega = S * normalPDF(d1) * Math.sqrt(T) / 100;
  const rho = type === 'call' 
    ? K * T * Math.exp(-r * T) * normalCDF(d2) / 100
    : -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  
  return { delta, gamma, theta, vega, rho };
}

// Fetch all tradeable symbols with options
async function fetchTradeableSymbols(): Promise<string[]> {
  const alphaVantageKey = Deno.env.get("AV_KEY");
  
  try {
    // Get active stocks from Alpha Vantage
    const response = await fetch(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${alphaVantageKey}`);
    const csvData = await response.text();
    
    const lines = csvData.split('\n').filter(line => line.trim());
    const symbols: string[] = [];
    
    // Skip header, parse CSV
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length >= 4) {
        const symbol = columns[0].replace(/"/g, '');
        const status = columns[2].replace(/"/g, '');
        const exchange = columns[3].replace(/"/g, '');
        
        // Filter for active stocks on major exchanges
        if (status === 'Active' && ['NYSE', 'NASDAQ'].includes(exchange) && 
            symbol.length <= 5 && !symbol.includes('.')) {
          symbols.push(symbol);
        }
      }
    }
    
    console.log(`Found ${symbols.length} tradeable symbols`);
    return symbols.slice(0, 500); // Limit for initial processing
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'IWM'];
  }
}

// Fetch options chain data
async function fetchOptionsChain(symbol: string): Promise<any[]> {
  const alphaVantageKey = Deno.env.get("AV_KEY");
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=HISTORICAL_OPTIONS&symbol=${symbol}&apikey=${alphaVantageKey}`
    );
    const data = await response.json();
    
    if (data.data) {
      return data.data.slice(0, 50); // Limit recent options data
    }
    return [];
  } catch (error) {
    console.error(`Error fetching options for ${symbol}:`, error);
    return [];
  }
}

// Analyze unusual options activity
function analyzeUnusualActivity(optionsData: any[], symbol: string): any[] {
  const unusualOptions: any[] = [];
  
  for (const option of optionsData) {
    const volume = parseInt(option.volume || '0');
    const openInterest = parseInt(option.open_interest || '0');
    const avgVolume = openInterest * 0.1; // Estimate average volume as 10% of OI
    
    if (volume > 0 && avgVolume > 0) {
      const volumeRatio = volume / avgVolume;
      
      // Flag unusual activity if volume is 3x average
      if (volumeRatio >= 3.0 && volume >= 100) {
        const premium = parseFloat(option.mark || option.last || '0');
        const underlyingPrice = parseFloat(option.underlying_price || '100');
        
        unusualOptions.push({
          symbol,
          expiration_date: option.expiration,
          strike_price: parseFloat(option.strike),
          option_type: option.type,
          volume,
          avg_volume: Math.round(avgVolume),
          volume_ratio: volumeRatio,
          premium_paid: premium * volume * 100, // Total premium
          underlying_price: underlyingPrice,
          sentiment: determineSentiment(option.type, parseFloat(option.strike), underlyingPrice),
          unusual_score: Math.min(volumeRatio * 10, 100)
        });
      }
    }
  }
  
  return unusualOptions;
}

function determineSentiment(optionType: string, strike: number, underlyingPrice: number): string {
  const moneyness = strike / underlyingPrice;
  
  if (optionType === 'call') {
    return moneyness > 1.05 ? 'bullish' : 'neutral';
  } else {
    return moneyness < 0.95 ? 'bearish' : 'neutral';
  }
}

// Find optimal options strategies
function findOptimalStrategies(symbol: string, optionsData: any[], underlyingPrice: number): any[] {
  const strategies: any[] = [];
  const riskFreeRate = 0.05; // 5% risk-free rate
  
  // Look for high IV rank opportunities
  const calls = optionsData.filter(opt => opt.type === 'call');
  const puts = optionsData.filter(opt => opt.type === 'put');
  
  // Iron Condor opportunities (high IV)
  if (calls.length >= 2 && puts.length >= 2) {
    const atmCalls = calls.filter(c => Math.abs(parseFloat(c.strike) - underlyingPrice) / underlyingPrice < 0.05);
    const atmPuts = puts.filter(p => Math.abs(parseFloat(p.strike) - underlyingPrice) / underlyingPrice < 0.05);
    
    if (atmCalls.length > 0 && atmPuts.length > 0) {
      const shortCall = atmCalls[0];
      const shortPut = atmPuts[0];
      const iv = parseFloat(shortCall.implied_volatility || '0.25');
      
      if (iv > 0.3) { // High IV opportunity
        const daysToExp = Math.max(1, (new Date(shortCall.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const timeToExp = daysToExp / 365;
        
        const callPrice = blackScholes(underlyingPrice, parseFloat(shortCall.strike), timeToExp, riskFreeRate, iv, 'call');
        const putPrice = blackScholes(underlyingPrice, parseFloat(shortPut.strike), timeToExp, riskFreeRate, iv, 'put');
        
        strategies.push({
          symbol,
          strategy_name: 'Short Straddle',
          strategy_type: 'neutral',
          legs: [
            { action: 'sell', type: 'call', strike: parseFloat(shortCall.strike), quantity: 1 },
            { action: 'sell', type: 'put', strike: parseFloat(shortPut.strike), quantity: 1 }
          ],
          max_profit: (callPrice + putPrice) * 100,
          max_loss: null, // Unlimited
          breakeven_points: [
            parseFloat(shortCall.strike) + callPrice + putPrice,
            parseFloat(shortPut.strike) - callPrice - putPrice
          ],
          profit_probability: 0.68, // Roughly 1 standard deviation
          expected_return: (callPrice + putPrice) * 0.5,
          risk_reward_ratio: null,
          days_to_expiration: Math.round(daysToExp),
          iv_rank: Math.min(iv * 100, 100),
          delta_exposure: 0, // Delta neutral
          theta_decay: (callPrice + putPrice) * 0.1,
          confidence_score: iv > 0.4 ? 85 : 70
        });
      }
    }
  }
  
  // Covered Call opportunities (high IV, own stock)
  for (const call of calls) {
    const strike = parseFloat(call.strike);
    const iv = parseFloat(call.implied_volatility || '0.25');
    const daysToExp = Math.max(1, (new Date(call.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (strike > underlyingPrice * 1.02 && iv > 0.25 && daysToExp >= 14 && daysToExp <= 45) {
      const timeToExp = daysToExp / 365;
      const callPrice = blackScholes(underlyingPrice, strike, timeToExp, riskFreeRate, iv, 'call');
      
      strategies.push({
        symbol,
        strategy_name: 'Covered Call',
        strategy_type: 'income',
        legs: [
          { action: 'buy', type: 'stock', quantity: 100 },
          { action: 'sell', type: 'call', strike, quantity: 1 }
        ],
        max_profit: (strike - underlyingPrice + callPrice) * 100,
        max_loss: (underlyingPrice - callPrice) * 100,
        breakeven_points: [underlyingPrice - callPrice],
        profit_probability: 0.75,
        expected_return: callPrice * 100,
        risk_reward_ratio: callPrice / (underlyingPrice - callPrice),
        days_to_expiration: Math.round(daysToExp),
        iv_rank: Math.min(iv * 100, 100),
        delta_exposure: 0.5, // Approximately
        theta_decay: callPrice * 0.05,
        confidence_score: iv > 0.3 ? 80 : 65
      });
    }
  }
  
  return strategies.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0)).slice(0, 3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting comprehensive options analysis...');
    
    // Fetch all tradeable symbols
    const symbols = await fetchTradeableSymbols();
    console.log(`Analyzing ${symbols.length} symbols for options opportunities`);
    
    const allStrategies: any[] = [];
    const allUnusualActivity: any[] = [];
    let processedCount = 0;
    
    // Process symbols in batches to avoid rate limits
    for (let i = 0; i < Math.min(symbols.length, 50); i++) {
      const symbol = symbols[i];
      console.log(`Processing ${symbol} (${i + 1}/${Math.min(symbols.length, 50)})`);
      
      try {
        // Get current stock price
        const priceResponse = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${Deno.env.get("AV_KEY")}`
        );
        const priceData = await priceResponse.json();
        const underlyingPrice = parseFloat(priceData['Global Quote']?.[`05. price`] || '100');
        
        // Fetch options chain
        const optionsData = await fetchOptionsChain(symbol);
        
        if (optionsData.length > 0) {
          // Analyze for unusual activity
          const unusualActivity = analyzeUnusualActivity(optionsData, symbol);
          allUnusualActivity.push(...unusualActivity);
          
          // Find optimal strategies
          const strategies = findOptimalStrategies(symbol, optionsData, underlyingPrice);
          allStrategies.push(...strategies);
          
          // Store options data
          for (const option of optionsData.slice(0, 10)) {
            const daysToExp = Math.max(1, (new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const timeToExp = daysToExp / 365;
            const iv = parseFloat(option.implied_volatility || '0.25');
            const strike = parseFloat(option.strike);
            
            const theoreticalPrice = blackScholes(
              underlyingPrice, 
              strike, 
              timeToExp, 
              0.05, 
              iv, 
              option.type as 'call' | 'put'
            );
            
            const greeks = calculateGreeks(underlyingPrice, strike, timeToExp, 0.05, iv, option.type as 'call' | 'put');
            
            await sb.from('options_chain').upsert({
              symbol,
              expiration_date: option.expiration,
              strike_price: strike,
              option_type: option.type,
              bid: parseFloat(option.bid || '0'),
              ask: parseFloat(option.ask || '0'),
              volume: parseInt(option.volume || '0'),
              open_interest: parseInt(option.open_interest || '0'),
              implied_volatility: iv,
              delta: greeks.delta,
              gamma: greeks.gamma,
              theta: greeks.theta,
              vega: greeks.vega,
              rho: greeks.rho,
              theoretical_price: theoreticalPrice,
              intrinsic_value: Math.max(0, option.type === 'call' ? underlyingPrice - strike : strike - underlyingPrice),
              time_value: theoreticalPrice - Math.max(0, option.type === 'call' ? underlyingPrice - strike : strike - underlyingPrice),
              last_trade_price: parseFloat(option.last || '0')
            });
          }
        }
        
        processedCount++;
        
        // Rate limiting - wait between requests
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay every 5 requests
        }
        
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        continue;
      }
    }
    
    // Store unusual activity
    if (allUnusualActivity.length > 0) {
      await sb.from('unusual_options_activity').insert(allUnusualActivity);
      console.log(`Stored ${allUnusualActivity.length} unusual options activities`);
    }
    
    // Store strategies
    if (allStrategies.length > 0) {
      await sb.from('options_strategies').insert(allStrategies);
      console.log(`Stored ${allStrategies.length} options strategies`);
    }
    
    // Find best strategy for daily pick
    const bestStrategy = allStrategies.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))[0];
    
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
          `${bestStrategy.strategy_name} strategy`,
          `IV Rank: ${Math.round(bestStrategy.iv_rank || 0)}%`,
          `${bestStrategy.days_to_expiration} days to expiration`,
          `Confidence: ${Math.round(bestStrategy.confidence_score || 0)}%`,
          `Expected Return: $${Math.round(bestStrategy.expected_return || 0)}`
        ]
      };
      
      await sb.from('daily_pick').insert(dailyPick);
      console.log(`Selected ${bestStrategy.strategy_name} for ${bestStrategy.symbol} as today's pick`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${processedCount} symbols`,
        strategies_found: allStrategies.length,
        unusual_activity: allUnusualActivity.length,
        best_strategy: bestStrategy,
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
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
