
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SP500_SYMBOLS, HIGH_PRIORITY_SYMBOLS, MEDIUM_PRIORITY_SYMBOLS } from './sp500-symbols.ts'

export interface DataCollectionResult {
  successfulUpdates: number;
  failedUpdates: number;
  symbols: string[];
  priorityResults: {
    high: number;
    medium: number;
    low: number;
  };
}

export async function collectMarketData(supabaseClient: any, useFullSP500: boolean = true): Promise<DataCollectionResult> {
  const avKey = Deno.env.get('AV_KEY');
  const finnhubKey = Deno.env.get('FINNHUB_KEY');
  
  if (!avKey) {
    console.warn('Alpha Vantage API key not found - using existing data if available');
  }

  console.log('API Keys configured:', { 
    alphaVantage: !!avKey, 
    finnhub: !!finnhubKey 
  });

  // Determine symbols to process based on efficiency mode
  let symbolsToProcess: string[];
  if (useFullSP500) {
    symbolsToProcess = SP500_SYMBOLS;
    console.log(`Processing all ${SP500_SYMBOLS.length} S&P 500 symbols`);
  } else {
    symbolsToProcess = [...HIGH_PRIORITY_SYMBOLS, ...MEDIUM_PRIORITY_SYMBOLS.slice(0, 10)];
    console.log(`Processing ${symbolsToProcess.length} priority symbols`);
  }

  let successfulUpdates = 0;
  let failedUpdates = 0;
  let priorityResults = { high: 0, medium: 0, low: 0 };
  
  // Process in batches for better performance
  const BATCH_SIZE = 5;
  const CONCURRENT_REQUESTS = 3;
  
  for (let i = 0; i < symbolsToProcess.length; i += BATCH_SIZE) {
    const batch = symbolsToProcess.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(symbolsToProcess.length/BATCH_SIZE)}: ${batch.join(', ')}`);
    
    // Process batch with limited concurrency
    const batchPromises = batch.slice(0, CONCURRENT_REQUESTS).map(async (symbol) => {
      try {
        const result = await processSymbol(supabaseClient, symbol, avKey, finnhubKey);
        
        // Track priority results
        if (HIGH_PRIORITY_SYMBOLS.includes(symbol)) {
          priorityResults.high += result ? 1 : 0;
        } else if (MEDIUM_PRIORITY_SYMBOLS.includes(symbol)) {
          priorityResults.medium += result ? 1 : 0;
        } else {
          priorityResults.low += result ? 1 : 0;
        }
        
        return result;
      } catch (error) {
        console.error(`Batch processing error for ${symbol}:`, error);
        return false;
      }
    });
    
    const results = await Promise.allSettled(batchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulUpdates++;
      } else {
        failedUpdates++;
        console.error(`Failed to process ${batch[index]}`);
      }
    });
    
    // Adaptive delay based on API performance
    const delay = avKey ? (failedUpdates > 3 ? 8000 : 3000) : 1000;
    if (i + BATCH_SIZE < symbolsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`Data collection complete: ${successfulUpdates} successful, ${failedUpdates} failed`);
  console.log(`Priority breakdown - High: ${priorityResults.high}, Medium: ${priorityResults.medium}, Low: ${priorityResults.low}`);
  
  return { 
    successfulUpdates, 
    failedUpdates, 
    symbols: symbolsToProcess,
    priorityResults 
  };
}

async function processSymbol(supabaseClient: any, symbol: string, avKey: string | undefined, finnhubKey: string | undefined): Promise<boolean> {
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
      return true;
    }

    if (!avKey) {
      console.log(`No API key and no fresh data for ${symbol} - marking as failed`);
      return false;
    }

    // Fetch real daily data from Alpha Vantage with timeout
    console.log(`Fetching real data for ${symbol}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${avKey}&outputsize=compact`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle API errors and rate limits
    if (data['Error Message']) {
      console.error(`Alpha Vantage error for ${symbol}: ${data['Error Message']}`);
      return false;
    }
    
    if (data['Note']) {
      console.warn(`Alpha Vantage rate limit for ${symbol}: ${data['Note']}`);
      await new Promise(resolve => setTimeout(resolve, 12000)); // Wait for rate limit
      return false;
    }
    
    if (data['Information']) {
      console.warn(`Alpha Vantage info for ${symbol}: ${data['Information']}`);
      return false;
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries || Object.keys(timeSeries).length === 0) {
      console.warn(`No time series data returned for ${symbol}`);
      return false;
    }

    // Get the most recent 30 days of data (reduced for efficiency)
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

      // Collect news sentiment only for high-priority symbols to save time
      if (finnhubKey && HIGH_PRIORITY_SYMBOLS.includes(symbol)) {
        await collectNewsSentiment(supabaseClient, symbol, finnhubKey);
      }
      
      return true;
    } else {
      return false;
    }
    
  } catch (error) {
    console.error(`Failed to process real data for ${symbol}:`, error);
    return false;
  }
}

async function collectNewsSentiment(supabaseClient: any, symbol: string, finnhubKey: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekAgoStr = lastWeek.toISOString().split('T')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced timeout

    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgoStr}&to=${today}&token=${finnhubKey}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      
      if (Array.isArray(newsData) && newsData.length > 0) {
        // Process only top 3 articles for efficiency
        for (const article of newsData.slice(0, 3)) {
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
        
        console.log(`✓ Updated news sentiment for ${symbol}`);
      }
    }
  } catch (newsError) {
    console.error(`Error fetching news for ${symbol}:`, newsError);
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
