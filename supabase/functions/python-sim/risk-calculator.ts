
export interface RiskMetrics {
  winRate: number;
  payoffRatio: number;
  kellyFraction: number;
  volatility: number;
  sharpeRatio: number;
  excessReturn: number;
}

export function calculateRiskMetrics(prices: number[]): RiskMetrics {
  const returns = [];
  for (let i = 1; i < Math.min(prices.length, 30); i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  if (returns.length === 0) {
    return {
      winRate: 0.5,
      payoffRatio: 1,
      kellyFraction: 0,
      volatility: 0.2,
      sharpeRatio: 0,
      excessReturn: 0
    };
  }
  
  const positiveReturns = returns.filter(r => r > 0);
  const negativeReturns = returns.filter(r => r < 0);
  
  const winRate = positiveReturns.length / returns.length;
  const avgWin = positiveReturns.length > 0 ? 
    positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length : 0.01;
  const avgLoss = negativeReturns.length > 0 ? 
    Math.abs(negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length) : 0.01;
  
  const payoffRatio = avgWin / avgLoss;
  const kellyFraction = Math.max(0, Math.min(0.15, (payoffRatio * winRate - (1 - winRate)) / payoffRatio));
  
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r*r, 0) / returns.length) * Math.sqrt(252);
  const excessReturn = avgWin * winRate - avgLoss * (1 - winRate);
  const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
  
  return {
    winRate,
    payoffRatio,
    kellyFraction,
    volatility,
    sharpeRatio,
    excessReturn
  };
}
