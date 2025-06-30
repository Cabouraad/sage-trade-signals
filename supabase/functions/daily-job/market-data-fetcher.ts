
const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
const BASE_URL = 'https://www.alphavantage.co/query';

export interface MarketDataResult {
  symbol: string;
  success: boolean;
  data?: any;
  error?: string;
}

export async function fetchMarketData(symbol: string): Promise<MarketDataResult> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.error('Alpha Vantage API key not configured');
    return { symbol, success: false, error: 'API key not configured' };
  }

  try {
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    console.log(`Fetching data for ${symbol}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error('API call frequency limit reached');
    }
    
    // Return only the data we need, avoiding circular references
    return {
      symbol,
      success: true,
      data: {
        'Meta Data': data['Meta Data'],
        'Time Series (Daily)': data['Time Series (Daily)']
      }
    };
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return { 
      symbol, 
      success: false, 
      error: error.message 
    };
  }
}

export async function fetchNewsData(symbol: string): Promise<MarketDataResult> {
  if (!ALPHA_VANTAGE_API_KEY) {
    return { symbol, success: false, error: 'API key not configured' };
  }

  try {
    const url = `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&limit=50`;
    
    console.log(`Fetching news for ${symbol}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || 'API call frequency limit reached');
    }
    
    // Return clean data structure
    return {
      symbol,
      success: true,
      data: {
        items: data.items || 0,
        sentiment_score_definition: data.sentiment_score_definition,
        relevance_score_definition: data.relevance_score_definition,
        feed: (data.feed || []).map((item: any) => ({
          title: item.title,
          url: item.url,
          time_published: item.time_published,
          summary: item.summary,
          overall_sentiment_score: item.overall_sentiment_score,
          overall_sentiment_label: item.overall_sentiment_label,
          ticker_sentiment: item.ticker_sentiment || []
        }))
      }
    };
    
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
    return { 
      symbol, 
      success: false, 
      error: error.message 
    };
  }
}
