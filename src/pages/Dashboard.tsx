
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardHero } from "@/components/DashboardHero";
import { TodaysPick } from "@/components/TodaysPick";
import { OptionsAnalysis } from "@/components/OptionsAnalysis";
import { TradeHistory } from "@/components/TradeHistory";
import { EquityCurve } from "@/components/EquityCurve";
import { SystemOverview } from "@/components/SystemOverview";
import { SystemTest } from "@/components/SystemTest";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <DashboardHero />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodaysPick />
          </div>
          <div>
            <SystemOverview />
          </div>
        </div>

        <OptionsAnalysis />
        
        <div className="grid gap-6 md:grid-cols-2">
          <TradeHistory />
          <EquityCurve />
        </div>
        
        <SystemTest />
      </main>
    </div>
  );
};

export default Dashboard;
