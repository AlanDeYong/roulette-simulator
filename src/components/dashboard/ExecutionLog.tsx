import React, { useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Eye, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

interface LogItemProps {
  spin: any;
}

const LogItem: React.FC<LogItemProps> = ({ spin }) => {
  const isWin = spin.totalProfit > 0;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getBetDisplay = (bet: any) => {
      if (bet.type === 'corner') {
          const n = bet.value;
          // Calculate numbers: n, n+1, n+3, n+4
          const numbers = [n, n+1, n+3, n+4].join(', ');
          return `corner (${numbers})`;
      }
      if (bet.type === 'split' && Array.isArray(bet.value)) {
          return `split (${bet.value.join(', ')})`;
      }
      return `${bet.type} ${bet.value !== undefined ? `(${bet.value})` : ''}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const totalBet = spin.bets.reduce((sum: number, b: any) => sum + b.amount, 0);

  // Tooltip content for Win/Loss/Push
  const resultTooltip = (() => {
      const winAmount = isWin ? spin.totalProfit + totalBet : (spin.totalProfit === 0 ? totalBet : 0); 
      // Note: totalProfit is Net. 
      // If win: profit = payout - totalBet. Payout = profit + totalBet.
      // If loss: profit = -totalBet. Payout = 0.
      // If push: profit = 0. Payout = totalBet.
      
      return (
          <div className="text-xs space-y-1">
              <div><span className="text-text-muted">Total Bet:</span> ${totalBet}</div>
              <div><span className="text-text-muted">Payout:</span> ${spin.bets.reduce((sum: number, b: any) => sum + b.payout, 0)}</div>
              <div className={`font-bold ${isWin ? 'text-green-400' : spin.totalProfit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  Net: {spin.totalProfit > 0 ? '+' : ''}{spin.totalProfit}
              </div>
          </div>
      );
  })();

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-white/5 text-sm hover:bg-white/5 px-2 transition-colors relative group">
      {/* Spin # */}
      <div className="col-span-1 text-text-muted font-mono">#{spin.spinNumber}</div>
      
      {/* Bets (View) */}
      <div className="col-span-1 relative">
          <div 
            className="flex items-center space-x-1 cursor-help text-primary hover:text-primary/80 transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onMouseMove={handleMouseMove}
          >
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">View</span>
          </div>

          {/* Tooltip Portal-like behavior (Fixed position) */}
          {showTooltip && (
              <div 
                className="fixed z-50 p-3 bg-black/70 backdrop-blur-sm border border-primary/20 rounded shadow-xl text-xs min-w-[200px]"
                style={{ 
                    top: tooltipPos.y - 10, 
                    left: tooltipPos.x - 10,
                    transform: 'translate(-100%, -100%)',
                    pointerEvents: 'none'
                }}
              >
                  <div className="font-semibold mb-2 border-b border-white/10 pb-1">Bet Details</div>
                  {spin.bets.length === 0 ? (
                      <span className="text-text-muted italic">No bets placed</span>
                  ) : (
                      <div className="space-y-1">
                          {spin.bets.map((bet: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-4">
                                  <span className="text-text-muted">
                                      {getBetDisplay(bet)}
                                  </span>
                                  <span className="font-mono">${bet.amount}</span>
                              </div>
                          ))}
                          <div className="border-t border-white/10 pt-1 mt-1 flex justify-between font-bold text-primary">
                              <span>Total</span>
                              <span>${totalBet}</span>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* Total Bet */}
      <div className="col-span-2 text-right font-mono text-text-muted">
          ${totalBet}
      </div>

      {/* Winning Number */}
      <div className="col-span-2 flex justify-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm
          ${spin.winningColor === 'red' ? 'bg-red-600 text-white' : 
            spin.winningColor === 'black' ? 'bg-black text-white border border-gray-700' : 
            'bg-green-600 text-white'}`}>
          {spin.winningNumber === 37 ? '00' : spin.winningNumber}
        </div>
      </div>

      {/* Win/Loss Badge with Tooltip */}
      <div className="col-span-2 text-center">
          <Tooltip content={resultTooltip}>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase cursor-help
                ${isWin ? 'bg-green-900/50 text-green-400 border border-green-800' : 
                spin.totalProfit < 0 ? 'bg-red-900/50 text-red-400 border border-red-800' : 
                'bg-gray-800 text-gray-400'}`}>
                {isWin ? 'Win' : spin.totalProfit < 0 ? 'Loss' : 'Push'}
            </span>
          </Tooltip>
      </div>

      {/* Net Profit */}
      <div className="col-span-2 text-right font-mono font-medium">
        <span className={`${isWin ? 'text-green-500' : spin.totalProfit < 0 ? 'text-red-500' : 'text-text-muted'}`}>
            {spin.totalProfit > 0 ? '+' : ''}{spin.totalProfit}
        </span>
      </div>

      {/* Bankroll */}
      <div className="col-span-2 text-right font-mono text-text-muted">
          ${spin.bankrollAfter}
      </div>
    </div>
  );
};

export const ExecutionLog: React.FC = () => {
  const { results } = useSimulationStore();
  const spins = [...results.spins]; // Show oldest first (ascending order)

  const handleExport = () => {
      if (spins.length === 0) return;

      const header = "Spin #,Winning Number,Winning Color,Total Bet,Profit,Bankroll,Bets\n";
      const rows = spins.map(s => {
          const betsStr = s.bets.map((b: any) => `${b.type}${b.value !== undefined ? `:${b.value}` : ''}($${b.amount})`).join(' | ');
          const totalBet = s.bets.reduce((sum: number, b: any) => sum + b.amount, 0);
          return `${s.spinNumber},${s.winningNumber},${s.winningColor},${totalBet},${s.totalProfit},${s.bankrollAfter},"${betsStr}"`;
      }).join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation_export_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-[400px] flex flex-col border-t-4 border-t-primary">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle>Execution Log</CardTitle>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={spins.length === 0}
            className="h-7 text-xs"
        >
            <Download className="w-3 h-3 mr-2" />
            Export CSV
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 pb-2 border-b border-white/10 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
            <div className="col-span-1">Spin #</div>
            <div className="col-span-1">View</div>
            <div className="col-span-2 text-right">Total Bet</div>
            <div className="col-span-2 text-center">Result</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Profit</div>
            <div className="col-span-2 text-right">Bankroll</div>
        </div>
        
        <div className="space-y-0">
          {spins.length === 0 ? (
            <div className="text-center text-text-muted py-8 flex flex-col items-center">
                <span className="opacity-50">No spins yet</span>
            </div>
          ) : (
            spins.map(spin => <LogItem key={spin.id} spin={spin} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
};
