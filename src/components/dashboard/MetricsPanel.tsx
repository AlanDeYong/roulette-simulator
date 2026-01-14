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
  <Card className="bg-surface/50 border-primary/10 hover:bg-surface/80 transition-colors">
    <CardContent className="p-4 flex items-center space-x-3">
      <div className={`p-2.5 rounded-full bg-surface/80 border border-white/5 shrink-0 ${color || 'text-primary'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted font-medium truncate" title={title}>{title}</p>
        <div className="flex items-baseline gap-2">
            <p className={`text-xl font-bold ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-text'}`}>
            {value}
            </p>
            {subValue && <span className="text-xs text-text-muted">{subValue}</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const MetricsPanel: React.FC = () => {
  const { results } = useSimulationStore();
  const { metrics } = results;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Row 1: Financials */}
      <MetricCard
        title="Total Profit/Loss"
        value={`${metrics.totalProfit >= 0 ? '+' : ''}$${metrics.totalProfit.toFixed(0)}`}
        icon={<DollarSign className="w-5 h-5" />}
        trend={metrics.totalProfit > 0 ? 'up' : metrics.totalProfit < 0 ? 'down' : 'neutral'}
      />
      <MetricCard
        title="Ending Bankroll"
        value={`$${metrics.finalBankroll.toFixed(0)}`}
        icon={<Activity className="w-5 h-5 text-yellow-400" />}
        color="text-yellow-400"
      />
      <MetricCard
        title="Peak Bankroll"
        value={`$${metrics.peakBankroll.toFixed(0)}`}
        subValue={`Spin ${metrics.spinsToPeak}`}
        icon={<ArrowUpCircle className="w-5 h-5 text-green-400" />}
        color="text-green-400"
      />
      <MetricCard
        title="Lowest Bankroll"
        value={`$${metrics.lowestBankroll.toFixed(0)}`}
        subValue={`Spin ${metrics.spinsToLowest}`}
        icon={<ArrowDownCircle className="w-5 h-5 text-red-400" />}
        color="text-red-400"
      />
      <MetricCard
        title="Max Drawdown"
        value={`$${metrics.maxDrawdown.toFixed(0)}`}
        icon={<TrendingDown className="w-5 h-5 text-red-500" />}
        color="text-red-500"
      />

      {/* Row 2: Stats */}
      <MetricCard
        title="Max Bet"
        value={`$${metrics.maxBet.toFixed(0)}`}
        icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
        color="text-orange-400"
      />
      <MetricCard
        title="Average Bet"
        value={`$${metrics.averageBet.toFixed(0)}`}
        icon={<Target className="w-5 h-5 text-blue-400" />}
        color="text-blue-400"
      />
      <MetricCard
        title="Win Rate"
        value={`${(metrics.winRate * 100).toFixed(1)}%`}
        icon={<Percent className="w-5 h-5 text-purple-400" />}
        color="text-purple-400"
      />
      <MetricCard
        title="Winning Spins"
        value={metrics.winningSpins}
        icon={<Trophy className="w-5 h-5 text-green-500" />}
        color="text-green-500"
      />
      <MetricCard
        title="Losing Spins"
        value={metrics.losingSpins}
        icon={<Ban className="w-5 h-5 text-red-500" />}
        color="text-red-500"
      />
    </div>
  );
};
