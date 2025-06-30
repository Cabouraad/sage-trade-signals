
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

    console.log('Starting daily job: Data collection + TypeScript Ranking...');

    // Step 1: Collect fresh market data
    const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY'];
    console.log('Collecting market data for:', symbols.join(', '));
    
    const dataResult = await collectMarketData(supabaseClient, symbols);
    console.log(`Data collection completed: ${dataResult.successfulUpdates} successful, ${dataResult.failedUpdates} failed`);

    // Step 2: Run TypeScript ranking algorithm
    console.log('Running TypeScript ranking engine...');
    const { data: rankResult, error: rankError } = await supabaseClient.functions.invoke('rank-runner');

    if (rankError) {
      console.error('Error calling rank-runner:', rankError);
      throw rankError;
    }

    console.log('Rank-runner result:', rankResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily job completed successfully',
        dataCollection: {
          successful: dataResult.successfulUpdates,
          failed: dataResult.failedUpdates,
          symbols: dataResult.symbols
        },
        ranking: rankResult,
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

// Schedule the daily job to run at 09:05 ET (13:05 UTC) on weekdays
Deno.cron("trade-of-day", "5 13 * * 1-5", async () => {
  console.log('Running scheduled daily job...');
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  try {
    await supabaseClient.functions.invoke('daily-job');
    console.log('Scheduled daily job completed successfully');
  } catch (error) {
    console.error('Scheduled daily job failed:', error);
  }
});
