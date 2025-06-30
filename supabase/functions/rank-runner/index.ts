
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.40.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Candle = { date: string; open: number; high: number; low: number; close: number };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UNIVERSE = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];

/* ─── helpers ─────────────────────────────────────────── */
const sma = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

const atr = (rows: Candle[], n = 14) => {
  const tr = rows.slice(1).map((r, i) => Math.max(
    r.high - r.low,
    Math.abs(r.high - rows[i].close),
    Math.abs(r.low - rows[i].close)
  ));
  return sma(tr.slice(-n));
};

const kelly = (win = 0.55, payoff = 1.8, cap = 0.25) =>
  Math.max(0, Math.min(cap, win - (1 - win) / payoff));

/* ─── ranking logic ───────────────────────────────────── */
async function pickTrade() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const picks: any[] = [];

  console.log('Processing symbols:', UNIVERSE.join(', '));

  for (const sym of UNIVERSE) {
    try {
      console.log(`Processing ${sym}...`);
      
      const { data, error } = await sb
        .from("price_history")
        .select("date,open,high,low,close")
        .eq("symbol", sym)
        .order("date", { ascending: false })
        .limit(200);

      if (error || !data?.length || data.length < 60) {
        console.log(`Insufficient data for ${sym}, skipping`);
        continue;
      }

      const rows = [...data].reverse() as Candle[];

      // 20/50 SMA cross
      const sma20 = sma(rows.slice(-20).map(r => r.close));
      const sma50 = sma(rows.slice(-50).map(r => r.close));
      
      console.log(`${sym}: SMA20=${sma20.toFixed(2)}, SMA50=${sma50.toFixed(2)}`);
      
      if (sma20 <= sma50) {
        console.log(`${sym}: No bullish signal (SMA20 <= SMA50)`);
        continue;
      }

      const entry = rows.at(-1)!.close;
      const trueATR = atr(rows, 14);
      const stop = entry - trueATR;
      const target = entry + 2 * trueATR;
      const kFrac = kelly();

      const candidate = {
        symbol: sym,
        trade_type: "long_stock",
        entry,
        stop,
        target,
        kelly_frac: kFrac,
        size_pct: +(kFrac * 100).toFixed(1),
        reason_bullets: [
          "20/50 SMA cross-over",
          `ATR-based 2:1 target (ATR ≈ ${trueATR.toFixed(2)})`,
          `Kelly size ${+(kFrac * 100).toFixed(1)}%`,
          `Entry: $${entry.toFixed(2)}, Stop: $${stop.toFixed(2)}, Target: $${target.toFixed(2)}`
        ]
      };

      picks.push(candidate);
      console.log(`✓ Added candidate ${sym} with Kelly ${kFrac.toFixed(3)}`);
    } catch (error) {
      console.error(`Error processing ${sym}:`, error);
    }
  }

  if (picks.length === 0) {
    console.log('No suitable candidates found');
    return null;
  }

  // choose by max Kelly
  const bestPick = picks.sort((a, b) => b.kelly_frac - a.kelly_frac)[0];
  console.log(`Selected ${bestPick.symbol} with Kelly ${bestPick.kelly_frac.toFixed(3)}`);
  
  return bestPick;
}

/* ─── HTTP entrypoint ─────────────────────────────────── */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting TypeScript ranking engine...');
    
    const pick = await pickTrade();
    
    if (!pick) {
      console.log('No trading opportunities found today');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No trading opportunities found today", 
          candidates: 0 
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    
    const { error: insertError } = await sb.from("daily_pick").insert(pick);
    
    if (insertError) {
      console.error('Error storing daily pick:', insertError);
      throw insertError;
    }

    console.log('✓ Successfully stored daily pick');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Selected ${pick.symbol} as today's pick`,
        pick: pick,
        totalCandidates: 1
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (e) {
    console.error('Ranking engine error:', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(e),
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
