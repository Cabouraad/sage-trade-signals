
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, LogOut, Target, Shield, DollarSign, Brain, Activity, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TodaysPick } from "@/components/TodaysPick";
import { EquityCurve } from "@/components/EquityCurve";
import { TradeHistory } from "@/components/TradeHistory";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState<any>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        window.location.href = '/auth';
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        window.location.href = '/auth';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const runDailyJob = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-job');
      
      if (error) throw error;
      
      setEngineStatus(data);
      toast({
        title: "Success",
        description: "Enhanced daily job completed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold">TradeSage</span>
            <Badge variant="outline" className="ml-2 border-green-500/30 text-green-300 bg-green-500/10">
              <Brain className="h-3 w-3 mr-1" />
              Enhanced AI
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={runDailyJob}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Run Enhanced Analysis
            </Button>
            <span className="text-slate-300">Welcome, {user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Hero Section with Enhanced Badges */}
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-4">
              <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold">
                <Target className="h-3 w-3 mr-1" />
                Trade of the Day
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 px-4 py-2">
                <Brain className="h-3 w-3 mr-1" />
                Kelly Sizing
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10 px-4 py-2">
                <Activity className="h-3 w-3 mr-1" />
                Pattern Recognition
              </Badge>
            </div>
            
            {engineStatus && (
              <Card className="bg-slate-800/30 border-slate-700 mb-6">
                <CardContent className="p-4">
                  <div className="text-sm text-slate-300">
                    <strong>Enhanced Engine Status:</strong> {engineStatus.message}
                    <br />
                    Processed {engineStatus.processed_symbols} symbols with features: {engineStatus.features_enabled?.join(', ')}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Today's Pick with Enhanced Features */}
          <TodaysPick />
          
          {/* Trade History */}
          <TradeHistory />
          
          {/* Strategy Performance */}
          <EquityCurve />
          
          {/* Feature Overview */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Enhanced Trading Engine
              </CardTitle>
              <CardDescription className="text-slate-400">
                Advanced AI-powered features for systematic trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Target className="h-4 w-4" />
                    <span className="font-medium">Kelly Criterion</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    Optimal position sizing based on historical win rates and risk-reward ratios
                  </p>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="font-medium">Pattern Recognition</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    CNN-based chart pattern detection with confidence scoring
                  </p>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Risk Management</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    ATR-based stops, regime filtering, and robustness testing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
