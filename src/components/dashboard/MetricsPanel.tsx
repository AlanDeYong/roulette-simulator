import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent } from '../ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Activity, ArrowUpCircle, ArrowDownCircle, Target, Trophy, Ban } from 'lucide-react';

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ title, value, subValue, icon, trend, color }) => (
  <Card className="bg-surface/50 border-primary/10 hover:bg-surface/80 transition-colors overflow-hidden">
    <CardContent className="p-2 flex items-center space-x-2 overflow-hidden">
      <div className={`p-1.5 rounded-full bg-surface/80 border border-white/5 shrink-0 ${color || 'text-primary'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted font-medium whitespace-normal break-words leading-tight">{title}</p>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0">
            <p className={`text-sm font-bold tabular-nums leading-tight ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-text'}`}>
              {value}
            </p>
            {subValue && <span className="text-[10px] text-text-muted whitespace-normal break-words leading-tight">{subValue}</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const MetricsPanel: React.FC = () => {
  const { results, config } = useSimulationStore();
  const { metrics } = results;

  const peakProfit = metrics.peakBankroll - config.startingBankroll;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {/* Row 1: Financials */}
      <MetricCard
        title="Total Profit/Loss"
        value={`${metrics.totalProfit >= 0 ? '+' : ''}$${metrics.totalProfit.toFixed(0)}`}
        icon={<DollarSign className="w-4 h-4" />}
        trend={metrics.totalProfit > 0 ? 'up' : metrics.totalProfit < 0 ? 'down' : 'neutral'}
      />
      <MetricCard
        title="Ending Bankroll"
        value={`$${metrics.finalBankroll.toFixed(0)}`}
        icon={<Activity className="w-4 h-4 text-yellow-400" />}
        color="text-yellow-400"
      />
      <MetricCard
        title="Peak Bankroll"
        value={`$${metrics.peakBankroll.toFixed(0)}`}
        subValue={`Spin ${metrics.spinsToPeak}`}
        icon={<ArrowUpCircle className="w-4 h-4 text-green-400" />}
        color="text-green-400"
      />
      <MetricCard
        title="Lowest Bankroll"
        value={`$${metrics.lowestBankroll.toFixed(0)}`}
        subValue={`Spin ${metrics.spinsToLowest}`}
        icon={<ArrowDownCircle className="w-4 h-4 text-red-400" />}
        color="text-red-400"
      />
      <MetricCard
        title="Peak Profit"
        value={`${peakProfit >= 0 ? '+' : ''}$${peakProfit.toFixed(0)}`}
        subValue="(Peak - Start)"
        icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        color="text-green-500"
      />

      {/* Row 2: Stats */}
      <MetricCard
        title="Max Bet"
        value={`$${metrics.maxBet.toFixed(0)}`}
        icon={<TrendingUp className="w-4 h-4 text-orange-400" />}
        color="text-orange-400"
      />
      <MetricCard
        title="Average Bet"
        value={`$${metrics.averageBet.toFixed(0)}`}
        icon={<Target className="w-4 h-4 text-blue-400" />}
        color="text-blue-400"
      />
      <MetricCard
        title="Win Rate"
        value={`${(metrics.winRate * 100).toFixed(1)}%`}
        icon={<Percent className="w-4 h-4 text-purple-400" />}
        color="text-purple-400"
      />
      <MetricCard
        title="Winning Spins"
        value={metrics.winningSpins}
        icon={<Trophy className="w-4 h-4 text-green-500" />}
        color="text-green-500"
      />
      <MetricCard
        title="Losing Spins"
        value={metrics.losingSpins}
        icon={<Ban className="w-4 h-4 text-red-500" />}
        color="text-red-500"
      />
    </div>
  );
};
