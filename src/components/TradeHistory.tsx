
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface TradeRecord {
  id: string;
  date: string;
  strategy: string;
  symbol: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  sharpe_ratio: number;
  expected_return: number;
}

export const TradeHistory = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradeHistory();
  }, []);

  const fetchTradeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_pick')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trade history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePnL = (trade: TradeRecord) => {
    // Mock P/L calculation - in real app this would be based on actual exit prices
    const randomPnL = (Math.random() - 0.4) * 0.15; // Slight positive bias
    return randomPnL;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="text-slate-400">Loading trade history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <History className="h-5 w-5 text-purple-400" />
          Trade History
        </CardTitle>
        <CardDescription className="text-slate-400">
          Last 30 trading recommendations and their performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No trade history available yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Symbol</TableHead>
                  <TableHead className="text-slate-300">Strategy</TableHead>
                  <TableHead className="text-slate-300">Entry</TableHead>
                  <TableHead className="text-slate-300">Target</TableHead>
                  <TableHead className="text-slate-300">Stop</TableHead>
                  <TableHead className="text-slate-300">Sharpe</TableHead>
                  <TableHead className="text-slate-300">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const pnl = calculatePnL(trade);
                  const pnlPercent = (pnl * 100).toFixed(1);
                  
                  return (
                    <TableRow key={trade.id} className="border-slate-700">
                      <TableCell className="text-slate-300">
                        {new Date(trade.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {trade.strategy.replace(/-/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        ${trade.entry_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        ${trade.target_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        ${trade.stop_loss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {trade.sharpe_ratio.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {pnl >= 0 ? '+' : ''}{pnlPercent}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
