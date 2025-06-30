
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Shield, BarChart3 } from 'lucide-react';

interface DailyPick {
  symbol: string;
  trade_type: string;
  entry: number;
  stop: number;
  target: number;
  kelly_frac: number;
  size_pct: number;
  reason_bullets: string[];
  pick_ts: string;
}

interface Props {
  stockPick: DailyPick;
  onFindOptions: () => void;
}

export const StockPickCard: React.FC<Props> = ({ stockPick, onFindOptions }) => {
  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Today's Stock Pick (Fallback)
          </CardTitle>
          <Badge className="bg-orange-100 text-orange-800">
            STOCK TRADE
          </Badge>
        </div>
        <CardDescription>
          Stock trade recommendation (no options strategies found today)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary">{stockPick.symbol}</h3>
          <p className="text-muted-foreground capitalize">
            {stockPick.trade_type.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">ENTRY</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.entry.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-muted-foreground">STOP</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.stop.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">TARGET</span>
            </div>
            <p className="text-lg font-semibold">${stockPick.target.toFixed(2)}</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">SIZE</span>
            </div>
            <p className="text-lg font-semibold">{stockPick.size_pct}%</p>
          </div>
        </div>

        {stockPick.reason_bullets && stockPick.reason_bullets.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">RATIONALE</h4>
            <ul className="space-y-1">
              {stockPick.reason_bullets.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button onClick={onFindOptions} className="flex-1">
            Find Options Strategies
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
