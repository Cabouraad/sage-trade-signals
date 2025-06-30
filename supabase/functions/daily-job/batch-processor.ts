
import { MarketDataResult } from './market-data-fetcher.ts';
import { createCleanResult } from './data-sanitizer.ts';

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
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results and handle any rejections
      const cleanResults = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          const cleanResult = createCleanResult(
            result.value.symbol,
            result.value.success,
            result.value.data,
            result.value.error
          );
          
          if (cleanResult.success) {
            successful++;
          } else {
            failed++;
          }
          
          return cleanResult;
        } else {
          // Handle rejected promises
          const symbol = typeof batch[index] === 'string' ? batch[index] as string : 'unknown';
          failed++;
          return createCleanResult(symbol, false, undefined, result.reason?.message || 'Promise rejected');
        }
      });
      
      results.push(...cleanResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < items.length) {
        console.log(`Waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Batch processing error:`, error.message);
      // Mark all items in this batch as failed
      batch.forEach(item => {
        const symbol = typeof item === 'string' ? item : 'unknown';
        results.push(createCleanResult(symbol, false, undefined, error.message));
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
