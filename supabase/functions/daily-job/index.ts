
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple sentiment analysis function
function analyzeSentiment(text: string): number {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'strong', 'growth', 'profit', 'gain', 'success', 'bullish', 'buy', 'upgrade', 'outperform'];
  const negativeWords = ['bad', 'poor', 'negative', 'weak', 'loss', 'decline', 'fail', 'bearish', 'sell', 'downgrade', 'underperform', 'risk'];
  
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  // Normalize to -1 to 1 range
  const maxWords = Math.max(positiveWords.length, negativeWords.length);
  return Math.max(-1, Math.min(1, score / maxWords));
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

    console.log('Starting enhanced daily job...');

    // Get API keys
    const avKey = Deno.env.get('AV_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_KEY');
    
    if (!avKey) {
      throw new Error('Alpha Vantage API key not found');
    }

    // Sample symbols to track
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX', 'AMD', 'ADBE'];
    
    // 1. Fetch and store price data (existing logic)
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

        // Fetch news sentiment from Finnhub if API key is available
        if (finnhubKey) {
          try {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const newsResponse = await fetch(
              `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${yesterdayStr}&to=${today}&token=${finnhubKey}`
            );

            if (newsResponse.ok) {
              const newsData = await newsResponse.json();
              
              // Process and store news with sentiment
              for (const article of newsData.slice(0, 5)) { // Limit to 5 articles per symbol
                const sentimentScore = analyzeSentiment(article.headline + ' ' + (article.summary || ''));
                
                await supabaseClient
                  .from('news_sentiment')
                  .upsert({
                    symbol,
                    headline: article.headline,
                    summary: article.summary,
                    url: article.url,
                    sentiment_score: sentimentScore,
                    published_at: new Date(article.datetime * 1000).toISOString(),
                    source: article.source,
                    category: article.category,
                    date: today
                  }, { onConflict: 'symbol,headline,date' });
              }
              
              console.log(`Updated news sentiment for ${symbol}`);
            }
          } catch (newsError) {
            console.error(`Error fetching news for ${symbol}:`, newsError);
          }
        }

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
    }

    // 2. Call Python container /pattern_scan endpoint
    try {
      const containerUrl = Deno.env.get('PYTHON_CONTAINER_URL') || 'http://localhost:8000';
      const patternResponse = await fetch(`${containerUrl}/pattern_scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });

      if (patternResponse.ok) {
        const patternResult = await patternResponse.json();
        console.log('Pattern scanning completed:', patternResult);
      } else {
        console.error('Failed to call /pattern_scan endpoint:', patternResponse.status);
      }
    } catch (error) {
      console.error('Error calling pattern scan endpoint:', error);
    }

    // 3. Call Python container /rank endpoint with enhanced logic
    try {
      const containerUrl = Deno.env.get('PYTHON_CONTAINER_URL') || 'http://localhost:8000';
      const rankResponse = await fetch(`${containerUrl}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });

      if (rankResponse.ok) {
        const rankResult = await rankResponse.json();
        console.log('Enhanced strategy ranking completed:', rankResult);
      } else {
        console.error('Failed to call /rank endpoint:', rankResponse.status);
      }
    } catch (error) {
      console.error('Error calling Python container:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced daily job completed successfully',
        processed_symbols: symbols.length,
        finnhub_enabled: !!finnhubKey,
        features_enabled: ['pattern_scanning', 'kelly_sizing', 'robustness_testing', 'regime_filtering']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Enhanced daily job error:', error);
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
