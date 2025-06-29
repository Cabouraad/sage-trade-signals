
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily job...');

    // 1. Fetch market data from Alpha Vantage
    const avKey = Deno.env.get('AV_KEY');
    if (!avKey) {
      throw new Error('Alpha Vantage API key not found');
    }

    // Sample symbols to track
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    
    // Fetch and store price data
    for (const symbol of symbols) {
      try {
        // Insert symbol if not exists
        await supabaseClient
          .from('symbols')
          .upsert({ symbol }, { onConflict: 'symbol' })
          .select();

        // Fetch daily data from Alpha Vantage
        const response = await fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${avKey}`
        );
        
        const data = await response.json();
        
        if (data['Time Series (Daily)']) {
          const timeSeries = data['Time Series (Daily)'];
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const dateKey = yesterday.toISOString().split('T')[0];
          
          if (timeSeries[dateKey]) {
            const priceData = timeSeries[dateKey];
            
            // Store price history
            await supabaseClient
              .from('price_history')
              .upsert({
                symbol,
                date: dateKey,
                open: parseFloat(priceData['1. open']),
                high: parseFloat(priceData['2. high']),
                low: parseFloat(priceData['3. low']),
                close: parseFloat(priceData['4. close']),
                volume: parseInt(priceData['5. volume'])
              }, { onConflict: 'symbol,date' });
              
            console.log(`Updated price data for ${symbol}`);
          }
        }

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
    }

    // 2. Call Python container /rank endpoint
    try {
      const containerUrl = Deno.env.get('PYTHON_CONTAINER_URL') || 'http://localhost:8000';
      const rankResponse = await fetch(`${containerUrl}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });

      if (rankResponse.ok) {
        const rankResult = await rankResponse.json();
        console.log('Strategy ranking completed:', rankResult);
      } else {
        console.error('Failed to call /rank endpoint:', rankResponse.status);
      }
    } catch (error) {
      console.error('Error calling Python container:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily job completed successfully',
        processed_symbols: symbols.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Daily job error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
