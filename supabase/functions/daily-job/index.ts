
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { collectMarketData } from './data-collector.ts'
import { runOptionsAnalysis, runStockRanking } from './analysis-orchestrator.ts'
import { HIGH_PRIORITY_SYMBOLS } from './sp500-symbols.ts'

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

    console.log('Starting daily job: S&P 500 Market Data + Options Analysis...');

    // STRICT CHECK: Ensure we have required API keys for live data
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY') || Deno.env.get('AV_KEY');
    if (!alphaVantageKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is required for live market data. Cannot proceed with dummy data.');
    }

    // Parse request to see if full S&P 500 analysis is requested
    const url = new URL(req.url);
    const fullAnalysis = url.searchParams.get('full') === 'true';
    
    // Step 1: Collect LIVE market data for S&P 500 symbols
    console.log(`Collecting LIVE market data for ${fullAnalysis ? 'all S&P 500' : 'priority'} symbols...`);
    
    const dataResult = await collectMarketData(supabaseClient, fullAnalysis);
    console.log(`Data collection completed: ${dataResult.successfulUpdates} successful, ${dataResult.failedUpdates} failed`);
    
    // STRICT CHECK: Ensure we got some real data
    if (dataResult.successfulUpdates === 0) {
      throw new Error(`Failed to collect ANY live market data. Got ${dataResult.failedUpdates} failures. Cannot proceed with analysis using stale data.`);
    }

    // Require minimum success rate for live data
    const successRate = dataResult.successfulUpdates / (dataResult.successfulUpdates + dataResult.failedUpdates);
    if (successRate < 0.5) {
      throw new Error(`Market data collection success rate too low: ${Math.round(successRate * 100)}%. Need at least 50% success rate for reliable analysis.`);
    }

    console.log(`Priority breakdown - High: ${dataResult.priorityResults.high}, Medium: ${dataResult.priorityResults.medium}, Low: ${dataResult.priorityResults.low}`);

    // Step 2: Run comprehensive options analysis with LIVE data only
    const optionsResult = await runOptionsAnalysis(supabaseClient, HIGH_PRIORITY_SYMBOLS);

    // Step 3: Run stock ranking with LIVE data only
    const stockRankingResult = await runStockRanking(supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily S&P 500 analysis completed successfully with LIVE data (${fullAnalysis ? 'Full' : 'Priority'} mode)`,
        dataCollection: {
          successful: dataResult.successfulUpdates,
          failed: dataResult.failedUpdates,
          symbols: dataResult.symbols.length,
          priorityBreakdown: dataResult.priorityResults,
          successRate: Math.round(successRate * 100)
        },
        optionsAnalysis: optionsResult,
        stockRanking: stockRankingResult,
        fullAnalysis,
        symbolsProcessed: dataResult.symbols.length,
        timestamp: new Date().toISOString(),
        dataFreshness: 'LIVE'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Daily job error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
        dataFreshness: 'FAILED'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
