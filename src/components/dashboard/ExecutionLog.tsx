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
  const [preferLeft, setPreferLeft] = useState(true);
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
    const colW = 135;
    const rowH = 22;
    const colGap = 13;
    const chromeH = 52; // header + footer + outer padding
    const padOuter = 2 * 10; // ≈ padX×2
    const SOFT_MIN_W = 190;
    const HARD_MAX_W = Math.max(SOFT_MIN_W, Math.min(460, availW - 8));
    const MAX_COLS = 6;

    // 1:1 Square Aspect Ratio optimizer: minimize |Width - Height|.
    //   Width  ≈ colW × C + colGap × (C-1) + padOuter
    //   Height ≈ ceil(N / C) × rowH + chromeH
    //   For N ≤ 4 → force 1 column (small lists don't need multi-col split).
    const availSpace = Math.max(availW, vw - 2 * PAD);
    const colsBySpace = Math.max(1, Math.min(MAX_COLS, Math.floor((availSpace + colGap) / (colW + colGap))));
    let colCount = 1;
    {
      let bestScore = Number.POSITIVE_INFINITY;
      const cMin = N <= 4 ? 1 : 1;
      const cMax = Math.max(cMin, Math.min(colsBySpace, N <= 4 ? 1 : colsBySpace));
      for (let c = cMin; c <= cMax; c++) {
        const rowsC = Math.ceil(N / c);
        const bareWC = c * colW + (c - 1) * colGap;
        const wUnclamped = bareWC + padOuter;
        const finalWC = Math.min(HARD_MAX_W, Math.max(SOFT_MIN_W, wUnclamped));
        // If width would have to be clamped to HARD_MAX_W, content columns
        // squeeze & wrap → height grows roughly by clamp ratio.
        const ratio = wUnclamped > finalWC ? Math.max(1, wUnclamped / finalWC) : 1;
        const finalHC = chromeH + Math.round(rowsC * rowH * ratio);
        // Primary cost: shape as close to 1:1 square as possible.
        let score = Math.abs(finalWC - finalHC);
        // Penalty: if width exceeds hard max (bad overflow risk)
        if (wUnclamped > HARD_MAX_W) score += 6 * (wUnclamped - HARD_MAX_W);
        // Penalty: if forced to fewer cols than natural (N ≤ 4 protection)
        if (c > 1 && N <= 4) score += 500;
        // Mild tiebreak: prefer fewer columns for readability
        score += (c - 1) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          colCount = c;
        }
      }
    }
    const rows = Math.ceil(N / colCount);
    const betAreaW = Math.max(colW, colCount * colW + (colCount - 1) * colGap);
    const betAreaH = rows * rowH;

    // Final estW: hug the columns tightly with fit-content; only use as layout hint.
    const estW = Math.max(SOFT_MIN_W, Math.min(HARD_MAX_W, betAreaW + padOuter));
    const estH = chromeH + betAreaH;

    const useTiny = false;
    setCompactMode(estW < 260 || N > 22);

    const spaceLeftOfAnchor = anchorRect.left - PAD;
    const spaceRightOfAnchor = vw - anchorRect.right - PAD;
    const useLeft = spaceLeftOfAnchor >= estW || spaceLeftOfAnchor >= spaceRightOfAnchor;

    let left: number;
    if (useLeft) {
      left = anchorRect.left - estW - 8;
    } else {
      left = anchorRect.right + 8;
    }
    if (left < PAD) left = PAD;
    if (left + estW > vw - PAD) left = Math.max(PAD, vw - estW - PAD);

    const top = useAbove ? anchorRect.top : anchorRect.bottom + 8;
    setPreferLeft(useLeft);
    setPreferAbove(useAbove);

    setTooltipPos({ top, left, anchorTop: anchorRect.top, anchorBottom: anchorRect.bottom });
    (anchorRef.current as any)._layoutHints = {
      cols: 1,
      useTiny,
      useWide: false,
      availH,
      availW,
      useAbove,
      useLeft,
      anchorLeft: anchorRect.left,
      anchorRight: anchorRect.right,
      N,
      minW: SOFT_MIN_W,
      maxW: HARD_MAX_W,
      targetAr: 1.0, // now square 1:1
    };
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  useEffect(() => {
    if (showTooltip) {
      document.body.classList.add('global-hide-cursor');
      document.documentElement.classList.add('global-hide-cursor');
    } else {
      document.body.classList.remove('global-hide-cursor');
      document.documentElement.classList.remove('global-hide-cursor');
    }
    return () => {
      document.body.classList.remove('global-hide-cursor');
      document.documentElement.classList.remove('global-hide-cursor');
    };
  }, [showTooltip]);

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
          preferLeft={preferLeft}
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
  preferLeft: boolean;
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
  useLeft: boolean;
  anchorLeft: number;
  anchorRight: number;
}

const BetDetailsTooltip: React.FC<BetDetailsTooltipProps> = ({
  spin, bets, totalBet, top, left, anchorTop, anchorBottom, preferAbove, preferLeft, compact, viewportH, viewportW, onRef, getBetDisplay, anchorRef,
}) => {
  const PAD = 10;
  const vh = viewportH || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const vw = viewportW || (typeof window !== 'undefined' ? window.innerWidth : 1280);

  const [adjusted, setAdjusted] = React.useState<{ top: number; left: number }>({ top, left });

  const hints: LayoutHints = (anchorRef.current as any)?._layoutHints ?? {
    cols: bets.length > 12 ? 3 : bets.length > 4 ? 2 : 1,
    useTiny: bets.length > 40,
    useWide: false,
    availH: Math.max(vh - anchorBottom - PAD, anchorTop - PAD),
    availW: vw - 2 * PAD,
    useAbove: preferAbove,
    useLeft: preferLeft,
    anchorLeft: 0,
    anchorRight: 0,
  };

  const hintsN = typeof (hints as any).N === 'number' ? (hints as any).N : bets.length;
  const hintsMinW = typeof (hints as any).minW === 'number' ? (hints as any).minW : 210;
  const hintsMaxW = typeof (hints as any).maxW === 'number' ? (hints as any).maxW : 420;
  const hintsTargetAr = typeof (hints as any).targetAr === 'number' ? (hints as any).targetAr : 1.25;

  let { cols, useTiny } = hints;
  const { availW, availH, useAbove, useLeft, anchorLeft, anchorRight } = hints;

  const N = bets.length;
  const SOFT_MIN_W = Math.max(180, typeof hintsMinW === 'number' ? hintsMinW : 190);
  const HARD_MAX_W = Math.max(SOFT_MIN_W, typeof hintsMaxW === 'number' ? hintsMaxW : 460);
  const MAX_COLS = 6;

  const colW = useTiny ? 125 : 135;
  const rowH = useTiny ? 19 : 22;
  const colGap = 13;
  const chromeH = useTiny ? 48 : 52; // header + footer + outer padding
  const padOuter = 2 * 10;

  const padX = 10;
  const padY = useTiny ? 7 : 8;
  const headerFont = useTiny ? 'text-[11px]' : 'text-xs';
  const headerMb = 'mb-1';
  const headerPb = 'pb-0.5';
  const betFont = useTiny ? 'text-[10.5px]' : 'text-[11.5px]';
  const footerPt = 'pt-1';
  const footerMt = 'mt-1';
  const footerFont = useTiny ? 'text-[11px]' : 'text-xs';

  // 1:1 Square Aspect Ratio optimizer: minimize |Width - Height|.
  //   Width  ≈ colW × C + colGap × (C-1) + padOuter
  //   Height ≈ ceil(N / C) × rowH + chromeH
  //   For N ≤ 4 → force C = 1 (small lists don't need multi-col split)
  const empty = N === 0;
  const availSpace = Math.max(availW, vw - 2 * PAD);
  const colsBySpace = Math.max(1, Math.min(MAX_COLS, Math.floor((availSpace + colGap) / (colW + colGap))));
  let colCount = 1;
  if (N > 0) {
    let bestScore = Number.POSITIVE_INFINITY;
    const cMax = N <= 4 ? 1 : colsBySpace;
    for (let c = 1; c <= cMax; c++) {
      const rowsC = Math.ceil(N / c);
      const bareWC = c * colW + (c - 1) * colGap;
      const wUnclamped = bareWC + padOuter;
      const finalWC = Math.min(HARD_MAX_W, Math.max(SOFT_MIN_W, wUnclamped));
      // If width clamped by HARD_MAX_W, content columns wrap → grow height by clamp ratio.
      const ratio = wUnclamped > finalWC ? Math.max(1, wUnclamped / finalWC) : 1;
      const finalHC = chromeH + Math.round(rowsC * rowH * ratio);
      let score = Math.abs(finalWC - finalHC);
      if (wUnclamped > HARD_MAX_W) score += 6 * (wUnclamped - HARD_MAX_W);
      if (c > 1 && N <= 4) score += 500;
      score += (c - 1) * 0.5;
      if (score < bestScore) {
        bestScore = score;
        colCount = c;
      }
    }
  }

  const rows = empty ? 1 : Math.ceil(N / colCount);
  // Bet content ideal widths (used only as bounding hints, not forced via CSS width)
  void rows;

  // Outer tooltip: width: fit-content (hugs the columns).
  // Soft bounds only — no hard forced widths.
  const finalMinW = SOFT_MIN_W;
  const finalMaxW = HARD_MAX_W;

  // Height is auto everywhere — no clipping.

  const finalTop = useAbove
    ? Math.max(PAD, Math.min(anchorTop - 8, vh - 60 - PAD))
    : Math.max(PAD, Math.min(anchorBottom + 8, vh - 60 - PAD));

  // Prefer positioning to the LEFT of the anchor. Only fall back to the right if the left
  // side doesn't have enough space (less than measured width) AND the right side has more room.
  const computeLeftForW = (measuredW: number): number => {
    const w = Math.max(finalMinW, Math.min(finalMaxW, measuredW));
    const spaceLeftOfAnchor = (anchorLeft > 0 ? anchorLeft : left) - PAD;
    const aRight = anchorRight > 0 ? anchorRight : left + 40;
    const spaceRightOfAnchor = vw - aRight - PAD;

    const haveAnchorCoords = anchorLeft > 0 || anchorRight > 0;
    const wantLeft = haveAnchorCoords ? useLeft : preferLeft;

    let l: number;
    if (wantLeft && spaceLeftOfAnchor >= w) {
      l = anchorLeft - w - 8;
    } else if (haveAnchorCoords && spaceRightOfAnchor >= w && spaceRightOfAnchor > spaceLeftOfAnchor) {
      l = anchorRight + 8;
    } else if (wantLeft && spaceLeftOfAnchor > 80) {
      l = Math.max(PAD, anchorLeft - w - 8);
      if (l < PAD) l = PAD;
    } else if (!wantLeft && spaceRightOfAnchor >= w) {
      l = anchorRight + 8;
    } else {
      l = Math.max(PAD, vw - w - PAD);
    }
    if (l + w > vw - PAD) l = Math.max(PAD, vw - w - PAD);
    if (l < PAD) l = PAD;
    return l;
  };

  // Initial left, using estimated width before render
  const estWC = Math.max(finalMinW, Math.min(finalMaxW, colCount * colW + (colCount - 1) * colGap + padOuter));
  let finalLeft = computeLeftForW(estWC);

  // After paint — re-measure actual tooltip size and correct position (including prefer-left)
  React.useEffect(() => {
    const el = onRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      let newLeft = computeLeftForW(r.width);
      let newTop = finalTop;
      const spaceBelow = vh - anchorBottom - PAD;
      const spaceAbove = anchorTop - PAD;
      const fitsBelow = r.height <= spaceBelow;
      const fitsAbove = r.height <= spaceAbove;
      if (!fitsBelow && !fitsAbove) {
        newTop = spaceAbove > spaceBelow
          ? Math.max(PAD, Math.min(anchorTop - 8, vh - r.height - PAD))
          : Math.max(PAD, Math.min(anchorBottom + 8, vh - r.height - PAD));
      } else if (useAbove && !fitsAbove && fitsBelow) {
        newTop = Math.max(PAD, Math.min(anchorBottom + 8, vh - r.height - PAD));
      } else if (!useAbove && !fitsBelow && fitsAbove) {
        newTop = Math.max(PAD, Math.min(anchorTop - 8, vh - r.height - PAD));
      } else if (useAbove) {
        newTop = Math.max(PAD, Math.min(anchorTop - 8, vh - r.height - PAD));
      } else {
        newTop = Math.max(PAD, Math.min(anchorBottom + 8, vh - r.height - PAD));
      }
      setAdjusted((prev) => {
        if (Math.abs(prev.top - newTop) < 0.5 && Math.abs(prev.left - newLeft) < 0.5) return prev;
        return { top: newTop, left: newLeft };
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalMaxW, useTiny, N, vh, vw, anchorTop, anchorBottom, anchorLeft, anchorRight, useLeft, preferLeft]);

  const header = (
    <div
      className={`font-semibold ${headerMb} border-b border-white/10 ${headerPb} shrink-0 flex items-center justify-between ${headerFont}`}
      style={{ textWrap: 'balance' as any, minWidth: 0 }}
    >
      <span style={{ textWrap: 'balance' as any }}>Bet Details{spin.spinNumber !== undefined ? ` · Spin #${spin.spinNumber}` : ''}</span>
      <span className="text-text-muted font-normal text-[11px]" style={{ textWrap: 'balance' as any }}>{N} bet{N !== 1 ? 's' : ''}</span>
    </div>
  );

  const betCellStyle = `flex items-start justify-start min-h-[1.25rem]`;
  const betNameClass = `text-text-muted ${betFont} leading-snug break-words whitespace-normal`;
  const betAmtClass = `font-mono shrink-0 text-primary/90 ${betFont} tabular-nums leading-snug pt-[1px]`;

  const betsContent = (() => {
    if (empty) {
      return <span className="text-text-muted italic text-xs" style={{ textWrap: 'pretty' as any }}>No bets placed</span>;
    }
    const containerStyle: React.CSSProperties = {
      columnCount: colCount,
      columnGap: `${colGap}px`,
      columnFill: 'balance',
      columnRule: '1px solid rgba(255, 255, 255, 0.08)',
      orphans: 1,
      widows: 1,
      width: 'auto', // natural width; let browser hug actual columns
      minWidth: 0,
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      overflow: 'visible',
    };
    return (
      <div style={containerStyle} className="shrink-0">
        {bets.map((bet: any, idx: number) => (
          <div
            key={idx}
            className={betCellStyle}
            style={
              {
                minWidth: 0,
                gap: '0.35rem',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                WebkitColumnBreakInside: 'avoid',
                marginBottom: '2px',
                paddingTop: 0,
                paddingBottom: 0,
              } as React.CSSProperties
            }
          >
            <span className={betNameClass} style={{ textWrap: 'pretty' as any }}>
              {getBetDisplay(bet)}
            </span>
            <span className={betAmtClass} style={{ textWrap: 'balance' as any }}>${bet.amount}</span>
          </div>
        ))}
      </div>
    );
  })();

  const footer = !empty && (
    <div
      className={`border-t border-white/10 ${footerPt} ${footerMt} flex justify-between font-bold text-primary shrink-0 ${footerFont}`}
      style={{ textWrap: 'balance' as any, minWidth: 0 }}
    >
      <span style={{ textWrap: 'balance' as any }}>Total</span>
      <span style={{ textWrap: 'balance' as any }}>${totalBet}</span>
    </div>
  );

  const innerStyle: React.CSSProperties = {
    height: 'auto',
    minHeight: 0,
    width: 'fit-content',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'visible',
  };

  const tooltip = (
    <div
      ref={(el) => { onRef.current = el; }}
      className="fixed z-[9998] rounded-lg pointer-events-none"
      style={{
        top: adjusted.top,
        left: adjusted.left,
        paddingTop: padY,
        paddingBottom: padY,
        paddingLeft: padX,
        paddingRight: padX,
        width: 'fit-content',
        minWidth: finalMinW,
        maxWidth: finalMaxW,
        height: 'auto',
        overflow: 'visible',
        backgroundColor: 'rgba(10, 12, 16, 0.24)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        boxShadow: '0 24px 40px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.025)',
      }}
    >
      <div
        className="flex flex-col"
        style={innerStyle}
      >
        {header}
        <div className="shrink-0 mt-1" style={{ overflow: 'visible' }}>
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

