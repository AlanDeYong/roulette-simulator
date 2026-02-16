<<<<<<< HEAD
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const BankrollChart: React.FC = () => {
  const { results, config, setChartZoom } = useSimulationStore();
  
  // Prepare data: Add initial point
  const data = React.useMemo(() => [
    { spin: 0, bankroll: config.startingBankroll, virtualBankroll: undefined },
    ...results.spins.map(s => ({ 
        spin: s.spinNumber, 
        bankroll: s.bankrollAfter,
        virtualBankroll: s.virtualBankroll 
    }))
  ], [results.spins, config.startingBankroll]);

  const handleBrushChange = (e: any) => {
      // Recharts Brush onChange fires on every pixel move.
      // We only want to save to store (which triggers re-render/storage) when user stops dragging.
      // However, Recharts Brush doesn't have explicit onDragEnd.
      // But it passes the current index.
      
      // If we update store immediately, it causes lag.
      // We should rely on local state or debounce?
      // Actually, Brush is controlled if we pass startIndex/endIndex.
      // If we pass them, we MUST update them on change, or it won't move.
      // BUT updating store is expensive (persist middleware).
      
      // Solution: Debounce the save, OR allow Brush to be uncontrolled for interaction
      // but sync to store on "settle". 
      // Recharts Brush documentation says: "If startIndex or endIndex is specified, the brush will be a controlled component"
      
      // If we want smooth dragging, we might need local state for the chart's view,
      // and only sync to global store (and persistence) via a debounce.
      
      // Let's implement debounce here.
      debouncedSetZoom(e.startIndex, e.endIndex);
  };

  // Debounce helper
  const debounce = (func: Function, wait: number) => {
      let timeout: any;
      return (...args: any[]) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
      };
  };

  const debouncedSetZoom = React.useMemo(
      () => debounce((start: number, end: number) => setChartZoom(start, end), 500),
      [setChartZoom]
  );

  // We need to keep local state for immediate feedback if we want controlled component?
  // If we debounce the store update, the props startIndex/endIndex won't update immediately,
  // making the brush "stuck" until debounce fires.
  // So we need local state that updates immediately, and then syncs to store.
  
  const [localZoom, setLocalZoom] = React.useState<{start?: number, end?: number}>({
      start: results.zoomState?.startIndex,
      end: results.zoomState?.endIndex
  });

  // Sync local state when store changes (e.g. loaded from cache)
  React.useEffect(() => {
      setLocalZoom({
          start: results.zoomState?.startIndex,
          end: results.zoomState?.endIndex
      });
  }, [results.zoomState]);

  const onBrushChange = (e: any) => {
      if (!e) return;
      if (e.startIndex !== localZoom.start || e.endIndex !== localZoom.end) {
          setLocalZoom({ start: e.startIndex, end: e.endIndex });
          debouncedSetZoom(e.startIndex, e.endIndex);
      }
  };

  return (
    <Card className="h-[400px] flex flex-col border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Bankroll Progression</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 40, right: 10, left: 0, bottom: 0 }}>
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
                formatter={(value: number, name: string) => {
                    if (name === 'virtualBankroll') return [`$${value}`, 'Virtual Bankroll'];
                    return [`$${value}`, 'Bankroll'];
                }}
                labelFormatter={(label) => `Spin ${label}`}
                position={{ y: 0 }} 
                wrapperStyle={{ top: -40, zIndex: 100 }}
                allowEscapeViewBox={{ y: true }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Brush 
                dataKey="spin" 
                height={30} 
                stroke="#d4af37" 
                fill="#1a1a1a"
                tickFormatter={(value) => `Spin ${value}`}
                startIndex={localZoom.start}
                endIndex={localZoom.end}
                onChange={onBrushChange}
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
            {/* Virtual Bankroll Line */}
            <Line 
                type="monotone" 
                dataKey="virtualBankroll" 
                name="Virtual Bankroll"
                stroke="#00ffff" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 6, fill: '#00ffff' }}
                connectNulls={true}
                animationDuration={300}
            />
            {/* Starting Bankroll Reference Line */}
            <Line 
                type="monotone" 
                dataKey={() => config.startingBankroll}
                name="Start"
                stroke="#666" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
=======
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const BankrollChart: React.FC = () => {
  const { results, config, setChartZoom } = useSimulationStore();
  
  // Prepare data: Add initial point
  const data = React.useMemo(() => [
    { spin: 0, bankroll: config.startingBankroll, virtualBankroll: undefined },
    ...results.spins.map(s => ({ 
        spin: s.spinNumber, 
        bankroll: s.bankrollAfter,
        virtualBankroll: s.virtualBankroll 
    }))
  ], [results.spins, config.startingBankroll]);

  const handleBrushChange = (e: any) => {
      // Recharts Brush onChange fires on every pixel move.
      // We only want to save to store (which triggers re-render/storage) when user stops dragging.
      // However, Recharts Brush doesn't have explicit onDragEnd.
      // But it passes the current index.
      
      // If we update store immediately, it causes lag.
      // We should rely on local state or debounce?
      // Actually, Brush is controlled if we pass startIndex/endIndex.
      // If we pass them, we MUST update them on change, or it won't move.
      // BUT updating store is expensive (persist middleware).
      
      // Solution: Debounce the save, OR allow Brush to be uncontrolled for interaction
      // but sync to store on "settle". 
      // Recharts Brush documentation says: "If startIndex or endIndex is specified, the brush will be a controlled component"
      
      // If we want smooth dragging, we might need local state for the chart's view,
      // and only sync to global store (and persistence) via a debounce.
      
      // Let's implement debounce here.
      debouncedSetZoom(e.startIndex, e.endIndex);
  };

  // Debounce helper
  const debounce = (func: Function, wait: number) => {
      let timeout: any;
      return (...args: any[]) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
      };
  };

  const debouncedSetZoom = React.useMemo(
      () => debounce((start: number, end: number) => setChartZoom(start, end), 500),
      [setChartZoom]
  );

  // We need to keep local state for immediate feedback if we want controlled component?
  // If we debounce the store update, the props startIndex/endIndex won't update immediately,
  // making the brush "stuck" until debounce fires.
  // So we need local state that updates immediately, and then syncs to store.
  
  const [localZoom, setLocalZoom] = React.useState<{start?: number, end?: number}>({
      start: results.zoomState?.startIndex,
      end: results.zoomState?.endIndex
  });

  // Sync local state when store changes (e.g. loaded from cache)
  React.useEffect(() => {
      setLocalZoom({
          start: results.zoomState?.startIndex,
          end: results.zoomState?.endIndex
      });
  }, [results.zoomState]);

  const onBrushChange = (e: any) => {
      if (!e) return;
      if (e.startIndex !== localZoom.start || e.endIndex !== localZoom.end) {
          setLocalZoom({ start: e.startIndex, end: e.endIndex });
          debouncedSetZoom(e.startIndex, e.endIndex);
      }
  };

  return (
    <Card className="h-[400px] flex flex-col border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Bankroll Progression</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 40, right: 10, left: 0, bottom: 0 }}>
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
                formatter={(value: number, name: string) => {
                    if (name === 'virtualBankroll') return [`$${value}`, 'Virtual Bankroll'];
                    return [`$${value}`, 'Bankroll'];
                }}
                labelFormatter={(label) => `Spin ${label}`}
                position={{ y: 0 }} 
                wrapperStyle={{ top: -40, zIndex: 100 }}
                allowEscapeViewBox={{ y: true }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Brush 
                dataKey="spin" 
                height={30} 
                stroke="#d4af37" 
                fill="#1a1a1a"
                tickFormatter={(value) => `Spin ${value}`}
                startIndex={localZoom.start}
                endIndex={localZoom.end}
                onChange={onBrushChange}
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
            {/* Virtual Bankroll Line */}
            <Line 
                type="monotone" 
                dataKey="virtualBankroll" 
                name="Virtual Bankroll"
                stroke="#00ffff" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 6, fill: '#00ffff' }}
                connectNulls={true}
                animationDuration={300}
            />
            {/* Starting Bankroll Reference Line */}
            <Line 
                type="monotone" 
                dataKey={() => config.startingBankroll}
                name="Start"
                stroke="#666" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
>>>>>>> origin/main
