
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting Python ranking engine...');
    
    // Set up environment for Python process
    const env = {
      DATABASE_URL: Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL'),
      PYTHONPATH: '/opt/python'
    };

    // Run Python ranking engine
    const command = new Deno.Command('python3', {
      args: ['-m', 'app.rank'],
      env: env,
      cwd: '/opt',
      stdout: 'piped',
      stderr: 'piped'
    });

    const process = command.spawn();
    const { code, stdout, stderr } = await process.output();

    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    console.log('Python stdout:', output);
    if (errorOutput) {
      console.error('Python stderr:', errorOutput);
    }

    if (code === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Python ranking engine completed successfully',
          output: output 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Python process failed with code ${code}: ${errorOutput}`);
    }

  } catch (error) {
    console.error('Error running Python ranking engine:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
