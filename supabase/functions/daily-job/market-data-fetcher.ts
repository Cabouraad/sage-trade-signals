
const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
const BASE_URL = 'https://www.alphavantage.co/query';

import { createCleanResult, sanitizeData } from './data-sanitizer.ts';

export interface MarketDataResult {
  symbol: string;
  success: boolean;
  data?: any;
  error?: string;
}

export async function fetchMarketData(symbol: string): Promise<MarketDataResult> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('Alpha Vantage API key not configured');
    return createCleanResult(symbol, false, undefined, 'API key not configured');
  }

  try {
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    console.log(`Fetching data for ${symbol}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    // Check for API errors
    if (rawData['Error Message']) {
      throw new Error(rawData['Error Message']);
    }
    
    if (rawData['Note']) {
      throw new Error('API call frequency limit reached');
    }
    
    // Create clean data structure
    const cleanData = {
      'Meta Data': sanitizeData(rawData['Meta Data']),
      'Time Series (Daily)': sanitizeData(rawData['Time Series (Daily)'])
    };
    
    return createCleanResult(symbol, true, cleanData);
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return createCleanResult(symbol, false, undefined, error.message);
  }
}

export async function fetchNewsData(symbol: string): Promise<MarketDataResult> {
  if (!ALPHA_VANTAGE_API_KEY) {
    return createCleanResult(symbol, false, undefined, 'API key not configured');
  }

  try {
    const url = `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&limit=50`;
    
    console.log(`Fetching news for ${symbol}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    if (rawData['Error Message'] || rawData['Note']) {
      throw new Error(rawData['Error Message'] || 'API call frequency limit reached');
    }
    
    // Create clean data structure
    const cleanData = {
      items: rawData.items || 0,
      sentiment_score_definition: sanitizeData(rawData.sentiment_score_definition),
      relevance_score_definition: sanitizeData(rawData.relevance_score_definition),
      feed: (rawData.feed || []).map((item: any) => ({
        title: String(item.title || ''),
        url: String(item.url || ''),
        time_published: String(item.time_published || ''),
        summary: String(item.summary || ''),
        overall_sentiment_score: Number(item.overall_sentiment_score || 0),
        overall_sentiment_label: String(item.overall_sentiment_label || ''),
        ticker_sentiment: sanitizeData(item.ticker_sentiment || [])
      }))
    };
    
    return createCleanResult(symbol, true, cleanData);
    
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
    return createCleanResult(symbol, false, undefined, error.message);
  }
}
