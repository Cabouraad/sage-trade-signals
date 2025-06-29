
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface DataCollectionResult {
  successfulUpdates: number;
  failedUpdates: number;
  symbols: string[];
}

export async function collectMarketData(supabaseClient: any, symbols: string[]): Promise<DataCollectionResult> {
  const avKey = Deno.env.get('AV_KEY');
  const finnhubKey = Deno.env.get('FINNHUB_KEY');
  
  if (!avKey) {
    console.warn('Alpha Vantage API key not found - using existing data if available');
  }

  console.log('API Keys configured:', { 
    alphaVantage: !!avKey, 
    finnhub: !!finnhubKey 
  });

  let successfulUpdates = 0;
  let failedUpdates = 0;
  
  for (const symbol of symbols) {
    try {
      console.log(`Processing ${symbol}...`);
      
      // Insert symbol if not exists
      await supabaseClient
        .from('symbols')
        .upsert({ symbol }, { onConflict: 'symbol' });

      // Check if we have recent data first
      const { data: existingData } = await supabaseClient
        .from('price_history')
        .select('date')
        .eq('symbol', symbol)
        .order('date', { ascending: false })
        .limit(1);

      const hasRecentData = existingData && existingData.length > 0;
      const lastDataDate = hasRecentData ? new Date(existingData[0].date) : null;
      const isDataFresh = lastDataDate && (Date.now() - lastDataDate.getTime()) < 24 * 60 * 60 * 1000; // 1 day

      if (isDataFresh) {
        console.log(`✓ ${symbol} has fresh data from ${lastDataDate?.toISOString().split('T')[0]}`);
        successfulUpdates++;
        continue;
      }

      if (!avKey) {
        console.log(`No API key and no fresh data for ${symbol} - marking as failed`);
        failedUpdates++;
        continue;
      }

      // Fetch real daily data from Alpha Vantage
      console.log(`Fetching real data for ${symbol}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${avKey}&outputsize=compact`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`API Response for ${symbol}:`, Object.keys(data));
      
      // Handle API errors and rate limits
      if (data['Error Message']) {
        console.error(`Alpha Vantage error for ${symbol}: ${data['Error Message']}`);
        failedUpdates++;
        continue;
      }
      
      if (data['Note']) {
        console.warn(`Alpha Vantage rate limit for ${symbol}: ${data['Note']}`);
        await new Promise(resolve => setTimeout(resolve, 20000));
        failedUpdates++;
        continue;
      }
      
      if (data['Information']) {
        console.warn(`Alpha Vantage info for ${symbol}: ${data['Information']}`);
        await new Promise(resolve => setTimeout(resolve, 60000));
        failedUpdates++;
        continue;
      }
      
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries || Object.keys(timeSeries).length === 0) {
        console.warn(`No time series data returned for ${symbol}. Response keys:`, Object.keys(data));
        failedUpdates++;
        continue;
      }

      // Get the most recent 100 days of data
      const dates = Object.keys(timeSeries).sort().slice(-100);
      
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

        // Collect news sentiment if Finnhub is available
        if (finnhubKey) {
          await collectNewsSentiment(supabaseClient, symbol, finnhubKey);
        }
      } else {
        failedUpdates++;
      }

      // Rate limiting to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
      
    } catch (error) {
      console.error(`Failed to process real data for ${symbol}:`, error);
      failedUpdates++;
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait longer on error
    }
  }

  console.log(`Data collection complete: ${successfulUpdates} successful, ${failedUpdates} failed`);
  return { successfulUpdates, failedUpdates, symbols };
}

async function collectNewsSentiment(supabaseClient: any, symbol: string, finnhubKey: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekAgoStr = lastWeek.toISOString().split('T')[0];

    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgoStr}&to=${today}&token=${finnhubKey}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      
      if (Array.isArray(newsData) && newsData.length > 0) {
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

function analyzeSentiment(text: string): number {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'strong', 'growth', 'profit', 'gain', 'success', 'bullish', 'buy', 'upgrade', 'outperform', 'beat', 'exceed'];
  const negativeWords = ['bad', 'poor', 'negative', 'weak', 'loss', 'decline', 'fail', 'bearish', 'sell', 'downgrade', 'underperform', 'risk', 'miss', 'below'];
  
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  const maxWords = Math.max(positiveWords.length, negativeWords.length);
  return Math.max(-1, Math.min(1, score / maxWords));
}
