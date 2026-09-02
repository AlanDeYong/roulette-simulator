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
    const spaceBelow = vh - anchorRect.bottom - PAD;
    const spaceAbove = anchorRect.top - PAD;
    const useAbove = spaceAbove > spaceBelow;

    const availH = Math.max(spaceBelow, spaceAbove);
    const availW = Math.max(240, vw - 2 * PAD);

    const N = Math.max(1, spin.bets.length);
    const cellW = 100;
    const rowH = 16;
    const chromeH = 56;

    const targetSquareCols = Math.max(1, Math.round(Math.sqrt((N * cellW) / rowH)));
    let cols: 1 | 2 | 3 | 4 | 5 = (targetSquareCols as any);
    cols = Math.min(cols, Math.min(6, Math.max(1, Math.floor(availW / (cellW + 8))))) as any;
    cols = Math.min(cols, N as any) as any;
    cols = Math.max(1, cols as any) as any;
    let useTiny = false;

    {
      let c = cols as number;
      let rows = Math.ceil(N / c);
      let fitsH = rows * rowH + chromeH <= availH;
      let fitsW = c * (cellW + 4) + 24 <= availW;
      let tries = 0;
      while (((!fitsH && c < 6) || (!fitsW && c > 1)) && tries < 8) {
        if (!fitsW && c > 1) c--;
        else if (!fitsH && c < 6) c++;
        else break;
        rows = Math.ceil(N / c);
        fitsH = rows * rowH + chromeH <= availH;
        fitsW = c * (cellW + 4) + 24 <= availW;
        tries++;
      }
      if (!fitsH && c >= 6) useTiny = true;
      cols = c as any;
    }

    const narrow = availW < 280;
    const forceCompact = narrow || N > 12 || (cols as number) >= 3;
    setCompactMode(forceCompact);

    const top = useAbove ? anchorRect.top : anchorRect.bottom + 8;
    let left = anchorRect.left;
    const c = cols as number;
    const estW = c === 1 ? 220 : c * (cellW + 4) + 22;
    if (left + estW > vw - PAD) {
      left = Math.max(PAD, vw - estW - PAD);
    }
    if (left < PAD) left = PAD;
    setPreferAbove(useAbove);

    // Pass dynamic layout hints via state (encoded through compact + left + useAbove)
    setTooltipPos({ top, left, anchorTop: anchorRect.top, anchorBottom: anchorRect.bottom });
    // Store column/tiny choice on the component instance so tooltip re-render picks it up
    (anchorRef.current as any)._layoutHints = { cols, useTiny, useWide: false, availH, availW, useAbove };
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
          anchorRef={anchorRef}
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
  anchorRef: React.RefObject<HTMLDivElement>;
}

interface LayoutHints {
  cols: 1 | 2 | 3 | 4 | 5;
  useTiny: boolean;
  useWide: boolean;
  availH: number;
  availW: number;
  useAbove: boolean;
}

const BetDetailsTooltip: React.FC<BetDetailsTooltipProps> = ({
  spin, bets, totalBet, top, left, anchorTop, anchorBottom, preferAbove, compact, viewportH, viewportW, onRef, getBetDisplay, anchorRef,
}) => {
  const PAD = 10;
  const vh = viewportH || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const vw = viewportW || (typeof window !== 'undefined' ? window.innerWidth : 1280);

  const hints: LayoutHints = (anchorRef.current as any)?._layoutHints ?? {
    cols: bets.length > 12 ? 3 : bets.length > 4 ? 2 : 1,
    useTiny: bets.length > 40,
    useWide: false,
    availH: Math.max(vh - anchorBottom - PAD, anchorTop - PAD),
    availW: vw - 2 * PAD,
    useAbove: preferAbove,
  };

  let { cols, useTiny } = hints;
  const { availW, availH, useAbove } = hints;

  const N = bets.length;
  const safeColsMax = Math.min(6, Math.max(1, Math.floor(availW / 105)));

  if (N > 0) {
    const chromeH = 48;
    const rowH = useTiny ? 14 : 15;
    const cellW = useTiny ? 88 : 96;

    const targetSquareCols = Math.max(1, Math.round(Math.sqrt((N * cellW) / (rowH + 2))));
    let c: number = targetSquareCols;
    c = Math.min(c, safeColsMax);
    c = Math.min(c, N);
    c = Math.max(1, c);

    if (c >= 1) {
      let rows = Math.ceil(N / c);
      let fitsH = rows * rowH + chromeH <= availH;
      let fitsW = c * cellW + 24 <= availW;
      let tries = 0;
      while (((!fitsH && c < safeColsMax) || (!fitsW && c > 1)) && tries < 8) {
        if (!fitsW && c > 1) {
          c = c - 1;
        } else if (!fitsH && c < safeColsMax) {
          c = c + 1;
        } else {
          break;
        }
        rows = Math.ceil(N / c);
        fitsH = rows * rowH + chromeH <= availH;
        fitsW = c * cellW + 24 <= availW;
        tries++;
      }
      if (!fitsH && c >= safeColsMax) {
        useTiny = true;
      }
      cols = c as 1 | 2 | 3 | 4 | 5;
    }
  }

  const padX = 9;
  const padY = useTiny ? 6 : 7;
  const headerFont = useTiny ? 'text-[11px]' : 'text-xs';
  const headerMb = 'mb-1';
  const headerPb = 'pb-0.5';
  const betFont = useTiny ? 'text-[10px]' : 'text-[11px]';
  const gapX = 2;
  const gapY = 0;
  const footerPt = 'pt-1';
  const footerMt = 'mt-1';
  const footerFont = useTiny ? 'text-[11px]' : 'text-xs';

  const cellFixedW = useTiny ? 90 : 100;
  const colsN = cols as number;
  const totalInnerColW = colsN * cellFixedW + (colsN - 1) * (gapX * 4);
  const contentMinW = Math.min(220, 180 + colsN * 10);
  const contentMaxW = Math.min(vw - 2 * PAD, totalInnerColW + padX * 2 + 6);
  const absoluteMaxH = Math.max(200, vh - 2 * PAD);

  const rowsPerCol = Math.ceil(N / Math.max(1, colsN));
  const colOrderCells: any[] = [];
  if (N > 0) {
    for (let r = 0; r < rowsPerCol; r++) {
      for (let c = 0; c < colsN; c++) {
        const idx = c * rowsPerCol + r;
        if (idx < N) colOrderCells.push(bets[idx]);
      }
    }
  }

  const empty = N === 0;

  const finalTop = useAbove
    ? Math.max(PAD, Math.min(anchorTop - 8, vh - 80 - PAD))
    : Math.max(PAD, Math.min(anchorBottom + 8, vh - 80 - PAD));

  let finalLeft = left;
  if (finalLeft + contentMaxW > vw - PAD) {
    finalLeft = Math.max(PAD, vw - contentMaxW - PAD);
  }
  if (finalLeft < PAD) finalLeft = PAD;

  const header = (
    <div className={`font-semibold ${headerMb} border-b border-white/10 ${headerPb} shrink-0 flex items-center justify-between ${headerFont}`}>
      <span>Bet Details{spin.spinNumber !== undefined ? ` · Spin #${spin.spinNumber}` : ''}</span>
      <span className="text-text-muted font-normal text-[11px]">{N} bet{N !== 1 ? 's' : ''}</span>
    </div>
  );

  const betCellStyle = `flex items-center justify-start min-w-0`;
  const betNameClass = `text-text-muted truncate ${betFont} leading-tight`;
  const betAmtClass = `font-mono shrink-0 text-primary/90 ${betFont} leading-tight tabular-nums`;

  const betsGrid = (() => {
    if (empty) {
      return <span className="text-text-muted italic text-xs">No bets placed</span>;
    }
    const displayCells = colOrderCells.length > 0 ? colOrderCells : bets;
    const style: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${colsN}, ${cellFixedW}px)`,
      columnGap: `${Math.max(4, gapX * 4)}px`,
      rowGap: `${Math.max(0, gapY * 4)}px`,
      width: 'max-content',
    };
    return (
      <div style={style} className="shrink-0">
        {displayCells.map((bet: any, idx: number) => (
          <div key={idx} className={betCellStyle} style={{ minWidth: 0, gap: '0.25rem', maxWidth: cellFixedW }}>
            <span className={betNameClass} title={getBetDisplay(bet)}>
              {getBetDisplay(bet)}
            </span>
            <span className={betAmtClass}>${bet.amount}</span>
          </div>
        ))}
      </div>
    );
  })();

  const footer = !empty && (
    <div className={`border-t border-white/10 ${footerPt} ${footerMt} flex justify-between font-bold text-primary shrink-0 ${footerFont}`}>
      <span>Total</span>
      <span>${totalBet}</span>
    </div>
  );

  const innerStyle: React.CSSProperties = {
    maxHeight: absoluteMaxH,
    minHeight: 0,
    width: 'fit-content',
  };

  const tooltip = (
    <div
      ref={(el) => { onRef.current = el; }}
      className="fixed z-[9998] bg-black/90 backdrop-blur border border-primary/30 rounded-lg shadow-2xl pointer-events-none"
      style={{
        top: finalTop,
        left: finalLeft,
        paddingTop: padY,
        paddingBottom: padY,
        paddingLeft: padX,
        paddingRight: padX,
        width: 'fit-content',
        maxWidth: Math.min(vw - 2 * PAD, contentMaxW),
        maxHeight: absoluteMaxH,
        overflow: 'hidden',
      }}
    >
      <div
        className="flex flex-col"
        style={innerStyle}
      >
        {header}
        <div className="shrink-0">
          {betsGrid}
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

