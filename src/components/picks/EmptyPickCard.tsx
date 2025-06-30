
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

interface Props {
  onRunAnalysis: () => void;
}

export const EmptyPickCard: React.FC<Props> = ({ onRunAnalysis }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Today's Trading Pick
        </CardTitle>
        <CardDescription>
          No trading opportunities found for today. Run analysis to find new opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRunAnalysis} className="w-full">
          Run Options Analysis
        </Button>
      </CardContent>
    </Card>
  );
};
