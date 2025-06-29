
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

    console.log('Starting enhanced daily job with real data collection...');

    // Get API keys
    const avKey = Deno.env.get('AV_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_KEY');
    
    if (!avKey) {
      throw new Error('Alpha Vantage API key not found - real data cannot be fetched');
    }

    console.log('API Keys configured:', { 
      alphaVantage: !!avKey, 
      finnhub: !!finnhubKey 
    });

    // Priority symbols to track with real data (reduced list for reliability)
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    let successfulUpdates = 0;
    let failedUpdates = 0;
    
    // 1. Fetch and store REAL price data with better error handling
    for (const symbol of symbols) {
      try {
        console.log(`Fetching real data for ${symbol}...`);
        
        // Insert symbol if not exists
        await supabaseClient
          .from('symbols')
          .upsert({ symbol }, { onConflict: 'symbol' });

        // Fetch REAL daily data from Alpha Vantage with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${avKey}&outputsize=compact`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data['Error Message']) {
          console.error(`Alpha Vantage error for ${symbol}: ${data['Error Message']}`);
          failedUpdates++;
          continue;
        }
        
        if (data['Note']) {
          console.warn(`Alpha Vantage rate limit for ${symbol}: ${data['Note']}`);
          // Wait longer for rate limits
          await new Promise(resolve => setTimeout(resolve, 20000));
          failedUpdates++;
          continue;
        }
        
        if (!data['Time Series (Daily)'] || Object.keys(data['Time Series (Daily)']).length === 0) {
          console.warn(`No time series data returned for ${symbol}`);
          failedUpdates++;
          continue;
        }

        const timeSeries = data['Time Series (Daily)'];
        const dates = Object.keys(timeSeries).sort().slice(-30); // Last 30 days for better analysis
        
        let updatedDays = 0;
        for (const dateKey of dates) {
          const priceData = timeSeries[dateKey];
          
          try {
            const { error } = await supabaseClient
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
              
            if (error) {
              console.error(`Database error for ${symbol} ${dateKey}:`, error);
            } else {
              updatedDays++;
            }
          } catch (dbError) {
            console.error(`Failed to store ${symbol} data for ${dateKey}:`, dbError);
          }
        }
        
        if (updatedDays > 0) {
          console.log(`✓ Updated ${updatedDays} days of real data for ${symbol}`);
          successfulUpdates++;

          // Fetch real news sentiment if Finnhub is available
          if (finnhubKey) {
            try {
              const today = new Date().toISOString().split('T')[0];
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 7);
              const weekAgoStr = yesterday.toISOString().split('T')[0];

              const newsResponse = await fetch(
                `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgoStr}&to=${today}&token=${finnhubKey}`,
                { signal: AbortSignal.timeout(15000) }
              );

              if (newsResponse.ok) {
                const newsData = await newsResponse.json();
                
                if (Array.isArray(newsData) && newsData.length > 0) {
                  // Process and store real news with sentiment
                  for (const article of newsData.slice(0, 5)) {
                    const sentimentScore = analyzeSentiment(article.headline + ' ' + (article.summary || ''));
                    
                    await supabaseClient
                      .from('news_sentiment')
                      .upsert({
                        symbol,
                        headline: article.headline,
                        summary: article.summary || '',
                        url: article.url,
                        sentiment_score: sentimentScore,
                        published_at: new Date(article.datetime * 1000).toISOString(),
                        source: article.source,
                        category: article.category || 'general',
                        date: today
                      }, { onConflict: 'symbol,headline,date' });
                  }
                  
                  console.log(`✓ Updated real news sentiment for ${symbol}`);
                }
              }
            } catch (newsError) {
              console.error(`Error fetching real news for ${symbol}:`, newsError);
            }
          }
        } else {
          failedUpdates++;
        }

        // Rate limiting - be more conservative with API calls
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay between calls
        
      } catch (error) {
        console.error(`Failed to process real data for ${symbol}:`, error);
        failedUpdates++;
        
        // If we hit rate limits or network issues, wait longer
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    // 2. Run analysis only if we have sufficient fresh real data
    let analysisResult = null;
    if (successfulUpdates >= 3) { // Need at least 3 symbols with fresh data
      try {
        console.log('Running real data analysis with sufficient data...');
        
        // Call the analysis function directly
        const { data: rankResult, error: rankError } = await supabaseClient.functions.invoke('python-sim', {
          body: { 
            symbols: symbols.slice(0, successfulUpdates),
            path: 'rank'
          }
        });

        if (rankError) {
          console.error('Error in real data analysis:', rankError);
        } else if (rankResult?.success) {
          console.log('✓ Real data analysis completed successfully:', rankResult);
          analysisResult = rankResult;
        } else {
          console.warn('Analysis completed but no suitable candidates found:', rankResult);
        }
      } catch (error) {
        console.error('Error calling analysis function:', error);
      }
    } else {
      console.warn(`Insufficient fresh data (${successfulUpdates}/${symbols.length}) - skipping analysis`);
    }

    const summary = {
      success: true,
      message: 'Real data collection and analysis completed',
      data_collection: {
        symbols_processed: symbols.length,
        successful_updates: successfulUpdates,
        failed_updates: failedUpdates,
        success_rate: `${Math.round((successfulUpdates / symbols.length) * 100)}%`
      },
      apis_used: {
        alpha_vantage: !!avKey,
        finnhub: !!finnhubKey
      },
      analysis_completed: !!analysisResult,
      analysis_result: analysisResult,
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

// Simple sentiment analysis function for real news
function analyzeSentiment(text: string): number {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'strong', 'growth', 'profit', 'gain', 'success', 'bullish', 'buy', 'upgrade', 'outperform', 'beat', 'exceed'];
  const negativeWords = ['bad', 'poor', 'negative', 'weak', 'loss', 'decline', 'fail', 'bearish', 'sell', 'downgrade', 'underperform', 'risk', 'miss', 'below'];
  
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
