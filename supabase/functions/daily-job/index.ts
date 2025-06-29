
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily ranking job...');

    // Run the ranking algorithm
    const result = await runRankingAlgorithm(supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily ranking job completed successfully',
        result: result,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Daily job error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function runRankingAlgorithm(supabase: any) {
  const universe = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'];
  const candidates = [];

  console.log('Processing symbols:', universe.join(', '));

  for (const symbol of universe) {
    try {
      // Get latest 200 candles for this symbol
      const { data: priceData, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol)
        .order('date', { ascending: false })
        .limit(200);

      if (error || !priceData || priceData.length < 50) {
        console.log(`Insufficient data for ${symbol}, skipping`);
        continue;
      }

      // Sort by date ascending for calculations
      const df = priceData.reverse();
      
      // Calculate simple moving averages
      const smaShort = calculateSMA(df.slice(-20), 'close');
      const smaLong = calculateSMA(df.slice(-50), 'close');
      
      console.log(`${symbol}: SMA20=${smaShort.toFixed(2)}, SMA50=${smaLong.toFixed(2)}`);

      // Check for bullish crossover
      if (smaShort > smaLong) {
        const entry = df[df.length - 1].close;
        const atrValue = calculateATR(df.slice(-14));
        const stop = entry - atrValue;
        const target = entry + (2 * atrValue);
        
        // Kelly calculation (simplified)
        const winRate = 0.55;
        const payoffRatio = 1.8;
        const kelly = calcKelly(winRate, payoffRatio);
        const sizePct = Math.round(kelly * 100 * 10) / 10;

        const candidate = {
          symbol,
          trade_type: 'long_stock',
          entry,
          stop,
          target,
          kelly_frac: kelly,
          size_pct: sizePct,
          reason_bullets: [
            '20/50 SMA crossover signal',
            `ATR-based 2:1 R/R (ATR=${atrValue.toFixed(2)})`,
            `Kelly sizing: ${sizePct}%`,
            `Entry: $${entry.toFixed(2)}, Stop: $${stop.toFixed(2)}, Target: $${target.toFixed(2)}`
          ]
        };

        candidates.push(candidate);
        console.log(`✓ Added candidate ${symbol} with Kelly ${kelly.toFixed(3)}`);
      } else {
        console.log(`${symbol}: No bullish signal (SMA20 < SMA50)`);
      }
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }

  if (candidates.length === 0) {
    console.log('No suitable candidates found');
    return { message: 'No trading opportunities found today', candidates: 0 };
  }

  // Pick the candidate with highest Kelly fraction
  const bestPick = candidates.reduce((best, current) => 
    current.kelly_frac > best.kelly_frac ? current : best
  );

  console.log(`Selected ${bestPick.symbol} with Kelly ${bestPick.kelly_frac.toFixed(3)}`);

  // Store the daily pick
  const { error: insertError } = await supabase
    .from('daily_pick')
    .insert(bestPick);

  if (insertError) {
    console.error('Error storing daily pick:', insertError);
    throw insertError;
  }

  console.log('✓ Successfully stored daily pick');

  return {
    message: `Selected ${bestPick.symbol} as today's pick`,
    pick: bestPick,
    totalCandidates: candidates.length
  };
}

// Utility functions
function calculateSMA(data: any[], field: string): number {
  const sum = data.reduce((acc, item) => acc + parseFloat(item[field]), 0);
  return sum / data.length;
}

function calculateATR(data: any[], period = 14): number {
  if (data.length < 2) return 0;
  
  let trSum = 0;
  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(data[i].high);
    const low = parseFloat(data[i].low);
    const prevClose = parseFloat(data[i-1].close);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trSum += tr;
  }
  
  return trSum / (data.length - 1);
}

function calcKelly(winRate: number, payoffRatio: number, cap = 0.25): number {
  const kelly = winRate - ((1 - winRate) / payoffRatio);
  return Math.max(0.0, Math.min(kelly, cap));
}
