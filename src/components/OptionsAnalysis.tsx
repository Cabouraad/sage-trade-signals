
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';

interface OptionsStrategy {
  id: string;
  symbol: string;
  strategy_name: string;
  strategy_type: string;
  legs: any;
  max_profit: number;
  max_loss: number;
  breakeven_points: number[];
  profit_probability: number;
  expected_return: number;
  risk_reward_ratio: number;
  days_to_expiration: number;
  iv_rank: number;
  delta_exposure: number;
  theta_decay: number;
  confidence_score: number;
  created_at: string;
}

interface UnusualActivity {
  id: string;
  symbol: string;
  expiration_date: string;
  strike_price: number;
  option_type: string;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  premium_paid: number;
  underlying_price: number;
  sentiment: string;
  unusual_score: number;
  detected_at: string;
}

export const OptionsAnalysis = () => {
  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ['options-strategies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('options_strategies')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as OptionsStrategy[];
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const { data: unusualActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['unusual-options-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unusual_options_activity')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as UnusualActivity[];
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'bg-green-100 text-green-800';
      case 'bearish': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrategyTypeColor = (type: string) => {
    switch (type) {
      case 'neutral': return 'bg-blue-100 text-blue-800';
      case 'income': return 'bg-green-100 text-green-800';
      case 'growth': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Options Analysis</h2>
          <p className="text-muted-foreground">
            Advanced options strategies and unusual activity detection
          </p>
        </div>
      </div>

      <Tabs defaultValue="strategies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategies">Top Strategies</TabsTrigger>
          <TabsTrigger value="unusual">Unusual Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          {strategiesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {strategies?.map((strategy) => (
                <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{strategy.symbol}</CardTitle>
                      <Badge className={getStrategyTypeColor(strategy.strategy_type)}>
                        {strategy.strategy_type}
                      </Badge>
                    </div>
                    <CardDescription className="font-medium">
                      {strategy.strategy_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span>Max Profit: ${Math.round(strategy.max_profit || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span>Max Loss: ${Math.round(Math.abs(strategy.max_loss || 0))}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>IV Rank:</span>
                        <Badge variant="outline">{Math.round(strategy.iv_rank || 0)}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Days to Exp:</span>
                        <Badge variant="outline">{strategy.days_to_expiration}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <Badge className={strategy.confidence_score >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {Math.round(strategy.confidence_score || 0)}%
                        </Badge>
                      </div>
                    </div>

                    {strategy.breakeven_points && strategy.breakeven_points.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Breakeven: ${strategy.breakeven_points.map(bp => Math.round(bp)).join(', $')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unusual" className="space-y-4">
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {unusualActivity?.map((activity) => (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">{activity.symbol}</span>
                          <Badge className={getSentimentColor(activity.sentiment)}>
                            {activity.sentiment}
                          </Badge>
                          <Badge variant="outline">
                            {activity.option_type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>Strike: ${activity.strike_price}</span>
                          <span>Exp: {new Date(activity.expiration_date).toLocaleDateString()}</span>
                          <span>Vol: {activity.volume.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">{activity.volume_ratio.toFixed(1)}x</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Score: {Math.round(activity.unusual_score)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div>
                        Premium: ${Math.round(activity.premium_paid).toLocaleString()}
                      </div>
                      <div>
                        Underlying: ${activity.underlying_price.toFixed(2)}
                      </div>
                      <div>
                        {new Date(activity.detected_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
