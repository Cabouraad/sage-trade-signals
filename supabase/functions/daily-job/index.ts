
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

    // Check for required API keys
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY') || Deno.env.get('AV_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_KEY');
    
    if (!alphaVantageKey && !finnhubKey) {
      console.error('No market data API keys configured. Need either ALPHA_VANTAGE_API_KEY or FINNHUB_KEY');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Market data API keys not configured. Please set ALPHA_VANTAGE_API_KEY or FINNHUB_KEY in Supabase secrets.',
          missingKeys: ['ALPHA_VANTAGE_API_KEY', 'FINNHUB_KEY'],
          timestamp: new Date().toISOString(),
          dataFreshness: 'FAILED'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`API Keys available: AV=${!!alphaVantageKey}, Finnhub=${!!finnhubKey}`);

    // Parse request to see if full S&P 500 analysis is requested
    const url = new URL(req.url);
    const fullAnalysis = url.searchParams.get('full') === 'true';
    
    // Step 1: Collect LIVE market data for S&P 500 symbols
    console.log(`Collecting LIVE market data for ${fullAnalysis ? 'all S&P 500' : 'priority'} symbols...`);
    
    const dataResult = await collectMarketData(supabaseClient, fullAnalysis);
    console.log(`Data collection completed: ${dataResult.successfulUpdates} successful, ${dataResult.failedUpdates} failed`);
    
    const successRate = dataResult.successfulUpdates / (dataResult.successfulUpdates + dataResult.failedUpdates);
    console.log(`Data collection success rate: ${Math.round(successRate * 100)}%`);
    console.log(`Priority breakdown - High: ${dataResult.priorityResults.high}, Medium: ${dataResult.priorityResults.medium}, Low: ${dataResult.priorityResults.low}`);

    // STRICT data freshness validation - require at least some fresh data
    if (dataResult.successfulUpdates === 0) {
      console.error('CRITICAL: Daily job collected zero fresh market data');
      
      // Check if we have ANY recent data (within 24 hours) to work with
      const { data: recentData, error } = await supabaseClient
        .from('price_history')
        .select('symbol, date')
        .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);
      
      if (error || !recentData || recentData.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `CRITICAL: No live market data available within 24-hour freshness requirement. Cannot generate safe options trades.`,
            details: {
              successfulUpdates: dataResult.successfulUpdates,
              failedUpdates: dataResult.failedUpdates,
              apiKeysConfigured: { alphaVantage: !!alphaVantageKey, finnhub: !!finnhubKey },
              requirement: 'Data must be <24 hours old for live options trading'
            },
            timestamp: new Date().toISOString(),
            dataFreshness: 'FAILED'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('Found minimal recent data, proceeding with limited analysis...');
      }
    }
    // Step 2: Run comprehensive options analysis with STRICT validation
    console.log('Starting options analysis with strict backtesting and data validation...');
    const optionsResult = await runOptionsAnalysis(supabaseClient, HIGH_PRIORITY_SYMBOLS);

    // Step 3: Run stock ranking (as fallback if options analysis fails)
    const stockRankingResult = await runStockRanking(supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily S&P 500 analysis completed with ${dataResult.successfulUpdates > 0 ? 'fresh' : 'existing'} data (${fullAnalysis ? 'Full' : 'Priority'} mode)`,
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
        dataFreshness: dataResult.successfulUpdates > 0 ? 'LIVE' : 'RECENT'
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
        stack: error.stack,
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
