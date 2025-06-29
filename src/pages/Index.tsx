
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Target, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <TrendingUp className="h-12 w-12 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">TradeSage</h1>
          </div>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            AI-powered trading strategy optimization using advanced backtesting and real-time market data analysis
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Strategy Backtesting</CardTitle>
              <CardDescription className="text-slate-400">
                Test multiple trading strategies with 18+ months of historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• SMA Cross Strategy</li>
                <li>• Gap Close Strategy</li>
                <li>• Bull Call Spread</li>
                <li>• Bear Put Spread</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Target className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Daily Recommendations</CardTitle>
              <CardDescription className="text-slate-400">
                Get AI-selected trades with precise entry, stop, and target levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• Automated strategy ranking</li>
                <li>• Risk-adjusted selections</li>
                <li>• Real-time market data</li>
                <li>• Performance tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <Shield className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Risk Management</CardTitle>
              <CardDescription className="text-slate-400">
                Built-in risk controls and portfolio optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-slate-300 space-y-2">
                <li>• Sharpe ratio optimization</li>
                <li>• Position sizing</li>
                <li>• Drawdown protection</li>
                <li>• Performance analytics</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Tech Stack */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-8">Powered by Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <span className="bg-slate-800/50 px-4 py-2 rounded-lg">React + TypeScript</span>
            <span className="bg-slate-800/50 px-4 py-2 rounded-lg">Supabase Backend</span>
            <span className="bg-slate-800/50 px-4 py-2 rounded-lg">Python + Backtrader</span>
            <span className="bg-slate-800/50 px-4 py-2 rounded-lg">Alpha Vantage API</span>
            <span className="bg-slate-800/50 px-4 py-2 rounded-lg">Real-time Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
