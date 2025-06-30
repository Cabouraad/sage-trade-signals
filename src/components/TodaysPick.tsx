
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

export const TodaysPick = () => {
  const { data: todaysPick, isLoading, refetch } = useQuery({
    queryKey: ['todays-pick'],
    queryFn: async () => {
      // Get picks from the last 36 hours to account for UTC vs local time
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
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
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
      
      // Refresh the current pick
      refetch();
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

  if (!todaysPick) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Options Pick
          </CardTitle>
          <CardDescription>
            No options strategy found for today. Run analysis to find new opportunities.
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

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Options Pick
          </CardTitle>
          <Badge className={getTradeTypeColor(todaysPick.trade_type)}>
            {todaysPick.trade_type.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          AI-selected options strategy for {new Date(todaysPick.pick_ts).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary">{todaysPick.symbol}</h3>
          <p className="text-muted-foreground capitalize">
            {todaysPick.trade_type.replace(/_/g, ' ')} Strategy
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">ENTRY</span>
            </div>
            <p className="text-lg font-semibold">${todaysPick.entry.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-muted-foreground">STOP</span>
            </div>
            <p className="text-lg font-semibold">${todaysPick.stop.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">TARGET</span>
            </div>
            <p className="text-lg font-semibold">${todaysPick.target.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">SIZE</span>
            </div>
            <p className="text-lg font-semibold">{todaysPick.size_pct}%</p>
          </div>
        </div>

        {todaysPick.reason_bullets && todaysPick.reason_bullets.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">STRATEGY RATIONALE</h4>
            <ul className="space-y-1">
              {todaysPick.reason_bullets.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button onClick={runOptionsAnalysis} variant="outline" className="flex-1">
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
