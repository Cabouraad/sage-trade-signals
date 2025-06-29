
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

    if (pathname === '/rank') {
      // Simulate strategy ranking and write to daily_pick
      const strategies = ['sma-cross', 'gap-close', 'bull-call-spread', 'bear-put-spread'];
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      
      // Mock strategy results
      const strategyResults = strategies.map(strategy => ({
        strategy,
        sharpe_ratio: Math.random() * 2 + 0.5,
        expected_return: Math.random() * 0.3 + 0.05
      }));

      // Find best strategy
      const bestStrategy = strategyResults.reduce((best, current) => 
        current.sharpe_ratio > best.sharpe_ratio ? current : best
      );

      // Generate mock trade recommendation
      const selectedSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const entryPrice = Math.random() * 200 + 100;
      const stopLoss = entryPrice * (1 - Math.random() * 0.05 - 0.02);
      const targetPrice = entryPrice * (1 + Math.random() * 0.1 + 0.03);

      const today = new Date().toISOString().split('T')[0];

      // Create daily pick for all users (or you could make this user-specific)
      const { data: users } = await supabaseClient.auth.admin.listUsers();
      
      for (const user of users.users) {
        try {
          await supabaseClient
            .from('daily_pick')
            .upsert({
              user_id: user.id,
              date: today,
              strategy: bestStrategy.strategy,
              symbol: selectedSymbol,
              entry_price: entryPrice,
              stop_loss: stopLoss,
              target_price: targetPrice,
              sharpe_ratio: bestStrategy.sharpe_ratio,
              expected_return: bestStrategy.expected_return,
              risk_amount: entryPrice * 0.02
            }, { onConflict: 'date,user_id' });
        } catch (error) {
          console.error(`Error creating daily pick for user ${user.id}:`, error);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        best_strategy: bestStrategy.strategy,
        sharpe_ratio: bestStrategy.sharpe_ratio,
        symbol: selectedSymbol,
        entry_price: entryPrice
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
