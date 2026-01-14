import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const BankrollChart: React.FC = () => {
  const { results, config } = useSimulationStore();
  
  // Prepare data: Add initial point
  const data = [
    { spin: 0, bankroll: config.startingBankroll },
    ...results.spins.map(s => ({ spin: s.spinNumber, bankroll: s.bankrollAfter }))
  ];

  return (
    <Card className="h-[400px] flex flex-col border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Bankroll Progression</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
                dataKey="spin" 
                stroke="#666" 
                tick={{ fill: '#666' }}
                label={{ value: 'Spins', position: 'insideBottomRight', offset: -5, fill: '#666' }}
            />
            <YAxis 
                stroke="#666" 
                domain={['auto', 'auto']} 
                tick={{ fill: '#666' }}
                tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                itemStyle={{ color: '#d4af37' }}
                formatter={(value: number) => [`$${value}`, 'Bankroll']}
                labelFormatter={(label) => `Spin ${label}`}
                position={{ y: 0 }} // Fixes tooltip to top to avoid blocking view, or remove to follow point
                // To follow mouse height strictly is complex in Recharts without custom overlay.
                // Standard behavior + Brush is best for UX.
            />
            <Legend verticalAlign="top" height={36}/>
            <Brush 
                dataKey="spin" 
                height={30} 
                stroke="#d4af37" 
                fill="#1a1a1a"
                tickFormatter={(value) => `Spin ${value}`}
            />
            <Line 
                type="monotone" 
                dataKey="bankroll" 
                name="Bankroll"
                stroke="#d4af37" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#d4af37' }}
                animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
