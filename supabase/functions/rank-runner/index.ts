
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

type Candle = { open: number; high: number; low: number; close: number; date: string };

const sma = (arr: number[]) => arr.reduce((a, v) => a + v, 0) / arr.length;

const atr = (rows: Candle[], n = 14) => {
  const tr = rows.slice(1).map((r, i) => Math.max(
    r.high - r.low,
    Math.abs(r.high - rows[i].close),
    Math.abs(r.low - rows[i].close)
  ));
  return sma(tr.slice(-n));
};

const kelly = (w = 0.55, p = 1.8, cap = 0.25) => Math.max(0, Math.min(cap, w - (1 - w) / p));

async function universe(): Promise<string[]> {
  const { data } = await sb.rpc("list_symbols_with_history");
  return (data ?? []).map((r: any) => r.symbol as string);
}

async function latestCandles(symbol: string): Promise<Candle[]> {
  const { data } = await sb
    .from("price_history")
    .select("date,open,high,low,close")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(250);
  return (data ?? []).reverse() as Candle[];
}

async function checkDataFreshness(symbol: string): Promise<{ isFresh: boolean; daysSinceUpdate: number; lastUpdate: string | null }> {
  const { data } = await sb
    .from("price_history")
    .select("date")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (!data) {
    return { isFresh: false, daysSinceUpdate: Infinity, lastUpdate: null };
  }
  
  const lastUpdate = new Date(data.date);
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  const isFresh = daysSinceUpdate <= 7; // Data must be within 7 days
  
  return { isFresh, daysSinceUpdate, lastUpdate: data.date };
}

async function pick(): Promise<any | null> {
  const syms = await universe();
  console.log(`Found ${syms.length} symbols with history. Checking data freshness...`);
  
  const picks: any[] = [];
  let freshDataCount = 0;
  let staleDataCount = 0;

  for (const sym of syms) {
    // Check data freshness first
    const { isFresh, daysSinceUpdate, lastUpdate } = await checkDataFreshness(sym);
    
    if (!isFresh) {
      console.log(`${sym}: Skipping - data is ${Math.round(daysSinceUpdate)} days old (last: ${lastUpdate})`);
      staleDataCount++;
      continue;
    }
    
    freshDataCount++;
    console.log(`${sym}: Using fresh data (${Math.round(daysSinceUpdate * 24)} hours old)`);
    
    const rows = await latestCandles(sym);
    if (rows.length < 60) {
      console.log(`${sym}: Insufficient data (${rows.length} rows), skipping`);
      continue;
    }

    const sma20 = sma(rows.slice(-20).map(r => r.close));
    const sma50 = sma(rows.slice(-50).map(r => r.close));
    
    console.log(`${sym}: SMA20=${sma20.toFixed(2)}, SMA50=${sma50.toFixed(2)}`);
    
    if (sma20 <= sma50) {
      console.log(`${sym}: No bullish signal (SMA20 <= SMA50)`);
      continue;
    }

    const entry = rows.at(-1)!.close;
    const a = atr(rows, 14);
    const kellyFrac = kelly();
    
    const candidate = {
      symbol: sym,
      trade_type: "long_stock",
      entry,
      stop: entry - a,
      target: entry + 2 * a,
      kelly_frac: kellyFrac,
      size_pct: +(kellyFrac * 100).toFixed(1),
      reason_bullets: [
        "20/50 SMA cross-over (LIVE data)",
        `ATR 2:1 target (ATR≈${a.toFixed(2)})`,
        `Kelly ${+(kellyFrac * 100).toFixed(1)}%`,
        `Entry: $${entry.toFixed(2)}, Stop: $${(entry - a).toFixed(2)}, Target: $${(entry + 2 * a).toFixed(2)}`,
        `Data age: ${Math.round(daysSinceUpdate * 24)} hours`
      ],
      data_freshness: 'LIVE',
      last_update: lastUpdate
    };

    picks.push(candidate);
    console.log(`✓ Added candidate ${sym} with Kelly ${kellyFrac.toFixed(3)} (fresh data)`);
  }

  console.log(`Data freshness summary: ${freshDataCount} fresh, ${staleDataCount} stale`);

  if (picks.length === 0) {
    if (freshDataCount === 0) {
      throw new Error('No symbols have fresh data (within 7 days). Cannot generate picks with stale data.');
    }
    console.log('No suitable candidates found with fresh data');
    return null;
  }

  const bestPick = picks.sort((a, b) => b.kelly_frac - a.kelly_frac)[0];
  console.log(`Selected ${bestPick.symbol} with Kelly ${bestPick.kelly_frac.toFixed(3)} (LIVE data)`);
  
  return bestPick;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting TypeScript ranking engine with LIVE data only...');
    
    // REMOVED: Auto-seeding dummy data functionality
    // This function now ONLY works with real market data
    
    const { count } = await sb.from("price_history").select("symbol", { count: "exact" });
    if (!count || count === 0) {
      throw new Error('No price history data available. Please run market data collection first.');
    }

    const bestPick = await pick();
    
    if (!bestPick) {
      console.log('No trading opportunities found with fresh data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No trading opportunities found with fresh data (within 7 days)", 
          candidates: 0,
          data_freshness: 'LIVE_REQUIRED'
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { error: insertError } = await sb.from("daily_pick").insert(bestPick);
    
    if (insertError) {
      console.error('Error storing daily pick:', insertError);
      throw insertError;
    }

    console.log('✓ Successfully stored daily pick with LIVE data');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Selected ${bestPick.symbol} as today's pick using LIVE data`,
        pick: bestPick,
        totalCandidates: 1,
        data_freshness: 'LIVE'
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
        data_freshness: 'FAILED',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
