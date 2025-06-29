
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    if (pathname === '/backtest') {
      // Real backtest functionality would need historical analysis
      return new Response(JSON.stringify({ error: 'Backtest requires historical data analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/rank' || pathname.includes('rank')) {
      console.log('Starting real data ranking analysis');
      
      const today = new Date().toISOString().split('T')[0];
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META'];
      
      // Get real price data for analysis
      const candidates = [];
      
      for (const symbol of symbols) {
        try {
          // Fetch actual price history
          const { data: priceData, error: priceError } = await supabaseClient
            .from('price_history')
            .select('*')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(60); // Last 60 days

          if (priceError || !priceData || priceData.length < 20) {
            console.log(`Insufficient price data for ${symbol}, skipping`);
            continue;
          }

          console.log(`Analyzing ${symbol} with ${priceData.length} days of data`);

          // Calculate real technical indicators
          const prices = priceData.map(p => p.close).reverse(); // Oldest first
          const volumes = priceData.map(p => p.volume).reverse();
          
          // Simple Moving Averages
          const sma10 = calculateSMA(prices, 10);
          const sma20 = calculateSMA(prices, 20);
          const sma50 = calculateSMA(prices, 50);
          
          const currentPrice = prices[prices.length - 1];
          const prevPrice = prices[prices.length - 2];
          
          // Technical Analysis Scoring
          let technicalScore = 0;
          let signals = [];
          
          // Trend Analysis
          if (sma10 > sma20 && sma20 > sma50) {
            technicalScore += 3;
            signals.push('Strong uptrend: 10 > 20 > 50 SMA');
          } else if (sma10 > sma20) {
            technicalScore += 1;
            signals.push('Short-term uptrend: 10 > 20 SMA');
          }
          
          // Momentum
          const momentum5 = (currentPrice - prices[prices.length - 6]) / prices[prices.length - 6];
          if (momentum5 > 0.02) {
            technicalScore += 2;
            signals.push(`Strong 5-day momentum: ${(momentum5 * 100).toFixed(1)}%`);
          }
          
          // Volume Analysis
          const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
          const recentVolume = volumes[volumes.length - 1];
          if (recentVolume > avgVolume * 1.5) {
            technicalScore += 1;
            signals.push('Above-average volume');
          }
          
          // Price action near highs
          const high52w = Math.max(...prices.slice(-252)); // 52-week high approximation
          if (currentPrice / high52w > 0.95) {
            technicalScore += 1;
            signals.push('Near 52-week highs');
          }
          
          // Calculate real risk metrics
          const returns = [];
          for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
          }
          
          const positiveReturns = returns.filter(r => r > 0);
          const negativeReturns = returns.filter(r => r < 0);
          
          const winRate = positiveReturns.length / returns.length;
          const avgWin = positiveReturns.length > 0 ? 
            positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length : 0.01;
          const avgLoss = negativeReturns.length > 0 ? 
            Math.abs(negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length) : 0.01;
          
          const payoffRatio = avgWin / avgLoss;
          
          // Kelly Criterion calculation
          const kellyFraction = Math.max(0, Math.min(0.25, (payoffRatio * winRate - (1 - winRate)) / payoffRatio));
          
          // Historical volatility
          const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r*r, 0) / returns.length) * Math.sqrt(252);
          
          // Sharpe-like ratio
          const excessReturn = avgWin * winRate - avgLoss * (1 - winRate);
          const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
          
          // Only consider candidates with positive technical score
          if (technicalScore >= 2 && kellyFraction > 0.01) {
            // Calculate position sizing
            const sizePct = Math.round(kellyFraction * 100 * 10) / 10;
            
            // ATR-based stops (simplified)
            const atr = calculateATR(priceData.slice(-14));
            const stopLoss = currentPrice - (atr * 2);
            const targetPrice = currentPrice + (atr * 3);
            
            candidates.push({
              symbol,
              strategy: determineStrategy(sma10, sma20, sma50, momentum5),
              entry_price: currentPrice,
              stop_loss: Math.max(stopLoss, currentPrice * 0.95), // Max 5% stop
              target_price: Math.min(targetPrice, currentPrice * 1.15), // Max 15% target
              sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
              expected_return: Math.round(excessReturn * 1000) / 1000,
              kelly_fraction: Math.round(kellyFraction * 1000) / 1000,
              size_pct: sizePct,
              technical_score: technicalScore,
              win_rate: Math.round(winRate * 100) / 100,
              payoff_ratio: Math.round(payoffRatio * 100) / 100,
              volatility: Math.round(volatility * 100) / 100,
              reason_bullets: signals.slice(0, 5),
              data_points: priceData.length
            });
          }
          
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error);
        }
      }

      if (candidates.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'No suitable candidates found with current market data',
          analyzed_symbols: symbols.length,
          data_available: 'Requires recent price data in database'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Rank by composite score (technical score * kelly fraction * sharpe ratio)
      candidates.forEach(c => {
        c.composite_score = c.technical_score * c.kelly_fraction * Math.max(0, c.sharpe_ratio);
      });
      
      candidates.sort((a, b) => b.composite_score - a.composite_score);
      const bestCandidate = candidates[0];

      console.log(`Selected ${bestCandidate.symbol} with score ${bestCandidate.composite_score}`);

      // Store the real analysis result
      const { error: insertError } = await supabaseClient
        .from('daily_pick')
        .upsert({
          date: today,
          strategy: bestCandidate.strategy,
          symbol: bestCandidate.symbol,
          entry_price: bestCandidate.entry_price,
          stop_loss: bestCandidate.stop_loss,
          target_price: bestCandidate.target_price,
          sharpe_ratio: bestCandidate.sharpe_ratio,
          expected_return: bestCandidate.expected_return,
          kelly_fraction: bestCandidate.kelly_fraction,
          size_pct: bestCandidate.size_pct,
          risk_amount: Math.round((bestCandidate.entry_price - bestCandidate.stop_loss) * 100) / 100,
          reason_bullets: bestCandidate.reason_bullets
        }, { onConflict: 'date' });

      if (insertError) {
        console.error('Error storing daily pick:', insertError);
        throw insertError;
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Real data analysis completed',
        selected_pick: bestCandidate,
        total_candidates: candidates.length,
        analysis_method: 'technical_analysis_with_real_data'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Error in python-sim:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Real technical analysis functions
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

function calculateATR(priceData: any[], period: number = 14): number {
  if (priceData.length < period + 1) return priceData[0]?.high - priceData[0]?.low || 1;
  
  const trueRanges = [];
  for (let i = 1; i < priceData.length && i <= period; i++) {
    const current = priceData[i];
    const previous = priceData[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
}

function determineStrategy(sma10: number, sma20: number, sma50: number, momentum: number): string {
  if (sma10 > sma20 && sma20 > sma50 && momentum > 0.03) {
    return 'momentum-breakout';
  } else if (sma10 > sma20) {
    return 'trend-following';
  } else if (momentum < -0.02) {
    return 'mean-reversion';
  } else {
    return 'consolidation-play';
  }
}
