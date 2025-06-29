
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCandidates } from './candidate-builder.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Parse request body to get the path parameter
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      console.log('No request body or invalid JSON, using default path');
    }

    const path = requestBody.path || 'rank';
    console.log(`Processing request with path: ${path}`);

    if (path === 'backtest') {
      return new Response(JSON.stringify({ error: 'Backtest requires historical data analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'rank') {
      console.log('Starting real data ranking analysis');
      
      const today = new Date().toISOString().split('T')[0];
      const symbols = requestBody.symbols || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      
      console.log(`Analyzing symbols: ${symbols.join(', ')}`);
      
      const candidates = await buildCandidates(symbols, supabaseClient);

      if (candidates.length === 0) {
        console.log('No candidates found, returning warning');
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

      // Rank by composite score
      candidates.forEach(c => {
        c.composite_score = c.technical_score * c.kelly_fraction * (1 + Math.max(0, c.sharpe_ratio));
      });
      
      candidates.sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0));
      const bestCandidate = candidates[0];

      console.log(`Selected ${bestCandidate.symbol} with composite score ${bestCandidate.composite_score?.toFixed(4)}`);

      // Store the analysis result
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

    // Default response for unknown paths
    return new Response(JSON.stringify({
      error: 'Unknown path',
      available_paths: ['rank', 'backtest'],
      received_path: path
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in python-sim analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      success: false,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
