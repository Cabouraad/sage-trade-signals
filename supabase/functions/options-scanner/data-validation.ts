// Data validation utilities for options scanner

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateRealVolatility } from './market-analysis.ts'

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

export async function checkLiveDataAvailability(symbols: string[]): Promise<{ symbol: string, hasRecentData: boolean, lastUpdate: string | null, currentPrice: number | null, volatility: number | null }[]> {
  const dataStatus = [];
  
  for (const symbol of symbols.slice(0, 20)) {
    const { data } = await sb
      .from('price_history')
      .select('close, date')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(90); // Need 90 days for backtesting
    
    if (!data || data.length < 60) {
      dataStatus.push({
        symbol,
        hasRecentData: false,
        lastUpdate: null,
        currentPrice: null,
        volatility: null
      });
      continue;
    }
    
    // STRICT data freshness check - ONLY accept data within 24 hours for live trading
    const latestDataTime = new Date(data[0].date).getTime();
    const now = Date.now();
    const hoursOld = (now - latestDataTime) / (1000 * 60 * 60);
    const hasRecentData = hoursOld <= 24;
    
    const currentPrice = data[0].close;
    const volatility = calculateRealVolatility(data);
    
    dataStatus.push({
      symbol,
      hasRecentData,
      lastUpdate: data[0].date,
      currentPrice,
      volatility
    });
  }
  
  return dataStatus;
}