
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from "lucide-react";

// Mock data for equity curve - in real app this would come from backtesting results
const mockEquityData = [
  { date: '2023-01', value: 10000, strategy: 'sma-cross' },
  { date: '2023-02', value: 10250, strategy: 'sma-cross' },
  { date: '2023-03', value: 10100, strategy: 'sma-cross' },
  { date: '2023-04', value: 10500, strategy: 'sma-cross' },
  { date: '2023-05', value: 10750, strategy: 'sma-cross' },
  { date: '2023-06', value: 10900, strategy: 'sma-cross' },
  { date: '2023-07', value: 11200, strategy: 'sma-cross' },
  { date: '2023-08', value: 11050, strategy: 'sma-cross' },
  { date: '2023-09', value: 11400, strategy: 'sma-cross' },
  { date: '2023-10', value: 11650, strategy: 'sma-cross' },
  { date: '2023-11', value: 11800, strategy: 'sma-cross' },
  { date: '2023-12', value: 12100, strategy: 'sma-cross' },
];

export const EquityCurve = () => {
  const [equityData, setEquityData] = useState(mockEquityData);
  const [loading, setLoading] = useState(false);

  const totalReturn = ((equityData[equityData.length - 1]?.value - equityData[0]?.value) / equityData[0]?.value * 100).toFixed(1);
  const currentStrategy = "SMA Cross"; // This would come from your strategy selection logic

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          Strategy Performance
        </CardTitle>
        <CardDescription className="text-slate-400">
          Equity curve for the winning strategy: {currentStrategy}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Total Return</div>
            <div className="text-xl font-bold text-green-400">+{totalReturn}%</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Starting Capital</div>
            <div className="text-xl font-bold text-white">${equityData[0]?.value.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-slate-400">Current Value</div>
            <div className="text-xl font-bold text-white">
              ${equityData[equityData.length - 1]?.value.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
