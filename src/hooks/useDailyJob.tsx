
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
        description: "Running daily ranking algorithm...",
      });

      const { data, error } = await supabase.functions.invoke('daily-job');
      
      if (error) throw error;
      
      setEngineStatus(data);
      toast({
        title: "Success",
        description: data?.message || "Daily ranking completed successfully",
      });

      // Trigger refresh of components instead of full page reload
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
