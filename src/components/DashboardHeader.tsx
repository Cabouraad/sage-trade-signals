
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, LogOut, Brain, Zap } from "lucide-react";

interface DashboardHeaderProps {
  user: User;
  onSignOut: () => void;
  onRunDailyJob: () => void;
}

export const DashboardHeader = ({ user, onSignOut, onRunDailyJob }: DashboardHeaderProps) => {
  return (
    <header className="border-b border-slate-800 bg-slate-800/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-purple-400" />
          <span className="text-2xl font-bold">TradeSage</span>
          <Badge variant="outline" className="ml-2 border-green-500/30 text-green-300 bg-green-500/10">
            <Brain className="h-3 w-3 mr-1" />
            Simplified Engine
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={onRunDailyJob}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Run Daily Ranking
          </Button>
          <span className="text-slate-300">Welcome, {user.email}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};
