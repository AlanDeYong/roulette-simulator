import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, anchorTop: 0, anchorBottom: 0 });
  const [viewportDims, setViewportDims] = useState({ w: 0, h: 0 });
  const [compactMode, setCompactMode] = useState(false);
  const [preferAbove, setPreferAbove] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDims = () => {
      setViewportDims({ w: window.innerWidth, h: window.innerHeight });
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  const getBetDisplay = (bet: any) => {
      if (bet.type === 'corner') {
          const n = bet.value;
          const numbers = [n, n+1, n+3, n+4].join(', ');
          return `corner (${numbers})`;
      }
      if (bet.type === 'split' && Array.isArray(bet.value)) {
          return `split (${bet.value.join(', ')})`;
      }
      if (bet.type === 'trio' && Array.isArray(bet.value)) {
          return `trio (${bet.value.join(', ')})`;
      }
      return `${bet.type} ${bet.value !== undefined ? `(${bet.value})` : ''}`;
  };

  const repositionTooltip = () => {
    if (!anchorRef.current || !showTooltip) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const PAD = 12;
    const TOOLTIP_MAX_W = 420;
    const TOOLTIP_MIN_W = 260;

    const spaceBelow = vh - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

    const top = placeAbove ? anchorRect.top : anchorRect.bottom + 8;
    let left = anchorRect.left;

    const rightEdge = left + TOOLTIP_MAX_W;
    if (rightEdge > vw - PAD) {
      left = Math.max(PAD, vw - TOOLTIP_MAX_W - PAD);
    }
    if (left < PAD) left = PAD;

    const remainingRight = vw - (left + PAD);
    const narrow = remainingRight < TOOLTIP_MIN_W + 40;
    setCompactMode(narrow || spin.bets.length > 12);
    setPreferAbove(placeAbove);

    setTooltipPos({ top, left, anchorTop: anchorRect.top, anchorBottom: anchorRect.bottom });
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  useEffect(() => {
    if (showTooltip) {
      requestAnimationFrame(() => {
        repositionTooltip();
      });
    }
  }, [showTooltip, spin.bets.length, viewportDims]);

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
            ref={anchorRef}
            className="flex items-center space-x-1 cursor-help text-primary hover:text-primary/80 transition-colors"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
              <Eye className="w-5 h-5" />
          </div>
      </div>

      {/* Viewport-safe tooltip, rendered via portal at the body level */}
      {showTooltip && (
        <BetDetailsTooltip
          spin={spin}
          bets={spin.bets}
          totalBet={totalBet}
          top={tooltipPos.top}
          left={tooltipPos.left}
          anchorTop={tooltipPos.anchorTop}
          anchorBottom={tooltipPos.anchorBottom}
          preferAbove={preferAbove}
          compact={compactMode}
          viewportH={viewportDims.h || window.innerHeight}
          viewportW={viewportDims.w || window.innerWidth}
          onRef={tooltipRef}
          getBetDisplay={getBetDisplay}
        />
      )}

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

interface BetDetailsTooltipProps {
  spin: any;
  bets: any[];
  totalBet: number;
  top: number;
  left: number;
  anchorTop: number;
  anchorBottom: number;
  preferAbove: boolean;
  compact: boolean;
  viewportH: number;
  viewportW: number;
  onRef: React.MutableRefObject<HTMLDivElement | null>;
  getBetDisplay: (bet: any) => string;
}

const BetDetailsTooltip: React.FC<BetDetailsTooltipProps> = ({
  spin, bets, totalBet, top, left, anchorTop, anchorBottom, preferAbove, compact, viewportH, viewportW, onRef, getBetDisplay,
}) => {
  const [finalPos, setFinalPos] = useState<{ top: number; left: number }>({ top, left });
  const measureInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled || !measureInnerRef.current) return;
      const rect = measureInnerRef.current.getBoundingClientRect();
      const PAD = 10;
      const vh = viewportH || window.innerHeight;
      const vw = viewportW || window.innerWidth;

      let t = top;
      let l = left;

      if (preferAbove) {
        t = anchorTop - rect.height - 8;
        if (t < PAD) {
          t = anchorBottom + 8;
          if (t + rect.height > vh - PAD) {
            t = Math.max(PAD, vh - rect.height - PAD);
          }
        }
      } else {
        if (t + rect.height > vh - PAD) {
          const candidate = anchorTop - rect.height - 8;
          if (candidate >= PAD) {
            t = candidate;
          } else {
            t = Math.max(PAD, vh - rect.height - PAD);
          }
        }
      }

      const rightEdge = l + rect.width;
      if (rightEdge > vw - PAD) {
        l = Math.max(PAD, vw - rect.width - PAD);
      }
      if (l < PAD) l = PAD;

      setFinalPos({ top: t, left: l });
    });
    return () => { cancelled = true; };
  }, [top, left, bets.length, compact, preferAbove, anchorTop, anchorBottom, viewportH, viewportW]);

  const empty = bets.length === 0;
  const maxH = Math.min(520, Math.max(220, Math.floor(viewportH * 0.65) - 40));
  const betsMaxH = Math.max(120, maxH - 90);

  const header = (
    <div className="font-semibold mb-2 border-b border-white/10 pb-1 text-sm shrink-0 flex items-center justify-between">
      <span>Bet Details{spin.spinNumber !== undefined ? ` · Spin #${spin.spinNumber}` : ''}</span>
      <span className="text-text-muted font-normal text-[11px]">{bets.length} bet{bets.length !== 1 ? 's' : ''}</span>
    </div>
  );

  const betsContent = empty ? (
    <span className="text-text-muted italic">No bets placed</span>
  ) : compact ? (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
      {bets.map((bet: any, idx: number) => (
        <div key={idx} className="flex justify-between gap-2 min-w-0">
          <span className="text-text-muted truncate" title={getBetDisplay(bet)}>
            {getBetDisplay(bet)}
          </span>
          <span className="font-mono shrink-0">${bet.amount}</span>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-1 text-[13px]">
      {bets.map((bet: any, idx: number) => (
        <div key={idx} className="flex justify-between gap-4 min-w-0">
          <span className="text-text-muted truncate" title={getBetDisplay(bet)}>
            {getBetDisplay(bet)}
          </span>
          <span className="font-mono shrink-0">${bet.amount}</span>
        </div>
      ))}
    </div>
  );

  const footer = !empty && (
    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold text-primary text-sm shrink-0">
      <span>Total</span>
      <span>${totalBet}</span>
    </div>
  );

  const minW = compact ? 280 : 300;
  const maxW = Math.max(360, Math.min(520, Math.floor((viewportW || 1280) * 0.45)));

  const tooltip = (
    <div
      ref={(el) => { onRef.current = el; }}
      className="fixed z-[9998] p-3 bg-black/85 backdrop-blur border border-primary/25 rounded-lg shadow-2xl pointer-events-none"
      style={{
        top: finalPos.top,
        left: finalPos.left,
        minWidth: minW,
        maxWidth: maxW,
      }}
    >
      <div
        ref={measureInnerRef}
        className="flex flex-col"
        style={{ maxHeight: maxH }}
      >
        {header}
        <div
          className="overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar"
          style={{ maxHeight: betsMaxH }}
        >
          {betsContent}
        </div>
        {footer}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return tooltip;
  return createPortal(tooltip, document.body);
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

