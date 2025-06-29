
import { analyzeTechnicals } from './technical-analysis.ts'
import { calculateRiskMetrics } from './risk-calculator.ts'
import { determineStrategy } from './technical-analysis.ts'

export interface TradingCandidate {
  symbol: string;
  strategy: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  sharpe_ratio: number;
  expected_return: number;
  kelly_fraction: number;
  size_pct: number;
  technical_score: number;
  win_rate: number;
  payoff_ratio: number;
  volatility: number;
  reason_bullets: string[];
  data_points: number;
  composite_score?: number;
}

export async function buildCandidates(symbols: string[], supabaseClient: any): Promise<TradingCandidate[]> {
  const candidates: TradingCandidate[] = [];
  
  for (const symbol of symbols) {
    try {
      const { data: priceData, error: priceError } = await supabaseClient
        .from('price_history')
        .select('*')
        .eq('symbol', symbol)
        .order('date', { ascending: false })
        .limit(60);

      if (priceError) {
        console.error(`Error fetching data for ${symbol}:`, priceError);
        continue;
      }

      if (!priceData || priceData.length < 10) {
        console.log(`Insufficient price data for ${symbol} (${priceData?.length || 0} days), skipping`);
        continue;
      }

      console.log(`Analyzing ${symbol} with ${priceData.length} days of real market data`);

      const technicalAnalysis = analyzeTechnicals(priceData);
      const prices = priceData.map(p => p.close).reverse();
      const currentPrice = prices[prices.length - 1];
      const riskMetrics = calculateRiskMetrics(prices);
      
      if (technicalAnalysis.technicalScore >= 1 && riskMetrics.kellyFraction > 0.005) {
        const sizePct = Math.round(riskMetrics.kellyFraction * 100 * 20) / 20;
        const atr = technicalAnalysis.indicators.atr;
        const stopLoss = currentPrice - (atr * 2);
        const targetPrice = currentPrice + (atr * 2.5);
        
        const candidate: TradingCandidate = {
          symbol,
          strategy: determineStrategy(
            technicalAnalysis.indicators.sma5, 
            technicalAnalysis.indicators.sma10, 
            technicalAnalysis.indicators.sma20, 
            technicalAnalysis.indicators.momentum
          ),
          entry_price: currentPrice,
          stop_loss: Math.max(stopLoss, currentPrice * 0.97),
          target_price: Math.min(targetPrice, currentPrice * 1.12),
          sharpe_ratio: Math.round(riskMetrics.sharpeRatio * 100) / 100,
          expected_return: Math.round(riskMetrics.excessReturn * 1000) / 1000,
          kelly_fraction: Math.round(riskMetrics.kellyFraction * 1000) / 1000,
          size_pct: sizePct,
          technical_score: technicalAnalysis.technicalScore,
          win_rate: Math.round(riskMetrics.winRate * 100) / 100,
          payoff_ratio: Math.round(riskMetrics.payoffRatio * 100) / 100,
          volatility: Math.round(riskMetrics.volatility * 100) / 100,
          reason_bullets: technicalAnalysis.signals,
          data_points: priceData.length
        };

        candidates.push(candidate);
        console.log(`✓ Added candidate ${symbol} with technical score ${technicalAnalysis.technicalScore}`);
      } else {
        console.log(`${symbol} filtered out: tech score ${technicalAnalysis.technicalScore}, kelly ${riskMetrics.kellyFraction}`);
      }
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
    }
  }

  return candidates;
}
