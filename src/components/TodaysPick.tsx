
import React from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTodaysPick } from '@/hooks/useTodaysPick';
import { OptionsStrategyCard } from './picks/OptionsStrategyCard';
import { StockPickCard } from './picks/StockPickCard';
import { EmptyPickCard } from './picks/EmptyPickCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const TodaysPick = () => {
  const { todaysOptionsStrategy, todaysStockPick, isLoading } = useTodaysPick();

  // Fix: Call options analysis with no arguments to prevent serialization issues
  const runOptionsAnalysis = async () => {
    try {
      toast({
        title: "Running S&P 500 Analysis",
        description: "Starting comprehensive options analysis across S&P 500 symbols...",
      });

      // No body needed - prevents DOM serialization issues
      const { data, error } = await supabase.functions.invoke('options-scanner');
      
      if (error) throw error;

      toast({
        title: "S&P 500 Analysis Complete",
        description: `Found ${data.strategies_found} strategies across ${data.symbols_analyzed} symbols and ${data.unusual_activity} unusual activities`,
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
    return <EmptyPickCard onRunAnalysis={runOptionsAnalysis} />;
  }

  if (isOptionsStrategy) {
    return (
      <OptionsStrategyCard 
        strategy={todaysOptionsStrategy} 
        onRefresh={runOptionsAnalysis} 
      />
    );
  }

  return (
    <StockPickCard 
      stockPick={todaysStockPick} 
      onFindOptions={runOptionsAnalysis} 
    />
  );
};
