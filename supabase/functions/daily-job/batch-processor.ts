
import { fetchMarketData } from './market-data-fetcher.ts'
import { collectNewsSentiment } from './news-collector.ts'
import { HIGH_PRIORITY_SYMBOLS } from './sp500-symbols.ts'

export interface BatchResult {
  successfulUpdates: number;
  failedUpdates: number;
  priorityResults: {
    high: number;
    medium: number;
    low: number;
  };
}

export async function processBatch(
  supabaseClient: any,
  symbols: string[],
  avKey: string | undefined,
  finnhubKey: string | undefined,
  highPrioritySymbols: string[],
  mediumPrioritySymbols: string[]
): Promise<BatchResult> {
  const BATCH_SIZE = 5;
  const CONCURRENT_REQUESTS = 3;
  
  let successfulUpdates = 0;
  let failedUpdates = 0;
  let priorityResults = { high: 0, medium: 0, low: 0 };

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(symbols.length/BATCH_SIZE)}: ${batch.join(', ')}`);
    
    const batchPromises = batch.slice(0, CONCURRENT_REQUESTS).map(async (symbol) => {
      try {
        // Insert symbol if not exists
        await supabaseClient
          .from('symbols')
          .upsert({ symbol }, { onConflict: 'symbol' });

        const result = await fetchMarketData(supabaseClient, symbol, avKey);
        
        // Track priority results
        if (highPrioritySymbols.includes(symbol)) {
          priorityResults.high += result.success ? 1 : 0;
        } else if (mediumPrioritySymbols.includes(symbol)) {
          priorityResults.medium += result.success ? 1 : 0;
        } else {
          priorityResults.low += result.success ? 1 : 0;
        }

        // Collect news sentiment only for high-priority symbols
        if (result.success && finnhubKey && HIGH_PRIORITY_SYMBOLS.includes(symbol)) {
          await collectNewsSentiment(supabaseClient, symbol, finnhubKey);
        }
        
        return result.success;
      } catch (error) {
        console.error(`Batch processing error for ${symbol}:`, error);
        return false;
      }
    });
    
    const results = await Promise.allSettled(batchPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulUpdates++;
      } else {
        failedUpdates++;
      }
    });
    
    // Adaptive delay based on API performance
    const delay = avKey ? (failedUpdates > 3 ? 8000 : 3000) : 1000;
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { successfulUpdates, failedUpdates, priorityResults };
}
