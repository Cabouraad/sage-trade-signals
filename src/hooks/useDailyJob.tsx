
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useDailyJob = () => {
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const runDailyJob = async () => {
    try {
      toast({
        title: "Starting S&P 500 Analysis",
        description: "Collecting market data and running options analysis...",
      });

      // No body needed - prevents serialization issues
      const { data, error } = await supabase.functions.invoke('daily-job');
      
      if (error) throw error;
      
      setEngineStatus(data);
      
      // Show detailed success message
      if (data?.success) {
        const dataMsg = data.dataCollection ? 
          `Data: ${data.dataCollection.successful}/${data.symbolsProcessed || 0} symbols updated` : 
          'Data collection completed';
        
        const optionsMsg = data.optionsAnalysis?.success ? 
          `Options: ${data.optionsAnalysis.strategies_found} strategies found` : 
          'Options analysis completed';
        
        const priorityMsg = data.dataCollection?.priorityBreakdown ? 
          `Priority breakdown - High: ${data.dataCollection.priorityBreakdown.high}, Medium: ${data.dataCollection.priorityBreakdown.medium}, Low: ${data.dataCollection.priorityBreakdown.low}` : '';
        
        toast({
          title: "S&P 500 Analysis Complete",
          description: `${dataMsg}. ${optionsMsg}. ${priorityMsg}`,
        });
      } else {
        toast({
          title: "Analysis Issues",
          description: data?.message || "Some issues occurred during S&P 500 analysis",
          variant: "destructive",
        });
      }

      // Trigger refresh of components
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const runFullAnalysis = () => runDailyJob();
  const runPriorityAnalysis = () => runDailyJob();

  return { 
    engineStatus, 
    refreshTrigger, 
    runDailyJob, 
    runFullAnalysis, 
    runPriorityAnalysis 
  };
};
