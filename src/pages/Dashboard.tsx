
import { TodaysPick } from "@/components/TodaysPick";
import { EquityCurve } from "@/components/EquityCurve";
import { TradeHistory } from "@/components/TradeHistory";
import { SystemTest } from "@/components/SystemTest";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardHero } from "@/components/DashboardHero";
import { SystemOverview } from "@/components/SystemOverview";
import { useAuth } from "@/hooks/useAuth";
import { useDailyJob } from "@/hooks/useDailyJob";

const Dashboard = () => {
  const { user, loading, handleSignOut } = useAuth();
  const { engineStatus, refreshTrigger, runDailyJob } = useDailyJob();

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
      <DashboardHeader 
        user={user} 
        onSignOut={handleSignOut} 
        onRunDailyJob={runDailyJob} 
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <DashboardHero engineStatus={engineStatus} />
          
          <SystemTest />
          
          <TodaysPick key={refreshTrigger} />
          
          <TradeHistory key={refreshTrigger} />
          
          <EquityCurve />
          
          <SystemOverview />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
