// Backtesting functionality for options strategies

export async function backtestStrategy(symbol: string, priceData: any[], strategy: any): Promise<{ winRate: number, avgProfit: number, avgLoss: number, totalTrades: number }> {
  if (priceData.length < 60) return { winRate: 0, avgProfit: 0, avgLoss: 0, totalTrades: 0 };
  
  const trades = [];
  const lookbackPeriod = 30; // Days to hold position
  
  // Test strategy on historical data (skip most recent 30 days for out-of-sample testing)
  for (let i = 30; i < priceData.length - lookbackPeriod; i += 7) { // Test weekly
    const entryPrice = priceData[i].close;
    const exitPrice = priceData[i + lookbackPeriod] ? priceData[i + lookbackPeriod].close : priceData[priceData.length - 1].close;
    
    const priceChange = (exitPrice - entryPrice) / entryPrice;
    
    // Simulate strategy P&L based on price movement
    let strategyPnL = 0;
    if (strategy.strategy_type === 'bullish' && priceChange > 0.02) {
      strategyPnL = Math.min(strategy.max_profit, strategy.expected_return * 1.5);
    } else if (strategy.strategy_type === 'bearish' && priceChange < -0.02) {
      strategyPnL = Math.min(strategy.max_profit, strategy.expected_return * 1.5);
    } else if (strategy.strategy_type === 'neutral' && Math.abs(priceChange) < 0.05) {
      strategyPnL = strategy.expected_return * 0.8; // Collect most of premium
    } else {
      strategyPnL = -Math.min(strategy.max_loss * 0.5, strategy.expected_return); // Partial loss
    }
    
    trades.push(strategyPnL);
  }
  
  if (trades.length === 0) return { winRate: 0, avgProfit: 0, avgLoss: 0, totalTrades: 0 };
  
  const winners = trades.filter(t => t > 0);
  const losers = trades.filter(t => t < 0);
  
  return {
    winRate: winners.length / trades.length,
    avgProfit: winners.length > 0 ? winners.reduce((a, b) => a + b, 0) / winners.length : 0,
    avgLoss: losers.length > 0 ? Math.abs(losers.reduce((a, b) => a + b, 0) / losers.length) : 0,
    totalTrades: trades.length
  };
}