
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Shield, DollarSign, TrendingUp } from "lucide-react";

interface DailyPick {
  id: string;
  date: string;
  strategy: string;
  symbol: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  sharpe_ratio: number;
  expected_return: number;
  risk_amount: number;
}

export const TodaysPick = () => {
  const [todaysPick, setTodaysPick] = useState<DailyPick | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysPick();
  }, []);

  const fetchTodaysPick = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_pick')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setTodaysPick(data);
    } catch (error) {
      console.error('Error fetching today\'s pick:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="text-slate-400">Loading today's pick...</div>
        </CardContent>
      </Card>
    );
  }

  if (!todaysPick) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Today's Pick
          </CardTitle>
          <CardDescription className="text-slate-400">
            No trading recommendation available for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 text-center py-8">
            Run the daily job to generate today's trading recommendation
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskRewardRatio = ((todaysPick.target_price - todaysPick.entry_price) / (todaysPick.entry_price - todaysPick.stop_loss)).toFixed(2);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-400" />
          Today's Pick
        </CardTitle>
        <CardDescription className="text-slate-300">
          AI-selected trade recommendation for {new Date(todaysPick.date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{todaysPick.symbol}</h3>
            <Badge variant="secondary" className="mt-1 bg-purple-600/20 text-purple-300">
              {todaysPick.strategy.replace(/-/g, ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Sharpe Ratio</div>
            <div className="text-xl font-bold text-green-400">{todaysPick.sharpe_ratio.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Entry Price</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.entry_price.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Stop Loss</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.stop_loss.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Target Price</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.target_price.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div>
            <div className="text-sm text-slate-400">Expected Return</div>
            <div className="text-lg font-semibold text-green-400">
              {todaysPick.expected_return ? `${(todaysPick.expected_return * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Risk/Reward Ratio</div>
            <div className="text-lg font-semibold text-purple-400">1:{riskRewardRatio}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
