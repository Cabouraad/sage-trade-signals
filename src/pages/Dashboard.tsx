import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, LogOut, Target, Shield, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TodaysPick } from "@/components/TodaysPick";
import { EquityCurve } from "@/components/EquityCurve";
import { TradeHistory } from "@/components/TradeHistory";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
          </div>
          <div className="flex items-center gap-4">
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
          {/* Today's Pick */}
          <TodaysPick />
          
          {/* Strategy Performance */}
          <EquityCurve />
          
          {/* Trade History */}
          <TradeHistory />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
