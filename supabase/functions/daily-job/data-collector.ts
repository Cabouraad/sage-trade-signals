
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
    throw new Error('Alpha Vantage API key not found - real data cannot be fetched');
  }

  console.log('API Keys configured:', { 
    alphaVantage: !!avKey, 
    finnhub: !!finnhubKey 
  });

  let successfulUpdates = 0;
  let failedUpdates = 0;
  
  for (const symbol of symbols) {
    try {
      console.log(`Fetching real data for ${symbol}...`);
      
      // Insert symbol if not exists
      await supabaseClient
        .from('symbols')
        .upsert({ symbol }, { onConflict: 'symbol' });

      // Fetch REAL daily data from Alpha Vantage with timeout
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
      
      if (!data['Time Series (Daily)'] || Object.keys(data['Time Series (Daily)']).length === 0) {
        console.warn(`No time series data returned for ${symbol}`);
        failedUpdates++;
        continue;
      }

      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries).sort().slice(-30);
      
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
          await collectNewsSentiment(supabaseClient, symbol, finnhubKey);
        }
      } else {
        failedUpdates++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 15000));
      
    } catch (error) {
      console.error(`Failed to process real data for ${symbol}:`, error);
      failedUpdates++;
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  return { successfulUpdates, failedUpdates, symbols };
}

async function collectNewsSentiment(supabaseClient: any, symbol: string, finnhubKey: string) {
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
