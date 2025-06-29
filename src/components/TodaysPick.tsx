
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Target, Shield, DollarSign, TrendingUp, Percent, Brain } from "lucide-react";

interface DailyPick {
  pick_ts: string;
  symbol: string;
  trade_type: string;
  entry: number;
  stop: number;
  target: number;
  kelly_frac: number;
  size_pct: number;
  reason_bullets: string[];
}

export const TodaysPick = () => {
  const [todaysPick, setTodaysPick] = useState<DailyPick | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysPick();
  }, []);

  const fetchTodaysPick = async () => {
    try {
      // Get the most recent pick
      const { data, error } = await supabase
        .from('daily_pick')
        .select('*')
        .order('pick_ts', { ascending: false })
        .limit(1)
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
            No trading recommendation available
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

  const riskRewardRatio = ((todaysPick.target - todaysPick.entry) / (todaysPick.entry - todaysPick.stop)).toFixed(2);
  const expectedReturn = ((todaysPick.target - todaysPick.entry) / todaysPick.entry * 100).toFixed(1);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-400" />
          Today's Pick
        </CardTitle>
        <CardDescription className="text-slate-300">
          AI-selected trade recommendation for {new Date(todaysPick.pick_ts).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{todaysPick.symbol}</h3>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                {todaysPick.trade_type.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              {todaysPick.size_pct && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
                  <Percent className="h-3 w-3 mr-1" />
                  Size: {todaysPick.size_pct}% of equity
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Kelly Fraction</div>
            <div className="text-xl font-bold text-green-400">{(todaysPick.kelly_frac * 100).toFixed(1)}%</div>
            <div className="text-xs text-slate-500 mt-1">
              Risk/Reward: 1:{riskRewardRatio}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Entry Price</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.entry.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Stop Loss</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.stop.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Target Price</span>
            </div>
            <div className="text-xl font-bold text-white">${todaysPick.target.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div>
            <div className="text-sm text-slate-400">Expected Return</div>
            <div className="text-lg font-semibold text-green-400">+{expectedReturn}%</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Position Size</div>
            <div className="text-lg font-semibold text-purple-400">{todaysPick.size_pct}% of equity</div>
          </div>
        </div>

        {todaysPick.reason_bullets && todaysPick.reason_bullets.length > 0 && (
          <Accordion type="single" collapsible className="border-t border-slate-700 pt-4">
            <AccordionItem value="reasoning" className="border-slate-700">
              <AccordionTrigger className="text-white hover:text-purple-300">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  Why we picked this trade
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-300">
                <ul className="space-y-2 mt-2">
                  {todaysPick.reason_bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
