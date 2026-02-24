/**
 * Source: Bet With Mo (YouTube) - https://www.youtube.com/watch?v=1bGOvabrz50 (Modified)
 * The Logic: Observes the last winning number. Bets 10 numbers in that dozen. It excludes 
 * the hit number and the colder of the two adjacent numbers (based on the last 37 spins).
 * The Progression: 
 * - On Win (under goal): Resets to covering only the most recently hit dozen at base unit.
 * - On Loss: Adds the newly hit dozen to the active coverage map (up to 3 dozens).
 * - Multiplier: Once all 3 dozens are covered, bets double. On further losses, they double again.
 * - On Zero: Freezes progression and rebets the exact same layout.
 * The Goal: $20 incremental profit milestones above the highest recorded bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Goal Tracking
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.coveredDozens = []; // Tracks { dozen, excl1, excl2 }
        state.multiplier = 1;
        state.lastBets = [];
    }

    if (spinHistory.length === 0) return [];

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // 2. Zero Handling (Strict Rebet)
    if (lastNum === 0 || lastNum === '00') {
        return state.lastBets || [];
    }

    // 3. Profit Goal Check ($20 Increment)
    if (bankroll >= state.peakBankroll + 20) {
        state.peakBankroll = bankroll;
        state.coveredDozens = [];
        state.multiplier = 1;
    }

    // 4. Evaluate Previous Spin (Win/Loss)
    let won = false;
    if (state.lastBets && state.lastBets.length > 0) {
        won = state.lastBets.some(b => b.value === lastNum);
        
        if (won) {
            // Reset to a single dozen unless we are in the 3-dozen double-up phase
            if (state.coveredDozens.length < 3) {
                state.coveredDozens = [];
                state.multiplier = 1;
            }
        } else {
            // On loss, if we already cover the whole board (3 dozens), double up
            if (state.coveredDozens.length === 3) {
                state.multiplier *= 2;
            }
        }
    }

    // 5. Accumulate Dozens & Hot/Cold Logic
    const targetDozen = Math.ceil(lastNum / 12);
    const alreadyCovered = state.coveredDozens.some(d => d.dozen === targetDozen);

    if (!alreadyCovered && state.coveredDozens.length < 3) {
        let excl1 = lastNum;
        let excl2;

        const prevNum = lastNum - 1;
        const nextNum = lastNum + 1;
        const validPrev = (prevNum >= 1 && Math.ceil(prevNum / 12) === targetDozen);
        const validNext = (nextNum <= 36 && Math.ceil(nextNum / 12) === targetDozen);

        // Hot/Cold Analysis (Last 37 spins)
        if (validPrev && validNext) {
            const recentSpins = spinHistory.slice(-37);
            const countPrev = recentSpins.filter(s => s.winningNumber === prevNum).length;
            const countNext = recentSpins.filter(s => s.winningNumber === nextNum).length;

            // Bet the hotter number -> meaning we EXCLUDE the colder number
            if (countPrev > countNext) {
                excl2 = nextNum; // Prev is hotter, so exclude Next
            } else if (countNext > countPrev) {
                excl2 = prevNum; // Next is hotter, so exclude Prev
            } else {
                excl2 = nextNum; // Tie breaker
            }
        } else if (validPrev) {
            excl2 = prevNum; // Edge case (e.g., hit 12)
        } else if (validNext) {
            excl2 = nextNum; // Edge case (e.g., hit 1)
        }

        state.coveredDozens.push({ dozen: targetDozen, excl1, excl2 });

        // Trigger initial double-up immediately upon adding the 3rd dozen
        if (state.coveredDozens.length === 3 && !won) {
            state.multiplier = (state.multiplier === 1) ? 2 : state.multiplier * 2;
        }
    }

    // 6. Calculate Clamped Bet Amount
    let betAmount = config.betLimits.min * state.multiplier;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);
    
    // Sync state to actual clamped amount to prevent invisible progression
    state.multiplier = betAmount / config.betLimits.min; 

    // 7. Construct Bet Array
    const bets = [];
    for (const d of state.coveredDozens) {
        const startNum = (d.dozen - 1) * 12 + 1;
        const endNum = d.dozen * 12;

        for (let i = startNum; i <= endNum; i++) {
            if (i !== d.excl1 && i !== d.excl2) {
                bets.push({
                    type: 'number',
                    value: i,
                    amount: betAmount
                });
            }
        }
    }

    state.lastBets = bets;
    return bets;
}