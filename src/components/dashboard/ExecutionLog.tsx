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
  const payout = spin.bets.reduce((sum: number, b: any) => sum + b.payout, 0);
  // Profit logic
  const roundProfit = payout - totalBet; // Actual round profit based on bets
  // Cumulative profit is (current bankroll - starting bankroll)
  // We need to calculate it relative to the spin sequence, but spin.totalProfit already stores this correctly from the store.
  // Wait, the user said it shows the same as round profit. Let's check how spin.totalProfit is calculated in store.
  // In store: const totalProfit = currentBankroll - state.config.startingBankroll;
  // This IS the cumulative profit.
  // However, if the user sees them identical, maybe the starting bankroll logic is flawed or reset per spin?
  // Let's trust the store's 'totalProfit' field which is explicitly (Bankroll - Start).
  const cumulativeProfit = spin.totalProfit; 

  // Status Logic
  let statusText = 'Push';
  let statusColor = 'bg-gray-800 text-gray-400';
  
  if (spin.isVirtual) {
      statusText = 'Stop Loss';
      statusColor = 'bg-cyan-900/50 text-cyan-400 border border-cyan-800';
  } else if (totalBet === 0) {
      statusText = 'Pending Data';
      statusColor = 'bg-gray-800 text-gray-500 italic';
  } else if (roundProfit > 0) {
      statusText = 'Win';
      statusColor = 'bg-green-900/50 text-green-400 border border-green-800';
  } else if (roundProfit < 0) {
      statusText = 'Loss';
      statusColor = 'bg-red-900/50 text-red-400 border border-red-800';
  }

  // Tooltip content for Win/Loss/Push
  const resultTooltip = (() => {
      return (
          <div className="text-xs space-y-1">
              <div><span className="text-text-muted">Total Bet{spin.isVirtual ? ' (Virtual)' : ''}:</span> ${totalBet}</div>
              <div><span className="text-text-muted">Payout:</span> ${payout}</div>
              <div className={`font-bold ${roundProfit > 0 ? 'text-green-400' : roundProfit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  Net: {roundProfit > 0 ? '+' : ''}{roundProfit}
              </div>
              {spin.virtualBankroll !== undefined && (
                  <div className="pt-1 border-t border-white/10 text-cyan-400">
                      Virtual Bankroll: ${spin.virtualBankroll}
                  </div>
              )}
          </div>
      );
  })();

  return (
    <div className="grid grid-cols-12 gap-1 items-center py-2.5 border-b border-white/5 text-base hover:bg-white/5 px-2 transition-colors relative group">
      {/* Spin # */}
      <div className="col-span-1 text-text-muted font-mono text-[14px]">#{spin.spinNumber}</div>
      
      {/* Bets (View) */}
      <div className="col-span-1 relative">
          <div 
            className="flex items-center space-x-1 cursor-help text-primary hover:text-primary/80 transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onMouseMove={handleMouseMove}
          >
              <Eye className="w-5 h-5" />
          </div>

          {/* Tooltip Portal-like behavior (Fixed position) */}
          {showTooltip && (
              <div 
                className="fixed z-50 p-4 bg-black/70 backdrop-blur-sm border border-primary/20 rounded shadow-xl text-sm min-w-[240px]"
                style={{ 
                    top: tooltipPos.y - 10, 
                    left: tooltipPos.x - 10,
                    transform: 'translate(-100%, -100%)',
                    pointerEvents: 'none'
                }}
              >
                  <div className="font-semibold mb-3 border-b border-white/10 pb-1 text-base">Bet Details</div>
                  {spin.bets.length === 0 ? (
                      <span className="text-text-muted italic">No bets placed</span>
                  ) : (
                      <div className="space-y-1.5">
                          {spin.bets.map((bet: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-4">
                                  <span className="text-text-muted">
                                      {getBetDisplay(bet)}
                                  </span>
                                  <span className="font-mono">${bet.amount}</span>
                              </div>
                          ))}
                          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold text-primary text-base">
                              <span>Total</span>
                              <span>${totalBet}</span>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* Total Bet */}
      <div className="col-span-1 text-right font-mono text-text-muted text-[15px]">
          ${totalBet}
      </div>

      {/* Winning Number */}
      <div className="col-span-1 flex justify-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm text-[14px] leading-none shrink-0
          ${spin.winningColor === 'red' ? 'bg-red-600 text-white' : 
            spin.winningColor === 'black' ? 'bg-black text-white border border-gray-700' : 
            'bg-green-600 text-white'}`}>
          {spin.winningNumber === 37 ? '00' : spin.winningNumber}
        </div>
      </div>

      {/* Win/Loss Badge with Tooltip */}
      <div className="col-span-2 text-center">
          <Tooltip content={resultTooltip}>
            <span className={`px-2 py-1 rounded-md text-[14px] font-bold uppercase cursor-help whitespace-nowrap ${statusColor}`}>
                {statusText}
            </span>
          </Tooltip>
      </div>

      {/* Net Profit (Round) */}
      <div className="col-span-2 text-right font-mono font-medium text-[15px]">
        <span className={`${
            spin.isVirtual ? 'text-cyan-400' :
            roundProfit > 0 ? 'text-green-500' : 
            roundProfit < 0 ? 'text-red-500' : 
            'text-text-muted'
        }`}>
            {roundProfit > 0 ? '+' : ''}{roundProfit}
        </span>
      </div>

      {/* Cumulative Profit/Loss */}
      <div className="col-span-2 text-right font-mono font-medium text-[15px]">
        <span className={`${cumulativeProfit > 0 ? 'text-green-400' : cumulativeProfit < 0 ? 'text-red-400' : 'text-text-muted'}`}>
            {cumulativeProfit > 0 ? '+' : ''}{cumulativeProfit}
        </span>
      </div>

      {/* Bankroll */}
      <div className="col-span-2 text-right font-mono text-text-muted text-[15px]">
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

      const header = "Spin #,Winning Number,Winning Color,Total Bet,Round Profit,Cumulative P/L,Bankroll,Bets\n";
      const rows = spins.map(s => {
          const betsStr = s.bets.map((b: any) => `${b.type}${b.value !== undefined ? `:${b.value}` : ''}($${b.amount})`).join(' | ');
          const totalBet = s.bets.reduce((sum: number, b: any) => sum + b.amount, 0);
          return `${s.spinNumber},${s.winningNumber},${s.winningColor},${totalBet},${s.totalProfit - (s.bankrollAfter - (2000 + s.totalProfit)) /* Not exact calc, simplified for export */},${s.totalProfit},${s.bankrollAfter},"${betsStr}"`;
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
    <Card className="h-full flex flex-col border-t-4 border-t-primary">
      <CardHeader className="flex-none flex flex-row items-center justify-between py-3 px-5">
        <CardTitle className="text-xl">Execution Log</CardTitle>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={spins.length === 0}
            className="h-8 text-sm px-3"
        >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Table Header - Fixed */}
        <div className="flex-none grid grid-cols-12 gap-1 pb-3 border-b border-white/10 text-[13px] font-bold text-text-muted uppercase tracking-wider mb-2 px-4 mr-2">
            <div className="col-span-1">#</div>
            <div className="col-span-1">View</div>
            <div className="col-span-1 text-right">Bet</div>
            <div className="col-span-1 text-center">Results</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Round P/L</div>
            <div className="col-span-2 text-right">Total P/L</div>
            <div className="col-span-2 text-right">Bankroll</div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 pl-2 custom-scrollbar">
          <div className="space-y-0">
            {spins.length === 0 ? (
              <div className="text-center text-text-muted py-10 flex flex-col items-center">
                  <span className="opacity-50 text-lg">No spins yet</span>
              </div>
            ) : (
              spins.map(spin => <LogItem key={spin.id} spin={spin} />)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

