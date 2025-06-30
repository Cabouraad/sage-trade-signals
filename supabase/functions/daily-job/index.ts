
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { collectMarketData } from './data-collector.ts'

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

    console.log('Starting daily job: Market data + Options Analysis...');

    // Step 1: Collect fresh market data for key symbols
    const keySymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'IWM'];
    console.log('Collecting market data for key symbols:', keySymbols.join(', '));
    
    const dataResult = await collectMarketData(supabaseClient, keySymbols);
    console.log(`Data collection completed: ${dataResult.successfulUpdates} successful, ${dataResult.failedUpdates} failed`);

    // Step 2: Run comprehensive options analysis (PRIMARY FOCUS)
    console.log('Running options scanner...');
    const { data: optionsResult, error: optionsError } = await supabaseClient.functions.invoke('options-scanner');

    if (optionsError) {
      console.error('Error calling options-scanner:', optionsError);
    } else {
      console.log('Options analysis result:', optionsResult);
    }

    // Step 3: Only run stock ranking if no options strategies were found
    let stockRankingResult = null;
    
    // Check if we have any recent options strategies
    const { data: existingStrategies } = await supabaseClient
      .from('options_strategies')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!existingStrategies || existingStrategies.length === 0) {
      console.log('No options strategies found, running stock ranking as fallback...');
      const { data: rankingResult, error: rankingError } = await supabaseClient.functions.invoke('rank-runner');
      
      if (rankingError) {
        console.error('Error calling rank-runner:', rankingError);
      } else {
        stockRankingResult = rankingResult;
        console.log('Stock ranking result:', stockRankingResult);
      }
    } else {
      console.log('Options strategies found, skipping stock ranking');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily options analysis completed successfully',
        dataCollection: {
          successful: dataResult.successfulUpdates,
          failed: dataResult.failedUpdates,
          symbols: dataResult.symbols
        },
        optionsAnalysis: optionsResult,
        stockRanking: stockRankingResult,
        prioritizedOptions: true,
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
