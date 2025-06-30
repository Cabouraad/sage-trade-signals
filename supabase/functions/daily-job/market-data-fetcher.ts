
import { SP500_SYMBOLS, HIGH_PRIORITY_SYMBOLS, MEDIUM_PRIORITY_SYMBOLS } from './sp500-symbols.ts'

export interface MarketDataResult {
  success: boolean;
  updatedDays: number;
}

export async function fetchMarketData(supabaseClient: any, symbol: string, avKey: string | undefined): Promise<MarketDataResult> {
  try {
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
      return { success: true, updatedDays: 0 };
    }

    if (!avKey) {
      console.log(`No API key and no fresh data for ${symbol} - marking as failed`);
      return { success: false, updatedDays: 0 };
    }

    // Fetch real daily data from Alpha Vantage with timeout
    console.log(`Fetching real data for ${symbol}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
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
      return { success: false, updatedDays: 0 };
    }
    
    if (data['Note']) {
      console.warn(`Alpha Vantage rate limit for ${symbol}: ${data['Note']}`);
      await new Promise(resolve => setTimeout(resolve, 12000));
      return { success: false, updatedDays: 0 };
    }
    
    if (data['Information']) {
      console.warn(`Alpha Vantage info for ${symbol}: ${data['Information']}`);
      return { success: false, updatedDays: 0 };
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries || Object.keys(timeSeries).length === 0) {
      console.warn(`No time series data returned for ${symbol}`);
      return { success: false, updatedDays: 0 };
    }

    // Get the most recent 30 days of data
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
      return { success: true, updatedDays };
    } else {
      return { success: false, updatedDays: 0 };
    }
    
  } catch (error) {
    console.error(`Failed to process real data for ${symbol}:`, error);
    return { success: false, updatedDays: 0 };
  }
}
