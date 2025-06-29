
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
      // Simulate backtest endpoint
      const body = await req.json();
      const strategy = body.strategy || 'sma_cross';
      
      // Mock backtest results
      const mockResults = {
        strategy,
        total_return: 0.21,
        sharpe_ratio: 1.45,
        max_drawdown: -0.08,
        win_rate: 0.62,
        total_trades: 45
      };

      return new Response(JSON.stringify(mockResults), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/rank' || pathname.includes('rank')) {
      console.log('Received ranking request');
      
      // Simulate strategy ranking and write to daily_pick
      const strategies = ['momentum-breakout', 'mean-reversion', 'gap-fade', 'trend-following'];
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META'];
      
      // Mock strategy results with enhanced logic
      const strategyResults = strategies.map(strategy => ({
        strategy,
        sharpe_ratio: Math.random() * 2 + 0.8, // 0.8 to 2.8
        expected_return: Math.random() * 0.25 + 0.08, // 8% to 33%
        kelly_fraction: Math.random() * 0.15 + 0.05 // 5% to 20%
      }));

      // Find best strategy
      const bestStrategy = strategyResults.reduce((best, current) => 
        current.sharpe_ratio > best.sharpe_ratio ? current : best
      );

      // Generate enhanced trade recommendation
      const selectedSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const entryPrice = Math.random() * 150 + 100; // $100-$250 range
      const stopLossPercent = Math.random() * 0.03 + 0.02; // 2-5% stop
      const targetPercent = Math.random() * 0.08 + 0.05; // 5-13% target
      
      const stopLoss = entryPrice * (1 - stopLossPercent);
      const targetPrice = entryPrice * (1 + targetPercent);
      const sizePct = Math.round(bestStrategy.kelly_fraction * 100 * 10) / 10; // Round to 1 decimal

      const today = new Date().toISOString().split('T')[0];

      // Generate reason bullets
      const reasonBullets = [
        `Kelly sizing recommends ${sizePct}% of equity allocation`,
        `Strong ${bestStrategy.strategy.replace('-', ' ')} signal detected`,
        `Risk/reward ratio of 1:${(targetPercent/stopLossPercent).toFixed(1)}`,
        `Expected return of ${(bestStrategy.expected_return * 100).toFixed(1)}%`,
        `High Sharpe ratio of ${bestStrategy.sharpe_ratio.toFixed(2)}`
      ];

      // Create daily pick - simplified without user_id for now
      const { data: insertData, error: insertError } = await supabaseClient
        .from('daily_pick')
        .upsert({
          date: today,
          strategy: bestStrategy.strategy,
          symbol: selectedSymbol,
          entry_price: Math.round(entryPrice * 100) / 100,
          stop_loss: Math.round(stopLoss * 100) / 100,
          target_price: Math.round(targetPrice * 100) / 100,
          sharpe_ratio: Math.round(bestStrategy.sharpe_ratio * 100) / 100,
          expected_return: Math.round(bestStrategy.expected_return * 1000) / 1000,
          kelly_fraction: Math.round(bestStrategy.kelly_fraction * 1000) / 1000,
          size_pct: sizePct,
          risk_amount: Math.round((entryPrice - stopLoss) * 100) / 100,
          reason_bullets: reasonBullets
        }, { onConflict: 'date' });

      console.log('Daily pick created:', insertData);
      
      if (insertError) {
        console.error('Error creating daily pick:', insertError);
        throw insertError;
      }

      return new Response(JSON.stringify({
        success: true,
        best_strategy: bestStrategy.strategy,
        sharpe_ratio: bestStrategy.sharpe_ratio,
        symbol: selectedSymbol,
        entry_price: entryPrice,
        kelly_fraction: bestStrategy.kelly_fraction,
        size_pct: sizePct,
        message: 'Enhanced ranking completed successfully'
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
})
