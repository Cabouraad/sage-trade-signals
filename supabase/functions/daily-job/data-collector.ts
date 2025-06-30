
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SP500_SYMBOLS, HIGH_PRIORITY_SYMBOLS, MEDIUM_PRIORITY_SYMBOLS } from './sp500-symbols.ts'
import { processBatch } from './batch-processor.ts'

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

  const batchResult = await processBatch(
    supabaseClient,
    symbolsToProcess,
    avKey,
    finnhubKey,
    HIGH_PRIORITY_SYMBOLS,
    MEDIUM_PRIORITY_SYMBOLS
  );

  console.log(`Data collection complete: ${batchResult.successfulUpdates} successful, ${batchResult.failedUpdates} failed`);
  console.log(`Priority breakdown - High: ${batchResult.priorityResults.high}, Medium: ${batchResult.priorityResults.medium}, Low: ${batchResult.priorityResults.low}`);
  
  return { 
    successfulUpdates: batchResult.successfulUpdates, 
    failedUpdates: batchResult.failedUpdates, 
    symbols: symbolsToProcess,
    priorityResults: batchResult.priorityResults 
  };
}
