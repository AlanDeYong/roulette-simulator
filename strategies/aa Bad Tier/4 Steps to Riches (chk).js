/**
 * Four Steps to Riches Roulette Strategy
 * * Source: "4 STEPS TO ROULETTE RICHES!" by The Roulette Master (YouTube)
 * * The Logic: 
 * The strategy is broken into phases, using profits from one phase to fund the next.
 * - Phase 1: Bet 5 double streets (lines). If it wins, you net 1 unit of profit.
 * - Phase 2 (Dozens): Take the profit and sequentially bet on dozens based on streaks.
 * - 1st hit: Bet 1 unit on the dozen that just hit.
 * - 2nd consecutive hit: Bet 3 units on that same dozen.
 * - 3rd consecutive hit: You now bet AGAINST the streak. Bet 10 units each on the OTHER two dozens.
 * * The Progression:
 * - Phase 1 Loss: Triple the base bet (1x, 3x, 9x). You must win TWO times at the current recovery level to clear the deficit and net the 1 unit profit to advance.
 * - Dozens Loss: If the dozen streak breaks early, simply return to Phase 1.
 * - Dozens Recovery: If you lose the final anti-streak bet (the dozen hits a 4th time, or hits 0), bet 25 units each on the other two dozens to recover, then return to Phase 1.
 * * The Goal:
 * Complete the sequence of winning 5 double streets, hitting the same dozen twice, and then hitting a different dozen. This completes the "Four Steps" and secures a massive payout, at which point the system resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Machine
    if (!state.initialized) {
        state.phase = 'PHASE_1';
        // We statically pick the first 5 double streets (lines) to cover 1-30
        state.lines = [1, 7, 13, 19, 25]; 
        state.recoveryLevel = 0;
        state.recoveryWins = 0;
        state.targetDozen = null;
        state.consecutive = 0;
        state.initialized = true;
    }

    // 2. Define Base Units and Clamping Helper
    const baseInside = config.betLimits.min;
    const baseOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    const clamp = (amount, min) => Math.min(Math.max(amount, min), maxBet);

    // 3. Evaluate Previous Spin & Transition State
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        const lastDozen = lastSpin === 0 ? 0 : Math.ceil(lastSpin / 12);
        let wonLastSpin = false;

        // Determine if our last bet won based on the phase we were in
        if (state.phase === 'PHASE_1' || state.phase === 'RECOVERY') {
            const spinLine = lastSpin === 0 ? 0 : Math.floor((lastSpin - 1) / 6) * 6 + 1;
            wonLastSpin = state.lines.includes(spinLine);
        } else if (state.phase === 'DOZENS') {
            if (state.consecutive === 1 || state.consecutive === 2) {
                wonLastSpin = (lastDozen === state.targetDozen);
            } else if (state.consecutive === 3) {
                // We won if it hit anything EXCEPT our target dozen and 0
                wonLastSpin = (lastDozen !== 0 && lastDozen !== state.targetDozen);
            }
        } else if (state.phase === 'DOZENS_RECOVERY') {
            wonLastSpin = (lastDozen !== 0 && lastDozen !== state.targetDozen);
        }

        // Apply State Transitions
        if (state.phase === 'PHASE_1') {
            if (wonLastSpin) {
                state.phase = 'DOZENS';
                state.targetDozen = lastDozen;
                state.consecutive = 1;
            } else {
                state.phase = 'RECOVERY';
                state.recoveryLevel = 1;
                state.recoveryWins = 0;
            }
        } else if (state.phase === 'RECOVERY') {
            if (wonLastSpin) {
                state.recoveryWins++;
                if (state.recoveryWins === 2) {
                    state.phase = 'DOZENS';
                    state.targetDozen = lastDozen;
                    state.consecutive = 1;
                    state.recoveryLevel = 0;
                    state.recoveryWins = 0;
                }
            } else {
                state.recoveryLevel++;
                state.recoveryWins = 0;
            }
        } else if (state.phase === 'DOZENS') {
            if (wonLastSpin) {
                if (state.consecutive === 1) state.consecutive = 2;
                else if (state.consecutive === 2) state.consecutive = 3;
                else if (state.consecutive === 3) state.phase = 'PHASE_1'; // Sequence complete!
            } else {
                if (state.consecutive === 3) {
                    state.phase = 'DOZENS_RECOVERY'; // Lost the big anti-streak bet
                } else {
                    state.phase = 'PHASE_1'; // Streak broke early, reset
                }
            }
        } else if (state.phase === 'DOZENS_RECOVERY') {
            state.phase = 'PHASE_1'; // Always reset after dozen recovery attempt
        }
    }

    // 4. Generate Bets for Current State
    let bets = [];

    if (state.phase === 'PHASE_1') {
        let amount = clamp(baseInside, baseInside);
        state.lines.forEach(line => bets.push({ type: 'line', value: line, amount: amount }));
    } 
    else if (state.phase === 'RECOVERY') {
        let multiplier = Math.pow(3, state.recoveryLevel);
        let amount = clamp(baseInside * multiplier, baseInside);
        state.lines.forEach(line => bets.push({ type: 'line', value: line, amount: amount }));
    } 
    else if (state.phase === 'DOZENS') {
        if (state.consecutive === 1) {
            let amount = clamp(baseOutside, baseOutside);
            bets.push({ type: 'dozen', value: state.targetDozen, amount: amount });
        } 
        else if (state.consecutive === 2) {
            let amount = clamp(baseOutside * 3, baseOutside);
            bets.push({ type: 'dozen', value: state.targetDozen, amount: amount });
        } 
        else if (state.consecutive === 3) {
            let amount = clamp(baseOutside * 10, baseOutside);
            [1, 2, 3].forEach(d => {
                if (d !== state.targetDozen) bets.push({ type: 'dozen', value: d, amount: amount });
            });
        }
    } 
    else if (state.phase === 'DOZENS_RECOVERY') {
        let amount = clamp(baseOutside * 25, baseOutside);
        [1, 2, 3].forEach(d => {
            if (d !== state.targetDozen) bets.push({ type: 'dozen', value: d, amount: amount });
        });
    }

    return bets;
}