
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export const useTodaysPick = () => {
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
      
      if (!data?.[0]) return null;
      
      // Type-safe conversion from database result to OptionsStrategy
      const dbStrategy = data[0];
      return {
        ...dbStrategy,
        legs: (dbStrategy.legs as unknown) as OptionsLeg[] // Safe cast through unknown
      } as OptionsStrategy;
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

  return {
    todaysOptionsStrategy,
    todaysStockPick,
    isLoading: optionsLoading || stockLoading,
  };
};
