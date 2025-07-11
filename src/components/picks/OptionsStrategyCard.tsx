
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Shield, BarChart3, Calendar, DollarSign } from 'lucide-react';

interface OptionsLeg {
  action: 'buy' | 'sell';
  type: 'call' | 'put' | 'stock';
  strike?: number;
  quantity: number;
}

interface OptionsStrategy {
  id: string;
  symbol: string;
  strategy_name: string;
  strategy_type: string;
  legs: OptionsLeg[];
  max_profit: number;
  max_loss: number;
  breakeven_points: number[];
  expected_return: number;
  days_to_expiration: number;
  iv_rank: number;
  confidence_score: number;
  created_at: string;
}

interface Props {
  strategy: OptionsStrategy;
  onRefresh: () => void;
}

export const OptionsStrategyCard: React.FC<Props> = ({ strategy, onRefresh }) => {
  const getStrategyExplanation = (strategyName: string) => {
    switch (strategyName.toLowerCase()) {
      case 'iron condor':
        return "A neutral strategy that profits from low volatility. Sell a put spread and call spread simultaneously, collecting premium while the stock stays between the short strikes.";
      case 'covered call':
        return "An income strategy where you own 100 shares and sell a call option above current price. Collect premium while capping upside potential.";
      case 'cash secured put':
        return "Sell a put option while holding enough cash to buy 100 shares if assigned. Collect premium while potentially acquiring stock at a discount.";
      case 'bull call spread':
        return "A bullish strategy using two call options: buy a lower strike call, sell a higher strike call. Limited profit and loss.";
      case 'bear put spread':
        return "A bearish strategy using two put options: buy a higher strike put, sell a lower strike put. Limited profit and loss.";
      default:
        return "Options strategy designed to profit from specific market conditions and volatility expectations.";
    }
  };

  const formatLegInstruction = (leg: OptionsLeg, expirationDate: string) => {
    if (leg.type === 'stock') {
      return `${leg.action.toUpperCase()} ${leg.quantity} shares`;
    }
    return `${leg.action.toUpperCase()} ${leg.quantity} ${leg.type.toUpperCase()} $${leg.strike} exp ${expirationDate}`;
  };

  const getExpirationDate = (daysToExp: number) => {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + daysToExp);
    return expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const expirationDate = getExpirationDate(strategy.days_to_expiration);
  
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Options Strategy
          </CardTitle>
          <Badge className="bg-purple-100 text-purple-800">
            {strategy.strategy_name.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          AI-selected options strategy for {new Date(strategy.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary">{strategy.symbol}</h3>
          <p className="text-muted-foreground">{strategy.strategy_name}</p>
        </div>

        {/* Strategy Explanation */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Strategy Explanation</h4>
          <p className="text-blue-800 text-sm">{getStrategyExplanation(strategy.strategy_name)}</p>
        </div>

        {/* Trade Instructions */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            How to Execute This Trade
          </h4>
          <div className="space-y-2">
            {Array.isArray(strategy.legs) && strategy.legs.map((leg, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  LEG {index + 1}
                </span>
                <span className="font-mono text-green-800">
                  {formatLegInstruction(leg, expirationDate)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <Calendar className="h-4 w-4" />
            <span>All options expire: {expirationDate} ({strategy.days_to_expiration} days)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">MAX PROFIT</span>
            </div>
            <p className="text-lg font-semibold">${Math.round(strategy.max_profit || 0)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-muted-foreground">MAX LOSS</span>
            </div>
            <p className="text-lg font-semibold">${Math.round(Math.abs(strategy.max_loss || 0))}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">IV RANK</span>
            </div>
            <p className="text-lg font-semibold">{Math.round(strategy.iv_rank || 0)}%</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">CONFIDENCE</span>
            </div>
            <p className="text-lg font-semibold">{Math.round(strategy.confidence_score || 0)}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">STRATEGY DETAILS</h4>
          <ul className="space-y-1">
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary font-medium">•</span>
              <span>Expected Return: ${Math.round(strategy.expected_return || 0)}</span>
            </li>
            {strategy.breakeven_points && strategy.breakeven_points.length > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary font-medium">•</span>
                <span>Breakeven Price{strategy.breakeven_points.length > 1 ? 's' : ''}: ${strategy.breakeven_points.map(bp => Math.round(bp)).join(', $')}</span>
              </li>
            )}
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary font-medium">•</span>
              <span>Strategy Type: {strategy.strategy_type} outlook</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="text-primary font-medium">•</span>
              <span>Best if {strategy.symbol} stays {strategy.strategy_type === 'neutral' ? 'stable' : strategy.strategy_type === 'bullish' ? 'above breakeven' : 'below breakeven'}</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={onRefresh} variant="outline" className="flex-1">
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
