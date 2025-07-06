// Options strategy generators

export function createBullCallSpreadStrategy(symbol: string, currentPrice: number, volatility: number, lastUpdate: string): any {
  const longStrike = Math.round(currentPrice * 1.02); // Buy slightly OTM
  const shortStrike = Math.round(currentPrice * 1.08); // Sell further OTM
  const maxProfit = (shortStrike - longStrike) * 100 - 150; // Spread width minus estimated cost
  const maxLoss = 150; // Estimated net debit
  
  return {
    symbol,
    strategy_name: 'Bull Call Spread',
    strategy_type: 'bullish',
    legs: [
      { action: 'buy', type: 'call', strike: longStrike, quantity: 1 },
      { action: 'sell', type: 'call', strike: shortStrike, quantity: 1 }
    ],
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven_points: [longStrike + (maxLoss / 100)],
    expected_return: maxProfit * 0.6, // 60% probability weighted return
    risk_reward_ratio: maxProfit / maxLoss,
    days_to_expiration: 30,
    iv_rank: volatility * 100,
    confidence_score: Math.min(85, 70 + (15 * (1 - volatility))),
    expected_profit_probability: 0.65,
    data_freshness: 'LIVE',
    last_price_update: lastUpdate
  };
}

export function createBearPutSpreadStrategy(symbol: string, currentPrice: number, volatility: number, lastUpdate: string): any {
  const longStrike = Math.round(currentPrice * 0.98); // Buy slightly OTM put
  const shortStrike = Math.round(currentPrice * 0.92); // Sell further OTM put
  const maxProfit = (longStrike - shortStrike) * 100 - 150;
  const maxLoss = 150;
  
  return {
    symbol,
    strategy_name: 'Bear Put Spread',
    strategy_type: 'bearish',
    legs: [
      { action: 'buy', type: 'put', strike: longStrike, quantity: 1 },
      { action: 'sell', type: 'put', strike: shortStrike, quantity: 1 }
    ],
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven_points: [longStrike - (maxLoss / 100)],
    expected_return: maxProfit * 0.6,
    risk_reward_ratio: maxProfit / maxLoss,
    days_to_expiration: 30,
    iv_rank: volatility * 100,
    confidence_score: Math.min(85, 70 + (15 * (1 - volatility))),
    expected_profit_probability: 0.65,
    data_freshness: 'LIVE',
    last_price_update: lastUpdate
  };
}

export function createCashSecuredPutStrategy(symbol: string, currentPrice: number, volatility: number, lastUpdate: string): any {
  const putStrike = Math.round(currentPrice * 0.95); // 5% OTM put
  const premium = Math.round(currentPrice * volatility * 0.08 * 100); // Estimated premium
  const maxProfit = premium;
  const maxLoss = (putStrike * 100) - premium; // If assigned, loss is strike minus premium
  
  return {
    symbol,
    strategy_name: 'Cash Secured Put',
    strategy_type: 'neutral_bullish',
    legs: [
      { action: 'sell', type: 'put', strike: putStrike, quantity: 1 }
    ],
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven_points: [putStrike - (premium / 100)],
    expected_return: premium * 0.75, // 75% probability of keeping premium
    risk_reward_ratio: maxProfit / (maxLoss * 0.1), // Adjusted for low probability of max loss
    days_to_expiration: 30,
    iv_rank: volatility * 100,
    confidence_score: Math.min(90, 75 + (15 * volatility)),
    expected_profit_probability: 0.75,
    data_freshness: 'LIVE',
    last_price_update: lastUpdate
  };
}

export function createCoveredCallStrategy(symbol: string, currentPrice: number, volatility: number, lastUpdate: string): any {
  const callStrike = Math.round(currentPrice * 1.05); // 5% OTM call
  const premium = Math.round(currentPrice * volatility * 0.06 * 100);
  const maxProfit = premium + ((callStrike - currentPrice) * 100);
  const maxLoss = (currentPrice * 100) - premium; // Theoretical max loss if stock goes to zero
  
  return {
    symbol,
    strategy_name: 'Covered Call',
    strategy_type: 'neutral_bullish',
    legs: [
      { action: 'buy', type: 'stock', strike: currentPrice, quantity: 100 },
      { action: 'sell', type: 'call', strike: callStrike, quantity: 1 }
    ],
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven_points: [currentPrice - (premium / 100)],
    expected_return: premium * 0.8, // 80% probability of keeping premium
    risk_reward_ratio: maxProfit / (maxLoss * 0.05), // Adjusted for low probability of major loss
    days_to_expiration: 30,
    iv_rank: volatility * 100,
    confidence_score: Math.min(88, 72 + (16 * volatility)),
    expected_profit_probability: 0.80,
    data_freshness: 'LIVE',
    last_price_update: lastUpdate
  };
}

export function createIronCondorStrategy(symbol: string, currentPrice: number, volatility: number, lastUpdate: string): any {
  const putShortStrike = Math.round(currentPrice * 0.95);
  const putLongStrike = Math.round(currentPrice * 0.90);
  const callShortStrike = Math.round(currentPrice * 1.05);
  const callLongStrike = Math.round(currentPrice * 1.10);
  
  const creditReceived = Math.round(currentPrice * volatility * 0.12 * 100); // Estimated net credit
  const maxProfit = creditReceived;
  const maxLoss = Math.max(
    (putShortStrike - putLongStrike) * 100 - creditReceived,
    (callLongStrike - callShortStrike) * 100 - creditReceived
  );
  
  // Only create if profitable risk/reward ratio
  if (maxProfit / maxLoss < 0.3) return null;
  
  return {
    symbol,
    strategy_name: 'Iron Condor',
    strategy_type: 'neutral',
    legs: [
      { action: 'sell', type: 'put', strike: putShortStrike, quantity: 1 },
      { action: 'buy', type: 'put', strike: putLongStrike, quantity: 1 },
      { action: 'sell', type: 'call', strike: callShortStrike, quantity: 1 },
      { action: 'buy', type: 'call', strike: callLongStrike, quantity: 1 }
    ],
    max_profit: maxProfit,
    max_loss: maxLoss,
    breakeven_points: [
      putShortStrike - (creditReceived / 100),
      callShortStrike + (creditReceived / 100)
    ],
    expected_return: maxProfit * 0.7, // 70% probability of profit
    risk_reward_ratio: maxProfit / maxLoss,
    days_to_expiration: 30,
    iv_rank: volatility * 100,
    confidence_score: Math.min(82, 65 + (17 * volatility)),
    expected_profit_probability: 0.70,
    data_freshness: 'LIVE',
    last_price_update: lastUpdate
  };
}

export function generateOptimalStrategy(symbol: string, currentPrice: number, volatility: number, regime: string, lastUpdate: string): any | null {
  const ivRank = Math.min(100, volatility * 100);
  
  // High IV strategies (sell premium when IV > 30%)
  if (volatility > 0.30) {
    if (regime === 'sideways') {
      return createIronCondorStrategy(symbol, currentPrice, volatility, lastUpdate);
    } else if (regime === 'trending_up') {
      return createCashSecuredPutStrategy(symbol, currentPrice, volatility, lastUpdate);
    } else if (regime === 'trending_down') {
      return createCoveredCallStrategy(symbol, currentPrice, volatility, lastUpdate);
    }
  }
  
  // Low IV strategies (buy premium when IV < 25%)
  if (volatility < 0.25) {
    if (regime === 'trending_up') {
      return createBullCallSpreadStrategy(symbol, currentPrice, volatility, lastUpdate);
    } else if (regime === 'trending_down') {
      return createBearPutSpreadStrategy(symbol, currentPrice, volatility, lastUpdate);
    }
  }
  
  // Medium IV - neutral strategies
  return createIronCondorStrategy(symbol, currentPrice, volatility, lastUpdate);
}