// Market analysis utilities for options scanner

export function calculateRealVolatility(priceData: any[]): number {
  if (priceData.length < 2) return 0.3;
  
  const returns = [];
  for (let i = 1; i < Math.min(priceData.length, 21); i++) {
    const return_val = Math.log(priceData[i-1].close / priceData[i].close);
    returns.push(return_val);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252); // Annualized volatility
}

export function identifyMarketRegime(priceData: any[], volatility: number): 'trending_up' | 'trending_down' | 'sideways' | 'high_volatility' {
  if (priceData.length < 10) return 'sideways';
  
  const recentPrices = priceData.slice(0, 10);
  const sma5 = recentPrices.slice(0, 5).reduce((sum, p) => sum + p.close, 0) / 5;
  const sma10 = recentPrices.reduce((sum, p) => sum + p.close, 0) / 10;
  
  const priceChange = (recentPrices[0].close - recentPrices[9].close) / recentPrices[9].close;
  
  if (volatility > 0.35) return 'high_volatility';
  if (sma5 > sma10 * 1.02 && priceChange > 0.05) return 'trending_up';
  if (sma5 < sma10 * 0.98 && priceChange < -0.05) return 'trending_down';
  return 'sideways';
}