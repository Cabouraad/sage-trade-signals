
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Brain, Activity, Database, TrendingUp } from "lucide-react";

interface DashboardHeroProps {
  engineStatus: any;
}

export const DashboardHero = ({ engineStatus }: DashboardHeroProps) => {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center gap-2 mb-4">
        <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold">
          <Target className="h-3 w-3 mr-1" />
          Daily Pick System
        </Badge>
        <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 px-4 py-2">
          <Brain className="h-3 w-3 mr-1" />
          Kelly Sizing
        </Badge>
        <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10 px-4 py-2">
          <Activity className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
      </div>
      
      {engineStatus && (
        <Card className="bg-slate-800/30 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="text-sm text-slate-300 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <strong>Latest Run:</strong> {engineStatus.message}
              </div>
              
              {engineStatus.dataCollection && (
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    <span>Data: {engineStatus.dataCollection.successful}/{engineStatus.dataCollection.symbols?.length || 0} symbols</span>
                  </div>
                  {engineStatus.dataCollection.failed > 0 && (
                    <div className="text-orange-400">
                      {engineStatus.dataCollection.failed} failed
                    </div>
                  )}
                </div>
              )}
              
              {engineStatus.ranking?.result && (
                <div className="flex items-center justify-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  {engineStatus.ranking.result.pick?.symbol ? (
                    <span>Selected: {engineStatus.ranking.result.pick.symbol} | Candidates: {engineStatus.ranking.result.totalCandidates}</span>
                  ) : (
                    <span>{engineStatus.ranking.result.message}</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
