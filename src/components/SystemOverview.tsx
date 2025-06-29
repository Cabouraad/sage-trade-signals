
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, Activity, Shield } from "lucide-react";

export const SystemOverview = () => {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          Simplified Trading Engine
        </CardTitle>
        <CardDescription className="text-slate-400">
          Streamlined ranking system with Kelly position sizing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">SMA Crossover</span>
            </div>
            <p className="text-sm text-slate-300">
              Simple 20/50 SMA crossover signals for trend identification
            </p>
          </div>
          
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">ATR-Based Stops</span>
            </div>
            <p className="text-sm text-slate-300">
              Dynamic stop losses and targets using Average True Range
            </p>
          </div>
          
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Kelly Sizing</span>
            </div>
            <p className="text-sm text-slate-300">
              Optimal position sizing based on win rate and payoff ratio
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
