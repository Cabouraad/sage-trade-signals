
export interface TechnicalIndicators {
  sma5: number;
  sma10: number;
  sma20: number;
  momentum: number;
  atr: number;
}

export interface TechnicalSignal {
  technicalScore: number;
  signals: string[];
  indicators: TechnicalIndicators;
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period || period <= 0) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

export function calculateATR(priceData: any[], period: number = 14): number {
  if (!priceData || priceData.length < 2) return 1;
  
  const actualPeriod = Math.min(period, priceData.length - 1);
  const trueRanges = [];
  
  for (let i = 1; i < Math.min(priceData.length, actualPeriod + 1); i++) {
    const current = priceData[i];
    const previous = priceData[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return trueRanges.length > 0 ? trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length : 1;
}

export function analyzeTechnicals(priceData: any[]): TechnicalSignal {
  const prices = priceData.map(p => p.close).reverse();
  const volumes = priceData.map(p => p.volume).reverse();
  
  const sma5 = calculateSMA(prices, Math.min(5, prices.length));
  const sma10 = calculateSMA(prices, Math.min(10, prices.length));
  const sma20 = calculateSMA(prices, Math.min(20, prices.length));
  
  const currentPrice = prices[prices.length - 1];
  
  let technicalScore = 0;
  let signals = [];
  
  // Trend Analysis
  if (sma5 > sma10 && sma10 > sma20) {
    technicalScore += 3;
    signals.push('Strong uptrend: 5 > 10 > 20 SMA');
  } else if (sma5 > sma10) {
    technicalScore += 2;
    signals.push('Short-term uptrend: 5 > 10 SMA');
  } else if (sma5 > sma20) {
    technicalScore += 1;
    signals.push('Price above 20-day average');
  }
  
  // Momentum
  const momentumPeriod = Math.min(5, prices.length - 1);
  const momentum = (currentPrice - prices[prices.length - 1 - momentumPeriod]) / prices[prices.length - 1 - momentumPeriod];
  if (momentum > 0.01) {
    technicalScore += 2;
    signals.push(`Positive ${momentumPeriod}-day momentum: ${(momentum * 100).toFixed(1)}%`);
  }
  
  // Volume Analysis
  if (volumes.length >= 5) {
    const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const recentVolume = volumes[volumes.length - 1];
    if (recentVolume > avgVolume * 1.2) {
      technicalScore += 1;
      signals.push('Above-average volume');
    }
  }
  
  // Price action near recent highs
  const recentHigh = Math.max(...prices.slice(-Math.min(20, prices.length)));
  if (currentPrice / recentHigh > 0.9) {
    technicalScore += 1;
    signals.push('Near recent highs');
  }

  const atr = calculateATR(priceData.slice(-Math.min(14, priceData.length)));

  return {
    technicalScore,
    signals: signals.slice(0, 5),
    indicators: { sma5, sma10, sma20, momentum, atr }
  };
}

export function determineStrategy(sma5: number, sma10: number, sma20: number, momentum: number): string {
  if (sma5 > sma10 && sma10 > sma20 && momentum > 0.02) {
    return 'momentum-breakout';
  } else if (sma5 > sma10) {
    return 'trend-following';
  } else if (momentum < -0.015) {
    return 'mean-reversion';
  } else {
    return 'consolidation-play';
  }
}
