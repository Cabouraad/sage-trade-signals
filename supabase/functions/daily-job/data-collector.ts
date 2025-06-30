import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchMarketData, fetchNewsData } from './market-data-fetcher.ts';
import { processBatch } from './batch-processor.ts';
import { SP500_SYMBOLS, HIGH_PRIORITY_SYMBOLS } from './sp500-symbols.ts';
import { sanitizeData, safeStringify } from './data-sanitizer.ts';

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

async function shouldUpdateSymbol(supabaseClient: any, symbol: string): Promise<boolean> {
  try {
    const { data } = await supabaseClient
      .from('price_history')
      .select('date')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return true;

    const lastUpdate = new Date(data[0].date);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Update if more than 6 hours old
    return hoursSinceUpdate > 6;
  } catch (error) {
    console.error(`Error checking update status for ${symbol}:`, error);
    return true; // Default to updating if we can't check
  }
}

async function storeMarketData(supabaseClient: any, symbol: string, data: any): Promise<boolean> {
  try {
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      console.error(`No time series data for ${symbol}`);
      return false;
    }

    const records = Object.entries(timeSeries)
      .slice(0, 100) // Limit to last 100 days to avoid overwhelming the DB
      .map(([date, values]: [string, any]) => {
        // Ensure all values are properly sanitized and typed
        return {
          symbol: String(symbol),
          date: String(date),
          open: parseFloat(values['1. open']) || 0,
          high: parseFloat(values['2. high']) || 0,
          low: parseFloat(values['3. low']) || 0,
          close: parseFloat(values['4. close']) || 0,
          volume: parseInt(values['5. volume']) || 0
        };
      });

    // Clean the records before insertion
    const cleanRecords = sanitizeData(records);

    const { error } = await supabaseClient
      .from('price_history')
      .upsert(cleanRecords, { onConflict: 'symbol,date' });

    if (error) {
      console.error(`Error storing data for ${symbol}:`, error.message);
      return false;
    }

    console.log(`✓ Stored ${records.length} records for ${symbol}`);
    return true;
  } catch (error) {
    console.error(`Error processing data for ${symbol}:`, error.message);
    return false;
  }
}

export async function collectMarketData(supabaseClient: any, fullAnalysis: boolean = false): Promise<DataCollectionResult> {
  console.log(`Starting market data collection (${fullAnalysis ? 'Full S&P 500' : 'Priority symbols'})...`);
  
  // Determine which symbols to process
  const symbolsToProcess = fullAnalysis ? SP500_SYMBOLS : HIGH_PRIORITY_SYMBOLS;
  console.log(`Processing ${symbolsToProcess.length} symbols`);

  // Filter symbols that need updates
  const symbolsNeedingUpdate: string[] = [];
  
  for (const symbol of symbolsToProcess) {
    if (await shouldUpdateSymbol(supabaseClient, symbol)) {
      symbolsNeedingUpdate.push(symbol);
    }
  }

  console.log(`${symbolsNeedingUpdate.length} symbols need updates`);

  if (symbolsNeedingUpdate.length === 0) {
    return {
      successfulUpdates: 0,
      failedUpdates: 0,
      symbols: symbolsToProcess,
      priorityResults: { high: 0, medium: 0, low: 0 }
    };
  }

  // Process market data in batches
  const batchResult = await processBatch(
    symbolsNeedingUpdate,
    fetchMarketData,
    5, // batch size
    12000 // 12 second delay between batches
  );

  // Store successful results
  let successfulStores = 0;
  let failedStores = 0;

  for (const result of batchResult.results) {
    if (result.success && result.data) {
      const stored = await storeMarketData(supabaseClient, result.symbol, result.data);
      if (stored) {
        successfulStores++;
      } else {
        failedStores++;
      }
    } else {
      failedStores++;
    }
  }

  // Calculate priority breakdown
  const priorityResults = {
    high: batchResult.results.filter(r => HIGH_PRIORITY_SYMBOLS.includes(r.symbol) && r.success).length,
    medium: batchResult.results.filter(r => 
      !HIGH_PRIORITY_SYMBOLS.includes(r.symbol) && 
      SP500_SYMBOLS.slice(50, 150).includes(r.symbol) && 
      r.success
    ).length,
    low: batchResult.results.filter(r => 
      !HIGH_PRIORITY_SYMBOLS.includes(r.symbol) && 
      !SP500_SYMBOLS.slice(50, 150).includes(r.symbol) && 
      r.success
    ).length
  };

  console.log(`Market data collection completed: ${successfulStores} successful, ${failedStores} failed`);

  return {
    successfulUpdates: successfulStores,
    failedUpdates: failedStores,
    symbols: symbolsToProcess,
    priorityResults
  };
}
