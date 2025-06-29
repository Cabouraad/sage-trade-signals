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
      return new Response(JSON.stringify({ error: 'Backtest requires historical data analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/rank' || pathname.includes('rank')) {
      console.log('Starting real data ranking analysis');
      
      const today = new Date().toISOString().split('T')[0];
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      
      // Get real price data for analysis
      const candidates = [];
      
      for (const symbol of symbols) {
        try {
          // Fetch actual price history with more lenient requirements
          const { data: priceData, error: priceError } = await supabaseClient
            .from('price_history')
            .select('*')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(60); // Last 60 days

          if (priceError) {
            console.error(`Error fetching data for ${symbol}:`, priceError);
            continue;
          }

          if (!priceData || priceData.length < 10) { // Reduced from 20 to 10
            console.log(`Insufficient price data for ${symbol} (${priceData?.length || 0} days), skipping`);
            continue;
          }

          console.log(`Analyzing ${symbol} with ${priceData.length} days of real market data`);

          // Calculate real technical indicators
          const prices = priceData.map(p => p.close).reverse(); // Oldest first
          const volumes = priceData.map(p => p.volume).reverse();
          
          // Simple Moving Averages (adjust for shorter data)
          const sma5 = calculateSMA(prices, Math.min(5, prices.length));
          const sma10 = calculateSMA(prices, Math.min(10, prices.length));
          const sma20 = calculateSMA(prices, Math.min(20, prices.length));
          
          const currentPrice = prices[prices.length - 1];
          
          // Technical Analysis Scoring with more lenient criteria
          let technicalScore = 0;
          let signals = [];
          
          // Trend Analysis
          if (sma5 > sma10 && sma10 > sma20) {
            technicalScore += 3;
            signals.push('Strong uptrend: 5 > 10 > 20 SMA');
          } else if (sma5 > sma10) {
            technicalScore += 2;
            signals.push('Short-term uptrend: 5 > 10 SMA');
          } else if (sma5 > sma20) {
            technicalScore += 1;
            signals.push('Price above 20-day average');
          }
          
          // Momentum (use shorter period if needed)
          const momentumPeriod = Math.min(5, prices.length - 1);
          const momentum = (currentPrice - prices[prices.length - 1 - momentumPeriod]) / prices[prices.length - 1 - momentumPeriod];
          if (momentum > 0.01) { // Reduced from 0.02
            technicalScore += 2;
            signals.push(`Positive ${momentumPeriod}-day momentum: ${(momentum * 100).toFixed(1)}%`);
          }
          
          // Volume Analysis
          if (volumes.length >= 5) {
            const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
            const recentVolume = volumes[volumes.length - 1];
            if (recentVolume > avgVolume * 1.2) { // Reduced from 1.5
              technicalScore += 1;
              signals.push('Above-average volume');
            }
          }
          
          // Price action near recent highs
          const recentHigh = Math.max(...prices.slice(-Math.min(20, prices.length)));
          if (currentPrice / recentHigh > 0.9) { // Reduced from 0.95
            technicalScore += 1;
            signals.push('Near recent highs');
          }
          
          // Calculate risk metrics with available data
          const returns = [];
          for (let i = 1; i < Math.min(prices.length, 30); i++) { // Use last 30 days max
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
          }
          
          if (returns.length === 0) {
            console.log(`No returns data for ${symbol}, skipping`);
            continue;
          }
          
          const positiveReturns = returns.filter(r => r > 0);
          const negativeReturns = returns.filter(r => r < 0);
          
          const winRate = positiveReturns.length / returns.length;
          const avgWin = positiveReturns.length > 0 ? 
            positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length : 0.01;
          const avgLoss = negativeReturns.length > 0 ? 
            Math.abs(negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length) : 0.01;
          
          const payoffRatio = avgWin / avgLoss;
          
          // Kelly Criterion calculation (more conservative)
          const kellyFraction = Math.max(0, Math.min(0.15, (payoffRatio * winRate - (1 - winRate)) / payoffRatio));
          
          // Historical volatility
          const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r*r, 0) / returns.length) * Math.sqrt(252);
          
          // Sharpe-like ratio
          const excessReturn = avgWin * winRate - avgLoss * (1 - winRate);
          const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
          
          // More lenient candidate selection criteria
          if (technicalScore >= 1 && kellyFraction > 0.005) { // Reduced thresholds
            // Calculate position sizing
            const sizePct = Math.round(kellyFraction * 100 * 20) / 20; // Allow smaller positions
            
            // ATR-based stops (simplified with available data)
            const atr = calculateATR(priceData.slice(-Math.min(14, priceData.length)));
            const stopLoss = currentPrice - (atr * 2);
            const targetPrice = currentPrice + (atr * 2.5);
            
            candidates.push({
              symbol,
              strategy: determineStrategy(sma5, sma10, sma20, momentum),
              entry_price: currentPrice,
              stop_loss: Math.max(stopLoss, currentPrice * 0.97), // Max 3% stop
              target_price: Math.min(targetPrice, currentPrice * 1.12), // Max 12% target
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

            console.log(`✓ Added candidate ${symbol} with technical score ${technicalScore}`);
          } else {
            console.log(`${symbol} filtered out: tech score ${technicalScore}, kelly ${kellyFraction}`);
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
          data_available: 'Requires recent price data in database',
          debug_info: 'Try running data collection first'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Rank by composite score (technical score * kelly fraction * (1 + sharpe ratio))
      candidates.forEach(c => {
        c.composite_score = c.technical_score * c.kelly_fraction * (1 + Math.max(0, c.sharpe_ratio));
      });
      
      candidates.sort((a, b) => b.composite_score - a.composite_score);
      const bestCandidate = candidates[0];

      console.log(`Selected ${bestCandidate.symbol} with composite score ${bestCandidate.composite_score.toFixed(4)}`);

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

      console.log('✓ Successfully stored daily pick in database');

      return new Response(JSON.stringify({
        success: true,
        message: 'Real data analysis completed successfully',
        selected_pick: bestCandidate,
        total_candidates: candidates.length,
        analysis_method: 'technical_analysis_with_real_market_data'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Error in python-sim analysis:', error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Real technical analysis functions
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period || period <= 0) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

function calculateATR(priceData: any[], period: number = 14): number {
  if (!priceData || priceData.length < 2) return 1;
  
  const actualPeriod = Math.min(period, priceData.length - 1);
  const trueRanges = [];
  
  for (let i = 1; i < Math.min(priceData.length, actualPeriod + 1); i++) {
    const current = priceData[i];
    const previous = priceData[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return trueRanges.length > 0 ? trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length : 1;
}

function determineStrategy(sma5: number, sma10: number, sma20: number, momentum: number): string {
  if (sma5 > sma10 && sma10 > sma20 && momentum > 0.02) {
    return 'momentum-breakout';
  } else if (sma5 > sma10) {
    return 'trend-following';
  } else if (momentum < -0.015) {
    return 'mean-reversion';
  } else {
    return 'consolidation-play';
  }
}
