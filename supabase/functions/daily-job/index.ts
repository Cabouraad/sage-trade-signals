
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { collectMarketData } from './data-collector.ts'
import { runAnalysis } from './analysis-runner.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting enhanced daily job with real data collection...');

    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    
    // 1. Collect market data
    const dataResult = await collectMarketData(supabaseClient, symbols);
    
    // 2. Run analysis if we have sufficient data
    const analysisResult = await runAnalysis(supabaseClient, symbols, dataResult.successfulUpdates);

    const summary = {
      success: true,
      message: 'Real data collection and analysis completed',
      data_collection: {
        symbols_processed: symbols.length,
        successful_updates: dataResult.successfulUpdates,
        failed_updates: dataResult.failedUpdates,
        success_rate: `${Math.round((dataResult.successfulUpdates / symbols.length) * 100)}%`
      },
      apis_used: {
        alpha_vantage: !!Deno.env.get('AV_KEY'),
        finnhub: !!Deno.env.get('FINNHUB_KEY')
      },
      analysis_completed: analysisResult.success,
      analysis_result: analysisResult.result,
      timestamp: new Date().toISOString()
    };

    console.log('Daily job summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Enhanced daily job error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        requires: 'Valid Alpha Vantage API key for real market data'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
