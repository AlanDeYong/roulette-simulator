import React, { useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Eye } from 'lucide-react';

interface LogItemProps {
  spin: any;
}

const LogItem: React.FC<LogItemProps> = ({ spin }) => {
  const isWin = spin.totalProfit > 0;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const totalBet = spin.bets.reduce((sum: number, b: any) => sum + b.amount, 0);

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-white/5 text-sm hover:bg-white/5 px-2 transition-colors relative group">
      {/* Spin # */}
      <div className="col-span-1 text-text-muted font-mono">#{spin.spinNumber}</div>
      
      {/* Bets (View) */}
      <div className="col-span-2 relative">
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
                                      {bet.type} {bet.value !== undefined ? `(${bet.value})` : ''}
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

      {/* Winning Number */}
      <div className="col-span-2 flex justify-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm
          ${spin.winningColor === 'red' ? 'bg-red-600 text-white' : 
            spin.winningColor === 'black' ? 'bg-black text-white border border-gray-700' : 
            'bg-green-600 text-white'}`}>
          {spin.winningNumber === 37 ? '00' : spin.winningNumber}
        </div>
      </div>

      {/* Win/Loss Badge */}
      <div className="col-span-2 text-center">
          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
            ${isWin ? 'bg-green-900/50 text-green-400 border border-green-800' : 
              spin.totalProfit < 0 ? 'bg-red-900/50 text-red-400 border border-red-800' : 
              'bg-gray-800 text-gray-400'}`}>
              {isWin ? 'Win' : spin.totalProfit < 0 ? 'Loss' : 'Push'}
          </span>
      </div>

      {/* Net Profit */}
      <div className="col-span-2 text-right font-mono font-medium">
        <span className={`${isWin ? 'text-green-500' : spin.totalProfit < 0 ? 'text-red-500' : 'text-text-muted'}`}>
            {spin.totalProfit > 0 ? '+' : ''}{spin.totalProfit}
        </span>
      </div>

      {/* Bankroll */}
      <div className="col-span-3 text-right font-mono text-text-muted">
          ${spin.bankrollAfter}
      </div>
    </div>
  );
};

export const ExecutionLog: React.FC = () => {
  const { results } = useSimulationStore();
  const spins = [...results.spins].reverse(); // Show newest first

  return (
    <Card className="h-[400px] flex flex-col border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Execution Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 pb-2 border-b border-white/10 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
            <div className="col-span-1">Spin #</div>
            <div className="col-span-2">Bets</div>
            <div className="col-span-2 text-center">Result</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Profit</div>
            <div className="col-span-3 text-right">Bankroll</div>
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
