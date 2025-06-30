
import { MarketDataResult } from './market-data-fetcher.ts';

export interface BatchResult {
  successful: number;
  failed: number;
  results: MarketDataResult[];
}

export async function processBatch<T>(
  items: T[], 
  processor: (item: T) => Promise<MarketDataResult>, 
  batchSize: number = 5,
  delayMs: number = 12000
): Promise<BatchResult> {
  const results: MarketDataResult[] = [];
  let successful = 0;
  let failed = 0;

  console.log(`Processing ${items.length} items in batches of ${batchSize}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);

    try {
      // Process batch concurrently
      const batchPromises = batch.map(item => processor(item));
      const batchResults = await Promise.all(batchPromises);
      
      // Clean results to avoid circular references
      const cleanResults = batchResults.map(result => ({
        symbol: result.symbol,
        success: result.success,
        data: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
        error: result.error
      }));
      
      results.push(...cleanResults);
      
      // Count successes and failures
      cleanResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      // Add delay between batches (except for the last batch)
      if (i + batchSize < items.length) {
        console.log(`Waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Batch processing error:`, error.message);
      // Mark all items in this batch as failed
      batch.forEach(item => {
        results.push({
          symbol: typeof item === 'string' ? item : 'unknown',
          success: false,
          error: error.message
        });
        failed++;
      });
    }
  }

  return {
    successful,
    failed,
    results
  };
}
