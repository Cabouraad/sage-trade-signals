
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Play, Database, Brain, TrendingUp, RefreshCw } from "lucide-react";

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const SystemTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults: TestResult[] = [];

    // Test 1: Database Connection
    try {
      const { data, error } = await supabase.from('symbols').select('symbol').limit(1);
      if (error) throw error;
      testResults.push({
        name: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to Supabase',
        details: { symbolsFound: data?.length || 0 }
      });
    } catch (error: any) {
      testResults.push({
        name: 'Database Connection',
        status: 'error',
        message: `Database connection failed: ${error.message}`
      });
    }

    // Test 2: Price Data Availability
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('symbol, date, close')
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const uniqueSymbols = [...new Set(data?.map(d => d.symbol) || [])];
      const latestDate = data?.[0]?.date;
      
      testResults.push({
        name: 'Price Data Availability',
        status: data && data.length > 0 ? 'success' : 'warning',
        message: data && data.length > 0 ? 
          `Found price data for ${uniqueSymbols.length} symbols` : 
          'No price data found',
        details: { 
          recordCount: data?.length || 0,
          symbols: uniqueSymbols.slice(0, 5),
          latestDate
        }
      });
    } catch (error: any) {
      testResults.push({
        name: 'Price Data Availability',
        status: 'error',
        message: `Price data check failed: ${error.message}`
      });
    }

    // Test 3: Daily Job Function
    try {
      console.log('Invoking daily-job function...');
      const { data, error } = await supabase.functions.invoke('daily-job');
      
      if (error) {
        console.error('Daily job error:', error);
        throw error;
      }
      
      console.log('Daily job response:', data);
      
      testResults.push({
        name: 'Daily Job Execution',
        status: data?.success ? 'success' : 'warning',
        message: data?.message || 'Daily job completed',
        details: {
          dataCollection: data?.data_collection,
          analysisCompleted: data?.analysis_completed,
          timestamp: data?.timestamp
        }
      });
    } catch (error: any) {
      console.error('Daily job test error:', error);
      testResults.push({
        name: 'Daily Job Execution',
        status: 'error',
        message: `Daily job failed: ${error.message}`,
        details: { error: error }
      });
    }

    // Test 4: Analysis Function
    try {
      console.log('Invoking python-sim analysis function...');
      const { data, error } = await supabase.functions.invoke('python-sim', {
        body: { 
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          path: 'rank',
          force_analysis: true
        }
      });
      
      if (error) {
        console.error('Analysis error:', error);
        throw error;
      }
      
      console.log('Analysis response:', data);
      
      testResults.push({
        name: 'Analysis Engine',
        status: data?.success ? 'success' : 'warning',
        message: data?.message || 'Analysis completed',
        details: {
          selectedPick: data?.selected_pick?.symbol,
          totalCandidates: data?.total_candidates,
          analysisMethod: data?.analysis_method
        }
      });
    } catch (error: any) {
      console.error('Analysis test error:', error);
      testResults.push({
        name: 'Analysis Engine',
        status: 'error',
        message: `Analysis failed: ${error.message}`,
        details: { error: error }
      });
    }

    // Wait a moment before checking daily pick storage to allow database write to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Daily Pick Storage (check after analysis)
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_pick')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      
      testResults.push({
        name: 'Daily Pick Storage',
        status: data ? 'success' : 'warning',
        message: data ? 
          `Today's pick found: ${data.symbol}` : 
          'No pick stored for today (may need to run analysis first)',
        details: data ? {
          symbol: data.symbol,
          strategy: data.strategy,
          entryPrice: data.entry_price,
          sharpeRatio: data.sharpe_ratio
        } : null
      });
    } catch (error: any) {
      testResults.push({
        name: 'Daily Pick Storage',
        status: 'error',
        message: `Daily pick check failed: ${error.message}`
      });
    }

    // Test 6: API Keys Configuration
    const apiKeysTest: TestResult = {
      name: 'API Keys Configuration',
      status: 'warning',
      message: 'Cannot verify API keys from frontend',
      details: {
        note: 'API keys are configured in Supabase Edge Functions environment'
      }
    };
    testResults.push(apiKeysTest);

    setResults(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'error':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'warning':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-400" />
          System Health Check
        </CardTitle>
        <CardDescription className="text-slate-400">
          Test all components of the trading system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runTests}
          disabled={testing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run System Tests
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Test Results</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-slate-700/30 rounded-lg p-4 border border-slate-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-white">{result.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusColor(result.status)}
                  >
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-slate-300 text-sm mb-2">{result.message}</p>
                {result.details && (
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-300">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-slate-800 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-slate-300">
                  Summary: {results.filter(r => r.status === 'success').length} passed, {' '}
                  {results.filter(r => r.status === 'warning').length} warnings, {' '}
                  {results.filter(r => r.status === 'error').length} errors
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
