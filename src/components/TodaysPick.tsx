
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Shield, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DailyPick {
  symbol: string;
  trade_type: string;
  entry: number;
  stop: number;
  target: number;
  kelly_frac: number;
  size_pct: number;
  reason_bullets: string[];
  pick_ts: string;
}

interface OptionsStrategy {
  id: string;
  symbol: string;
  strategy_name: string;
  strategy_type: string;
  legs: any;
  max_profit: number;
  max_loss: number;
  breakeven_points: number[];
  expected_return: number;
  days_to_expiration: number;
  iv_rank: number;
  confidence_score: number;
  created_at: string;
}

export const TodaysPick = () => {
  // First try to get options strategies (priority)
  const { data: todaysOptionsStrategy, isLoading: optionsLoading } = useQuery({
    queryKey: ['todays-options-strategy'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data, error } = await supabase
        .from('options_strategies')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .order('confidence_score', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] as OptionsStrategy | null;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Fallback to stock picks if no options strategies
  const { data: todaysStockPick, isLoading: stockLoading } = useQuery({
    queryKey: ['todays-stock-pick'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 36);
      
      const { data, error } = await supabase
        .from('daily_pick')
        .select('*')
        .gte('pick_ts', yesterday.toISOString())
        .order('pick_ts', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] as DailyPick | null;
    },
    enabled: !todaysOptionsStrategy, // Only run if no options strategy found
    refetchInterval: 5 * 60 * 1000,
  });

  const runOptionsAnalysis = async () => {
    try {
      toast({
        title: "Running Analysis",
        description: "Starting comprehensive options analysis...",
      });

      const { data, error } = await supabase.functions.invoke('options-scanner');
      
      if (error) throw error;

      toast({
        title: "Analysis Complete",
        description: `Found ${data.strategies_found} strategies and ${data.unusual_activity} unusual activities`,
      });
      
      // Refresh both queries
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTradeTypeColor = (tradeType: string) => {
    if (tradeType.includes('call') || tradeType.includes('covered')) return 'bg-green-100 text-green-800';
    if (tradeType.includes('put') || tradeType.includes('protective')) return 'bg-red-100 text-red-800';
    if (tradeType.includes('straddle') || tradeType.includes('strangle')) return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  const isLoading = optionsLoading || stockLoading;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority: Options Strategy > Stock Pick > No pick
  const todaysPick = todaysOptionsStrategy || todaysStockPick;
  const isOptionsStrategy = !!todaysOptionsStrategy;

  if (!todaysPick) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Trading Pick
          </CardTitle>
          <CardDescription>
            No trading opportunities found for today. Run analysis to find new opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runOptionsAnalysis} className="w-full">
            Run Options Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isOptionsStrategy) {
    const strategy = todaysPick as OptionsStrategy;
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
                <span>Strategy Type: {strategy.strategy_type}</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary font-medium">•</span>
                <span>Days to Expiration: {strategy.days_to_expiration}</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-primary font-medium">•</span>
                <span>Expected Return: ${Math.round(strategy.expected_return || 0)}</span>
              </li>
              {strategy.breakeven_points && strategy.breakeven_points.length > 0 && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">•</span>
                  <span>Breakeven: ${strategy.breakeven_points.map(bp => Math.round(bp)).join(', $')}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={runOptionsAnalysis} variant="outline" className="flex-1">
              Refresh Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback to stock pick display
  const stockPick = todaysPick as DailyPick;
  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Stock Pick (Fallback)
          </CardTitle>
          <Badge className="bg-orange-100 text-orange-800">
            STOCK TRADE
          </Badge>
        </div>
        <CardDescription>
          Stock trade recommendation (no options strategies found today)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary">{stockPick.symbol}</h3>
          <p className="text-muted-foreground capitalize">
            {stockPick.trade_type.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">ENTRY</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.entry.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-muted-foreground">STOP</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.stop.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">TARGET</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.target.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">SIZE</span>
            </div>
            <p className="text-lg font-semibold">{stockPick.size_pct}%</p>
          </div>
        </div>

        {stockPick.reason_bullets && stockPick.reason_bullets.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">RATIONALE</h4>
            <ul className="space-y-1">
              {stockPick.reason_bullets.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button onClick={runOptionsAnalysis} className="flex-1">
            Find Options Strategies
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
