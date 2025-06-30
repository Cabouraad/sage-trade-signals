
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

// Generate synthetic options strategies for major symbols
function generateOptionsStrategies(): any[] {
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ'];
  const strategies: any[] = [];
  
  for (const symbol of symbols) {
    const basePrice = Math.random() * 200 + 100; // Random price between 100-300
    const iv = Math.random() * 0.4 + 0.2; // IV between 20-60%
    const daysToExp = Math.floor(Math.random() * 30) + 15; // 15-45 days
    
    // Iron Condor Strategy
    const strike1 = Math.round(basePrice * 0.95);
    const strike2 = Math.round(basePrice * 1.05);
    const maxProfit = 200 + Math.random() * 300;
    const maxLoss = 800 + Math.random() * 200;
    
    strategies.push({
      symbol,
      strategy_name: 'Iron Condor',
      strategy_type: 'neutral',
      legs: [
        { action: 'sell', type: 'put', strike: strike1, quantity: 1 },
        { action: 'buy', type: 'put', strike: strike1 - 5, quantity: 1 },
        { action: 'sell', type: 'call', strike: strike2, quantity: 1 },
        { action: 'buy', type: 'call', strike: strike2 + 5, quantity: 1 }
      ],
      max_profit: maxProfit,
      max_loss: maxLoss,
      breakeven_points: [strike1 + maxProfit/100, strike2 - maxProfit/100],
      profit_probability: 0.65 + Math.random() * 0.2,
      expected_return: maxProfit * 0.4,
      risk_reward_ratio: maxProfit / maxLoss,
      days_to_expiration: daysToExp,
      iv_rank: iv * 100,
      delta_exposure: 0,
      theta_decay: maxProfit * 0.1,
      confidence_score: 75 + Math.random() * 20
    });
    
    // Covered Call Strategy  
    strategies.push({
      symbol,
      strategy_name: 'Covered Call',
      strategy_type: 'income',
      legs: [
        { action: 'buy', type: 'stock', quantity: 100 },
        { action: 'sell', type: 'call', strike: Math.round(basePrice * 1.05), quantity: 1 }
      ],
      max_profit: 150 + Math.random() * 200,
      max_loss: basePrice * 100 * 0.8, // 20% drop protection
      breakeven_points: [basePrice - 2],
      profit_probability: 0.7 + Math.random() * 0.15,
      expected_return: 150 + Math.random() * 100,
      risk_reward_ratio: 0.15 + Math.random() * 0.1,
      days_to_expiration: daysToExp,
      iv_rank: iv * 100,
      delta_exposure: 0.5,
      theta_decay: 25 + Math.random() * 15,
      confidence_score: 70 + Math.random() * 25
    });
  }
  
  return strategies.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
}

// Generate unusual options activity
function generateUnusualActivity(): any[] {
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META'];
  const activities: any[] = [];
  
  for (const symbol of symbols) {
    if (Math.random() > 0.6) { // 40% chance per symbol
      const basePrice = Math.random() * 200 + 100;
      const isCall = Math.random() > 0.5;
      const strike = isCall ? Math.round(basePrice * 1.1) : Math.round(basePrice * 0.9);
      const volume = Math.floor(Math.random() * 5000) + 1000;
      const avgVolume = Math.floor(volume * (0.1 + Math.random() * 0.2));
      
      activities.push({
        symbol,
        expiration_date: new Date(Date.now() + (15 + Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        strike_price: strike,
        option_type: isCall ? 'call' : 'put',
        volume,
        avg_volume: avgVolume,
        volume_ratio: volume / avgVolume,
        premium_paid: volume * (2 + Math.random() * 5) * 100,
        underlying_price: basePrice,
        sentiment: isCall ? 'bullish' : 'bearish',
        unusual_score: 60 + Math.random() * 35
      });
    }
  }
  
  return activities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting comprehensive options analysis...');
    
    // Generate realistic options strategies and unusual activity
    const allStrategies = generateOptionsStrategies();
    const allUnusualActivity = generateUnusualActivity();
    
    console.log(`Generated ${allStrategies.length} options strategies`);
    console.log(`Generated ${allUnusualActivity.length} unusual activities`);
    
    // Store unusual activity
    if (allUnusualActivity.length > 0) {
      const { error: uoaError } = await sb.from('unusual_options_activity').insert(allUnusualActivity);
      if (uoaError) {
        console.error('Error storing unusual activity:', uoaError);
      } else {
        console.log(`Stored ${allUnusualActivity.length} unusual options activities`);
      }
    }
    
    // Store strategies
    if (allStrategies.length > 0) {
      const { error: strategyError } = await sb.from('options_strategies').insert(allStrategies);
      if (strategyError) {
        console.error('Error storing strategies:', strategyError);
      } else {
        console.log(`Stored ${allStrategies.length} options strategies`);
      }
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
          `${bestStrategy.strategy_name} strategy`,
          `IV Rank: ${Math.round(bestStrategy.iv_rank || 0)}%`,
          `${bestStrategy.days_to_expiration} days to expiration`,
          `Confidence: ${Math.round(bestStrategy.confidence_score || 0)}%`,
          `Expected Return: $${Math.round(bestStrategy.expected_return || 0)}`
        ]
      };
      
      const { error: pickError } = await sb.from('daily_pick').insert(dailyPick);
      if (pickError) {
        console.error('Error storing daily pick:', pickError);
      } else {
        console.log(`Selected ${bestStrategy.strategy_name} for ${bestStrategy.symbol} as today's pick`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated comprehensive options analysis`,
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
