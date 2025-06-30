
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Schedule the daily job to run at 09:05 ET (13:05 UTC) on weekdays
Deno.cron("daily-trade", "5 13 * * 1-5", async () => {
  console.log('Running scheduled daily job...');
  
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    const { data, error } = await sb.functions.invoke("rank-runner");
    
    if (error) {
      console.error('Scheduled rank-runner failed:', error);
      return;
    }
    
    console.log('Scheduled daily job completed successfully:', data);
  } catch (error) {
    console.error('Scheduled daily job failed:', error);
  }
});

// Also serve HTTP requests for manual triggering
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async () => {
  return new Response(JSON.stringify({ message: "Cron job is running" }), {
    headers: { "Content-Type": "application/json" }
  });
});
