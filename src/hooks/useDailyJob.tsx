
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useDailyJob = () => {
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const runDailyJob = async () => {
    try {
      toast({
        title: "Starting Analysis",
        description: "Collecting market data and running ranking algorithm...",
      });

      const { data, error } = await supabase.functions.invoke('daily-job');
      
      if (error) throw error;
      
      setEngineStatus(data);
      
      // Show detailed success message
      if (data?.success) {
        const dataMsg = data.dataCollection ? 
          `Data: ${data.dataCollection.successful}/${data.dataCollection.symbols?.length || 0} symbols updated` : 
          'Data collection completed';
        
        toast({
          title: "Analysis Complete",
          description: `${dataMsg}. ${data?.ranking?.result?.message || 'Ranking completed'}`,
        });
      } else {
        toast({
          title: "Analysis Issues",
          description: data?.message || "Some issues occurred during analysis",
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

  return { engineStatus, refreshTrigger, runDailyJob };
};
